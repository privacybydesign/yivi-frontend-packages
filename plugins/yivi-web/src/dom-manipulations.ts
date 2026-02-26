import QRCode from 'qrcode';
import type { Translations } from './translations';
import type { StateChangeEvent, YiviState } from '@privacybydesign/yivi-core';

type TransitionCallback = (transition: string) => void;
type PairingCodeCallback = (code: string) => void;

interface DOMOptions {
  translations: Translations;
  showHelper?: boolean;
  showCloseButton?: boolean;
  fallbackDelay?: number;
}

interface QRCodePayload {
  qr: string;
  showBackButton?: boolean;
}

interface PairingCodePayload {
  enteredPairingCode: string;
}

interface InputWithPrevValue extends HTMLInputElement {
  prevValue?: string;
}

type StatePartialMethod = (state: StateChangeEvent) => string | false;

export default class DOMManipulations {
  private _element: Element;
  private _translations: Translations;
  private _showHelper: boolean;
  private _showCloseButton: boolean;
  private _fallbackDelay: number;
  private _eventHandlers: Record<string, EventListener>;
  private _clickCallback: TransitionCallback;
  private _pairingCodeCallback: PairingCodeCallback;

  constructor(
    element: Element | null,
    options: DOMOptions,
    clickCallback: TransitionCallback,
    pairingCodeCallback: PairingCodeCallback,
  ) {
    if (!element) {
      throw new Error('Element not found');
    }
    this._element = element;
    this._translations = options.translations;
    this._showHelper = options.showHelper || false;
    this._showCloseButton = options.showCloseButton || false;
    this._fallbackDelay = options.fallbackDelay || 1000;
    this._eventHandlers = {};

    this._clickCallback = clickCallback;
    this._pairingCodeCallback = pairingCodeCallback;

    this._renderInitialState();
    this._attachEventHandlers();
  }

  renderState(state: StateChangeEvent): void {
    const newPartial = this._stateToPartialMapping()[state.newState];
    if (!newPartial) throw new Error(`I don't know how to render '${state.newState}'`);
    this._renderPartial(newPartial, state);

    if (state.oldState === 'ShowingYiviButton' && !this._showHelper) {
      this._element.querySelector('.yivi-web-header')?.classList.remove('yivi-web-show-helper');
    }

    if (state.isFinal) {
      this._detachEventHandlers();
      // Make sure all restart buttons are hidden when being in a final state
      this._element.querySelectorAll<HTMLElement>('.yivi-web-restart-button').forEach((e) => (e.style.display = 'none'));
    }
  }

  setQRCode(qr: string): void {
    const canvas = this._element.querySelector<HTMLCanvasElement>('.yivi-web-qr-canvas');
    if (canvas) {
      QRCode.toCanvas(canvas, qr, {
        width: 230,
        margin: 1,
      });
    }
  }

  setButtonLink(link: string): void {
    this._element.querySelector('.yivi-web-button-link')?.setAttribute('href', link);
  }

  private _renderInitialState(): void {
    this._element.classList.add('yivi-web-form');
    this._element.innerHTML = this._yiviWebForm(this._stateUninitialized());
  }

  private _attachEventHandler(e: string, callback: EventListener): void {
    this._element.addEventListener(e, callback);
    this._eventHandlers[e] = callback;
  }

  private _attachEventHandlers(): void {
    // Polyfill for Element.matches to fix IE11
    if (!Element.prototype.matches) {
      Element.prototype.matches =
        (Element.prototype as unknown as { msMatchesSelector?: typeof Element.prototype.matches }).msMatchesSelector ||
        Element.prototype.webkitMatchesSelector;
    }

    this._attachEventHandler('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const isAndroid = /Android/i.test(window.navigator.userAgent);
      if (target.matches('[data-yivi-glue-transition]')) {
        this._clickCallback(target.getAttribute('data-yivi-glue-transition') || '');
      } else if (isAndroid && target.matches('.yivi-web-button-link *')) {
        (target as HTMLButtonElement).disabled = true;
        setTimeout(() => {
          // Only activate helper if the button to open the Yivi app is still present after the timeout.
          if (this._element.contains(target)) {
            this._element.querySelector('.yivi-web-header')?.classList.add('yivi-web-show-helper');
            (target as HTMLButtonElement).disabled = false;
          }
        }, this._fallbackDelay);
      } else if (target.matches('.yivi-web-pairing-code')) {
        const firstInvalidField = target.querySelector<HTMLInputElement>('input:invalid');
        if (firstInvalidField) firstInvalidField.focus();
      }
    });

    this._attachEventHandler('keydown', (e: Event) => {
      const target = e.target as InputWithPrevValue;
      const keyEvent = e as KeyboardEvent;
      if (target.matches('.yivi-web-pairing-code input')) {
        target.prevValue = target.value;
        if (keyEvent.key !== 'Enter') target.value = '';
      }
    });

    this._attachEventHandler('keyup', (e: Event) => {
      const target = e.target as InputWithPrevValue;
      const keyEvent = e as KeyboardEvent;
      if (target.matches('.yivi-web-pairing-code input')) {
        const prevField = target.previousElementSibling as HTMLInputElement | null;
        if (prevField && keyEvent.key === 'Backspace' && target.value === target.prevValue) {
          prevField.value = '';
          prevField.focus();
        }
      }
    });

