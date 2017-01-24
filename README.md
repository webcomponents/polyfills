# HTMLImports

A polyfill for [HTMLImports](https://www.w3.org/TR/html-imports/).

[![Build Status](https://travis-ci.org/webcomponents/html-imports.svg?branch=master)](https://travis-ci.org/webcomponents/html-imports)

The polyfill hosts the imported documents in the main document instead of a disconnected `Document`. Contents are hosted in the import link element. E.g.

```html
<link rel="import" href="my-element.html">

<!-- becomes -->

<link rel="import" href="my-element.html">
  <!-- my-element.html contents -->
</link>
```

This is done to leverage the native implementation of [Custom Elements](https://www.w3.org/TR/custom-elements), which expects scripts upgrading the `CustomElementRegistry` to be connected to the main document. Use [`html-imports#v0`](https://github.com/webcomponents/html-imports/tree/v0) if you require document isolation.

The polyfill fires the `HTMLImportsLoaded` event when imports are loaded, and exposes the `HTMLImports.whenReady` method. This api is necessary because unlike the native implementation, script elements do not force imports to resolve. Instead, users should wrap code in either an `HTMLImportsLoaded` handler or after load time in an `HTMLImports.whenReady(callback)` call.

Note: the polyfill supports dynamically added imports by observing mutations in `<head>` and within other imports; it won't capture imports appended in `<body>`.

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
