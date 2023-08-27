import type { Trap } from "../exports/focus-hunter.js"

export {}

declare global {
  interface Window {
    focusHunter: {
      trapStack: Set<Trap>
      rootElementStack: Set<Element>
    }
  }
}
