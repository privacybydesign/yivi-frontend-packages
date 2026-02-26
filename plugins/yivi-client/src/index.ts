import SessionClient from './session-client';
import StateClient from './state-client';
import type { IStateMachine, YiviOptions, StateChangeEvent, SessionMappings } from '@privacybydesign/yivi-core';

interface YiviClientArgs {
  stateMachine: IStateMachine;
  options: YiviOptions;
}

export default class YiviClient {
  private _stateClient: StateClient;
  private _sessionClient: SessionClient;

  constructor(args: YiviClientArgs) {
    this._stateClient = new StateClient(args);
    this._sessionClient = new SessionClient({
      ...args,
      onCancel: (mappings: SessionMappings) => this._stateClient.cancelSession(mappings),
    });
  }

  stateChange(args: StateChangeEvent): void {
    this._sessionClient.stateChange(args);
    this._stateClient.stateChange(args);
  }

  start(): void {
    this._sessionClient.start();
  }

  close(): void {
    this._stateClient.close();
  }
}

// Re-export useful types and utilities
export { default as ProtocolVersion } from './protocol-version';
export { default as userAgent, type UserAgentType } from './user-agent';
export { default as SessionManagement } from './session-management';
export { default as StatusListener, type ServerState } from './status-listener';
