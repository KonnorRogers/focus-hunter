import { html, expect, fixture, aTimeout } from '@open-wc/testing';

import { Trap } from '../exports/focus-hunter.js'
import { activeElements, deepestActiveElement } from '../exports/active-elements.js';
import { sendKeys } from '@web/test-runner-commands';
import "./fixtures/components.js"

/**
 * @param {string[]} keys - Keys to hold down
 * @param {() => Promise<void>} callback
 */
async function holdKeys(keys, callback) {
  await Promise.allSettled(keys.map(async (key) => await sendKeys({ down: key })))
  await callback();
  await Promise.allSettled(keys.map(async (key) => await sendKeys({ up: key })))
}

async function holdShiftKey(callback) {
  await holdKeys(["Shift"], callback)
}

const tabKey =
  navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('HeadlessChrome') ? 'Alt+Tab' : 'Tab';

// Simple helper to turn the activeElements generator into an array
function activeElementsArray() {
  return [...activeElements()];
}

setup(() => {
  if (!window.focusHunter) return

  for (const trap of window.focusHunter.trapStack.values()) {
    trap.stop()
  }
})

test("Should not attempt to tab non-visible / non-focusable elements", async () => {
  const el = await fixture(html`
    <button tabindex="-1">Button</button>
    <a></a>
    <button style="display: none;">Button</button>
    <button style="visibility: hidden;">Button</button>
    <button style="opacity: 0;">Button</button>
  `)

  new Trap({ rootElement: el }).start()

  // Tabs should just go to the body.
  await sendKeys({ press: tabKey });
  expect(deepestActiveElement()).to.equal(document.body)

  await sendKeys({ press: tabKey });
  expect(deepestActiveElement()).to.equal(document.body)

  await holdShiftKey(async () => await sendKeys({ press: tabKey }))
  expect(deepestActiveElement()).to.equal(document.body)
})

test("Should account for the initially focused element", async () => {
  const el = await fixture(html`
    <div>
      <button>Button</button>
      <a href="/">Link</a>
      <area href="/">Area</area>
      <button>Button 2</button>
    </div>
  `)

  const trap = new Trap({ rootElement: el })

  el.querySelector("button").focus()

  expect(deepestActiveElement()).to.equal(el.querySelector("button"))

  // Delay the start so we can test initial focus
  trap.start()
  await sendKeys({ press: tabKey })
  expect(deepestActiveElement()).to.equal(el.querySelector("a"))

  await sendKeys({ press: tabKey });
  expect(deepestActiveElement()).to.equal(el.querySelectorAll("button")[1])

  await sendKeys({ press: tabKey });
  expect(deepestActiveElement()).to.equal(el.querySelector("button"))

  await holdShiftKey(async () => await sendKeys({ press: tabKey }))
  expect(deepestActiveElement()).to.equal(el.querySelectorAll("button")[1])
})

test("Should check the 'rootElementStack' and 'trapStack' prior to adding / removing traps", async () => {
  const rootElement = await fixture(html`<button>button</button>`)

  const trap = new Trap({ rootElement })

  const { trapStack, rootElementStack } = window.focusHunter

  expect(trapStack).to.be.instanceof(Set)
  expect(rootElementStack).to.be.instanceof(Set)

  expect(trapStack.size).to.equal(0)
  expect(rootElementStack.size).to.equal(0)

  expect(trap.isActive()).to.equal(false)

  trap.start()

  expect(trap.isActive()).to.equal(true)

  expect(trapStack.size).to.equal(1)
  expect(rootElementStack.size).to.equal(1)

  expect([...trapStack.values()][0]).to.equal(trap)
  expect([...rootElementStack.values()][0]).to.equal(rootElement)

  trap.stop()

  expect(trapStack.size).to.equal(0)
  expect(rootElementStack.size).to.equal(0)

  expect(trap.isActive()).to.equal(false)
})

