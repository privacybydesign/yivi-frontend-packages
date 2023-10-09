const ServerSession = require('./session-management');
const merge = require('deepmerge');

module.exports = class YiviSessionClient {
  constructor({ stateMachine, options, onCancel }) {
    this._stateMachine = stateMachine;
    this._options = this._sanitizeOptions(options);
    this._session = this._options.session ? new ServerSession(this._options.session) : false;
    this._onCancel = onCancel || (() => {});
  }

  stateChange({ newState }) {
    switch (newState) {
      case 'Loading':
        this._startNewSession();
        break;
      case 'PreparingResult':
        this._prepareResult();
        break;
    }
  }

  start() {
    if (this._options.session) {
      return this._stateMachine.selectTransition(({ state }) => {
        if (state !== 'Uninitialized') throw new Error('State machine is already initialized by another plugin');
        return {
          transition: 'initialize',
          // The start option may contain an object, so we force conversion to boolean by doing a double negation (!!).
          payload: { canRestart: !!this._options.session.start },
        };
      });
    }
    return Promise.resolve();
  }

  _startNewSession() {
    if (this._session) {
      this._session
        .start()
        .then((mappings) =>
          this._stateMachine.selectTransition(({ state }) => {
            if (state === 'Loading') {
              return { transition: 'loaded', payload: mappings };
            } else {
              this._onCancel(mappings);
              return false;
            }
          }),
        )
        .catch((error) =>
          this._stateMachine.selectTransition(({ validTransitions }) => {
            if (this._options.debugging) console.error('Error starting a new session on the server:', error);
            if (validTransitions.includes('fail')) return { transition: 'fail', payload: error };
            throw error;
          }),
        );
    }
  }

  _prepareResult() {
    if (this._session) {
      this._session
        .result()
        .then((result) =>
          this._stateMachine.selectTransition(({ validTransitions }) =>
            validTransitions.includes('succeed') ? { transition: 'succeed', payload: result } : false,
          ),
        )
        .catch((error) =>
          this._stateMachine.selectTransition(({ validTransitions }) => {
            if (this._options.debugging) console.error('Error getting result from the server:', error);
            if (validTransitions.includes('fail')) return { transition: 'fail', payload: error };
            throw error;
          }),
        );
    }
  }

  _sanitizeOptions(options) {
    const defaults = {
      session: {
        url: '',
        start: {
          url: (o) => `${o.url}/session`,
          parseResponse: (r) => r.json(),
          // And default custom settings for fetch()'s init parameter
          // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
        },
        mapping: {
          sessionPtr: (r) => r.sessionPtr,
          sessionToken: (r) => r.token,
          frontendRequest: (r) => r.frontendRequest,
        },
        result: {
          url: (o, { sessionToken }) => `${o.url}/session/${sessionToken}/result`,
          parseResponse: (r) => r.json(),
          // And default custom settings for fetch()'s init parameter
          // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
        },
      },
    };

    return merge(defaults, options);
  }
};
