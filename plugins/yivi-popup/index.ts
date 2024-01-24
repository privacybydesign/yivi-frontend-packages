import YiviWeb from '@privacybydesign/yivi-web';
import DOMManipulations from './dom-manipulations';
import merge from 'deepmerge';

export default class YiviPopup {
  _stateMachine: any;
  _options: any;
  _dom: DOMManipulations;
  _yiviWeb: YiviWeb;
  _popupClosedEarly: any;
  
  constructor({ stateMachine, options }) {
    this._stateMachine = stateMachine;
    this._options = this._sanitizeOptions(options);

    this._dom = new DOMManipulations(options.element, () =>
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

  stateChange(state) {
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

  close() {
    this._yiviWeb.close();
    if (!this._dom.isPopupActive()) return Promise.resolve();

    // Delay closing pop-up so that the user can see the animation.
    return new Promise<void>((resolve) => {
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

  _sanitizeOptions(options) {
    const defaults = {
      closePopupDelay: 2000,
    };

    return merge(defaults, options);
  }
};
