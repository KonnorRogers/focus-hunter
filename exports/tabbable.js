// @ts-check
import { offsetParent } from 'composed-offset-position';

/**
 * Determines if the specified element is tabbable using heuristics inspired by https://github.com/focus-trap/tabbable
 * @param {Element} el - The element to check if it's tabbable
 * @returns {boolean}
 */
export function isTabbable(el) {
  const tag = el.tagName.toLowerCase();

  // Elements with a -1 tab index are not tabbable
  if (el.getAttribute('tabindex') === '-1') {
    return false;
  }

  // Elements with a disabled attribute are not tabbable
  if (el.hasAttribute('disabled')) {
    return false;
  }

  // Elements with aria-disabled are not tabbable
  if (el.hasAttribute('aria-disabled') && el.getAttribute('aria-disabled') !== 'false') {
    return false;
  }

  // Radios without a checked attribute are not tabbable
  if (tag === 'input' && el.getAttribute('type') === 'radio' && !el.hasAttribute('checked')) {
    return false;
  }

  // Elements that are hidden have no offsetParent and are not tabbable
  // offsetParent() is added because otherwise it misses elements in Safari
  if (
    (/** @type {HTMLElement} */ (el)).offsetParent == null
    && offsetParent(/** @type {HTMLElement} */ (el)) == null
  )
  {
    return false;
  }

  // Elements without visibility are not tabbable
  if (window.getComputedStyle(el).visibility === 'hidden') {
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
  return ['button', 'input', 'select', 'textarea', 'a', 'audio', 'video', 'summary'].includes(tag);
}

/**
 * Returns the first and last bounding elements that are tabbable. This is more performant than checking every single
 * element because it short-circuits after finding the first and last ones.
 * @param {HTMLElement | ShadowRoot} root
 */
export function getTabbableBoundary(root) {
  const tabbableElements = getTabbableElements(root);

  // Find the first and last tabbable elements
  let start = null;
  let end = null;

  while (true) {
    const current = tabbableElements.next()
    if (!start) {
      start = current.value
    }

    if (current.done) {
      end = current.value
      break
    }
  }

  console.log(start)
  return { start, end };
}

/**
 * @param {Element | ShadowRoot} root
 * @return {Generator<Element | ShadowRoot>}
 */
export function* getTabbableElements(root) {
  /**
   * We use this Set because we could have potentially duplicated nodes.
   * @type {Set<Element | ShadowRoot>}
   */
  const tabbableElements = new Set()

  /**
   * @param {Element | ShadowRoot} el
   * @return {Generator<Element | ShadowRoot>}
   */
  function* walk(el) {
    if (el instanceof Element) {
      // if the element has "inert" we can just no-op it and all its children.
      if (el.hasAttribute('inert')) {
        return;
      }

      if (!tabbableElements.has(el) && isTabbable(el)) {
        tabbableElements.add(el)
        yield el
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

      // Walk slots
      if (el instanceof HTMLSlotElement && !rootHasSlotChildren(el, root)) {
        for (const assignedEl of el.assignedElements({ flatten: true })) {
          yield* walk(assignedEl);
        }
      }

      // Walk  shadow roots
      if (el.shadowRoot !== null && el.shadowRoot.mode === 'open') {
        yield* walk(el.shadowRoot);
      }
    }

    for (const e of Array.from(el.children)) {
      yield* walk(e)
    }
  }

  // Collect all elements including the root
  yield* walk(root);
  // Is this worth having? Most sorts will always add increased overhead. And positive tabindexes shouldn't really be used.
  // So is it worth being right? Or fast?
  // return allElements.filter(isTabbable).sort((a, b) => {
  //   // Make sure we sort by tabindex.
  //   const aTabindex = Number(a.getAttribute('tabindex')) || 0;
  //   const bTabindex = Number(b.getAttribute('tabindex')) || 0;
  //   return bTabindex - aTabindex;
  // });
}
