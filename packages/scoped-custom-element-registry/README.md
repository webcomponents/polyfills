# Scoped CustomElementRegistry polyfill

## Overview

Scoped CustomElementRegistry polyfill based on [DOM Spec]https://html.spec.whatwg.org/multipage/custom-elements.html], originally proposed via [Scoped Custom Element
Registries](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Scoped-Custom-Element-Registries.md).

See [MDN](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/CustomElementRegistry) for current native support status.

Technique: uses native CustomElements to register stand-in classes that
delegate to the constructor in the registry for the element's scope; this
avoids any manual treewalks to identify custom elements that need upgrading.
Stand-ins are queued when constructed and customized once their tree, and so
their registry, is known: at the end of the DOM call that created them, or,
for the main document's parser, once inserted (before any script that follows
them runs). The "constructor call trick" is then used to upgrade them.

## Supported

- `new CustomElementRegistry()`, and `define`, `get`, `getName`, `whenDefined`,
  `upgrade` and `initialize`.
- `customElementRegistry` on elements, shadow roots and documents.
- `attachShadow`, `createElement`, `createElementNS` and `importNode` with a
  `customElementRegistry` option, including `null`.
- Declarative shadow roots, and parsing (`innerHTML`, `setHTMLUnsafe`, etc.)
  into scoped trees.
- Null registries, via `customelementregistry` or `scopedcustomelementregistry`
  on elements, and `shadowrootcustomelementregistry` on declarative shadow
  roots (see below).
- Cloning (`cloneNode`, `importNode`, `Range.cloneContents`) keeps each node's
  registry, including in clonable shadow roots.
- Adoption into another document, as natively.

The polyfill does nothing in browsers with native support. Set
`window.CustomElementRegistryPolyfill = {force: true}` before loading it to
use it anyway.

## Usage notes

- **Load it first**, before any markup that uses custom elements is parsed.
- **Declarative shadow roots with a null registry** also need
  `polyfill-shadowrootcustomelementregistry` on the host: the parser consumes
  the template, so the polyfill never sees its attribute. Use it only on a
  host that has such a root: the polyfill treats any root attached to that
  host as its declarative root, so `attachShadow` there gets a null registry,
  whatever registry is passed.
  ```html
  <x-host polyfill-shadowrootcustomelementregistry>
    <template shadowrootmode="open" shadowrootcustomelementregistry>…</template>
  </x-host>
  ```
- **`polyfill-customelementregistry`** (or `polyfill-scopedcustomelementregistry`)
  is equivalent to the standard attribute but always handled by the polyfill,
  never by the browser. Use it only if you want the polyfill's behavior in
  browsers with native support (e.g. when forcing); don't combine it with the
  standard attribute.
- **`:defined`** matches elements the polyfill hasn't customized yet. Use
  `:is(:not(:defined), :state(polyfill-undefined))` instead of `:not(:defined)`;
  it's correct with or without the polyfill.
- **Elements the main parser creates upgrade once inserted**, rather than
  when constructed: a script that follows them sees them upgraded, as
  natively, but their constructors run a little later, just before such a
  script or the next custom element the parser creates.
- **Cloning a closed shadow root:** when a closed, clonable shadow root is on
  an element that wasn't a defined custom element when the root was attached
  (for example a `div`, or an undefined custom element like `my-element`), the
  polyfill can't reach the copy's shadow root after cloning. Elements in the
  copy that are only defined later get the shadow root's registry (or, in a
  shadow root nested inside it, the document's), even if their originals used
  a different one. This only matters if elements inside
  the root use a different registry than the root itself. To avoid it, do any
  of these:
  - put the shadow root on a custom element that's defined before the root is
    attached;
  - define the elements inside before cloning;
  - make the shadow root open.
- **Uncommon APIs** the polyfill doesn't patch (e.g.
  `execCommand('insertHTML')`) upgrade elements a microtask later than natively.
- **`observedAttributes`** is simulated by patching `setAttribute`,
  `removeAttribute` and `toggleAttribute`, since the browser fixes it at define
  time. Attributes changed any other way (e.g. through reflecting properties
  or `setAttributeNS`) are not observed.
- **Form-associated elements:** whether a tag can be form-associated is fixed
  by its first definition. If a later definition of the same tag is
  form-associated when the first isn't, list the tag in
  `window.CustomElementRegistryPolyfill.formAssociated` (a `Set`) before
  loading. An element whose own class isn't form-associated, of a tag that
  is, is left out of its form's data, `elements` and `length`, but it's still
  in `form[index]` and the form's named properties, matches `:disabled`, and
  is disabled by a `disabled` attribute.
- **Customized built-in elements** (`extends`) are defined natively in the
  global registry, where the browser supports them. A name can't be used both
  for a customized built-in and in any registry's autonomous definitions,
  since the polyfill defines every autonomous name natively. The polyfill
  reads the class before the browser does, so a one-shot iterable (e.g. a
  generator) for `observedAttributes` or `disabledFeatures` is empty when the
  browser reads it, and nothing is observed.

## Differences from native implementations

Where browsers currently differ from the spec, the polyfill follows the spec.
Tests of these are skipped when the browser's native support is used.

- Safari 26 and 27 customize an element created with a null registry using
  the global registry's definition, while still reporting a null registry.
  The polyfill is used there.

- Chromium and WebKit ignore `customelementregistry` when `innerHTML` uses
  their fast-path parser (e.g. for `<div customelementregistry></div>`), but
  honor it when the full parser runs. `setHTMLUnsafe` always honors it.
- Chromium:
  - `customElements.initialize(document)` doesn't throw a `NotSupportedError`
    (Safari and Firefox do);
  - a scoped registry accepts `extends` instead of throwing a
    `NotSupportedError`;
  - a cloned document gets a null registry, instead of keeping its scoped
    one;
  - a copy of an element with a global registry, in a document with a scoped
    registry, gets that scoped registry instead of null;
  - `ElementInternals.setFormValue` works for an element whose constructor
    failed, which isn't form-associated;
  - adopting a null-registry element gives it the document's registry,
    instead of its new parent's (as an effective global registry);
  - adopting a host gives its shadow root a null registry but leaves the
    elements inside it global.

## Testing

`npm test` builds the polyfill and runs the tests with Playwright in
Chromium, Firefox and WebKit, then again in Chromium with the polyfill forced
(`npm run test:forced`), so its code is tested in a browser with native
support too. Setting `FORCE_POLYFILL=true` forces it in any run. Where the
browser's native support is used, tests of polyfill-only behavior are
skipped (see `itWithPolyfill` in `test/utils.js`).

To run the tests in a Firefox-engine browser without native support, see
`test/wtr.firefox.config.js`.
