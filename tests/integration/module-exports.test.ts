import { describe, it, expect } from 'vitest';

describe('Module Exports', () => {
  describe('yivi-core', () => {
    it('should export YiviCore as named export', async () => {
      const { YiviCore } = await import('../../yivi-core/src/index');
      expect(YiviCore).toBeDefined();
      expect(typeof YiviCore).toBe('function');
    });

    it('should export StateMachineImpl', async () => {
      const { StateMachineImpl } = await import('../../yivi-core/src/index');
      expect(StateMachineImpl).toBeDefined();
      expect(typeof StateMachineImpl).toBe('function');
    });

    it('should export transitions', async () => {
      const { transitions } = await import('../../yivi-core/src/index');
      expect(transitions).toBeDefined();
      expect(transitions.startState).toBe('Uninitialized');
    });

    it('should export types', async () => {
      // TypeScript types are compile-time only, but we can verify the module structure
      const exports = await import('../../yivi-core/src/index');
      expect(exports).toBeDefined();
    });
  });

  describe('yivi-dummy', () => {
    it('should export YiviDummy as named export', async () => {
      const { YiviDummy } = await import('../../plugins/yivi-dummy/src/index');
      expect(YiviDummy).toBeDefined();
      expect(typeof YiviDummy).toBe('function');
    });
  });

  describe('yivi-client', () => {
    it('should export YiviClient as named export', async () => {
      const { YiviClient } = await import('../../plugins/yivi-client/src/index');
      expect(YiviClient).toBeDefined();
      expect(typeof YiviClient).toBe('function');
    });

    it('should export ProtocolVersion', async () => {
      const { ProtocolVersion } = await import('../../plugins/yivi-client/src/index');
      expect(ProtocolVersion).toBeDefined();
    });

    it('should export userAgent', async () => {
      const { userAgent } = await import('../../plugins/yivi-client/src/index');
      expect(userAgent).toBeDefined();
      expect(typeof userAgent).toBe('function');
    });

    it('should export SessionManagement', async () => {
      const { SessionManagement } = await import('../../plugins/yivi-client/src/index');
      expect(SessionManagement).toBeDefined();
    });

    it('should export StatusListener', async () => {
      const { StatusListener } = await import('../../plugins/yivi-client/src/index');
      expect(StatusListener).toBeDefined();
    });
  });

  describe('yivi-web', () => {
    it('should export YiviWeb as named export', async () => {
      const { YiviWeb } = await import('../../plugins/yivi-web/src/index');
      expect(YiviWeb).toBeDefined();
      expect(typeof YiviWeb).toBe('function');
    });

    it('should export translations', async () => {
      const { en, nl } = await import('../../plugins/yivi-web/src/index');
      expect(en).toBeDefined();
      expect(nl).toBeDefined();
      expect(en.header).toBeDefined();
      expect(nl.header).toBeDefined();
    });

    it('should export DOMManipulations', async () => {
      const { DOMManipulations } = await import('../../plugins/yivi-web/src/index');
      expect(DOMManipulations).toBeDefined();
    });
  });

  describe('yivi-popup', () => {
    it('should export YiviPopup as named export', async () => {
      const { YiviPopup } = await import('../../plugins/yivi-popup/src/index');
      expect(YiviPopup).toBeDefined();
      expect(typeof YiviPopup).toBe('function');
    });

    it('should export DOMManipulations', async () => {
      const { DOMManipulations } = await import('../../plugins/yivi-popup/src/index');
      expect(DOMManipulations).toBeDefined();
    });
  });

  describe('yivi-console', () => {
    it('should export createYiviConsole', async () => {
      const { createYiviConsole } = await import('../../plugins/yivi-console/src/index');
      expect(createYiviConsole).toBeDefined();
      expect(typeof createYiviConsole).toBe('function');
    });
  });
});
