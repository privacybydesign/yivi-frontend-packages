const StateMachine = require('./state-machine');
const userAgent    = require('./user-agent');

module.exports = class IrmaCore {

  constructor(options) {
    this._modules = [];
    this._options = options || {};
    const agent = userAgent();
    const storedSession = localStorage.getItem('irmajs-options');
    if (agent !== 'nodejs' && storedSession)
      this._options = JSON.parse(storedSession);
    this._options.userAgent = agent;

    this._stateMachine = new StateMachine(this._options.debugging);
    this._stateMachine.addStateChangeListener((s) => this._stateChangeListener(s));
  }

  use(mod) {
    this._modules.push(new mod({
      stateMachine: this._stateMachine,
      options:      this._options
    }));
  }

  start(...input) {
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject  = reject;
      this._modules.filter(m => m.start)
                   .forEach(m => m.start(...input));
    });
  }

  _stateChangeListener(state) {
    this._modules.filter(m => m.stateChange)
                 .forEach(m => m.stateChange(state));

    const {newState, payload} = state;

    switch(newState) {
      case 'Success':
        if ( this._resolve ) this._resolve(payload);
        if (this._options.userAgent !== 'nodejs')
          localStorage.removeItem('irmajs-options');
        break;
      case 'BrowserNotSupported':
        if ( this._reject ) this._reject(payload);
        break;
      case 'MediumContemplation':
        if (this._options.userAgent !== 'nodejs')
          localStorage.setItem('irmajs-options', JSON.stringify(this._options));
        if ( this._options.userAgent === 'Android' || this._options.userAgent === 'iOS' )
          this._stateMachine.transition('showIrmaButton', payload);
        else
          this._stateMachine.transition('showQRCode', payload);
        break;
      case 'Cancelled':
      case 'TimedOut':
      case 'Error':
        if (this._options.userAgent !== 'nodejs')
          localStorage.removeItem('irmajs-options');
        this._options.sessionPtr = null; // sessionPtr generated error, so make sure it gets not started again
        break;
    }
  }

}
