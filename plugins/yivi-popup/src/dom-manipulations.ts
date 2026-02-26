type CloseCallback = () => void;

export default class DOMManipulations {
  private _closeCallback: CloseCallback;
  private _element: HTMLElement;
  private _removeEventListeners: () => void;

  constructor(element: string | undefined, closeCallback: CloseCallback) {
    this._closeCallback = closeCallback;
    this._element = this._findElement(element);
    this._removeEventListeners = () => {};

    this._element.classList.add('yivi-web-popup');
    this._element.innerHTML = `<section class='yivi-web-form' id='yivi-popup-web-form'></section>`;
  }

  isPopupActive(): boolean {
    return this._element.classList.contains('yivi-web-popup-active');
  }

  openPopup(): void {
    // Initialize event handlers
    const clickEventListener = (e: Event) => this._clickHandler(e);
    const keyEventListener = (e: Event) => this._keyHandler(e as KeyboardEvent);
    this._element.addEventListener('click', clickEventListener);
    document.addEventListener('keyup', keyEventListener);
    this._removeEventListeners = () => {
      this._element.removeEventListener('click', clickEventListener);
      document.removeEventListener('keyup', keyEventListener);
    };

    this._element.classList.add('yivi-web-popup-active');
    // Explicitly focus popup to prevent that buttons in underlying website stay in focus.
    this._element.focus();
  }

  closePopup(): void {
    if (this.isPopupActive()) {
      this._removeEventListeners();
      this._element.classList.remove('yivi-web-popup-active');
    }
  }

  private _findElement(element: string | undefined): HTMLElement {
    if (element) {
      const found = document.querySelector<HTMLElement>(element);
      if (!found) console.error(`Could not find element ${element}`);
      return found!;
    }

    let createdElement = document.querySelector<HTMLElement>('div.yivi-web-popup');
    if (!createdElement) {
      createdElement = document.body.appendChild(document.createElement('div'));
    }
    createdElement.setAttribute('tabindex', '-1'); // Make popup focusable
    return createdElement;
  }

  private _clickHandler(e: Event): void {
    const target = e.target as HTMLElement;
    // Is this a click on the close button or the background overlay?
    if (target.matches('button.yivi-web-close')) this._cancel();
  }

  private _keyHandler(e: KeyboardEvent): void {
    // Did we press the Escape key?
    if (e.key === 'Escape') this._cancel();
  }

  private _cancel(): void {
    this.closePopup();
    this._closeCallback();
  }
}
