# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

<!-- ## [Unreleased] -->

## [2.5.0] - 2020-10-21

- Polyfill `Element#matches`.
  ([#400](https://github.com/webcomponents/polyfills/pull/400))
- Remove function declarations from platform polyfills to sastisfy internal lint
  after import transforms.
  ([#396](https://github.com/webcomponents/polyfills/pull/396))
- Polyfill `Element#getAttributeNames`.
  ([#393](https://github.com/webcomponents/polyfills/pull/393))
- Add polyfills for ChildNode APIs.
  ([#390](https://github.com/webcomponents/polyfills/pull/390))
- Add polyfills for select ParentNode APIs.
  ([#389](https://github.com/webcomponents/polyfills/pull/389))
- Add `classList` support to `SVGElement`.
  ([#391](https://github.com/webcomponents/polyfills/pull/391))
- Add new entrypoints to webcomponentsjs for the 'platform' polyfills.
  ([#385](https://github.com/webcomponents/polyfills/pull/385))

## [2.4.4] - 2020-07-20

- Fixed bug where Object.assign polyfill would copy non-enumerable properties.
- Convert platform (`Array.from`, `CustomEvent`, `Promise` etc.) polyfills to
  TypeScript ([#292](https://github.com/webcomponents/polyfills/pull/292))
- Improve types for JSCompiler compatibility
  ([#307](https://github.com/webcomponents/polyfills/pull/307))
- README improvements
  ([#128](https://github.com/webcomponents/polyfills/pull/128),
  [#212](https://github.com/webcomponents/polyfills/pull/212),
  [#214](https://github.com/webcomponents/polyfills/pull/214))

## [2.4.3] - 2020-03-16

- Maintenance release (no user-facing changes)

## [2.4.2] - 2020-02-26

- Remove unnecessary externs
  ([#272](https://github.com/webcomponents/polyfills/pull/272))

## [2.4.1] - 2020-01-09

- Maintenance release (no user-facing changes)

## [2.4.0] - 2019-11-12

- Add on-demand patching mode
  ([#189](https://github.com/webcomponents/polyfills/pull/189))
