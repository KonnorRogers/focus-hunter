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
    (/** @type {HTMLElement} */ (el)).offsetParent == null
    && offsetParent(/** @type {HTMLElement} */ (el)) == null
  )
  {
    return false;
  }

  // Anchor tags with no hrefs arent focusable.
  // This is focusable: <a href="">Stuff</a>
  // This is not: <a>Stuff</a>
  if (["area", "a"].includes(tag) && !el.hasAttribute("href")) return false

  const computedStyle = window.getComputedStyle(el)

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
export function* getTabbableElements(root) {
  /**
   * We use this Set because we could have potentially duplicated nodes.
   * @type {Set<Element>}
   */
  const tabbableElements = new Set()

  // Collect all elements including the root
  for (const el of [...walk(root, root, tabbableElements)].sort(sortByTabIndex)) {
    yield el
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
};

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
      tabbableElements.add(el)
      yield el
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
    yield* walk(e, rootElement, tabbableElements)
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
