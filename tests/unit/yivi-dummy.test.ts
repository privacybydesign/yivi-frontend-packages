import { describe, it, expect } from 'vitest';
import YiviCore from '../../yivi-core/src/index';
import YiviDummy from '../../plugins/yivi-dummy/src/index';

describe('YiviDummy', () => {
  describe('QR code generation', () => {
    it('should generate universal link for QR code', async () => {
      const stateChanges: any[] = [];

      const StateLogger = class {
        constructor({ stateMachine }: any) {
          stateMachine.addStateChangeListener((event: any) => {
            stateChanges.push(event);
          });
        }
        start() {}
      };

      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        timing: { start: 10, prepare: 10, scan: 10, pairing: 10, app: 10 },
      });

      yivi.use(StateLogger);
      yivi.use(YiviDummy);

      await yivi.start();

      const qrEvent = stateChanges.find((e) => e.newState === 'ShowingQRCode');
      expect(qrEvent).toBeDefined();
      expect(qrEvent.payload.qr).toMatch(/^https:\/\/open\.yivi\.app\/-\/session#/);
    });

    it('should include session pointer in QR code URL', async () => {
      const stateChanges: any[] = [];

      const StateLogger = class {
        constructor({ stateMachine }: any) {
          stateMachine.addStateChangeListener((event: any) => {
            stateChanges.push(event);
          });
        }
        start() {}
      };

      const customPayload = {
        u: 'https://custom.server.com/session/123',
        irmaqr: 'signing',
      };

      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        qrPayload: customPayload,
        timing: { start: 10, prepare: 10, scan: 10, pairing: 10, app: 10 },
      });

      yivi.use(StateLogger);
      yivi.use(YiviDummy);

      await yivi.start();

      const qrEvent = stateChanges.find((e) => e.newState === 'ShowingQRCode');
      expect(qrEvent).toBeDefined();

      // Decode the URL and verify content
      const url = qrEvent.payload.qr;
      const hash = url.split('#')[1];
      const decoded = JSON.parse(decodeURIComponent(hash));

      expect(decoded.u).toBe(customPayload.u);
      expect(decoded.irmaqr).toBe(customPayload.irmaqr);
      expect(decoded.continueOnSecondDevice).toBe(true);
    });

    it('should use default session pointer when not provided', async () => {
      const stateChanges: any[] = [];

      const StateLogger = class {
        constructor({ stateMachine }: any) {
          stateMachine.addStateChangeListener((event: any) => {
            stateChanges.push(event);
          });
        }
        start() {}
      };

      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        timing: { start: 10, prepare: 10, scan: 10, pairing: 10, app: 10 },
      });

      yivi.use(StateLogger);
      yivi.use(YiviDummy);

      await yivi.start();

      const qrEvent = stateChanges.find((e) => e.newState === 'ShowingQRCode');
      expect(qrEvent).toBeDefined();

      const url = qrEvent.payload.qr;
      const hash = url.split('#')[1];
      const decoded = JSON.parse(decodeURIComponent(hash));

      expect(decoded.u).toBe('https://example.com/irma/session/dummy');
      expect(decoded.irmaqr).toBe('disclosing');
    });
  });

  describe('state flow', () => {
    it('should go through expected states in happy path', async () => {
      const states: string[] = [];

      const StateLogger = class {
        constructor({ stateMachine }: any) {
          stateMachine.addStateChangeListener((event: any) => {
            states.push(event.newState);
          });
        }
        start() {}
      };

      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        timing: { start: 10, prepare: 10, scan: 10, pairing: 10, app: 10 },
      });

      yivi.use(StateLogger);
      yivi.use(YiviDummy);

      await yivi.start();

      // Should go through these states
      expect(states).toContain('Loading');
      expect(states).toContain('CheckingUserAgent');
      expect(states).toContain('PreparingQRCode');
      expect(states).toContain('ShowingQRCode');
      expect(states).toContain('ContinueOn2ndDevice');
      expect(states).toContain('PreparingResult');
      expect(states).toContain('Success');
    });

    it('should return success payload', async () => {
      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        successPayload: { custom: 'result' },
        timing: { start: 10, prepare: 10, scan: 10, pairing: 10, app: 10 },
      });

      yivi.use(YiviDummy);

      const result = await yivi.start();
      // deepmerge combines custom payload with defaults
      expect(result).toMatchObject({ custom: 'result' });
    });
  });

  describe('timing options', () => {
    it('should complete flow with minimal timing', async () => {
      const startTime = Date.now();

      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        timing: { start: 5, prepare: 5, scan: 5, pairing: 5, app: 5 },
      });

      yivi.use(YiviDummy);

      await yivi.start();

      const elapsed = Date.now() - startTime;
      // Flow should complete relatively quickly with minimal timing
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('browser unsupported', () => {
    it('should immediately reject with BrowserNotSupported', async () => {
      const yivi = new YiviCore({
        debugging: false,
        dummy: 'browser unsupported',
      });

      yivi.use(YiviDummy);

      await expect(yivi.start()).rejects.toBe('BrowserNotSupported');
    });
  });
});
