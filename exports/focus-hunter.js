// @ts-check
import { activeElements, deepestActiveElement } from './active-elements.js';
import { getTabbableElements } from './tabbable.js';

/**
 * {import("../types/focus-hunter.d.ts")}
 */

/**
 * @typedef {object} TrapOptions
 * @property {Element} rootElement - The element to implement focus trapping on.
 * @property {boolean} preventScroll - Whether or not to prevent scrolling when focusing elements in the trap.
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
      window.focusHunter = {
        trapStack: new Set(),
        rootElementStack: new Set()
      }
    }

    /**
     * The currently focused element when the focus trap is started.
     * @type {undefined | null | HTMLElement}
     */
    this.initialFocus = undefined

    /**
     * An array of possible focus traps. This helps protects against multiple traps being active at once.
     * @type {Set<Trap>}
     */
    this.trapStack = window.focusHunter.trapStack;

    /**
     * An array of possibly focus trapped elements. This helps protects against multiple traps being active at once.
     * @type {Set<Element>}
     */
    this.rootElementStack = window.focusHunter.rootElementStack;

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
    if (this.trapStack.has(this) || this.rootElementStack.has(this.rootElement)) return

    this.trapStack.add(this);
    this.rootElementStack.add(this.rootElement)
    this.rootElement.dispatchEvent(new Event("focus-trap-start"))
    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    const currentlyFocusedEl = deepestActiveElement()
    this.initialFocus = /** @type {HTMLElement | null} */ (currentlyFocusedEl)
    this.currentFocus = /** @type {HTMLElement | null} */ (currentlyFocusedEl)
  }

  /**
   * End the trap
   */
  stop() {
    this.trapStack.delete(this);
    this.rootElementStack.delete(this.rootElement)
    this.currentFocus = undefined;

    this.rootElement.dispatchEvent(new Event("focus-trap-end"))
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);

    // Perhaps we want to return to initial focus?
    // this.initialFocus?.focus({ preventScroll: this.preventScroll })
    this.initialFocus = undefined
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

    this.adjustFocus()
  };

  adjustFocus () {
    const tabbableElements = [...getTabbableElements(this.rootElement)];

    const start = tabbableElements[0]

    let currentFocusIndex = tabbableElements.findIndex((el) => el === this.currentFocus)

    if (currentFocusIndex === -1) {
      this.currentFocus = (/** @type {HTMLElement} */ (start));
      this.currentFocus?.focus?.({ preventScroll: this.preventScroll });
      return;
    }

    const addition = this.tabDirection === 'forward' ? 1 : -1;

    if (currentFocusIndex + addition >= tabbableElements.length) {
      currentFocusIndex = 0;
    } else if (currentFocusIndex + addition < 0) {
      currentFocusIndex = tabbableElements.length - 1;
    } else {
      currentFocusIndex += addition;
    }

    this.currentFocus = /** @type {HTMLElement} */ (tabbableElements[currentFocusIndex]);
    this.currentFocus?.focus({ preventScroll: true });
  }


  /**
   * @param {KeyboardEvent} _event
   */
  handleKeyUp = (_event) => {
    this.tabDirection = 'forward';
  };
}
