// @ts-check

/**
 * Use a generator so we can iterate and possibly break early.
 * @example
 *   // to operate like a regular array. This kinda nullifies generator benefits, but worth knowing if you need the whole array.
 *   const allActiveElements = [...activeElements()]
 *
 *   // Early return
 *   for (const activeElement of activeElements()) {
 *     if (<cond>) {
 *       break; // Break the loop, dont need to iterate over the whole array or store an array in memory!
 *     }
 *   }
 * @param {Element | null} [activeElement=document.activeElement] - Make sure to pass in a currently active element.
 * @returns {Generator<Element, undefined, Element | ShadowRoot>}
 */
function* activeElements(activeElement = document.activeElement) {
  if (activeElement === null || activeElement === undefined) return;

  yield activeElement;

  if ('shadowRoot' in activeElement && activeElement.shadowRoot && activeElement.shadowRoot.mode !== 'closed') {
    yield* activeElements(activeElement.shadowRoot.activeElement);
  }
}


/**
 * @param {Element | null} [activeElement=document.activeElement] - Make sure to pass in a currently active element.
 * @returns {Element | null}
 */
function deepestActiveElement (activeElement = document.activeElement) {
  const activeEls = activeElements(activeElement);

  let end = null;

  while (true) {
    const current = activeEls.next();

    if (current.done) {
      break
    }

    if (current.value != null) {
      end = current.value;
    }
  }

  return end;
}

// @ts-check
// It doesn't technically check visibility, it checks if the element has been rendered and can maybe possibly be tabbed to.
// This is a workaround for shadowroots not having an `offsetParent`
// https://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
// Previously, we used https://www.npmjs.com/package/composed-offset-position, but recursing up an entire
// node tree took up a lot of CPU cycles and made focus traps unusable in Chrome / Edge.
/**
 * @param {HTMLElement} elem
 * @returns {boolean}
 */
function isTakingUpSpace(elem) {
  return Boolean(elem.offsetParent || elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
}

/**
 * Determines if the specified element is tabbable using heuristics inspired by https://github.com/focus-trap/tabbable
 * @param {Element} el - The element to check if it's tabbable
 * @returns {boolean}
 */
function isTabbable(el) {
  const tag = el.tagName.toLowerCase();

  // Elements with a -1 tab index are not tabbable
  if (Number(el.getAttribute('tabindex')) <= -1) {
    return false;
  }

  // Elements with a disabled attribute are not tabbable
  if (el.hasAttribute('disabled')) {
    return false;
  }

  // Radios without a checked attribute are not tabbable
  if (tag === 'input' && el.getAttribute('type') === 'radio' && !el.hasAttribute('checked')) {
    return false;
  }

  // Elements that are hidden have no offsetParent and are not tabbable
  // offsetParent() is added because otherwise it misses elements in Safari
  if (
    !isTakingUpSpace(/** @type {HTMLElement} */ (el))
  )
  {
    return false;
  }

  // Anchor tags with no hrefs arent focusable.
  // This is focusable: <a href="">Stuff</a>
  // This is not: <a>Stuff</a>
  if (tag === "a" && !el.hasAttribute("href")) return false

  const computedStyle = window.getComputedStyle(el);

  // Elements without visibility are not tabbable
  if (computedStyle.visibility === 'hidden') {
    return false;
  }

  // Audio and video elements with the controls attribute are tabbable
  if ((tag === 'audio' || tag === 'video') && el.hasAttribute('controls')) {
    return true;
  }

  // Elements with a tabindex other than -1 are tabbable
  if (el.hasAttribute('tabindex')) {
    return true;
  }

  // Elements with a contenteditable attribute are tabbable
  if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') !== 'false') {
    return true;
  }

  // At this point, the following elements are considered tabbable
  return ['button', 'input', 'select', 'textarea', 'a', 'audio', 'video', 'summary', 'iframe', 'object', 'embed'].includes(tag);
}

/**
 * @param {Element | ShadowRoot} root
 * @return {Generator<Element>}
 */