    this._attachEventHandler('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.matches('.yivi-web-pairing-code input')) {
        const nextField = target.nextElementSibling as HTMLInputElement | null;
        if (!nextField || !target.checkValidity()) {
          target.form?.querySelector<HTMLInputElement>('input[type=submit]')?.click();
        } else {
          nextField.focus();
        }
      }
    });

    this._attachEventHandler('focusin', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.matches('.yivi-web-pairing-code input')) {
        if (!target.value) {
          e.preventDefault();
          target.form?.querySelector<HTMLInputElement>('input:invalid')?.focus();
        }
      }
    });

    this._attachEventHandler('submit', (e: Event) => {
      const target = e.target as HTMLFormElement;
      if (target.className === 'yivi-web-pairing-form') {
        e.preventDefault();
        const inputFields = target.querySelectorAll<HTMLInputElement>('.yivi-web-pairing-code input');
        const enteredCode = Array.from(inputFields)
          .map((f) => f.value)
          .join('');
        this._pairingCodeCallback(enteredCode);
      }
    });
  }

  private _detachEventHandlers(): void {
    Object.keys(this._eventHandlers).forEach((e) => {
      this._element.removeEventListener(e, this._eventHandlers[e]);
    });
    this._eventHandlers = {};
  }

  private _renderPartial(newPartial: StatePartialMethod, state: StateChangeEvent): void {
    const content = newPartial.call(this, state);

    if (content) {
      const centered = this._element.querySelector('.yivi-web-content .yivi-web-centered');
      if (centered) {
        centered.innerHTML = content;
      }
    }

    // Focus on first input field if any is present.
    const firstInputField = this._element.querySelector<HTMLInputElement>('input');
    if (firstInputField) firstInputField.focus();
  }

  private _stateToPartialMapping(): Record<YiviState, StatePartialMethod> {
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

  private _yiviWebForm(content: string): string {
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

  private _stateUninitialized(): string {
    return `
      <!-- State: Uninitialized -->
      <div class="yivi-web-loading-animation">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <p>${this._translations.loading}</p>
    `;
  }

  private _stateLoading(): string {
    return `
      <!-- State: Loading -->
      <div class="yivi-web-loading-animation">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <p>${this._translations.loading}</p>
    `;
  }

  private _stateShowingQRCode({ payload }: StateChangeEvent): string {
    const qrPayload = payload as QRCodePayload;
    return `
      <!-- State: ShowingQRCode -->
      <canvas class="yivi-web-qr-canvas"></canvas>
      ${
        qrPayload?.showBackButton
          ? `<p><a data-yivi-glue-transition="checkUserAgent">${this._translations.back}</a></p>`
          : ''
      }
    `;
  }

  private _stateShowingYiviButton(): string {
    return `
      <!-- State: ShowingButton -->
      <a class="yivi-web-button-link">
        <button class="yivi-web-button">${this._translations.button}</button>
      </a>
      <p><a data-yivi-glue-transition="chooseQR">${this._translations.qrCode}</a></p>
    `;
  }

  private _stateEnterPairingCode({ transition, payload }: StateChangeEvent): string | false {
    const form = this._element.querySelector<HTMLFormElement>('.yivi-web-pairing-form');
    const inputFields = this._element.querySelectorAll<HTMLInputElement>('.yivi-web-pairing-code input');
    const pairingPayload = payload as PairingCodePayload | undefined;

    switch (transition) {
      case 'pairingRejected': {
        if (form) {
          const textElement = form.firstElementChild as HTMLElement;
          textElement.innerHTML = this._translations.pairingFailed(pairingPayload?.enteredPairingCode || '');
          textElement.classList.add('yivi-web-error');
          form.reset();
          inputFields.forEach((f) => (f.disabled = false));
          const loadingAnimation = form.querySelector<HTMLElement>('.yivi-web-pairing-loading-animation');
          if (loadingAnimation) loadingAnimation.style.visibility = 'hidden';
        }
        return false;
      }
      case 'codeEntered':
        inputFields.forEach((f) => (f.disabled = true));
        if (form) {
          const loadingAnimation = form.querySelector<HTMLElement>('.yivi-web-pairing-loading-animation');
          if (loadingAnimation) loadingAnimation.style.visibility = 'visible';
        }
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

  private _stateContinueInYiviApp(): string {
    return `
      <!-- State: WaitingForUser -->
      <div class="yivi-web-waiting-for-user-animation"></div>
      <p>${this._translations.app}</p>
      <p><a data-yivi-glue-transition="cancel">${this._translations.cancel}</a></p>
    `;
  }

  private _stateCancelled(): string {
    return `
      <!-- State: Cancelled -->
      <div class="yivi-web-forbidden-animation"></div>
      <p>${this._translations.cancelled}</p>
      <p class="yivi-web-restart-button"><a data-yivi-glue-transition="restart">${this._translations.retry}</a></p>
    `;
  }

  private _stateTimedOut(): string {
    return `
      <!-- State: TimedOut -->
      <div class="yivi-web-clock-animation"></div>
      <p>${this._translations.timeout}</p>
      <p class="yivi-web-restart-button"><a data-yivi-glue-transition="restart">${this._translations.retry}</a></p>
    `;
  }

  private _stateError(): string {
    return `
      <!-- State: Error -->
      <div class="yivi-web-forbidden-animation"></div>
      <p>${this._translations.error}</p>
      <p class="yivi-web-restart-button"><a data-yivi-glue-transition="restart">${this._translations.retry}</a></p>
    `;
  }

  private _stateBrowserNotSupported(): string {
    return `
      <!-- State: BrowserNotSupported -->
      <div class="yivi-web-forbidden-animation"></div>
      <p>${this._translations.browser}</p>
    `;
  }

  private _stateSuccess(): string {
    return `
      <!-- State: Success -->
      <div class="yivi-web-checkmark-animation"></div>
      <p>${this._translations.success}</p>
    `;
  }

  private _stateAborted(): string {
    return `
      <!-- State: Aborted -->
    `;
  }
}
