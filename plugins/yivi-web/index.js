const DOMManipulations = require('./dom-manipulations');
const merge = require('deepmerge');
const translations = {
  nl: require('./translations/nl'),
  en: require('./translations/en'),
};

module.exports = class YiviWeb {
  constructor({ stateMachine, options }) {
    this._stateMachine = stateMachine;
    this._options = this._sanitizeOptions(options);
    this._lastPayload = null;

    this._dom = new DOMManipulations(
      document.querySelector(this._options.element),
      this._options,
      (t) =>
        this._stateMachine.selectTransition(({ validTransitions }) =>
          validTransitions.includes(t) ? { transition: t, payload: this._lastPayload } : false,
        ),
      (enteredPairingCode) =>
        this._stateMachine.selectTransition(({ validTransitions }) =>
          validTransitions.includes('codeEntered')
            ? { transition: 'codeEntered', payload: { enteredPairingCode } }
            : false,
        ),
    );

    this._addVisibilityListener();
  }

  stateChange(state) {
    const { newState, payload } = state;
    this._lastPayload = payload;

    this._dom.renderState(state);
    switch (newState) {
      case 'ShowingQRCode':
        this._dom.setQRCode(payload.qr);
        break;

      case 'ShowingYiviButton':
        this._dom.setButtonLink(payload.mobile);
        break;
    }
  }

  close() {
    this._removeVisibilityListener();
  }

  _sanitizeOptions(options) {
    const defaults = {
      element: '#yivi-web-form',
      showHelper: false,
      fallbackDelay: 1000,
      translations: translations[options.language || 'nl'],
    };

    return merge(defaults, options);
  }

  _addVisibilityListener() {
    const onVisibilityChange = () =>
      this._stateMachine.selectTransition(({ state, validTransitions }) => {
        if (state !== 'TimedOut' || document.hidden || !validTransitions.includes('restart')) return false;

        if (this._options.debugging) console.log('🖥 Restarting because document became visible');
        return { transition: 'restart' };
      });

    const onFocusChange = () =>
      this._stateMachine.selectTransition(({ state, validTransitions }) => {
        if (state !== 'TimedOut' && !validTransitions.includes('restart')) return false;

        if (this._options.debugging) console.log('🖥 Restarting because window regained focus');
        return { transition: 'restart' };
      });

    const onResize = () =>
      this._stateMachine.selectTransition(({ validTransitions }) => {
        if (validTransitions.includes('checkUserAgent'))
          return { transition: 'checkUserAgent', payload: this._lastPayload };
        return false;
      });

    if (typeof document !== 'undefined' && document.addEventListener)
      document.addEventListener('visibilitychange', onVisibilityChange);

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('focus', onFocusChange);
      window.addEventListener('resize', onResize);
    }

    this._removeVisibilityListener = () => {
      if (typeof document !== 'undefined' && document.removeEventListener)
        document.removeEventListener('visibilitychange', onVisibilityChange);
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('focus', onFocusChange);
        window.removeEventListener('resize', onResize);
      }
    };
  }
};
