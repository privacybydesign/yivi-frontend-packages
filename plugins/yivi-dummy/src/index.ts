import merge from 'deepmerge';
import type { IStateMachine, YiviOptions, StateChangeEvent, SelectTransitionResult } from '@privacybydesign/yivi-core';

interface YiviDummyArgs {
  stateMachine: IStateMachine;
  options: YiviOptions;
}

interface DummyOptions extends YiviOptions {
  dummy: string;
  qrPayload: Record<string, unknown>;
  successPayload: Record<string, unknown>;
  pairingCode: string;
  timing: {
    start: number;
    prepare: number;
    scan: number;
    pairing: number;
    app: number;
  };
}

interface PairingCodePayload {
  enteredPairingCode: string;
}

export class YiviDummy {
  private _stateMachine: IStateMachine;
  private _options: DummyOptions;

  constructor({ stateMachine, options }: YiviDummyArgs) {
    this._stateMachine = stateMachine;
    this._options = this._sanitizeOptions(options);
  }

  stateChange({ newState, payload }: StateChangeEvent): void {
    switch (newState) {
      case 'Loading':
        this._startNewSession();
        break;
      case 'CheckingUserAgent':
        switch (this._options.dummy) {
          case 'mobile':
            this._doTransition('prepareButton');
            break;
          default:
            this._doTransition('prepareQRCode');
            break;
        }
        break;
      case 'PreparingQRCode':
        setTimeout(
          () =>
            this._doTransition('showQRCode', {
              qr: this._getUniversalLink(),
            }),
          this._options.timing.prepare,
        );
        break;
      case 'PreparingYiviButton':
        setTimeout(
          () =>
            this._doTransition('showYiviButton', {
              mobile: this._getMobileLink(),
            }),
          this._options.timing.prepare,
        );
        break;
      case 'ShowingQRCode':
        this._waitForScanning();
        break;
      case 'Pairing': {
        const pairingPayload = payload as PairingCodePayload;
        setTimeout(() => {
          if (this._options.pairingCode === pairingPayload.enteredPairingCode) {
            this._doTransition('appConnected');
          } else {
            this._doTransition('pairingRejected', payload);
          }
        }, this._options.timing.pairing);
        break;
      }
      case 'ContinueOn2ndDevice':
        this._waitForUserAction();
        break;
      case 'PreparingResult':
        setTimeout(() => this._doTransition('succeed', this._options.successPayload), this._options.timing.prepare);
        break;
    }
  }

  start(): Promise<SelectTransitionResult | false> {
    if (this._options.debugging) console.log(`Initializing fake Yivi flow`);

    return this._stateMachine.selectTransition(({ state }) => {
      if (state !== 'Uninitialized') throw new Error('State machine is already initialized by another plugin');
      switch (this._options.dummy) {
        case 'browser unsupported':
          return {
            transition: 'browserError',
            payload: 'Browser not supported, need magic feature',
          };
        default:
          return { transition: 'initialize', payload: { canRestart: true } };
      }
    });
  }

  private _startNewSession(): void {
    setTimeout(() => {
      switch (this._options.dummy) {
        case 'connection error':
          this._doTransition('fail', new Error('Dummy connection error'));
          break;
        default:
          this._doTransition('loaded', {
            sessionPtr: this._options.qrPayload,
          });
          break;
      }
    }, this._options.timing.start);
  }

  private _doTransition(transition: string, payload?: unknown): Promise<SelectTransitionResult | false> {
    return this._stateMachine.selectTransition(({ validTransitions }) => {
      if (validTransitions.includes(transition)) return { transition, payload };
      return false;
    });
  }

  private _waitForScanning(): void {
    setTimeout(() => {
      switch (this._options.dummy) {
        case 'pairing':
          this._doTransition('appPairing', {
            pairingCode: this._options.pairingCode,
          });
          break;
        case 'timeout':
          this._doTransition('timeout');
          break;
        default:
          this._doTransition('appConnected');
          break;
      }
    }, this._options.timing.scan);
  }

  private _waitForUserAction(): void {
    setTimeout(() => {
      switch (this._options.dummy) {
        case 'cancel':
          this._doTransition('cancel');
          break;
        default:
          this._doTransition('prepareResult');
          break;
      }
    }, this._options.timing.app);
  }

  private _getUniversalLink(): string {
    const sessionPtr = {
      ...this._options.qrPayload,
      continueOnSecondDevice: true,
    };
    return `https://open.yivi.app/-/session#${encodeURIComponent(JSON.stringify(sessionPtr))}`;
  }

  private _getMobileLink(): string {
    const sessionPtr = this._options.qrPayload;
    return `https://open.yivi.app/-/session#${encodeURIComponent(JSON.stringify(sessionPtr))}`;
  }

  private _sanitizeOptions(options: YiviOptions): DummyOptions {
    const defaults = {
      dummy: 'happy path',
      qrPayload: {
        u: 'https://example.com/irma/session/dummy',
        irmaqr: 'disclosing',
      },
      successPayload: {
        disclosed: 'Some attributes',
      },
      pairingCode: '1234',
      timing: {
        start: 1000,
        prepare: 1000,
        scan: 2000,
        pairing: 500,
        app: 2000,
      },
    };

    return merge(defaults, options) as DummyOptions;
  }
}
