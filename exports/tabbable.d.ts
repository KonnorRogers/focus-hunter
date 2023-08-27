/**
 * Determines if the specified element is tabbable using heuristics inspired by https://github.com/focus-trap/tabbable
 * @param {Element} el - The element to check if it's tabbable
 * @returns {boolean}
 */
export function isTabbable(el: Element): boolean;
/**
 * @param {Element | ShadowRoot} root
 * @return {Generator<Element>}
 */
export function getTabbableElements(root: Element | ShadowRoot): Generator<Element>;
