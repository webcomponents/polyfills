# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- ## [Unreleased] -->

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
