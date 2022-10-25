const SessionClient = require('./session-client');
const StateClient = require('./state-client');

module.exports = class YiviClient {
  constructor(args) {
    this._stateClient = new StateClient(args);
    this._sessionClient = new SessionClient({
      ...args,
      onCancel: (mappings) => this._stateClient.cancelSession(mappings),
    });
  }

  stateChange(args) {
    this._sessionClient.stateChange(args);
    this._stateClient.stateChange(args);
  }

  start() {
    this._sessionClient.start();
  }

  close() {
    this._stateClient.close();
  }
};
