import YiviWeb from '@privacybydesign/yivi-web';
import DOMManipulations from './dom-manipulations';
import merge from 'deepmerge';
import type { IStateMachine, YiviOptions, StateChangeEvent } from '@privacybydesign/yivi-core';

interface YiviPopupArgs {
  stateMachine: IStateMachine;
  options: YiviOptions;
}

interface YiviPopupOptions extends YiviOptions {
  closePopupDelay: number;
}

export default class YiviPopup {
  private _stateMachine: IStateMachine;
  private _options: YiviPopupOptions;
  private _dom: DOMManipulations;
  private _yiviWeb: YiviWeb;
  private _popupClosedEarly?: () => void;

  constructor({ stateMachine, options }: YiviPopupArgs) {
    this._stateMachine = stateMachine;
    this._options = this._sanitizeOptions(options);

    this._dom = new DOMManipulations(options.element as string | undefined, () =>
      this._stateMachine.selectTransition(({ inEndState }) => {
        if (!inEndState) {
          return { transition: 'abort' };
        } else if (this._popupClosedEarly) {
          this._popupClosedEarly();
        }
        return false;
      }),
    );

    this._yiviWeb = new YiviWeb({
      stateMachine,
      options: {
        ...options,
        element: `#yivi-popup-web-form`,
        showCloseButton: true,
      },
    });
  }

  stateChange(state: StateChangeEvent): void {
    this._yiviWeb.stateChange(state);

    switch (state.newState) {
      case 'Loading':
        this._dom.openPopup();
        break;
      case 'Aborted':
        this._dom.closePopup();
        break;
    }
  }

  close(): Promise<void> | void {
    this._yiviWeb.close();
    if (!this._dom.isPopupActive()) return Promise.resolve();

    // Delay closing pop-up so that the user can see the animation.
    return new Promise((resolve) => {
      this._popupClosedEarly = resolve;
      window.setTimeout(() => {
        // Popup might already be closed in the meantime.
        if (this._dom.isPopupActive()) {
          this._dom.closePopup();
          resolve();
        }
      }, this._options.closePopupDelay);
    });
  }

  private _sanitizeOptions(options: YiviOptions): YiviPopupOptions {
    const defaults = {
      closePopupDelay: 2000,
    };

    return merge(defaults, options) as YiviPopupOptions;
  }
}

export { default as DOMManipulations } from './dom-manipulations';
