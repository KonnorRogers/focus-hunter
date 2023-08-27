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
    constructor(options: TrapOptions);
    /**
     * The element to implement focus trapping on.
     * @type {Element}
     */
    rootElement: Element;
    /**
     * The currently focused element when the focus trap is started.
     * @type {undefined | null | HTMLElement}
     */
    initialFocus: undefined | null | HTMLElement;
    /**
     * An array of possible focus traps. This helps protects against multiple traps being active at once.
     * @type {Set<Trap>}
     */
    trapStack: Set<Trap>;
    /**
     * An array of possibly focus trapped elements. This helps protects against multiple traps being active at once.
     * @type {Set<Element>}
     */
    rootElementStack: Set<Element>;
    /**
     * If `true` will do: `focus({ preventScroll: true })` to prevent scrolling when focusing.
     * @type {boolean}
     */
    preventScroll: boolean;
    /**
     * Which way to go in the array of tabbable elements
     * @type {'forward' | 'backward'}
     */
    tabDirection: 'forward' | 'backward';
    /**
     * The currently focused element
     * @type {HTMLElement | undefined | null}
     */
    currentFocus: HTMLElement | undefined | null;
    /**
     * Start the trap
     */
    start(): void;
    /**
     * End the trap
     */
    stop(): void;
    /**
     * Check the trapStack and make sure this is the current trap.
     * @returns {Boolean}
     */
    isActive(): boolean;
    /**
     * If we're the active trap, call .focus() at what we expect to be the proper focus to be.
     * this is for the off chance someone has managed to escape the focus.
     */
    resetFocus(): void;
    /**
     * @param {FocusEvent} _event
     */
    handleFocusIn: (_event: FocusEvent) => void;
    /**
     * Checks if the `startElement` is already focused. This is important if the modal already
     *   has an existing focused prior to the first tab key.
     * @param {ShadowRoot | Element} startElement
     */
    startElementAlreadyFocused(startElement: ShadowRoot | Element): boolean;
    /**
     * @param {KeyboardEvent} event
     */
    handleKeyDown: (event: KeyboardEvent) => void;
    adjustFocus(): void;
    /**
     * @param {KeyboardEvent} _event
     */
    handleKeyUp: (_event: KeyboardEvent) => void;
}
export type TrapOptions = {
    /**
     * - The element to implement focus trapping on.
     */
    rootElement: Element;
    /**
     * - Whether or not to prevent scrolling when focusing elements in the trap.
     */
    preventScroll: boolean;
};
