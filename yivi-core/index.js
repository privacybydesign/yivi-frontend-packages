const StateMachine = require('./state-machine');

module.exports = class YiviCore {
  constructor(options) {
    this._modules = [];
    this._options = options || {};

    this._stateMachine = new StateMachine(this._options.debugging);
    this._stateMachine.addStateChangeListener((s) => this._stateChangeListener(s));
  }

  use(mod) {
    this._modules.push(
      // eslint-disable-next-line new-cap
      new mod({
        stateMachine: this._stateMachine,
        options: this._options,
      }),
    );
  }

  start(...input) {
    if (this._resolve) throw new Error('The yivi-core instance has already been started');

    if (this._options.debugging) console.log('Starting session with options:', this._options);

    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
      this._modules.filter((m) => m.start).forEach((m) => m.start(...input));
    });
  }

  abort() {
    return this._stateMachine.selectTransition(({ state, inEndState }) => {
      if (state !== 'Uninitialized' && !inEndState) {
        if (this._options.debugging) console.log('🖥 Manually aborting session instance');
        return { transition: 'abort' };
      } else {
        if (this._options.debugging) console.log('🖥 Manual abort is not necessary');
        return false;
      }
    });
  }

  _stateChangeListener(state) {
    this._modules.filter((m) => m.stateChange).forEach((m) => m.stateChange(state));

    const { newState, payload, isFinal } = state;

    if (isFinal) {
      const returnValue = newState === 'Success' ? payload : newState;
      this._close(returnValue)
        .then(newState === 'Success' ? this._resolve : this._reject)
        .catch(this._reject);
    }
  }

  /**
   * Calls the close() method of all registered plugins and looks for the result
   * where the Promise that was created by the start() method should resolve with.
   *
   * If non of the plugins returns a result, we return the yivi-core result.
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
  _close(coreReturnValue) {
    return Promise.all(this._modules.map((m) => Promise.resolve(m.close ? m.close() : undefined))).then(
      (returnValues) => {
        const hasValues = returnValues.some((v) => v !== undefined);
        return hasValues ? [coreReturnValue, ...returnValues] : coreReturnValue;
      },
    );
  }
};
