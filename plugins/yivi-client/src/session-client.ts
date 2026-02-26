import SessionManagement from './session-management';
import merge from 'deepmerge';
import type {
  IStateMachine,
  YiviOptions,
  YiviSessionOptions,
  SessionMappings,
  StateChangeEvent,
} from '@privacybydesign/yivi-core';

interface SessionClientArgs {
  stateMachine: IStateMachine;
  options: YiviOptions;
  onCancel?: (mappings: SessionMappings) => void;
}

interface SanitizedOptions extends YiviOptions {
  session: YiviSessionOptions;
}

export default class YiviSessionClient {
  private _stateMachine: IStateMachine;
  private _options: SanitizedOptions;
  private _session: SessionManagement | false;
  private _onCancel: (mappings: SessionMappings) => void;

  constructor({ stateMachine, options, onCancel }: SessionClientArgs) {
    this._stateMachine = stateMachine;
    this._options = this._sanitizeOptions(options);
    this._session = this._options.session ? new SessionManagement(this._options.session) : false;
    this._onCancel = onCancel || (() => {});
  }

  stateChange({ newState }: StateChangeEvent): void {
    switch (newState) {
      case 'Loading':
        this._startNewSession();
        break;
      case 'PreparingResult':
        this._prepareResult();
        break;
    }
  }

  start(): Promise<unknown> {
    if (this._options.session) {
      return this._stateMachine.selectTransition(({ state }) => {
        if (state !== 'Uninitialized') throw new Error('State machine is already initialized by another plugin');
        const startOption = this._options.session.start;
        return {
          transition: 'initialize',
          // The start option may contain an object, so we force conversion to boolean by doing a double negation (!!).
          payload: { canRestart: !!startOption },
        };
      });
    }
    return Promise.resolve();
  }

  private _startNewSession(): void {
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

  private _prepareResult(): void {
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

  private _sanitizeOptions(options: YiviOptions): SanitizedOptions {
    const defaults = {
      session: {
        url: '',
        start: {
          url: (o: YiviSessionOptions) => `${o.url}/session`,
          parseResponse: (r: Response) => r.json(),
          // And default custom settings for fetch()'s init parameter
          // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
        },
        mapping: {
          sessionPtr: (r: { sessionPtr?: unknown }) => r.sessionPtr,
          sessionToken: (r: { token?: string }) => r.token,
          frontendRequest: (r: { frontendRequest?: unknown }) => r.frontendRequest,
        },
        result: {
          url: (o: YiviSessionOptions, { sessionToken }: SessionMappings) => `${o.url}/session/${sessionToken}/result`,
          parseResponse: (r: Response) => r.json(),
          // And default custom settings for fetch()'s init parameter
          // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
        },
      },
    };

    return merge(defaults, options) as SanitizedOptions;
  }
}
