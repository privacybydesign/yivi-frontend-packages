import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SessionManagement } from '../../plugins/yivi-client/src/session-management';
import { sanitizePairingCode } from '../../plugins/yivi-web/src/dom-manipulations';
import type { YiviSessionOptions, SessionPtr } from '../../yivi-core/src/types';

// Regression guards for the hardening fixes described in security advisory
// GHSA-2gvf-qqg8-9c9j:
//  - the pairing code must be sanitised (and rendered as text) before use
//  - the server-supplied sessionPtr.u must be scheme-validated before it is
//    used as a fetch base

describe('sanitizePairingCode (advisory: pairing-code DOM XSS)', () => {
  it('keeps a legitimate numeric code untouched', () => {
    expect(sanitizePairingCode('1234')).toBe('1234');
  });

  it('strips markup from a crafted code so no HTML can survive', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const sanitized = sanitizePairingCode(payload);
    expect(sanitized).toBe('1');
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
  });

  it('strips all non-digit characters', () => {
    expect(sanitizePairingCode('12<script>ab34')).toBe('1234');
  });

  it('handles empty / nullish input', () => {
    expect(sanitizePairingCode('')).toBe('');
    // @ts-expect-error exercising the runtime guard against nullish input
    expect(sanitizePairingCode(undefined)).toBe('');
  });
});

describe('dom-manipulations pairing failure rendering (advisory)', () => {
  const source = readFileSync(resolve(__dirname, '../../plugins/yivi-web/src/dom-manipulations.ts'), 'utf8');

  it('renders the pairingFailed message via textContent, never innerHTML', () => {
    // The pairingRejected branch must not assign pairingFailed(...) to innerHTML.
    expect(source).not.toMatch(/innerHTML\s*=\s*this\._translations\.pairingFailed/);
    expect(source).toMatch(/textContent\s*=\s*this\._translations\.pairingFailed/);
  });

  it('sanitises the entered code before interpolating it', () => {
    expect(source).toMatch(/sanitizePairingCode\(pairingPayload\?\.enteredPairingCode/);
  });
});

describe('sessionPtr.u validation (advisory: unvalidated session URL)', () => {
  // The `start: false` path validates synchronously (it does not go through
  // fetch), so wrap in a promise to normalise sync throws into rejections.
  function attempt(u: string): Promise<{ sessionPtr: SessionPtr }> {
    const session = new SessionManagement({
      url: '',
      start: false,
      mapping: {
        sessionPtr: (): SessionPtr => ({ u, irmaqr: 'disclosing' }),
      },
    } as YiviSessionOptions);
    return Promise.resolve().then(() => session.start());
  }

  it('accepts an absolute https session URL', async () => {
    const mappings = await attempt('https://irma.example.com/irma/session/abc');
    expect(mappings.sessionPtr.u).toBe('https://irma.example.com/irma/session/abc');
  });

  it('accepts a same-origin relative session URL', async () => {
    const mappings = await attempt('/irma/session/abc');
    expect(mappings.sessionPtr.u).toBe('/irma/session/abc');
  });

  it('accepts http only for localhost (local development)', async () => {
    await expect(attempt('http://localhost:8088/irma')).resolves.toBeTruthy();
    await expect(attempt('http://127.0.0.1:8088/irma')).resolves.toBeTruthy();
  });

  it('rejects http to a remote host (auth-token leak)', async () => {
    await expect(attempt('http://evil.example.com/irma')).rejects.toThrow(/insecure/i);
  });

  it('rejects protocol-relative URLs', async () => {
    await expect(attempt('//evil.example.com/irma')).rejects.toThrow(/protocol-relative/i);
  });

  it('rejects dangerous schemes', async () => {
    // Built by concatenation to avoid eslint's no-script-url on the literal.
    await expect(attempt('java' + 'script:alert(1)')).rejects.toThrow(/insecure/i);
    await expect(attempt('data:text/html,<script>1</script>')).rejects.toThrow(/insecure/i);
  });

  it('rejects an empty session URL', async () => {
    await expect(attempt('')).rejects.toThrow(/Missing or invalid sessionPtr URL/i);
  });
});
