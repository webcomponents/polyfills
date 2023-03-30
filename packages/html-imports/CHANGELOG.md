# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- ## Unreleased -->

## [1.3.1] - 2023-03-20

- Update dependencies ([#542](https://github.com/webcomponents/polyfills/pull/542))

## [1.3.0] - 2021-08-02

- Add TS externs. ([#457](https://github.com/webcomponents/polyfills/pull/457))
- Upstream cl/345169174: Fix calls to XMLHttpRequest#getResponseHeader to accept
  null as a return value.
  ([#433](https://github.com/webcomponents/polyfills/pull/433))

## [1.2.6] - 2020-10-21

- Maintenance release (no user-facing changes)

## [1.2.5] - 2020-07-20

- Maintenance release (no user-facing changes)

## [1.2.4] - 2020-03-16

- Maintenance release (no user-facing changes)

## [1.2.3] - 2020-02-26

- Maintenance release (no user-facing changes)

## [1.2.2] - 2019-09-19

- Fix bug where `<style>` elements within `<svg>` elements would cause the HTML
  imports polyfill to wait for them forever
  ([#203](https://github.com/webcomponents/polyfills/pull/203))
- Fix Edge and Chrome 41 timing issues
  ([#141](https://github.com/webcomponents/polyfills/pull/141))