test("Cannot be two different traps on the same rootElement", async () => {
  const rootElement = await fixture(html`<button>button</button>`)

  const trap1 = new Trap({ rootElement })
  const trap2 = new Trap({ rootElement })

  const { trapStack, rootElementStack } = window.focusHunter

  // Both inactive
  expect(trap1.isActive()).to.equal(false)
  expect(trap2.isActive()).to.equal(false)

  trap1.start()

  // Only trap 1 active
  expect(trap1.isActive()).to.equal(true)
  expect(trap2.isActive()).to.equal(false)
  expect(trapStack.size).to.equal(1)
  expect(rootElementStack.size).to.equal(1)

  trap2.start()

  // Try to start trap2 after trap1 has already been started on the same rootElement
  expect(trap1.isActive()).to.equal(true)
  expect(trap2.isActive()).to.equal(false)
  expect(trapStack.size).to.equal(1)
  expect(rootElementStack.size).to.equal(1)

  // Stop trap 1, now lets activate trap 2
  trap1.stop()
  trap2.start()

  expect(trap1.isActive()).to.equal(false)
  expect(trap2.isActive()).to.equal(true)
  expect(trapStack.size).to.equal(1)
  expect(rootElementStack.size).to.equal(1)
})


test("Activating multiple traps", async () => {
  const el1 = await fixture(html`
    <div>
      <button>Button</button>
      <a href="/">Link</a>
      <area href="/">Area</area>
      <button>Button 2</button>
    </div>
  `)

  const el2 = await fixture(html`
    <div>
      <button>Button</button>
      <a href="/">Link</a>
      <area href="/">Area</area>
      <button>Button 2</button>
    </div>
  `)

  const trap1 = new Trap({ rootElement: el1 })
  const trap2 = new Trap({ rootElement: el2 })

  // Get focus ball rolling
  el1.querySelector("button").focus()

  trap1.start()
  trap2.start()

  await sendKeys({ press: tabKey })
  expect(deepestActiveElement()).to.equal(el2.querySelector("button"))

  await sendKeys({ press: tabKey })
  expect(deepestActiveElement()).to.equal(el2.querySelector("a"))

  await sendKeys({ press: tabKey });
  expect(deepestActiveElement()).to.equal(el2.querySelectorAll("button")[1])

  await sendKeys({ press: tabKey });
  expect(deepestActiveElement()).to.equal(el2.querySelector("button"))

  trap2.stop()

  trap1.initialFocus.focus()
  expect(deepestActiveElement()).to.equal(el1.querySelector("button"))

  await sendKeys({ press: tabKey })
  expect(deepestActiveElement()).to.equal(el1.querySelector("a"))

  await sendKeys({ press: tabKey });
  expect(deepestActiveElement()).to.equal(el1.querySelectorAll("button")[1])

  await sendKeys({ press: tabKey });
  expect(deepestActiveElement()).to.equal(el1.querySelector("button"))

})

