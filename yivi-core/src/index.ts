import StateMachine from './state-machine';
import type {
  YiviOptions,
  YiviPlugin,
  YiviPluginConstructor,
  StateChangeEvent,
} from './types';

export default class YiviCore {
  private _modules: YiviPlugin[];
  private _options: YiviOptions;
  private _stateMachine: StateMachine;
  private _resolve?: (value: unknown) => void;
  private _reject?: (reason: unknown) => void;

  constructor(options?: YiviOptions) {
    this._modules = [];
    this._options = options || {};

    this._stateMachine = new StateMachine(this._options.debugging);
    this._stateMachine.addStateChangeListener((s) => this._stateChangeListener(s));
  }

  use(mod: YiviPluginConstructor): void {
    this._modules.push(
      new mod({
        stateMachine: this._stateMachine,
        options: this._options,
      }),
    );
  }

  start(...input: unknown[]): Promise<unknown> {
    if (this._resolve) throw new Error('The yivi-core instance has already been started');

    if (this._options.debugging) console.log('Starting session with options:', this._options);

    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
      this._modules.filter((m) => m.start).forEach((m) => m.start!(...input));
    });
  }

  abort(): Promise<unknown> {
    return this._stateMachine.selectTransition(({ state, inEndState }) => {
      if (state !== 'Uninitialized' && !inEndState) {
        if (this._options.debugging) console.log('Manually aborting session instance');
        return { transition: 'abort' };
      } else {
        if (this._options.debugging) console.log('Manual abort is not necessary');
        return false;
      }
    });
  }

  private _stateChangeListener(state: StateChangeEvent): void {
    this._modules.filter((m) => m.stateChange).forEach((m) => m.stateChange!(state));

    const { newState, payload, isFinal } = state;

    if (isFinal) {
      const returnValue = newState === 'Success' ? payload : newState;
      this._close(returnValue)
        .then(newState === 'Success' ? this._resolve! : this._reject!)
        .catch(this._reject!);
    }
  }

  /**
   * Calls the close() method of all registered plugins and looks for the result
   * where the Promise that was created by the start() method should resolve with.
   *
   * If none of the plugins returns a result, we return the yivi-core result.
   *
   * If one or more plugins return a result on close(), we return an array
   * containing the yivi-core result as first item and the return values of the
   * registered plugins as subsequent items. The order in which the plugins are
   * added with 'use' determines the index in the array. Plugins that do not
   * return a result, have the result 'undefined' then.
   * @param coreReturnValue
   * @returns Promise<*coreReturnValue* | *[coreReturnValue, ...]*>
   * @private
   */
  private _close(coreReturnValue: unknown): Promise<unknown> {
    return Promise.all(this._modules.map((m) => Promise.resolve(m.close ? m.close() : undefined))).then(
      (returnValues) => {
        const hasValues = returnValues.some((v) => v !== undefined);
        return hasValues ? [coreReturnValue, ...returnValues] : coreReturnValue;
      },
    );
  }
}

// Re-export all types
export * from './types';
// Export the StateMachine class (for advanced usage)
// The IStateMachine interface should be used for type annotations in plugins
export { default as StateMachineImpl } from './state-machine';
export { default as transitions } from './state-transitions';
