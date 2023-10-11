const transitions = require('./state-transitions');

module.exports = class StateMachine {
  constructor(debugging) {
    this._state = transitions.startState;
    this._debugging = debugging;
    this._listeners = [];
    this._inEndState = false;
    this._disabledTransitions = [];
  }

  addStateChangeListener(func) {
    this._listeners.push(func);
  }

  /**
   * @deprecated Please use the function 'selectTransition'.
   * Starts the given transition unconditionally using the given payload.
   * @param transition
   * @param payload
   * @returns Promise<performedTransition>, Promise is rejected when an invalid transition is chosen.
   */
  transition(transition, payload) {
    console.warn(
      "The 'transition' function of the yivi-core state machine is deprecated. Please use 'selectTransition'.",
    );
    return this.selectTransition(() => ({ transition, payload }));
  }

  /**
   * @deprecated Please use the function 'selectTransition'.
   * Starts the given transition unconditionally using the given payload.
   * The transition is being requested as final.
   * @param transition
   * @param payload
   * @returns Promise<performedTransition>, Promise is rejected when an invalid transition is chosen
   *          or when the chosen transition does not lead to an end state.
   */
  finalTransition(transition, payload) {
    console.warn(
      "The 'finalTransition' function of the yivi-core state machine is deprecated. Please use 'selectTransition'.",
    );
    return this.selectTransition(() => ({
      transition,
      payload,
      isFinal: true,
    }));
  }

  /**
   * Initiate a transition based on the current state of the state machine. As parameter a
   * callback function should be specified which should return the desired transition.
   * The callback function receives information about the current state as parameter.
   * In case you conclude you don't want to do a transition after all, you can return false.
   * In case you decide to do a transition, you return the following:
   * {
   *   transition: 'someTransition', // Required
   *   isFinal: false,               // Optional; default value is false
   *   payload: 'some'               // Optional; default value is undefined
   * }
   * @param selectCallback: ({state, validTransitions, inEndState}) => {...}
   * @returns Promise<performedTransition>, Promise is rejected when an invalid transition is chosen.
   */
  selectTransition(selectCallback) {
    // Don't use promise chaining to prevent race-conditions.
    return new Promise((resolve, reject) => {
      try {
        const selected = selectCallback({
          state: this._state,
          validTransitions: this._getValidTransitions(),
          inEndState: this._inEndState,
        });
        if (!selected) {
          resolve(false);
          return;
        }
        this._performTransition(selected);
        resolve(selected);
      } catch (e) {
        reject(e);
      }
    });
  }

  _getValidTransitions() {
    const isEnabled = (t) => !this._disabledTransitions.includes(t);
    return Object.keys(transitions[this._state]).filter(isEnabled);
  }

  // This function is non-async by design, to prevent race conditions when two transitions are started simultaneously.
  _performTransition({ transition, isFinal, payload }) {
    const oldState = this._state;
    if (this._inEndState)
      throw new Error(`State machine is in an end state. No transitions are allowed from ${oldState}.`);
    this._state = this._getNewState(transition, isFinal);

    if (this._debugging)
      console.debug(`🎰 State change: '${oldState}' → '${this._state}' (because of '${transition}')`);

    // State is also an end state when no transitions are available from that state. We exclude the
    // abort transition since abort is only intended to turn a non end state into an end state.
    this._inEndState = isFinal || this._getValidTransitions().filter((t) => t !== 'abort').length === 0;

    if (transition === 'initialize') this._disabledTransitions = payload.canRestart ? [] : ['restart'];

    this._listeners.forEach((func) =>
      func({
        newState: this._state,
        oldState,
        transition,
        isFinal: this._inEndState,
        payload,
      }),
    );
  }

  _getNewState(transition, isFinal) {
    const newState = transitions[this._state][transition];
    const isDisabled = this._disabledTransitions.includes(transition);
    if (!newState) throw new Error(`Invalid transition '${transition}' from state '${this._state}'.`);
    if (isDisabled) throw new Error(`Transition '${transition}' is currently disabled in state '${this._state}'.`);
    if (isFinal && !transitions.endStates.includes(newState))
      throw new Error(
        `Transition '${transition}' from state '${this._state}' is marked as final, but resulting state ${newState} cannot be an end state.`,
      );
    return newState;
  }
};
