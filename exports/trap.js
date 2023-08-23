import { activeElements } from './active-elements.js';
import { getTabbableElements } from './tabbable.js';

/**
 * @typedef {object} TrapOptions
 * @property {Element} element - The element to implement focus trapping on.
 * @property {Array<Element>} [activeModals=[]] - A Map of possibly active modals. Pass it in and we'll handle the rest.
 */

export default class Trap {
  /**
   * @param {TrapOptions} options
   */
  constructor(options) {
    if (options.rootElement == null) {
      throw Error("No `rootElement` provided for focus trapping")
    }

    /**
     * The element to implement focus trapping on.
     * @type {Element}
     */
    this.rootElement = options.rootElement;

    /**
     * An array of possibly activeModals. This helps protects against multiple traps
     * being active at once.
     * @type {Element[]}
     */
    this.activeModals = options.activeModals || [];

    /**
     * Which way to go in the array of tabbable elements
     * @type {'forward' | 'backward'}
     */
    this.tabDirection = 'forward'


    /**
     * The currently focused element
     * @type {HTMLElement | undefined | null}
     */
    this.currentFocus = undefined
  }

  /**
   * Start the trap
   */
  activate() {
    activeModals.push(this.rootElement);
    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * End the trap
   */
  deactivate() {
    activeModals = activeModals.filter(modal => modal !== this.rootElement);
    this.currentFocus = undefined;
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Check the activeModals and make sure this is the current trap.
   */
  isActive() {
    // The "active" modal is always the most recent one shown
    return activeModals[activeModals.length - 1] === this.rootElement;
  }

  /**
   * If we're the active trap, call .focus() at what we expect to be the proper focus.
   */
  checkFocus() {
    if (this.isActive()) {
      const tabbableElements = getTabbableElements(this.rootElement);
      if (!this.rootElement.matches(':focus-within')) {
        const start = tabbableElements[0];
        const end = tabbableElements[tabbableElements.length - 1];
        const target = this.tabDirection === 'forward' ? start : end;

        if (typeof target?.focus === 'function') {
          this.currentFocus = target;
          target.focus({ preventScroll: true });
        }
      }
    }
  }

  /**
   * @param {FocusEvent} _event
   */
  handleFocusIn = (_event) => {
    this.checkFocus();
  };

  get currentFocusIndex() {
    return getTabbableElements(this.rootElement).findIndex(el => el === this.currentFocus);
  }

  /**
   * Checks if the `startElement` is already focused. This is important if the modal already
   *   has an existing focused prior to the first tab key.
   * @param {Element} startElement
   */
  startElementAlreadyFocused(startElement) {
    for (const activeElement of activeElements()) {
      if (startElement === activeElement) {
        return true;
      }
    }

    return false;
  }

  /**
   * @param {KeyboardEvent} event
   */
  handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      this.tabDirection = 'backward';
    } else {
      this.tabDirection = 'forward';
    }

    event.preventDefault();

    const tabbableElements = getTabbableElements(this.rootElement);
    const start = tabbableElements[0];

    // Sometimes we programmatically focus the first element in a modal.
    // Lets make sure the start element isn't already focused.
    let focusIndex = this.startElementAlreadyFocused(start) ? 0 : this.currentFocusIndex;

    if (focusIndex === -1) {
      this.currentFocus = start;
      this.currentFocus.focus({ preventScroll: true });
      return;
    }

    const addition = this.tabDirection === 'forward' ? 1 : -1;

    if (focusIndex + addition >= tabbableElements.length) {
      focusIndex = 0;
    } else if (this.currentFocusIndex + addition < 0) {
      focusIndex = tabbableElements.length - 1;
    } else {
      focusIndex += addition;
    }

    this.currentFocus = tabbableElements[focusIndex];
    this.currentFocus?.focus({ preventScroll: true });

    setTimeout(() => this.checkFocus());
  };


  /**
   * @param {KeyboardEvent} _event
   */
  handleKeyUp = (_event) => {
    this.tabDirection = 'forward';
  };
}
