# HTMLImports

A polyfill for [HTMLImports](https://www.w3.org/TR/html-imports/).

[![Build Status](https://travis-ci.org/webcomponents/html-imports.svg?branch=master)](https://travis-ci.org/webcomponents/html-imports)

The polyfill will append the imported documents to the main
document instead of creating a disconnected `Document` for each import.

This is done to leverage the native implementation of
[Custom Elements](https://www.w3.org/TR/custom-elements), which
expects scripts upgrading the `CustomElementRegistry` to be connected to the
main document.
Use [`html-imports#v0`](https://github.com/webcomponents/html-imports/tree/v0)
if you require document isolation.

Use `HTMLImports.whenReady()` to get a promise which is resolved once the imports
are done loading.

Note: the polyfill supports dynamically added imports by observing mutations
in `<head>` and within other imports; it won't capture imports appended in `<body>`.

## Building & Running Tests

### Build

  ```bash
  $ git clone https://github.com/webcomponents/html-imports.git
  $ cd html-imports
  $ npm i
  $ bower i
  $ gulp
  ```

### Run tests

  ```bash
  $ npm i -g web-component-tester
  $ wct
  ```
