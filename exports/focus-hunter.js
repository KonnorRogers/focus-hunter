// @ts-check
import { activeElements } from './active-elements.js';
import { getTabbableElements } from './tabbable.js';

/**
 * {import("../types/focus-hunter.d.ts")}
 */

/**
 * @typedef {object} TrapOptions
 * @property {Element} rootElement - The element to implement focus trapping on.
 * @property {boolean} preventScroll -
 * @property {Set<Trap>} [trapStack=[]] - A Map of possibly active modals. Pass it in and we'll handle the rest.
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

    if (!window.focusHunter) {
      window.focusHunter = {trapStack: new Set()}
    }

    /**
     * An array of possibly focus trapped elements. This helps protects against multiple traps being active at once.
     * @type {Set<Trap>}
     */
    this.trapStack = window.focusHunter.trapStack;

    /**
     * If `true` will do: `focus({ preventScroll: true })` to prevent scrolling when focusing.
     * @type {boolean}
     */
    this.preventScroll = Boolean(options.preventScroll === true)

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
    if (this.trapStack.has(this)) return

    this.trapStack.add(this);
    this.rootElement.dispatchEvent(new Event("focus-trap-start"))
    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * End the trap
   */
  stop() {
    this.trapStack.delete(this);
    this.currentFocus = undefined;
    this.rootElement.dispatchEvent(new Event("focus-trap-end"))
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Check the trapStack and make sure this is the current trap.
   * @returns {Boolean}
   */
  isActive() {
    // The "active" modal is always the most recent one shown
    let end = null

    const values = this.trapStack.values()

    while (true) {
      const next = values.next()

      if (next.done) {
        break
      }

      end = next.value
    }

    return end === this
  }

  /**
   * If we're the active trap, call .focus() at what we expect to be the proper focus to be.
   * this is for the off chance someone has managed to escape the focus.
   */
  resetFocus() {
    if (this.isActive()) {
      if (!this.rootElement.matches(':focus-within')) {
        let target = null

        const tabbableElements = getTabbableElements(/** @type {ShadowRoot | HTMLElement} */ (this.rootElement))

        if (this.tabDirection === "forward") {
          target = tabbableElements.next().value
        } else if (this.tabDirection === "backward") {
          while (true) {
            const next = tabbableElements.next()

            if (next.done) {
              break
            }

            target = next.value
          }
        }

        if (target && typeof target?.focus === 'function') {
          this.currentFocus = target;
          target.focus({ preventScroll: false });
        }
      }
    }
  }

  /**
   * @param {FocusEvent} _event
   */
  handleFocusIn = (_event) => {
    this.resetFocus();
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
      // @TODO: this does `preventScroll` in Shoelace, and honestly, I'm not sure if that's right.
      this.currentFocus?.focus?.({ preventScroll: this.preventScroll });
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
