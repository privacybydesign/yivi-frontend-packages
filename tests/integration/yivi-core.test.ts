import { describe, it, expect, vi } from 'vitest';
import { YiviCore } from '../../yivi-core/src/index';
import { YiviDummy } from '../../plugins/yivi-dummy/src/index';

describe('YiviCore Integration', () => {
  describe('with YiviDummy plugin', () => {
    it('should complete happy path flow', async () => {
      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        timing: {
          start: 10,
          prepare: 10,
          scan: 10,
          pairing: 10,
          app: 10,
        },
      });

      yivi.use(YiviDummy);

      const result = await yivi.start();

      expect(result).toEqual({
        disclosed: 'Some attributes',
      });
    });

    it('should handle browser unsupported scenario', async () => {
      const yivi = new YiviCore({
        debugging: false,
        dummy: 'browser unsupported',
      });

      yivi.use(YiviDummy);

      // Browser unsupported results in rejection with 'BrowserNotSupported'
      await expect(yivi.start()).rejects.toBe('BrowserNotSupported');
    });

    it('should reject when start is called twice', async () => {
      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        timing: {
          start: 100,
          prepare: 100,
          scan: 100,
          pairing: 100,
          app: 100,
        },
      });

      yivi.use(YiviDummy);

      // Start first session (don't await)
      const promise1 = yivi.start();

      // Try to start second session immediately
      expect(() => yivi.start()).toThrow('already been started');

      // Clean up
      await promise1;
    });

    it('should allow abort during session', async () => {
      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        timing: {
          start: 500,
          prepare: 500,
          scan: 500,
          pairing: 500,
          app: 500,
        },
      });

      yivi.use(YiviDummy);

      const resultPromise = yivi.start();

      // Wait a bit then abort
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 50);
      });
      await yivi.abort();

      // Abort results in rejection with 'Aborted'
      await expect(resultPromise).rejects.toBe('Aborted');
    });

    it('should use custom success payload', async () => {
      const customPayload = {
        attributes: ['email', 'name'],
        signature: 'abc123',
      };

      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        successPayload: customPayload,
        timing: {
          start: 10,
          prepare: 10,
          scan: 10,
          pairing: 10,
          app: 10,
        },
      });

      yivi.use(YiviDummy);

      const result = await yivi.start();

      // deepmerge combines custom payload with defaults
      expect(result).toMatchObject(customPayload);
    });
  });

  describe('plugin system', () => {
    it('should call plugin stateChange method', async () => {
      const stateChangeMock = vi.fn();

      const MockPlugin = class {
        stateChange = stateChangeMock;
        start() {
          // Do nothing - let dummy handle the flow
        }
      };

      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        timing: {
          start: 10,
          prepare: 10,
          scan: 10,
          pairing: 10,
          app: 10,
        },
      });

      yivi.use(MockPlugin);
      yivi.use(YiviDummy);

      await yivi.start();

      // Should have been called multiple times for state changes
      expect(stateChangeMock).toHaveBeenCalled();
      expect(stateChangeMock.mock.calls.length).toBeGreaterThan(0);
    });

    it('should pass correct options to plugins', () => {
      let receivedOptions: any;

      const MockPlugin = class {
        constructor({ options }: any) {
          receivedOptions = options;
        }

        start() {}
      };

      const options = {
        debugging: true,
        customOption: 'test',
      };

      const yivi = new YiviCore(options);
      yivi.use(MockPlugin);

      expect(receivedOptions).toEqual(options);
    });

    it('should pass stateMachine to plugins', () => {
      let receivedStateMachine: any;

      const MockPlugin = class {
        constructor({ stateMachine }: any) {
          receivedStateMachine = stateMachine;
        }

        start() {}
      };

      const yivi = new YiviCore({});
      yivi.use(MockPlugin);

      expect(receivedStateMachine).toBeDefined();
      expect(typeof receivedStateMachine.selectTransition).toBe('function');
    });

    it('should call close method on plugins', async () => {
      const closeMock = vi.fn();

      const MockPlugin = class {
        close = closeMock;
        start() {}
      };

      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        timing: {
          start: 10,
          prepare: 10,
          scan: 10,
          pairing: 10,
          app: 10,
        },
      });

      yivi.use(MockPlugin);
      yivi.use(YiviDummy);

      await yivi.start();

      expect(closeMock).toHaveBeenCalled();
    });

    it('should pass plugin close return values in result array', async () => {
      const MockPlugin = class {
        start() {}
        close() {
          return 'plugin result';
        }
      };

      const yivi = new YiviCore({
        debugging: false,
        dummy: 'happy path',
        timing: {
          start: 10,
          prepare: 10,
          scan: 10,
          pairing: 10,
          app: 10,
        },
      });

      yivi.use(MockPlugin);
      yivi.use(YiviDummy);

      const result = await yivi.start();

      // When plugins return values from close(), the result is an array
      expect(result).toEqual([{ disclosed: 'Some attributes' }, 'plugin result', undefined]);
    });
  });
});
