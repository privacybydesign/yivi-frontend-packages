import { YiviSessionClient as SessionClient } from './session-client';
import { YiviStateClient as StateClient } from './state-client';
import type { IStateMachine, YiviOptions, StateChangeEvent, SessionMappings } from '@privacybydesign/yivi-core';

interface YiviClientArgs {
  stateMachine: IStateMachine;
  options: YiviOptions;
}

export class YiviClient {
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
export { ProtocolVersion } from './protocol-version';
export { userAgent, type UserAgentType } from './user-agent';
export { SessionManagement } from './session-management';
export { StatusListener, type ServerState } from './status-listener';
