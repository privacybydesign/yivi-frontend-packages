import { describe, it, expect } from 'vitest';
import { YiviStateClient } from '../../plugins/yivi-client/src/state-client';
import type { UserAgentType } from '../../plugins/yivi-client/src/user-agent';
import type { IStateMachine, SessionPtr, YiviOptions } from '../../yivi-core/src/types';

type MobileUrlClient = { _userAgent: UserAgentType; _getMobileUrl(sessionPtr: SessionPtr): string };

const sessionPtr: SessionPtr = { u: 'https://irma.example/irma/session-token', irmaqr: 'disclosing' };

function mobileUrl(agent: UserAgentType): string {
  const client = new YiviStateClient({
    stateMachine: {} as IStateMachine,
    options: {} as YiviOptions,
  }) as unknown as MobileUrlClient;
  client._userAgent = agent;
  return client._getMobileUrl(sessionPtr);
}

describe('YiviStateClient mobile url', () => {
  describe('Android', () => {
    it('builds an intent link for the Yivi app carrying the session', () => {
      const url = mobileUrl('Android');

      expect(url).toMatch(/^intent:\/\/qr\/json\/.+#Intent;package=org\.irmacard\.cardemu;scheme=irma;/);
      expect(url).toContain(encodeURIComponent(JSON.stringify(sessionPtr)));
    });

    it('passes only a web flag as install referrer, never session data', () => {
      const intent = mobileUrl('Android').split('#')[1];
      const referrers = intent.split(';').filter((part) => part.startsWith('S.market_referrer='));

      expect(referrers).toEqual(['S.market_referrer=from%3Dweb']);
    });
  });

  describe('iOS', () => {
    it('builds a universal link without an install referrer', () => {
      const url = mobileUrl('iOS');

      expect(url).toBe(`https://open.yivi.app/-/session#${encodeURIComponent(JSON.stringify(sessionPtr))}`);
      expect(url).not.toContain('market_referrer');
    });
  });

  it('rejects a device that is neither Android nor iOS', () => {
    expect(() => mobileUrl('Desktop')).toThrow('Device type is not supported.');
  });
});
