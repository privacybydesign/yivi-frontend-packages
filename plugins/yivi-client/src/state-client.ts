import ProtocolVersion from './protocol-version';
import StatusListener, { type ServerState } from './status-listener';
import merge from 'deepmerge';
import userAgent, { type UserAgentType } from './user-agent';
import type {
  IStateMachine,
  YiviOptions,
  YiviStateOptions,
  SessionMappings,
  SessionPtr,
  StateChangeEvent,
  SelectTransitionResult,
} from '@privacybydesign/yivi-core';

interface StateClientArgs {
  stateMachine: IStateMachine;
  options: YiviOptions;
}

interface SanitizedOptions extends YiviOptions {
  state: YiviStateOptions;
}
interface FrontendOptions {
  pairingCode?: string;
  pairingMethod?: string;
}

interface PairingCodePayload {
  enteredPairingCode: string;
}

export default class YiviStateClient {
  private _stateMachine: IStateMachine;
  private _options: SanitizedOptions;
  private _mappings: SessionMappings;
  private _statusListener?: StatusListener;
  private _canRestart: boolean;
  private _pairingEnabled: boolean;
  private _frontendOptions?: FrontendOptions;
  private _userAgent?: UserAgentType;

  constructor({ stateMachine, options }: StateClientArgs) {
    this._stateMachine = stateMachine;
    this._options = this._sanitizeOptions(options);
    this._mappings = {} as SessionMappings;
    this._canRestart = false;
    this._pairingEnabled = false;
  }

  stateChange({ newState, transition, payload }: StateChangeEvent): void {
    switch (newState) {
      case 'Loading':
        this._canRestart = transition === 'restart' || (payload as { canRestart?: boolean })?.canRestart || false;
        break;
      case 'CheckingUserAgent':
        if (transition === 'loaded') {
          this._mappings = payload as SessionMappings;
          this._pairingEnabled = false;
          this._statusListener = new StatusListener(payload as SessionMappings, this._options.state);
        } else {
          this._statusListener?.close();
        }
        this._determineFlow();
        break;
      case 'PreparingQRCode':
        this._updatePairingState(transition, true);
        break;
      case 'PreparingYiviButton':
        this._updatePairingState(transition, false);
        break;
      case 'ShowingQRCode':
      case 'ShowingYiviButton':
        this._startWatchingServerState();
        break;
      case 'Pairing': {
        const pairingPayload = payload as PairingCodePayload;
        if (this._frontendOptions?.pairingCode === pairingPayload.enteredPairingCode) {
          this._pairingCompleted();
        } else {
          const pairingOptions = this._options.state.pairing as { minCheckingDelay?: number };
          setTimeout(
            () =>
              this._stateMachine.selectTransition(({ validTransitions }) =>
                validTransitions.includes('pairingRejected') ? { transition: 'pairingRejected', payload } : false,
              ),
            pairingOptions?.minCheckingDelay || 500,
          );
        }
        break;
      }
      case 'PreparingResult':
      case 'Cancelled':
      case 'TimedOut':
      case 'Error':
        this._serverCloseSession();
        break;
    }
  }

  close(): void {
    this._serverCloseSession();
  }

  cancelSession(mappings: SessionMappings): Promise<Response | void> {
    if (!this._options.state.cancel) return Promise.resolve();
    const cancelUrl = this._options.state.cancel.url!(mappings);
    return fetch(cancelUrl, {
      method: 'DELETE',
    });
  }

  private _startWatchingServerState(): void {
    try {
      this._statusListener?.observe(
        (s) => this._serverStateChange(s),
        (e) => this._serverHandleError(e),
      );
    } catch (error) {
      if (this._options.debugging) console.error('Observing server state could not be started: ', error);

      this._handleNoSuccess('fail', error);
    }
  }

  private _serverCloseSession(): void {
    if (this._statusListener) {
      if (this._statusListener.close()) {
        // If the server is still in an active state, we have to actively cancel.
        this.cancelSession(this._mappings).catch((error) => {
          if (this._options.debugging) console.error('Session could not be cancelled:', error);
        });
      }
    }
  }

  private _serverHandleError(error: Error): void {
    if (this._options.debugging) console.error('Error while observing server state: ', error);

    this._handleNoSuccess('fail', error);
  }

