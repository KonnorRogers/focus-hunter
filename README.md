![Bundle Size Badge](https://deno.bundlejs.com/?q=focus-hunter&badge)

## Purpose

Focus trapping made easy for things like Dialogs.

## Why?

Because focus trapping sucks. But its a necessary evil.

## Prior Art

- [Focus Trap](https://github.com/focus-trap/focus-trap) was attempted to be used, but was quite big (~5kb) and didn't handle multiple levels of shadow DOM. It is however a big inspiration for this library.

- This solution has been largely extracted from [Shoelace](https://shoelace.style)

## Differences from Focus Trap

Focus Hunter doesn't aim to do everything. It tries its best to keep a small minimal API and get out of your way.
This is reflected in bundle size.

`focus-hunter` is `~1.5kb` minified + gzipped.
`focus-trap` is `~5.5kb` minified + gzipped.

## Installation

```bash
npm install focus-hunter
```

## Adding a trap


```js
// Create a trap
const trap = new Trap({ rootElement: document.querySelector("my-trap") })

// Start the trap
trap.start()

// Stop the trap
trap.stop()
```

## All Options

```js
const trap = new Trap({
  rootElement,
  preventScroll, // Passed to `element.focus({ preventScroll })` for programmatically focused elements
})
```

## Multiple Traps

Focus Trap is allowed to have multiple traps. It keeps track of the stacks using `window.focusHunter.trapStack` which
is implemented via a `Set`.

There is also a stack of rootElements at `window.focusHunter.rootElementStack`

There 2 stacks are checked when you call `trap.start()` to ensure the rootElement isn't already being trapped and that
the trap isn't already active.

```js
window.focusHunter.trapStack // => Set
window.focusHunter.rootElementStack // => Set
```

## A note on iframes

While the focus trap can get to an `<iframe>` it cannot find elements within a cross origin iframe
so they are excluded from the focus trap.

## Differences from Shoelace

This library is largely me experimenting with generators. Beyond internal implementation details, here are some differences:

```diff
- // Elements with aria-disabled are not tabbable
- if (el.hasAttribute('aria-disabled') && el.getAttribute('aria-disabled') !== 'false') {
-   return false;
- }
```

The above was removed from `exports/tabbable.js` because `aria-disabled` elements are tabbable.


```diff
+  // Anchor tags with no hrefs arent focusable.
+  // This is focusable: <a href="">Stuff</a>
+  // This is not: <a>Stuff</a>
+  if ("a" === tag && el.getAttribute("href") == null) return false
```

While not a big deal, anchor elements without an `href` attribute were getting tripped up.
So we added a check to make sure it has an `href`.

```diff
+iframe, object, embed
```

The additional elements were found here: <https://github.com/gdkraus/accessible-modal-dialog/blob/d2a9c13de65028cda917279246346a277509fda0/modal-window.js#L38>

## Structure

`exports/` is publicly available files
`internal/` is...well...internal.

`exports` and `internal` shouldn't write their own `.d.ts` that are co-located.

`types/` is where you place your handwritten `.d.ts` files.
