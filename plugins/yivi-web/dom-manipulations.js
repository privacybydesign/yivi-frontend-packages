const QRCode = require('qrcode');

module.exports = class DOMManipulations {
  constructor(element, options, clickCallback, pairingCodeCallback) {
    this._element = element;
    this._translations = options.translations;
    this._showHelper = options.showHelper;
    this._showCloseButton = options.showCloseButton;
    this._fallbackDelay = options.fallbackDelay;
    this._eventHandlers = {};

    this._clickCallback = clickCallback;
    this._pairingCodeCallback = pairingCodeCallback;

    this._renderInitialState();
    this._attachEventHandlers();
  }

  renderState(state) {
    const newPartial = this._stateToPartialMapping()[state.newState];
    if (!newPartial) throw new Error(`I don't know how to render '${state.newState}'`);
    this._renderPartial(newPartial, state);

    if (state.oldState === 'ShowingYiviButton' && !this._showHelper) {
      this._element.querySelector('.yivi-web-header').classList.remove('yivi-web-show-helper');
    }

    if (state.isFinal) {
      this._detachEventHandlers();
      // Make sure all restart buttons are hidden when being in a final state
      this._element.querySelectorAll('.yivi-web-restart-button').forEach((e) => (e.style.display = 'none'));
    }
  }

  setQRCode(qr) {
    QRCode.toCanvas(this._element.querySelector('.yivi-web-qr-canvas'), qr, {
      width: '230',
      margin: '1',
    });
  }

  setButtonLink(link) {
    this._element.querySelector('.yivi-web-button-link').setAttribute('href', link);
  }

  _renderInitialState() {
    this._element.classList.add('yivi-web-form');
    this._element.innerHTML = this._yiviWebForm(this._stateUninitialized());
  }

  _attachEventHandler(e, callback) {
    this._element.addEventListener(e, callback);
    this._eventHandlers[e] = callback;
  }

  _attachEventHandlers() {
    // Polyfill for Element.matches to fix IE11
    if (!Element.prototype.matches) {
      Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }

    this._attachEventHandler('click', (e) => {
      const isAndroid = /Android/i.test(window.navigator.userAgent);
      if (e.target.matches('[data-yivi-glue-transition]')) {
        this._clickCallback(e.target.getAttribute('data-yivi-glue-transition'));
      } else if (isAndroid && e.target.matches('.yivi-web-button-link *')) {
        e.target.disabled = true;
        setTimeout(() => {
          // Only activate helper if the button to open the Yivi app is still present after the timeout.
          if (this._element.contains(e.target)) {
            this._element.querySelector('.yivi-web-header').classList.add('yivi-web-show-helper');
            e.target.disabled = false;
          }
        }, this._fallbackDelay);
      } else if (e.target.matches('.yivi-web-pairing-code')) {
        const firstInvalidField = e.target.querySelector('input:invalid');
        if (firstInvalidField) firstInvalidField.focus();
      }
    });

    this._attachEventHandler('keydown', (e) => {
      if (e.target.matches('.yivi-web-pairing-code input')) {
        e.target.prevValue = e.target.value;
        if (e.key !== 'Enter') e.target.value = '';
      }
    });

    this._attachEventHandler('keyup', (e) => {
      if (e.target.matches('.yivi-web-pairing-code input')) {
        const prevField = e.target.previousElementSibling;
        if (prevField && e.key === 'Backspace' && e.target.value === e.target.prevValue) {
          prevField.value = '';
          prevField.focus();
        }
      }
    });

    this._attachEventHandler('input', (e) => {
      if (e.target.matches('.yivi-web-pairing-code input')) {
        const nextField = e.target.nextElementSibling;
        if (!nextField || !e.target.checkValidity()) {
          e.target.form.querySelector('input[type=submit]').click();
        } else {
          nextField.focus();
        }
      }
    });

    this._attachEventHandler('focusin', (e) => {
      if (e.target.matches('.yivi-web-pairing-code input')) {
        if (!e.target.value) {
          e.preventDefault();
          e.target.form.querySelector('input:invalid').focus();
        }
      }
    });

    this._attachEventHandler('submit', (e) => {
      if (e.target.className === 'yivi-web-pairing-form') {
        e.preventDefault();
        const inputFields = e.target.querySelectorAll('.yivi-web-pairing-code input');
        const enteredCode = Array.prototype.map.call(inputFields, (f) => f.value).join('');
        this._pairingCodeCallback(enteredCode);
      }
    });
  }

  _detachEventHandlers() {
    Object.keys(this._eventHandlers).forEach((e) => {
      this._element.removeEventListener(e, this._eventHandlers[e]);
    });
    this._eventHandlers = {};
  }

  _renderPartial(newPartial, state) {
    const content = newPartial.call(this, state);

    if (content) {
      this._element.querySelector('.yivi-web-content .yivi-web-centered').innerHTML = content;
    }

    // Focus on first input field if any is present.
    const firstInputField = this._element.querySelector('input');
    if (firstInputField) firstInputField.focus();
  }

  _stateToPartialMapping() {
    return {
      Uninitialized: this._stateUninitialized,
      Loading: this._stateLoading,
      CheckingUserAgent: this._stateLoading,
      PreparingQRCode: this._stateLoading,
      PreparingYiviButton: this._stateLoading,
      ShowingQRCode: this._stateShowingQRCode,
      EnterPairingCode: this._stateEnterPairingCode,
      Pairing: this._stateEnterPairingCode,
      ContinueOn2ndDevice: this._stateContinueInYiviApp,
      ShowingYiviButton: this._stateShowingYiviButton,
      ContinueInYiviApp: this._stateContinueInYiviApp,
      PreparingResult: this._stateLoading,
      Cancelled: this._stateCancelled,
      TimedOut: this._stateTimedOut,
      Error: this._stateError,
      BrowserNotSupported: this._stateBrowserNotSupported,
      Success: this._stateSuccess,
      Aborted: this._stateAborted,
    };
  }

  /** Container markup **/

  _yiviWebForm(content) {
    return `
      <div class="yivi-web-header ${this._showHelper ? 'yivi-web-show-helper' : ''}">
        <p>${this._translations.header}</p>
        <div class="yivi-web-helper">
          <p>${this._translations.helper}</p>
        </div>
        ${
          this._showCloseButton
            ? `
          <button class="yivi-web-close"></button>
        `
            : ''
        }
      </div>
      <div class="yivi-web-content">
        <div class="yivi-web-centered">
          ${content}
        </div>
      </div>
    `;
  }

  /** States markup **/

  _stateUninitialized() {
    return `
      <!-- State: Uninitialized -->
      <div class="yivi-web-loading-animation">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <p>${this._translations.loading}</p>
    `;
  }

  _stateLoading() {
    return `
      <!-- State: Loading -->
      <div class="yivi-web-loading-animation">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <p>${this._translations.loading}</p>
    `;
  }

  _stateShowingQRCode({ payload }) {
    return `
      <!-- State: ShowingQRCode -->
      <canvas class="yivi-web-qr-canvas"></canvas>
      ${
        payload.showBackButton
          ? `<p><a data-yivi-glue-transition="checkUserAgent">${this._translations.back}</a></p>`
          : ''
      }
    `;
  }

  _stateShowingYiviButton() {
    return `
      <!-- State: ShowingButton -->
      <a class="yivi-web-button-link">
        <button class="yivi-web-button">${this._translations.button}</button>
      </a>
      <p><a data-yivi-glue-transition="chooseQR">${this._translations.qrCode}</a></p>
    `;
  }

  _stateEnterPairingCode({ transition, payload }) {
    const form = this._element.querySelector('.yivi-web-pairing-form');
    const inputFields = this._element.querySelectorAll('.yivi-web-pairing-code input');
    switch (transition) {
      case 'pairingRejected': {
        const textElement = form.firstElementChild;
        textElement.innerHTML = this._translations.pairingFailed(payload.enteredPairingCode);
        textElement.classList.add('yivi-web-error');
        form.reset();
        inputFields.forEach((f) => (f.disabled = false));
        form.querySelector('.yivi-web-pairing-loading-animation').style.visibility = 'hidden';
        return false;
      }
      case 'codeEntered':
        inputFields.forEach((f) => (f.disabled = true));
        form.querySelector('.yivi-web-pairing-loading-animation').style.visibility = 'visible';
        return false;
      default:
        return `
          <!-- State: EnterPairingCode -->
          <form class="yivi-web-pairing-form">
            <p>${this._translations.pairing}</p>
            <div class="yivi-web-pairing-code">
              <input inputmode="numeric" pattern="\\d" maxlength="1" required />
              <input inputmode="numeric" pattern="\\d" maxlength="1" required />
              <input inputmode="numeric" pattern="\\d" maxlength="1" required />
              <input inputmode="numeric" pattern="\\d" maxlength="1" required />
            </div>
            <input type="submit" />
            <div class="yivi-web-pairing-loading-animation">
                <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
            </div>
            <p><a data-yivi-glue-transition="cancel">${this._translations.cancel}</a></p>
          </form>
        `;
    }
  }

  _stateContinueInYiviApp() {
    return `
      <!-- State: WaitingForUser -->
      <div class="yivi-web-waiting-for-user-animation"></div>
      <p>${this._translations.app}</p>
      <p><a data-yivi-glue-transition="cancel">${this._translations.cancel}</a></p>
    `;
  }

  _stateCancelled() {
    return `
      <!-- State: Cancelled -->
      <div class="yivi-web-forbidden-animation"></div>
      <p>${this._translations.cancelled}</p>
      <p class="yivi-web-restart-button"><a data-yivi-glue-transition="restart">${this._translations.retry}</a></p>
    `;
  }

  _stateTimedOut() {
    return `
      <!-- State: TimedOut -->
      <div class="yivi-web-clock-animation"></div>
      <p>${this._translations.timeout}</p>
      <p class="yivi-web-restart-button"><a data-yivi-glue-transition="restart">${this._translations.retry}</a></p>
    `;
  }

  _stateError() {
    return `
      <!-- State: Error -->
      <div class="yivi-web-forbidden-animation"></div>
      <p>${this._translations.error}</p>
      <p class="yivi-web-restart-button"><a data-yivi-glue-transition="restart">${this._translations.retry}</a></p>
    `;
  }

  _stateBrowserNotSupported() {
    return `
      <!-- State: BrowserNotSupported -->
      <div class="yivi-web-forbidden-animation"></div>
      <p>${this._translations.browser}</p>
    `;
  }

  _stateSuccess() {
    return `
      <!-- State: Success -->
      <div class="yivi-web-checkmark-animation"></div>
      <p>${this._translations.success}</p>
    `;
  }

  _stateAborted() {
    return `
      <!-- State: Aborted -->
    `;
  }
};
