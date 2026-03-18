import DOMManipulations from './dom-manipulations';
import merge from 'deepmerge';
import { en, nl, type Translations } from './translations';
import type { IStateMachine, YiviOptions, StateChangeEvent } from '@privacybydesign/yivi-core';

const translations: Record<string, Translations> = { nl, en };

interface YiviWebArgs {
  stateMachine: IStateMachine;
  options: YiviOptions;
}

interface YiviWebOptions extends YiviOptions {
  element: string;
  showHelper: boolean;
  fallbackDelay: number;
  translations: Translations;
  showCloseButton?: boolean;
}

interface QRCodePayload {
  qr: string;
}

interface ButtonPayload {
  mobile: string;
}

export default class YiviWeb {
  private _stateMachine: IStateMachine;
  private _options: YiviWebOptions;
  private _lastPayload: unknown;
  private _dom: DOMManipulations;
  private _removeVisibilityListener: () => void;

  constructor({ stateMachine, options }: YiviWebArgs) {
    this._stateMachine = stateMachine;
    this._options = this._sanitizeOptions(options);
    this._lastPayload = null;
    this._removeVisibilityListener = () => {};

    this._dom = new DOMManipulations(
      document.querySelector(this._options.element),
      this._options,
      (t) =>
        this._stateMachine.selectTransition(({ validTransitions }) =>
          validTransitions.includes(t) ? { transition: t, payload: this._lastPayload } : false,
        ),
      (enteredPairingCode) =>
        this._stateMachine.selectTransition(({ validTransitions }) =>
          validTransitions.includes('codeEntered')
            ? { transition: 'codeEntered', payload: { enteredPairingCode } }
            : false,
        ),
    );

    this._addVisibilityListener();
  }

  stateChange(state: StateChangeEvent): void {
    const { newState, payload } = state;
    this._lastPayload = payload;

    this._dom.renderState(state);
    switch (newState) {
      case 'ShowingQRCode':
        this._dom.setQRCode((payload as QRCodePayload).qr);
        break;

      case 'ShowingYiviButton':
        this._dom.setButtonLink((payload as ButtonPayload).mobile);
        break;
    }
  }

  close(): void {
    this._removeVisibilityListener();
  }

  private _sanitizeOptions(options: YiviOptions): YiviWebOptions {
    const language = (options.language as 'en' | 'nl') || 'nl';
    const defaults = {
      element: '#yivi-web-form',
      showHelper: false,
      minimal: false,
      fallbackDelay: 1000,
      translations: translations[language],
    };

    return merge(defaults, options) as YiviWebOptions;
  }

  private _addVisibilityListener(): void {
    const onVisibilityChange = (): void => {
      this._stateMachine.selectTransition(({ state, validTransitions }) => {
        if (state !== 'TimedOut' || document.hidden || !validTransitions.includes('restart')) return false;

        if (this._options.debugging) console.log('Restarting because document became visible');
        return { transition: 'restart' };
      });
    };

    const onFocusChange = (): void => {
      this._stateMachine.selectTransition(({ state, validTransitions }) => {
        if (state !== 'TimedOut' && !validTransitions.includes('restart')) return false;

        if (this._options.debugging) console.log('Restarting because window regained focus');
        return { transition: 'restart' };
      });
    };

    const onResize = (): void => {
      this._stateMachine.selectTransition(({ validTransitions }) => {
        if (validTransitions.includes('checkUserAgent'))
          return { transition: 'checkUserAgent', payload: this._lastPayload };
        return false;
      });
    };

    if (typeof document !== 'undefined' && document.addEventListener)
      document.addEventListener('visibilitychange', onVisibilityChange);

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('focus', onFocusChange);
      window.addEventListener('resize', onResize);
    }

    this._removeVisibilityListener = () => {
      if (typeof document !== 'undefined' && document.removeEventListener)
        document.removeEventListener('visibilitychange', onVisibilityChange);
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('focus', onFocusChange);
        window.removeEventListener('resize', onResize);
      }
    };
  }
}

// Re-export translations
export { en, nl, type Translations } from './translations';
export { default as DOMManipulations } from './dom-manipulations';
