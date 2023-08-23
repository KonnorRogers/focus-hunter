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
 * @returns {Generator<Element, undefined, Element>}
 */
export function* activeElements(activeElement) {
  if (activeElement === null || activeElement === undefined) return;

  yield activeElement;

  if ('shadowRoot' in activeElement && activeElement.shadowRoot && activeElement.shadowRoot.mode !== 'closed') {
    yield* activeElements(activeElement.shadowRoot.activeElement);
  }
}