  private _serverStateChange(serverState: ServerState): Promise<SelectTransitionResult | false> {
    return this._stateMachine
      .selectTransition(({ validTransitions }) => {
        // We sometimes miss the appConnected transition
        // on iOS, that's why sometimes we have to do this one first.
        if (serverState.status === 'DONE' && validTransitions.includes('appConnected')) {
          return { transition: 'appConnected' };
        }
        return false;
      })
      .then(() =>
        this._stateMachine.selectTransition(({ state, validTransitions }) => {
          switch (serverState.status) {
            case 'PAIRING':
              if (validTransitions.includes('appPairing'))
                return {
                  transition: 'appPairing',
                  payload: this._frontendOptions,
                };
              break;
            case 'CONNECTED':
              // In yivi-core state 'Pairing', the _pairingCompleted method will initiate the appConnected transition.
              if (state !== 'Pairing' && validTransitions.includes('appConnected'))
                return { transition: 'appConnected' };
              break;
            case 'DONE':
              // What we hope will happen ;)
              this._statusListener?.close();
              if (serverState.nextSession) {
                const newMappings: SessionMappings = {
                  ...this._mappings,
                  sessionPtr: serverState.nextSession,
                };
                this._statusListener = new StatusListener(newMappings, this._options.state);
                this._startWatchingServerState();
              } else if (validTransitions.includes('prepareResult')) {
                return { transition: 'prepareResult' };
              }
              break;
            case 'CANCELLED':
              // This is a conscious choice by a user.
              this._statusListener?.close();
              return this._noSuccessTransition(validTransitions, 'cancel');
            case 'TIMEOUT':
              // This is a known and understood error. We can be explicit to the user.
              this._statusListener?.close();
              return this._noSuccessTransition(validTransitions, 'timeout');
            default:
              // Catch unknown errors and give generic error message. We never really
              // want to get here.
              if (this._options.debugging) console.error('Unknown state received from server:', serverState.status);

              this._statusListener?.close();
              return this._noSuccessTransition(
                validTransitions,
                'fail',
                new Error('Unknown state received from server'),
              );
          }
          return false;
        }),
      );
  }

  private _handleNoSuccess(transition: string, payload?: unknown): Promise<SelectTransitionResult | false> {
    return this._stateMachine.selectTransition(({ validTransitions }) =>
      this._noSuccessTransition(validTransitions, transition, payload),
    );
  }

  private _noSuccessTransition(
    validTransitions: string[],
    transition: string,
    payload?: unknown,
  ): SelectTransitionResult | false {
    if (validTransitions.includes(transition)) {
      return {
        transition,
        payload,
        isFinal: !this._canRestart,
      };
    }

    // If we cannot handle it in a nice way, we only print it for debug purposes.
    if (this._options.debugging) {
      const payloadError = payload ? `with payload ${payload}` : '';
      console.error(`Unknown transition, tried transition ${transition}`, payloadError);
    }
    return false;
  }

  private _updatePairingState(prevTransition: string, continueOnSecondDevice: boolean): Promise<void> {
    return Promise.resolve()
      .then(() => {
        const pairingOptions = this._options.state.pairing;
        if (!pairingOptions) return Promise.resolve();

        // onlyEnableIf may return 'undefined', so we force conversion to boolean by doing a double negation (!!).
        const shouldBeEnabled = continueOnSecondDevice && !!pairingOptions.onlyEnableIf?.(this._mappings);

        // Skip the request when the pairing method is correctly set already.
        if (shouldBeEnabled === this._pairingEnabled) return Promise.resolve();

        this._pairingEnabled = shouldBeEnabled;

        const pairingMethod = pairingOptions.pairingMethod || 'pin';
        // If pairing should be enabled, parse the pairing options struct.
        const options = shouldBeEnabled ? { pairingMethod } : { pairingMethod: 'none' };
        return this._updateFrontendOptions(options);
      })
      .then(() => {
        this._stateMachine.selectTransition(({ validTransitions }) => {
          if (continueOnSecondDevice) {
            const crossDeviceJson = {
              ...this._mappings.sessionPtr,
              continueOnSecondDevice: true,
            };
            const jsonSessionPtr = encodeURIComponent(JSON.stringify(crossDeviceJson));
            return validTransitions.includes('showQRCode')
              ? {
                  transition: 'showQRCode',
                  payload: {
                    qr: `https://open.yivi.app/-/session#${jsonSessionPtr}`,
                    showBackButton: prevTransition === 'chooseQR',
                  },
                }
              : false;
          } else {
            return validTransitions.includes('showYiviButton')
              ? {
                  transition: 'showYiviButton',
                  payload: {
                    mobile: this._getMobileUrl(this._mappings.sessionPtr),
                  },
                }
              : false;
          }
        });
      })
      .catch((err) => {
        if (this._options.debugging) console.error('Error received while updating pairing state:', err);
        this._handleNoSuccess('fail', err);
      });
  }