function* getTabbableElements(root) {
  /**
   * We use this Set because we could have potentially duplicated nodes.
   * @type {Set<Element>}
   */
  const tabbableElements = new Set();

  // Collect all elements including the root
  for (const el of [...walk(root, root, tabbableElements)].sort(sortByTabIndex)) {
    yield el;
  }
}



// Is this worth having? Most sorts will always add increased overhead. And positive tabindexes shouldn't really be used.
// So is it worth being right? Or fast?
/**
 * @param {Element} a
 * @param {Element} b
 */
function sortByTabIndex(a, b) {
  // Make sure we sort by tabindex.
  const aTabindex = Number(a.getAttribute('tabindex')) || 0;
  const bTabindex = Number(b.getAttribute('tabindex')) || 0;
  return bTabindex - aTabindex;
}
/**
  * @param {Element | ShadowRoot} el
  * @param {Element | ShadowRoot} rootElement
  * @param {Set<Element>} tabbableElements
  * @return {Generator<Element>}
  */
function* walk(el, rootElement, tabbableElements) {
  if (el instanceof Element) {
    // if the element has "inert" we can just no-op it and all its children.
    if (el.hasAttribute('inert')) {
      return;
    }

    if (!tabbableElements.has(el) && isTabbable(el)) {
      tabbableElements.add(el);
      yield el;
    }


    // Walk slots
    if (el instanceof HTMLSlotElement && !rootHasSlotChildren(el, rootElement)) {
      for (const assignedEl of el.assignedElements({ flatten: true })) {
        yield* walk(assignedEl, rootElement, tabbableElements);
      }
    }

    // Walk  shadow roots
    if (el.shadowRoot !== null && el.shadowRoot.mode === 'open') {
      yield* walk(el.shadowRoot, rootElement, tabbableElements);
    }
  }

  for (const e of Array.from(el.children)) {
    yield* walk(e, rootElement, tabbableElements);
  }
}


/**
  * This looks funky. Basically a slots children will always be picked up *if* they're within the `root` element.
  * However, there is an edge case if the `root` is wrapped by another shadowDOM, it won't grab the children.
  * This fixes that fun edge case.
  * @param {HTMLSlotElement} slotElement
  * @param {Node} rootElement
  */
function rootHasSlotChildren (slotElement, rootElement) {
  return (/** @type {ShadowRoot | null} */ (slotElement.getRootNode({ composed: true })))?.host === rootElement;
}

// @ts-check

/**
 * {import("../types/focus-hunter.d.ts")}
 */

/**
 * @typedef {object} TrapOptions
 * @property {Element} rootElement - The element to implement focus trapping on.
 * @property {boolean} preventScroll - Whether or not to prevent scrolling when focusing elements in the trap.
 */

