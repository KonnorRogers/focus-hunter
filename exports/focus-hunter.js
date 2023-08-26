// @ts-check
import { activeElements } from './active-elements.js';
import { getTabbableElements, getTabbableBoundary } from './tabbable.js';

/**
 * @typedef {object} TrapOptions
 * @property {Element} rootElement - The element to implement focus trapping on.
 * @property {Array<Element>} [trapStack=[]] - A Map of possibly active modals. Pass it in and we'll handle the rest.
 */

export class Trap {
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
     * An array of possibly focus trapped elements. This helps protects against multiple traps being active at once.
     * @type {Element[]}
     */
    this.trapStack = options.trapStack || [];

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
  start() {
    this.trapStack.push(this.rootElement);
    this.rootElement.dispatchEvent(new Event("focus-trap-start"))
    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * End the trap
   */
  end() {
    this.trapStack = this.trapStack.filter(modal => modal !== this.rootElement);
    this.currentFocus = undefined;
    this.rootElement.dispatchEvent(new Event("focus-trap-end"))
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Check the trapStack and make sure this is the current trap.
   */
  isActive() {
    // The "active" modal is always the most recent one shown
    return this.trapStack[this.trapStack.length - 1] === this.rootElement;
  }

  /**
   * If we're the active trap, call .focus() at what we expect to be the proper focus.
   */
  checkFocus() {
    if (this.isActive()) {
      if (!this.rootElement.matches(':focus-within')) {
        const {start,end} = getTabbableBoundary(/** @type {ShadowRoot | HTMLElement} */ (this.rootElement))
        const target = this.tabDirection === 'forward' ? start : end;

        if (typeof target?.focus === 'function') {
          this.currentFocus = target;
          target.focus({ preventScroll: true });
          // https://developer.mozilla.org/en-US/docs/Web/API/FocusEvent#order_of_events
          // focusout: sent before element A loses focus.
          // focusin: sent before element B receives focus.
          // blur: sent after element A loses focus.
          // focus: sent after element B receives focus.
          //
          // previouslyFocusedElement.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))
          // currentlyFocusedElement.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
          // previouslyFocusedElement.dispatchEvent(new FocusEvent("blur", { bubbles: false }))
          // currentlyFocusedElement.dispatchEvent(new FocusEvent("focus", { bubbles: false }))
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

  /**
   * Checks if the `startElement` is already focused. This is important if the modal already
   *   has an existing focused prior to the first tab key.
   * @param {ShadowRoot | Element} startElement
   */
  startElementAlreadyFocused(startElement) {
    const els = activeElements()

    while (true) {
      const next = els.next()

      const activeElement = next.value

      if (next.done) return false

      if (startElement === activeElement) {
        return true;
      }
    }
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

    const tabbableElements = [...getTabbableElements(this.rootElement)];

    const start = tabbableElements[0]

    const currentFocusIndex = tabbableElements.findIndex((el) => el === this.currentFocus)

    // Sometimes we programmatically focus the first element in a modal.
    // Lets make sure the start element isn't already focused.
    let focusIndex = this.startElementAlreadyFocused(start) ? 0 : currentFocusIndex;

    if (focusIndex === -1) {
      this.currentFocus = (/** @type {HTMLElement} */ (start));
      this.currentFocus?.focus?.({ preventScroll: true });
      return;
    }

    const addition = this.tabDirection === 'forward' ? 1 : -1;

    if (focusIndex + addition >= tabbableElements.length) {
      focusIndex = 0;
    } else if (currentFocusIndex + addition < 0) {
      focusIndex = tabbableElements.length - 1;
    } else {
      focusIndex += addition;
    }

    this.currentFocus = /** @type {HTMLElement} */ (tabbableElements[focusIndex]);
    this.currentFocus?.focus({ preventScroll: true });
  };


  /**
   * @param {KeyboardEvent} _event
   */
  handleKeyUp = (_event) => {
    this.tabDirection = 'forward';
  };
}
