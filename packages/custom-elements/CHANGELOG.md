# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- ## Unreleased -->

## [1.6.0] - 2023-03-30

- Add support for `Element.toggleAttribute()` ([#541](https://github.com/webcomponents/polyfills/pull/541))
- Update dependencies ([#542](https://github.com/webcomponents/polyfills/pull/542))

## [1.5.1] - 2022-10-20

- Don't write to window.CustomElementsRegistry unless we're also writing to window.customElements. ([#524](https://github.com/webcomponents/polyfills/pull/524))
- Update TypeScript and upstream internal changes.
  ([#525](https://github.com/webcomponents/polyfills/pull/525))

## [1.5.0] - 2021-08-02

- Add TS externs. ([#457](https://github.com/webcomponents/polyfills/pull/457))

## [1.4.3] - 2020-10-21

- Maintenance release (no user-facing changes)

## [1.4.2] - 2020-07-20

- Type annotation improvements for Closure ([#287](https://github.com/webcomponents/polyfills/pull/287))
- README improvements ([#169](https://github.com/webcomponents/polyfills/pull/169))

## [1.4.1] - 2020-03-16

- Fix bug that prevented elements in the main document from being upgraded
  ([#283](https://github.com/webcomponents/polyfills/pull/283))

## [1.4.0] - 2020-02-26

- Convert to TypeScript
  ([#246](https://github.com/webcomponents/polyfills/pull/246))

## [1.3.2] - 2020-01-08

- Maintenance release (no user-facing changes)

## [1.3.1] - 2019-11-12

- Remove warnings about `insertAdjacentElement` and `insertAdjacentHTML` not
  being patched ([#229](https://github.com/webcomponents/polyfills/pull/229))
- Fix incorrect `polyfillWrapFlushCallback` example in README
  ([#219](https://github.com/webcomponents/polyfills/pull/219))