class Trap {
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
      };
    }

    /**
     * The currently focused element when the focus trap is started.
     * @type {undefined | null | HTMLElement}
     */
    this.initialFocus = undefined;

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
    this.preventScroll = Boolean(options.preventScroll === true);

    /**
     * Which way to go in the array of tabbable elements
     * @type {'forward' | 'backward'}
     */
    this.tabDirection = 'forward';


    /**
     * The currently focused element
     * @type {HTMLElement | undefined | null}
     */
    this.currentFocus = undefined;
  }

  /**
   * Start the trap
   */
  start() {
    if (this.trapStack.has(this) || this.rootElementStack.has(this.rootElement)) return

    this.trapStack.add(this);
    this.rootElementStack.add(this.rootElement);
    this.rootElement.dispatchEvent(new Event("focus-trap-start"));
    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    const currentlyFocusedEl = deepestActiveElement();
    this.initialFocus = /** @type {HTMLElement | null} */ (currentlyFocusedEl);
    this.currentFocus = /** @type {HTMLElement | null} */ (currentlyFocusedEl);
  }

  /**
   * End the trap
   */
  stop() {
    this.trapStack.delete(this);
    this.rootElementStack.delete(this.rootElement);
    this.currentFocus = undefined;

    this.rootElement.dispatchEvent(new Event("focus-trap-end"));
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);

    // Perhaps we want to return to initial focus?
    // this.initialFocus?.focus({ preventScroll: this.preventScroll })
    this.initialFocus = undefined;
  }

  /**
   * Check the trapStack and make sure this is the current trap.
   * @returns {Boolean}
   */
  isActive() {
    // The "active" modal is always the most recent one shown
    let end = null;

    const values = this.trapStack.values();

    while (true) {
      const next = values.next();

      if (next.done) {
        break
      }

      end = next.value;
    }

    return end === this
  }

  /**
   * If we're the active trap, call .focus() at what we expect to be the proper focus to be.
   * this is for the off chance someone has managed to escape the focus.
   */
  resetFocus() {
    if (!this.isActive()) return
    if (this.rootElement.matches(':focus-within')) return

    let target = null;

    const tabbableElements = getTabbableElements(/** @type {ShadowRoot | HTMLElement} */ (this.rootElement));

    if (this.tabDirection === "forward") {
      target = tabbableElements.next().value;
    } else if (this.tabDirection === "backward") {
      while (true) {
        const next = tabbableElements.next();

        if (next.done) {
          break
        }

        target = next.value;
      }
    }

    if (target && typeof target?.focus === 'function') {
      this.currentFocus = target;
      target.focus({ preventScroll: this.preventScroll });
    }
  }

  /**
   * @param {FocusEvent} _event
   */
  handleFocusIn = (_event) => {
    if (!this.isActive()) return
    this.resetFocus();
  };

  /**
   * @param {KeyboardEvent} event
   */
  handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    if (!this.isActive()) return

    if (event.shiftKey) {
      this.tabDirection = 'backward';
    } else {
      this.tabDirection = 'forward';
    }

    event.preventDefault();

    this.adjustFocus();
  };

  adjustFocus () {
    if (!this.isActive()) return

    const tabbableElements = [...getTabbableElements(this.rootElement)];

    const start = tabbableElements[0];

    const currentFocus = deepestActiveElement();
    let currentFocusIndex = tabbableElements.findIndex((el) => el === currentFocus);

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
    this.currentFocus?.focus({ preventScroll: this.preventScroll });
  }


  /**
   * @param {KeyboardEvent} _event
   */
  handleKeyUp = (_event) => {
    this.tabDirection = 'forward';
  };
}

/**
 * @param {Parameters<typeof String["raw"]>} args
 */
const html = (...args) => {
  const template = document.createElement("template");
  const str = String.raw(...args);
  template.innerHTML = str;
  return template.content.cloneNode(true)
};

class BaseElement extends HTMLElement {
  /**
   * @type {string[]}
   */
  static get observedAttributes () {
    return []
  }

  constructor () {
    super();

    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (this.shadowRoot) {
      this.shadowRoot.append(this.render());
    }
  }

  toEvent (callback) {
    const self = this;
    return { handleEvent(event) { return callback.call(self, event) }}
  }

  setEvent (callback) {
    if (this.events == null) {
      this.events = new WeakMap();
    }

    this.events.set(callback, this.toEvent(callback));
  }


  render () { return html`` }
}


