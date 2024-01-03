const qrcode = require('qrcode-terminal');

module.exports = (askRetry, askPairingCode) => {
  return class YiviConsole {
    constructor({ stateMachine, options }) {
      this._stateMachine = stateMachine;
      this._options = options;
    }

    stateChange({ newState, transition, payload, isFinal }) {
      if (isFinal) return;
      switch (newState) {
        case 'Cancelled':
          this._askRetry('Transaction cancelled.');
          break;
        case 'TimedOut':
          this._askRetry('Transaction timed out.');
          break;
        case 'Error':
          this._askRetry('An error occurred.');
          break;
        case 'ShowingQRCode':
          this._renderQRcode(payload);
          break;
        case 'ShowingYiviButton': {
          const err = new Error('Mobile sessions cannot be performed in node');
          if (this._options.debugging) console.error(err);
          this._stateMachine.selectTransition(({ validTransitions }) => {
            if (validTransitions.includes('fail')) return { transition: 'fail', payload: err };
            throw err;
          });
          break;
        }
        case 'ContinueOn2ndDevice':
        // Falls through
        case 'ContinueInYiviApp':
          console.log('Please follow the instructions in the Yivi app.');
          break;
        case 'EnterPairingCode':
          this._askPairingCode(transition !== 'appPairing');
          break;
      }
    }

    _askPairingCode(askedBefore) {
      return this._stateMachine.selectTransition(({ validTransitions, inEndState }) => {
        if (inEndState) return false;
        if (askedBefore && !askRetry('Wrong pairing code was entered.')) {
          const transition = validTransitions.includes('cancel') ? 'cancel' : 'abort';
          return { transition };
        }
        const enteredPairingCode = askPairingCode();
        return validTransitions.includes('codeEntered')
          ? { transition: 'codeEntered', payload: { enteredPairingCode } }
          : false;
      });
    }

    _askRetry(message) {
      return this._stateMachine.selectTransition(({ validTransitions, inEndState }) => {
        if (inEndState) return false;
        const transition = validTransitions.includes('restart') && askRetry(message) ? 'restart' : 'abort';
        return { transition };
      });
    }

    _renderQRcode(payload) {
      qrcode.generate(payload.qr, { small: true });
    }
  };
};
