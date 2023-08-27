import { Trap } from "../../exports/focus-hunter.js";

/**
 * @param {Parameters<typeof String["raw"]>} args
 */
const html = (...args) => {
  const template = document.createElement("template")
  const str = String.raw(...args)
  template.innerHTML = str
  return template.content.cloneNode(true)
}

class BaseElement extends HTMLElement {
  /**
   * @type {string[]}
   */
  static get observedAttributes () {
    return []
  }

  constructor () {
    super()

    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (this.shadowRoot) {
      this.shadowRoot.append(this.render());
    }
  }

  toEvent (callback) {
    const self = this
    return { handleEvent(event) { return callback.call(self, event) }}
  }

  setEvent (callback) {
    if (this.events == null) {
      this.events = new WeakMap()
    }

    this.events.set(callback, this.toEvent(callback))
  }


  render () { return html`` }
}


if (!window.customElements.get("my-modal")) {
  window.customElements.define("my-modal", class extends BaseElement {
    static get observedAttributes () {
      return ["open"]
    }
    constructor () {
      super()

      this.open = false
      this.trap = new Trap({ rootElement: this })
      this.setEvent(this.handleBackdropClick)

      this.addEventListener("click", this.events.get(this.handleBackdropClick))
    }

    attributeChangedCallback (attrName, oldVal, newVal) {
      if (attrName === "open") {
        if (oldVal !== newVal) {
          this.open = newVal == null ? false : true
        }
      }
    }

    get open () {
      return this.__open
    }

    set open (val) {
      this.__open = Boolean(val)

      if (val === true) {
        this.trap?.start()
        this.setAttribute("open", "")
      } else {
        this.trap?.stop()
        this.removeAttribute("open")
      }
    }

    show () {
      this.open = true
    }

    hide () {
      this.open = false
    }

    handleBackdropClick (event) {
      const backdrop = this.shadowRoot.querySelector(".backdrop")
      if (event.composedPath().includes(backdrop)) {
        this.hide()
      }
    }

    render () {
      return html`
        <style>
          :host {
            display: none;
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
  })
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
        `
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
  )
}
