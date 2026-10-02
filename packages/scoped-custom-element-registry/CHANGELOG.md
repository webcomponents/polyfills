# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- ## Unreleased -->
<!-- ### Added -->
<!-- ### Changed -->
<!-- ### Fixed -->

## Unreleased

- `define` no longer writes `formAssociated` onto the class; whether a tag is
  form-associated is still fixed by its first definition

### Changed

- Updated to latest [proposed spec](https://github.com/whatwg/html/issues/10854)
- Elements are customized once their tree is known: at the end of the DOM call
  that created them, or, for the main document, when it becomes interactive
- The registry of parsed content is worked out from where it is, so reading
  registries and calling `initialize` during parsing match native
- Cloning keeps each node's registry, including in clonable shadow roots
- Adoption into another document changes null and global registries, as
  natively
- `attachInternals` returns the element's single `ElementInternals`, and
  honors `disabledFeatures`

### Added

- customElements.initialize: sets registry on a DOM tree
- document.createElement(NS): takes options with {customElementRegistry}
- document.importNode: takes options with {selfOnly, customElementRegistry}
- Node.customElementRegistry set to creating registry
- Null registries: `customElementRegistry: null` options, and the
  `customelementregistry` / `scopedcustomelementregistry` attributes
- Declarative shadow roots with a null registry, via
  `shadowrootcustomelementregistry` plus `polyfill-shadowrootcustomelementregistry`
  on the host
- `polyfill-customelementregistry` / `polyfill-scopedcustomelementregistry`:
  null registry attributes always handled by the polyfill
- `:state(polyfill-undefined)` on elements the polyfill hasn't customized, for
  use with or instead of `:defined`
- `Range.cloneContents`, `Range.createContextualFragment`, `Range.insertNode`
  and `Range.surroundContents` respect registries

### Fixed

- Fixes [issue](https://github.com/webcomponents/polyfills/issues/613) with setting `shadowRoot.customElements` on Safari's native implementation
- Errors thrown by constructors and callbacks are reported rather than thrown,
  and don't stop other elements from upgrading
- `define` with an invalid name no longer leaves the registry in a bad state
- `connectedMoveCallback` is called for `moveBefore`, instead of disconnecting
  and reconnecting the element
- Upgrade order: an element whose constructor calls a DOM API (e.g.
  `attachShadow`) finishes before other elements created with it upgrade
- `importNode(node)` copies shallowly by default
- `disabledFeatures: ['shadow']` is honored
- An adopted element inserted into a disconnected tree, or passed to
  `upgrade()`, no longer loses its upgrade when later connected
- A constructor can create or construct other elements before calling
  `super()`
- An upgrade fails if the constructor returns a different object
- A constructor that throws before calling `super()` runs once
- `define` throws a `TypeError` for a non-constructor and a `SyntaxError` for an
  invalid name before reading the class
- `define` reads `observedAttributes` only when there's an
  `attributeChangedCallback`, and form callbacks only for a form-associated
  class; it captures `disabledFeatures` once
- Customized built-in elements work in the global registry; a scoped registry
  rejects `extends` with a `NotSupportedError`
- `form.elements` is the native collection again, live and with native named
  lookup, filtered through a `Proxy` to leave out elements whose own class
  isn't form-associated; those elements can no longer set form values
- `define` reads the class in the specified order and rejects callbacks that
  aren't functions and `observedAttributes` or `disabledFeatures` that aren't
  iterable; a customized built-in isn't visible until its class has been read
- An upgrade fails if the class disables shadow roots and the element has one
- `attachInternals` respects `disabledFeatures` for a directly constructed
  element; an element whose constructor failed gets no form callbacks and
  isn't a form control; `form.elements` treats only canonical numbers as
  indexes, resolves names like `entries` to controls, and filters its keys and
  property descriptors too
- A closed shadow root copied on a host without internals, including one
  nested in another, is paired before any constructor can change its source,
  or else keeps only its registry, instead of a reference to its source
- A copy with a global registry in a document with a scoped registry gets
  null; `ElementInternals` form members (including `form`, `labels`,
  `validity`) throw for an element that isn't form-associated, or whose
  constructor failed; `define` rejects a class whose prototype isn't an
  object; a directly constructed element whose class isn't form-associated,
  of a tag that is, isn't part of its form
- Copies keep their sources' registries in template contents (without
  `importNode`'s registry), in `Range.extractContents`, and in a cloned
  document, which keeps a scoped registry; `whenDefined` rejects invalid names
  itself
- An error in a callback the polyfill calls (initial attribute callbacks,
  `connectedCallback` on upgrade, `attributeChangedCallback` from
  `setAttribute`) is reported, not thrown, and the remaining callbacks run
- `attributeChangedCallback` follows each element's own definition: a class
  defined in several registries, or a subclass of another defined class, no
  longer gets extra or duplicate callbacks; removing an absent attribute
  doesn't call back
- `define` leaves the class unchanged if it fails, throws `NotSupportedError`
  for a used name or constructor, and while another definition is running
- `Range.createContextualFragment` gives new elements a null context registry
- A parsed element keeps its registry when moved or removed before anything
  needed it

## [0.0.10] - 2025-02-26

### Added

- Added support for `ShadowRoot.prototype.createElementNS()`

- Added the `registry` property to ShadowRootInit to match current proposal.
  `customElements` remains supported for compatibility

### Changed

- polyfill always used; conditional installation blocked by need for spec

- formAssociated set by first name's defining value or if
  CustomElementRegistryPolyfill.formAssociated set contains name

### Fixed

- Fixed a bug in versions of WebKit and Safari that had the prototype scoped
  custom element registry implementation enabled.

- parser created custom elements call attributeChangedCallback for parser
  created attributes

- toggleAttribute called only when attribute value changes

## [0.0.9] - 2023-03-30

- Update dependencies ([#542](https://github.com/webcomponents/polyfills/pull/542))

## [0.0.8] - 2023-02-03

### Fixed

- toggleAttribute polyfill now retains the force argument if it is present

## [0.0.7] - 2023-01-06

### Fixed

- Polyfilled ElementInternals prototype methods now return their original value.

## [0.0.5] - 2022-02-18

### Fixed

- Replaced `self` with `typeof globalThis === 'object' ? globalThis : window` for compatibility with Node (for SSR).

## [0.0.4] - 2022-01-27

### Fixed

- Bump @web/test-runner and related deps to resolve issue running tests on Chrome
- Make form-associated tests conditional on the native feature.
- Fixed form-associated custom element definitions (`static formAssociated = true`) when used with the polyfill.
- Fixed patched callback names in form-associated custom element support.
- Fixed handling of mixed-case attributes. Fixes #483

## [0.0.3] - 2021-08-02

- Maintenance release (no user-facing changes)

## [0.0.2] - 2021-06-02

- Fix to allow definition of custom elements whose classes have been created before applying the polyfill.
- Run `connectedCallback` on upgraded elements. Fixes #442.
- Checks if ShadowRoot prototype supports the createElement method to determine if the polyfill should be applied or not.

## [0.0.1] - 2021-02-18

- First public prerelease.
