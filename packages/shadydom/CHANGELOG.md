# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- ## Unreleased -->

## [1.11.0] - 2023-03-30

- Add support for `Element.toggleAttribute()` ([#541](https://github.com/webcomponents/polyfills/pull/541))
- Update dependencies ([#542](https://github.com/webcomponents/polyfills/pull/542))

## [1.10.0] - 2022-10-20

- Fix focus/blur events to be usable without wrapped `addEventListener` in
  `noPatch` mode. ([#502](https://github.com/webcomponents/polyfills/pull/502))
- Add type annotations for JSCompiler to `eventPhase` property descriptor.
  ([#473](https://github.com/webcomponents/polyfills/pull/473))
- Allow event listener options to be specified using a function in addition to
  an object. ([#469](https://github.com/webcomponents/polyfills/pull/469))
- The `eventPhase` property of events is now properly set to `Event.AT_TARGET`
  when events are re-targeted to hosts of shadowRoots.
  ([#469](https://github.com/webcomponents/polyfills/pull/469))
- Adds an opt-out for polyfilling `element(s)FromPoint` on `document` via
  setting `ShadyDOM.useNativeDocumentEFP` to `true`.
  ([#472](https://github.com/webcomponents/polyfills/pull/472))
- In browsers where `EventTarget` doesn't exist, `XMLHttpRequest.prototype`'s
  `EventTarget`-like properties are now patched. In browsers where events'
  `currentTarget` is an own value property and Shady DOM needs to manually
  dispatch an event, Shady DOM will instead dispatch a new object having the
  original event as its prototype so that it can update `currentTarget` without
  modifying the built-in property descriptor.
  ([#519](https://github.com/webcomponents/polyfills/pull/519))
- Add `ShadyDOM.querySelectorImplementation` setting.
  ([#517](https://github.com/webcomponents/polyfills/pull/517))
- Fix Closure types of `querySelector{,All}` patches for internal conformance
  checks. ([#526](https://github.com/webcomponents/polyfills/pull/526))

## [1.9.0] - 2021-08-02

- Add `@this` annotation to new `elementFromPoint` wrappers.
  ([#464](https://github.com/webcomponents/polyfills/pull/464))
- Adds `element(s)FromPoint` to `document` and `shadowRoot`
  ([#463](https://github.com/webcomponents/polyfills/pull/463))
- Add TS externs. ([#457](https://github.com/webcomponents/polyfills/pull/457))
- When `EventTarget.prototype` exists but is not in the prototype chain of
  `window`, polyfill installation breaks.
  ([#416](https://github.com/webcomponents/polyfills/pull/416))

## [1.8.0] - 2020-10-21

- Implicitly coerce values passed to `createTextNode` to a string.
  ([#401](https://github.com/webcomponents/polyfills/pull/401))
- Add support for ChildNode APIs.
  ([#390](https://github.com/webcomponents/polyfills/pull/390))
- Add support for select ParentNode APIs.
  ([#389](https://github.com/webcomponents/polyfills/pull/389))

## [1.7.4] - 2020-07-20

- Manually dispatch events for connected, unassigned targets, if
  `preferPerformance` is not enabled.
  ([#332](https://github.com/webcomponents/polyfills/pull/332))
- Remove outdated references to `customElements.nativeHTMLElement`
  ([#234](https://github.com/webcomponents/polyfills/pull/234))
- Add README warning about polyfill ordering when using `noPatch`
  ([#179](https://github.com/webcomponents/polyfills/pull/179))

## [1.7.3] - 2020-03-16

- Maintenance release (no user-facing changes)

## [1.7.2] - 2020-02-26

- Correctly detect `slot.insertBefore` as requiring shadowRoot distribution
  ([#267](https://github.com/webcomponents/polyfills/pull/267))
- Gather event properties from the correct prototypes
  ([#263](https://github.com/webcomponents/polyfills/pull/263/files))

## [1.7.1] - 2020-01-08

- Fix case where user creates a global `customElements` object for the sake of
  passing flags to the polyfill by only modify `customElements` at load if it's
  a `CustomElementRegistry`
  ([#235](https://github.com/webcomponents/polyfills/pull/235))

## [1.7.0] - 2019-11-12

- Add on-demand patching mode
  ([#189](https://github.com/webcomponents/polyfills/pull/189))
- Avoid IE11 bug that breaks Closure's `WeakMap` polyfill
  ([#228](https://github.com/webcomponents/polyfills/pull/228))
