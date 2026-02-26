import qrcode from 'qrcode-terminal';
import type {
  IStateMachine,
  YiviOptions,
  StateChangeEvent,
  YiviPlugin,
  YiviPluginConstructor,
  YiviPluginArgs,
} from '@privacybydesign/yivi-core';

type AskRetryFn = (message: string) => boolean;
type AskPairingCodeFn = () => string;

interface QRCodePayload {
  qr: string;
}

export default function createYiviConsole(
  askRetry: AskRetryFn,
  askPairingCode: AskPairingCodeFn,
): YiviPluginConstructor {
  return class YiviConsole implements YiviPlugin {
    private _stateMachine: IStateMachine;
    private _options: YiviOptions;

    constructor({ stateMachine, options }: YiviPluginArgs) {
      this._stateMachine = stateMachine;
      this._options = options;
    }

    stateChange({ newState, transition, payload, isFinal }: StateChangeEvent): void {
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
          this._renderQRcode(payload as QRCodePayload);
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

    private _askPairingCode(askedBefore: boolean): void {
      this._stateMachine.selectTransition(({ validTransitions, inEndState }) => {
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

    private _askRetry(message: string): void {
      this._stateMachine.selectTransition(({ validTransitions, inEndState }) => {
        if (inEndState) return false;
        const transition = validTransitions.includes('restart') && askRetry(message) ? 'restart' : 'abort';
        return { transition };
      });
    }

    private _renderQRcode(payload: QRCodePayload): void {
      qrcode.generate(payload.qr, { small: true });
    }
  };
}
