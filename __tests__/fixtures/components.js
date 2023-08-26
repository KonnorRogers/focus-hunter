const html = String.raw

class BaseElement extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = this.render();
  }
}

if (!window.customElements.get("my-modal")) {
  window.customElements.define("my-modal", class extends BaseElement {
    render () {
      return html`
        <style>
          :host {
            display: block;
          }

          .backdrop {
            position: fixed;
            height: 100vh;
            width: 100vw;
            background-color: rgba(0,0,0,0.2);
          }
          .base {
            display: grid;
            height: 100%;
            gap: 8px;
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: minmax(0, auto) minmax(0, 1fr) minmax(0, auto);
          }

          .header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, auto);
          }
        </style>

        <div class="backdrop">
          <div class="base" role="dialog" tabindex="0">
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
            <!-- Focus 2 lives as the close-button from <sl-drawer> -->
            <button id="focus-3">Focus 3</button>
            <button id="focus-4">Focus 4</button>
            <input id="focus-5" value="Focus 5">
          </div>

          <div slot="footer">
            <div id="focus-6" tabindex="0">Focus 6</div>
            <button tabindex="-1">No Focus</button>
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
