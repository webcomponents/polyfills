# Scoped CustomElementRegistry polyfill

## Overview

Scoped CustomElementRegistry polyfill based on the
[HTML spec](https://html.spec.whatwg.org/multipage/custom-elements.html),
originally proposed as
[Scoped Custom Element Registries](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Scoped-Custom-Element-Registries.md).

See [MDN](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/CustomElementRegistry) for current native support status.

Technique: uses native CustomElements to register stand-in classes that
delegate to the constructor in the registry for the element's scope; this
avoids any manual treewalks to identify custom elements that need upgrading.
Stand-ins are queued when constructed and customized once their tree, and so
their registry, is known: at the end of the DOM call that created them, or,
for the main document's parser, once inserted (before any script that follows
them runs). The "constructor call trick" is then used to upgrade them. See
[DESIGN.md](DESIGN.md) for how it works.

## Installing and loading

```sh
npm i @webcomponents/scoped-custom-element-registry
```

Load it as a classic script in the document's `<head>`, before any markup
that uses custom elements and before any code that defines them. Don't use
`defer`, `async` or `type="module"`, which run it after the document is
parsed.

```html
<head>
  <script src="node_modules/@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min.js"></script>
</head>
```

Options are set on `window.CustomElementRegistryPolyfill` before loading:

```html
<script>
  window.CustomElementRegistryPolyfill = {
    // Use the polyfill even where the browser supports scoped registries.
    force: true,
    // Tags that may be form-associated (see "Usage notes").
    formAssociated: new Set(['my-input']),
  };
</script>
<script src=".../scoped-custom-element-registry.min.js"></script>
```

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

The polyfill does nothing in browsers with native support, unless `force` is
set.

## Limitations

- **Customized built-in elements** (`extends`) are best avoided, since
  Safari doesn't support them. The polyfill passes them to the browser, in the
  global registry only. A name can't be both a customized built-in and, in any
  registry, an autonomous element, since the polyfill defines every
  autonomous name natively.
- **`attributeChangedCallback`** only runs for changes made with
  `setAttribute`, `removeAttribute` and `toggleAttribute`, which the polyfill
  patches, since the browser fixes `observedAttributes` at define time.
  Changes made any other way (e.g. through reflecting properties or
  `setAttributeNS`) are not observed.
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
- **`:defined`** matches elements the polyfill hasn't customized yet. Use
  `:is(:not(:defined), :state(polyfill-undefined))` instead of `:not(:defined)`;
  it's correct with or without the polyfill.

## Usage notes

- **`polyfill-customelementregistry`** (or `polyfill-scopedcustomelementregistry`)
  is equivalent to the standard attribute but always handled by the polyfill,
  never by the browser. Use it only if you want the polyfill's behavior in
  browsers with native support (e.g. when forcing); don't combine it with the
  standard attribute.
- **Elements the main parser creates** are constructed once inserted, so a
  constructor may see attributes and children it wouldn't natively; don't
  rely on that.
- **Form-associated elements:** whether a tag can be form-associated is fixed
  by its first definition. If a later definition of the same tag is
  form-associated when the first isn't, list the tag in the `formAssociated`
  option. An element whose own class isn't form-associated, of a tag that
  is, is left out of its form's data, `elements` and `length`, but it's still
  in `form[index]` and the form's named properties, matches `:disabled`, and
  is disabled by a `disabled` attribute.

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