if (!window.customElements.get("my-modal")) {
  window.customElements.define("my-modal", class extends BaseElement {
    static get observedAttributes () {
      return ["open"]
    }
    constructor () {
      super();

      this.open = false;
      this.trap = new Trap({ rootElement: this });
      this.setEvent(this.handleBackdropClick);
      this.setEvent(this.handleCloseButtonClick);
      this.setEvent(this.handleEscKey);

      this.addEventListener("click", this.events.get(this.handleBackdropClick));
      this.addEventListener("click", this.events.get(this.handleCloseButtonClick));
    }

    attributeChangedCallback (attrName, oldVal, newVal) {
      if (attrName === "open") {
        if (oldVal !== newVal) {
          this.open = newVal == null ? false : true;
        }
      }
    }

    get open () {
      return this.__open
    }

    set open (val) {
      this.__open = Boolean(val);


      this.setEvent(this.handleEscKey);

      if (val === true) {
        document.addEventListener("keydown", this.events.get(this.handleEscKey));
        this.trap?.start();
        this.setAttribute("open", "");
      } else {
        this.trap?.stop();
        document.removeEventListener("keydown", this.events.get(this.handleEscKey));
        this.removeAttribute("open");
      }
    }

    handleEscKey (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.open = false;
      }
    }

    show () {
      this.open = true;
    }

    hide () {
      this.open = false;
    }

    handleCloseButtonClick (event) {
      const closeButton = this.shadowRoot.querySelector("[part~='close-button']");
      if (event.composedPath().includes(closeButton)) {
        this.hide();
      }
    }

    handleBackdropClick (event) {
      const backdrop = this.shadowRoot.querySelector(".backdrop");
      if (event.composedPath().includes(backdrop)) {
        this.hide();
      }
    }

    render () {
      return html`
        <style>
          :host {
            display: none;
            position: fixed;
            inset: 0;
            height: 100vh;
            width: 100vw;
          }

          :host([open]) {
            display: block;
          }

          .backdrop {
            position: fixed;
            inset: 0;
            height: 100vh;
            width: 100vw;
            background-color: hsla(240 3.8% 46.1% / 33%);
            z-index: -1;
          }

          .base {
            position: fixed;
            display: grid;
            place-content: center;
            inset: 0;
            height: 100vh;
            width: 100vw;
          }

          .panel {
            display: grid;
            place-content: center;
            background-color: white;
            margin: auto;
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: minmax(0, auto) minmax(0, 1fr) minmax(0, auto);
            gap: 8px;
            padding: 8px;
            border-radius: 8px;
            box-shadow: 0 0 3px 3px rgba(0,0,0,0.05);
            min-height: 30vh;
            background-color: var(--trap-color, lightgreen);
          }

          .panel:focus {
            outline: 2px solid blue;
          }

          .header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, auto);
            padding: 8px;
          }

          .body {
            padding: 8px;
          }

          .footer {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            padding: 8px;
          }

          button:focus {
            outline: 3px solid blue;
          }
        </style>

        <div class="base">
          <div class="backdrop"></div>

          <div class="panel" role="dialog" tabindex="0">
            <div class="header">
              <slot name="label"></slot>

              <button part='close-button'>Close Button</button>
            </div>

            <div class="body">
              <slot></slot>
            </div>

            <div class="footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </div>
      `
    }
  });
}

if (!window.customElements.get("tab-test-1")) {
  window.customElements.define(
    'tab-test-1',
    class extends BaseElement {
      render () {
        this.innerHTML = `
          <div slot="label">
            <button id="focus-1">Focus 1</button>
          </div>

          <div>
            <!-- Focus 2 lives as the close-button from <my-modal> -->
            <button id="focus-3">Focus 3</button>
            <button id="focus-4">Focus 4</button>
            <input id="focus-5" value="Focus 5">
          </div>

          <div slot="footer">
            <div id="focus-6" tabindex="0">Focus 6 (div with tabindex=0) </div>
            <button tabindex="-1">No Focus (button tabindex=-1)</button>
          </div>
        `;
        return html`
          <style>
            :host {
              display: block;
            }
          </style>
          <my-modal>
              <slot name="label" slot="label"></slot>

              <slot></slot>

              <slot name="footer" slot="footer"></slot>
          </my-modal>`
      }
    }
  );
}

document.querySelector("#modal-toggle").addEventListener("click", () => document.querySelector("tab-test-1").shadowRoot.querySelector("my-modal").show());

      document.querySelectorAll(".js-activate-trap").forEach((el) => el.addEventListener("click", (evt) => {
        const rootElement = evt.currentTarget.nextElementSibling;
        if (!rootElement.trap) {
          rootElement.trap = new Trap({ rootElement });
        }
        rootElement.trap.start();
        rootElement.classList.add("trap--active");
        console.log(rootElement);
      }));

      document.querySelectorAll(".js-deactivate-trap").forEach((el) => el.addEventListener("click", (evt) => {
        const rootElement = evt.target.closest(".trap");
        rootElement.trap?.stop();
        rootElement.classList.remove("trap--active");
      }));
