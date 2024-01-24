import SessionClient from './session-client';
import StateClient from './state-client';

export default class YiviClient {
  _stateClient: StateClient;
  _sessionClient: SessionClient;
  
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