test('Should allow tabbing to slotted elements via composed shadow doms', async () => {
  const el = await fixture(html`
    <tab-test-1>
      <div slot="label">
        <button id="focus-1">Focus 1</button>
      </div>

      <div>
        <!-- Focus 2 lives as the close-button from <sl-modal> -->
        <button id="focus-3">Focus 3</button>
        <button id="focus-4">Focus 4</button>
        <input id="focus-5" value="Focus 5">
      </div>

      <div slot="footer">
        <div id="focus-6" tabindex="0">Focus 6</div>
        <button tabindex="-1">No Focus</button>
      </div>
    </tab-test-1>
  `);

  const modal = el.shadowRoot?.querySelector('my-modal');

  const focusZero = modal.shadowRoot?.querySelector("[role='dialog']");

  if (focusZero === null || focusZero === undefined) throw Error('Could not find dialog panel inside <my-modal>');

  const focusOne = el.querySelector('#focus-1');
  const focusTwo = modal.shadowRoot?.querySelector("[part~='close-button']");

  if (focusTwo === null || focusTwo === undefined) throw Error('Could not find close button inside <sl-modal>');

  const focusThree = el.querySelector('#focus-3');
  const focusFour = el.querySelector('#focus-4');
  const focusFive = el.querySelector('#focus-5');
  const focusSix = el.querySelector('#focus-6');

  // Open the modal, which will activate the trap, then test.
  modal.show()
  await aTimeout(1)

  // When we open modal, we should be focused on the panel to start.
  await sendKeys({ press: tabKey });
  expect(activeElementsArray()).to.include(focusZero);
  expect(deepestActiveElement()).to.equal(focusZero)

  await sendKeys({ press: tabKey });
  expect(activeElementsArray()).to.include(focusOne);

  // When we hit the <Tab> key we should go to the "close button" on the modal
  await sendKeys({ press: tabKey });
  expect(activeElementsArray()).to.include(focusTwo);

  await sendKeys({ press: tabKey });
  expect(activeElementsArray()).to.include(focusThree);

  await sendKeys({ press: tabKey });
  expect(activeElementsArray()).to.include(focusFour);

  await sendKeys({ press: tabKey });
  expect(activeElementsArray()).to.include(focusFive);

  await sendKeys({ press: tabKey });
  expect(activeElementsArray()).to.include(focusSix);

  // Now we should loop back to #panel
  await sendKeys({ press: tabKey });
  expect(activeElementsArray()).to.include(focusZero);

  // Now we should loop back to #panel
  await sendKeys({ press: tabKey });
  expect(activeElementsArray()).to.include(focusOne);

  // Let's reset and try from starting point 0 and go backwards.
  await holdShiftKey(async () => await sendKeys({ press: tabKey }));
  expect(activeElementsArray()).to.include(focusZero);

  await holdShiftKey(async () => await sendKeys({ press: tabKey }));
  expect(activeElementsArray()).to.include(focusSix);

  await holdShiftKey(async () => await sendKeys({ press: tabKey }));
  expect(activeElementsArray()).to.include(focusFive);

  await holdShiftKey(async () => await sendKeys({ press: tabKey }));
  expect(activeElementsArray()).to.include(focusFour);

  await holdShiftKey(async () => await sendKeys({ press: tabKey }));
  expect(activeElementsArray()).to.include(focusThree);

  await holdShiftKey(async () => await sendKeys({ press: tabKey }));
  expect(activeElementsArray()).to.include(focusTwo);

  await holdShiftKey(async () => await sendKeys({ press: tabKey }));
  expect(activeElementsArray()).to.include(focusOne);

  await holdShiftKey(async () => await sendKeys({ press: tabKey }));
  expect(activeElementsArray()).to.include(focusZero);

  await holdShiftKey(async () => await sendKeys({ press: tabKey }));
  expect(activeElementsArray()).to.include(focusSix);
});


test('Should adjust current focus based on external focus events', async () => {
  const el = await fixture(html`
    <tab-test-1>
      <div slot="label">
        <button id="focus-1">Focus 1</button>
      </div>

      <div>
        <!-- Focus 2 lives as the close-button from <sl-modal> -->
        <button id="focus-3">Focus 3</button>
        <button id="focus-4">Focus 4</button>
        <input id="focus-5" value="Focus 5">
      </div>

      <div slot="footer">
        <div id="focus-6" tabindex="0">Focus 6</div>
        <button tabindex="-1">No Focus</button>
      </div>
    </tab-test-1>
  `);

  const modal = el.shadowRoot?.querySelector('my-modal');

  // const focusZero = modal.shadowRoot?.querySelector("[role='dialog']");
  //
  // if (focusZero === null || focusZero === undefined) throw Error('Could not find dialog panel inside <my-modal>');
  // const focusOne = el.querySelector('#focus-1');
  // const focusTwo = modal.shadowRoot?.querySelector("[part~='close-button']");

  // if (focusTwo === null || focusTwo === undefined) throw Error('Could not find close button inside <sl-modal>');

  // const focusThree = el.querySelector('#focus-3');
  const focusFour = el.querySelector('#focus-4');
  const focusFive = el.querySelector('#focus-5');
  const focusSix = el.querySelector('#focus-6');

  modal.show()
  await aTimeout(1)

  focusFive.focus()

  await sendKeys({ press: tabKey });
  expect(activeElementsArray()).to.include(focusSix);
  expect(deepestActiveElement()).to.equal(focusSix)

  focusFive.focus()

  await holdShiftKey(async () => await sendKeys({ press: tabKey }));
  expect(activeElementsArray()).to.include(focusFour);
  expect(deepestActiveElement()).to.equal(focusFour)
})