  private _pairingCompleted(): Promise<void> {
    const pairingOptions = this._options.state.pairing;
    if (!pairingOptions) return Promise.reject(new Error('Pairing options are not configured'));
    const delay = new Promise<void>((resolve) => {
      setTimeout(resolve, pairingOptions?.minCheckingDelay || 500);
    });
    const completedEndpoint = pairingOptions?.completedEndpoint || 'pairingcompleted';
    const url = this._options.state.url!(this._mappings, completedEndpoint);

    return fetch(url, {
      method: 'POST',
      headers: { Authorization: this._mappings.frontendRequest?.authorization || '' },
    })
      .finally(() => delay)
      .then(() => {
        this._stateMachine.selectTransition(({ validTransitions }) =>
          validTransitions.includes('appConnected') ? { transition: 'appConnected' } : false,
        );
      })
      .catch((err) => {
        if (this._options.debugging) console.error('Error received while completing pairing:', err);
        this._handleNoSuccess('fail', err);
      });
  }

  private _updateFrontendOptions(options: { pairingMethod: string }): Promise<void> {
    const maxProtocolVersion = this._mappings.frontendRequest?.maxProtocolVersion;
    if (!maxProtocolVersion || ProtocolVersion.below(maxProtocolVersion, ProtocolVersion.get('pairing'))) {
      return Promise.reject(new Error('Frontend options are not supported by the IRMA server'));
    }

    const frontendOptions = this._options.state.frontendOptions as {
      endpoint?: string;
      requestContext?: string;
    };

    const req: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._mappings.frontendRequest?.authorization || '',
      },
      body: JSON.stringify({
        '@context': frontendOptions?.requestContext || 'https://irma.app/ld/request/frontendoptions/v1',
        ...options,
      }),
    };
    const endpoint = frontendOptions?.endpoint || 'options';
    const url = this._options.state.url!(this._mappings, endpoint);
    return fetch(url, req)
      .then((r) => r.json() as Promise<FrontendOptions>)
      .then((newOptions) => {
        this._frontendOptions = newOptions;
      });
  }

  private _getMobileUrl(sessionPtr: SessionPtr): string {
    const json = JSON.stringify(sessionPtr);
    switch (this._userAgent) {
      case 'Android': {
        // Universal links are not stable in Android webviews and custom tabs, so always use intent links.
        const intent = `Intent;package=org.irmacard.cardemu;scheme=irma;l.timestamp=${Date.now()}`;
        return `intent://qr/json/${encodeURIComponent(json)}#${intent};end`;
      }
      case 'iOS': {
        return `https://open.yivi.app/-/session#${encodeURIComponent(json)}`;
      }
      default: {
        throw new Error('Device type is not supported.');
      }
    }
  }

  private _determineFlow(): Promise<SelectTransitionResult | false> {
    this._userAgent = userAgent();
    return this._stateMachine.selectTransition(({ validTransitions }) => {
      switch (this._userAgent) {
        case 'Android':
        case 'iOS':
          if (validTransitions.includes('prepareButton')) return { transition: 'prepareButton' };
          break;
        default:
          if (validTransitions.includes('prepareQRCode')) return { transition: 'prepareQRCode' };
          break;
      }
      return false;
    });
  }

  private _sanitizeOptions(options: YiviOptions): SanitizedOptions {
    const defaults = {
      state: {
        debugging: options.debugging,

        cancel: {
          url: (m: SessionMappings) => m.sessionPtr.u,
        },

        url: (m: SessionMappings, endpoint: string) => `${m.sessionPtr.u}/frontend/${endpoint}`,
        legacyUrl: (m: SessionMappings, endpoint: string) => `${m.sessionPtr.u}/${endpoint}`,

        serverSentEvents: {
          endpoint: 'statusevents',
          timeout: 2000,
        },

        polling: {
          endpoint: 'status',
          interval: 500,
          startState: 'INITIALIZED',
        },

        frontendOptions: {
          endpoint: 'options',
          requestContext: 'https://irma.app/ld/request/frontendoptions/v1',
        },

        pairing: {
          onlyEnableIf: (m: SessionMappings) => m.frontendRequest?.pairingHint,
          completedEndpoint: 'pairingcompleted',
          minCheckingDelay: 500,
          pairingMethod: 'pin',
        },
      },
    };

    return merge(defaults, options) as SanitizedOptions;
  }
}
