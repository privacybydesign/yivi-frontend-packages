const ProtocolVersion = require('./protocol-version');

if (typeof fetch === 'undefined') require('isomorphic-fetch');

const StatusListener = require('./status-listener');
const merge = require('deepmerge');
const userAgent = require('./user-agent');

module.exports = class YiviStateClient {
  constructor({ stateMachine, options }) {
    this._stateMachine = stateMachine;
    this._options = this._sanitizeOptions(options);
    this._mappings = {};
  }

  stateChange({ newState, transition, payload }) {
    switch (newState) {
      case 'Loading':
        this._canRestart = transition === 'restart' || payload.canRestart;
        break;
      case 'CheckingUserAgent':
        if (transition === 'loaded') {
          this._mappings = payload;
          this._pairingEnabled = false;
          this._statusListener = new StatusListener(payload, this._options.state);
        } else {
          this._statusListener.close();
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
        this._startWatchingServerState(payload);
        break;
      case 'Pairing':
        if (this._frontendOptions.pairingCode === payload.enteredPairingCode) {
          this._pairingCompleted();
        } else {
          setTimeout(
            () =>
              this._stateMachine.selectTransition(({ validTransitions }) =>
                validTransitions.includes('pairingRejected') ? { transition: 'pairingRejected', payload } : false,
              ),
            this._options.state.pairing.minCheckingDelay,
          );
        }
        break;
      case 'PreparingResult':
      case 'Cancelled':
      case 'TimedOut':
      case 'Error':
        this._serverCloseSession();
        break;
    }
  }

  close() {
    this._serverCloseSession();
  }

  cancelSession(mappings) {
    if (!this._options.state.cancel) return Promise.resolve();
    // eslint-disable-next-line compat/compat
    return fetch(this._options.state.cancel.url(mappings), {
      method: 'DELETE',
    });
  }

  _startWatchingServerState() {
    try {
      this._statusListener.observe(
        (s) => this._serverStateChange(s),
        (e) => this._serverHandleError(e),
      );
    } catch (error) {
      if (this._options.debugging) console.error('Observing server state could not be started: ', error);

      this._handleNoSuccess('fail', error);
    }
  }

  _serverCloseSession() {
    if (this._statusListener) {
      if (this._statusListener.close()) {
        // If the server is still in an active state, we have to actively cancel.
        this.cancelSession(this._mappings).catch((error) => {
          if (this._options.debugging) console.error('Session could not be cancelled:', error);
        });
      }
    }
  }

  _serverHandleError(error) {
    if (this._options.debugging) console.error('Error while observing server state: ', error);

    this._handleNoSuccess('fail', error);
  }

  _serverStateChange(serverState) {
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
              this._statusListener.close();
              if (serverState.nextSession) {
                const newMappings = {
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
              this._statusListener.close();
              return this._noSuccessTransition(validTransitions, 'cancel');
            case 'TIMEOUT':
              // This is a known and understood error. We can be explicit to the user.
              this._statusListener.close();
              return this._noSuccessTransition(validTransitions, 'timeout');
            default:
              // Catch unknown errors and give generic error message. We never really
              // want to get here.
              if (this._options.debugging) console.error('Unknown state received from server:', serverState.status);

              this._statusListener.close();
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

  _handleNoSuccess(transition, payload) {
    return this._stateMachine.selectTransition(({ validTransitions }) =>
      this._noSuccessTransition(validTransitions, transition, payload),
    );
  }

  _noSuccessTransition(validTransitions, transition, payload) {
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

  _updatePairingState(prevTransition, continueOnSecondDevice) {
    return Promise.resolve()
      .then(() => {
        if (!this._options.state.pairing) return Promise.resolve();

        // onlyEnableIf may return 'undefined', so we force conversion to boolean by doing a double negation (!!).
        const shouldBeEnabled = continueOnSecondDevice && !!this._options.state.pairing.onlyEnableIf(this._mappings);

        // Skip the request when the pairing method is correctly set already.
        if (shouldBeEnabled === this._pairingEnabled) return Promise.resolve();

        this._pairingEnabled = shouldBeEnabled;

        // If pairing should be enabled, parse the pairing options struct.
        const options = shouldBeEnabled
          ? { pairingMethod: this._options.state.pairing.pairingMethod }
          : { pairingMethod: 'none' };
        return this._updateFrontendOptions(options);
      })
      .then(() =>
        this._stateMachine.selectTransition(({ validTransitions }) => {
          if (continueOnSecondDevice) {
            return validTransitions.includes('showQRCode')
              ? {
                  transition: 'showQRCode',
                  payload: {
                    qr: JSON.stringify(this._mappings.sessionPtr),
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
        }),
      )
      .catch((err) => {
        if (this._options.debugging) console.error('Error received while updating pairing state:', err);
        this._handleNoSuccess('fail', err);
      });
  }

  _pairingCompleted() {
    const delay = new Promise((resolve) => {
      setTimeout(resolve, this._options.state.pairing.minCheckingDelay);
    });
    const url = this._options.state.url(this._mappings, this._options.state.pairing.completedEndpoint);

    // eslint-disable-next-line compat/compat
    return fetch(url, {
      method: 'POST',
      headers: { Authorization: this._mappings.frontendRequest.authorization },
    })
      .finally(() => delay)
      .then(() =>
        this._stateMachine.selectTransition(({ validTransitions }) =>
          validTransitions.includes('appConnected') ? { transition: 'appConnected' } : false,
        ),
      )
      .catch((err) => {
        if (this._options.debugging) console.error('Error received while completing pairing:', err);
        this._handleNoSuccess('fail', err);
      });
  }

  _updateFrontendOptions(options) {
    if (ProtocolVersion.below(this._mappings.frontendRequest.maxProtocolVersion, ProtocolVersion.get('pairing'))) {
      return Promise.reject(new Error('Frontend options are not supported by the IRMA server'));
    }

    const req = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._mappings.frontendRequest.authorization,
      },
      body: JSON.stringify({
        '@context': this._options.state.frontendOptions.requestContext,
        ...options,
      }),
    };
    const url = this._options.state.url(this._mappings, this._options.state.frontendOptions.endpoint);
    // eslint-disable-next-line compat/compat
    return fetch(url, req)
      .then((r) => r.json())
      .then((newOptions) => (this._frontendOptions = newOptions));
  }

  _getMobileUrl(sessionPtr) {
    const json = JSON.stringify(sessionPtr);
    switch (this._userAgent) {
      case 'Android': {
        // Universal links are not stable in Android webviews and custom tabs, so always use intent links.
        const intent = `Intent;package=org.irmacard.cardemu;scheme=irma;l.timestamp=${Date.now()}`;
        return `intent://qr/json/${encodeURIComponent(json)}#${intent};end`;
      }
      case 'iOS': {
        return `https://irma.app/-/session#${encodeURIComponent(json)}`;
      }
      default: {
        throw new Error('Device type is not supported.');
      }
    }
  }

  _determineFlow() {
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

  _sanitizeOptions(options) {
    const defaults = {
      state: {
        debugging: options.debugging,

        cancel: {
          url: (m) => m.sessionPtr.u,
        },

        url: (m, endpoint) => `${m.sessionPtr.u}/frontend/${endpoint}`,
        legacyUrl: (m, endpoint) => `${m.sessionPtr.u}/${endpoint}`,

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
          onlyEnableIf: (m) => m.frontendRequest.pairingHint,
          completedEndpoint: 'pairingcompleted',
          minCheckingDelay: 500,
          pairingMethod: 'pin',
        },
      },
    };

    return merge(defaults, options);
  }
};
