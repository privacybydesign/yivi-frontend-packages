import { describe, it, expect, vi, beforeEach } from 'vitest';
import StateMachine from '../../yivi-core/src/state-machine';
import transitions from '../../yivi-core/src/state-transitions';

describe('StateMachine', () => {
  let stateMachine: StateMachine;

  beforeEach(() => {
    stateMachine = new StateMachine();
  });

  describe('initial state', () => {
    it('should start in Uninitialized state', async () => {
      const result = await stateMachine.selectTransition(({ state }) => {
        expect(state).toBe('Uninitialized');
        return false;
      });
      expect(result).toBe(false);
    });

    it('should not be in end state initially', async () => {
      await stateMachine.selectTransition(({ inEndState }) => {
        expect(inEndState).toBe(false);
        return false;
      });
    });
  });

  describe('selectTransition', () => {
    it('should return valid transitions from Uninitialized state', async () => {
      await stateMachine.selectTransition(({ validTransitions }) => {
        expect(validTransitions).toContain('initialize');
        expect(validTransitions).toContain('browserError');
        return false;
      });
    });

    it('should perform initialize transition', async () => {
      const result = await stateMachine.selectTransition(({ validTransitions }) => {
        if (validTransitions.includes('initialize')) {
          return { transition: 'initialize' };
        }
        return false;
      });

      expect(result).toEqual({ transition: 'initialize' });

      // Verify state changed to Loading
      await stateMachine.selectTransition(({ state }) => {
        expect(state).toBe('Loading');
        return false;
      });
    });

    it('should reject invalid transitions', async () => {
      await expect(
        stateMachine.selectTransition(() => ({
          transition: 'nonexistent',
        })),
      ).rejects.toThrow("Invalid transition 'nonexistent'");
    });

    it('should pass payload to state change listeners', async () => {
      const listener = vi.fn();
      stateMachine.addStateChangeListener(listener);

      const payload = { canRestart: true };
      await stateMachine.selectTransition(() => ({
        transition: 'initialize',
        payload,
      }));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          newState: 'Loading',
          oldState: 'Uninitialized',
          transition: 'initialize',
          payload,
        }),
      );
    });
  });

  describe('state change listeners', () => {
    it('should call all registered listeners on transition', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      stateMachine.addStateChangeListener(listener1);
      stateMachine.addStateChangeListener(listener2);

      await stateMachine.selectTransition(() => ({ transition: 'initialize' }));

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should provide correct event data to listeners', async () => {
      const listener = vi.fn();
      stateMachine.addStateChangeListener(listener);

      await stateMachine.selectTransition(() => ({
        transition: 'initialize',
        payload: { test: 'data' },
      }));

      expect(listener).toHaveBeenCalledWith({
        newState: 'Loading',
        oldState: 'Uninitialized',
        transition: 'initialize',
        isFinal: false,
        payload: { test: 'data' },
      });
    });
  });

  describe('end states', () => {
    it('should mark Success as an end state', async () => {
      // Navigate to Success state
      await stateMachine.selectTransition(() => ({ transition: 'initialize' }));
      await stateMachine.selectTransition(() => ({ transition: 'loaded', payload: { sessionPtr: {} } }));
      await stateMachine.selectTransition(() => ({ transition: 'prepareQRCode' }));
      await stateMachine.selectTransition(() => ({ transition: 'showQRCode', payload: { qr: 'test' } }));
      await stateMachine.selectTransition(() => ({ transition: 'appConnected' }));
      await stateMachine.selectTransition(() => ({ transition: 'prepareResult' }));
      await stateMachine.selectTransition(() => ({
        transition: 'succeed',
        payload: { disclosed: 'data' },
      }));

      await stateMachine.selectTransition(({ state, inEndState }) => {
        expect(state).toBe('Success');
        expect(inEndState).toBe(true);
        return false;
      });
    });

    it('should prevent transitions from end state', async () => {
      // Navigate to an end state
      await stateMachine.selectTransition(() => ({ transition: 'browserError', isFinal: true }));

      await expect(
        stateMachine.selectTransition(() => ({ transition: 'initialize' })),
      ).rejects.toThrow('State machine is in an end state');
    });
  });

  describe('restart functionality', () => {
    it('should disable restart when canRestart is false', async () => {
      await stateMachine.selectTransition(() => ({
        transition: 'initialize',
        payload: { canRestart: false },
      }));

      await stateMachine.selectTransition(({ validTransitions }) => {
        expect(validTransitions).not.toContain('restart');
        return false;
      });
    });

    it('should enable restart when canRestart is true', async () => {
      await stateMachine.selectTransition(() => ({
        transition: 'initialize',
        payload: { canRestart: true },
      }));

      // Navigate to a state that allows restart
      await stateMachine.selectTransition(() => ({ transition: 'loaded', payload: { sessionPtr: {} } }));
      await stateMachine.selectTransition(() => ({ transition: 'prepareQRCode' }));
      await stateMachine.selectTransition(() => ({ transition: 'showQRCode', payload: { qr: 'test' } }));
      await stateMachine.selectTransition(() => ({ transition: 'timeout' }));

      await stateMachine.selectTransition(({ validTransitions }) => {
        expect(validTransitions).toContain('restart');
        return false;
      });
    });
  });

  describe('debugging', () => {
    it('should log transitions when debugging is enabled', async () => {
      const debugStateMachine = new StateMachine(true);
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      await debugStateMachine.selectTransition(() => ({ transition: 'initialize' }));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("State change: 'Uninitialized' -> 'Loading'"),
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('State Transitions', () => {
  it('should have Uninitialized as start state', () => {
    expect(transitions.startState).toBe('Uninitialized');
  });

  it('should define end states', () => {
    expect(transitions.endStates).toContain('Success');
    expect(transitions.endStates).toContain('Aborted');
    expect(transitions.endStates).toContain('BrowserNotSupported');
  });

  it('should have transitions from all non-end states', () => {
    const allStates = new Set<string>();

    // Collect all states from transitions
    for (const [state, stateTransitions] of Object.entries(transitions)) {
      if (state === 'startState' || state === 'endStates') continue;
      allStates.add(state);
      for (const targetState of Object.values(stateTransitions as Record<string, string>)) {
        allStates.add(targetState);
      }
    }

    // Verify each non-end state has transitions defined
    for (const state of allStates) {
      if (transitions.endStates.includes(state as any)) continue;
      const stateTransitions = transitions[state as keyof typeof transitions];
      expect(stateTransitions, `State ${state} should have transitions defined`).toBeDefined();
    }
  });
});
