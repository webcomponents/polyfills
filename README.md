# HTMLImports

A polyfill for [HTMLImports](https://www.w3.org/TR/html-imports/).

[![Build Status](https://travis-ci.org/webcomponents/html-imports.svg?branch=master)](https://travis-ci.org/webcomponents/html-imports)

The polyfill hosts the imported documents in the import link element. E.g.

```html
<link rel="import" href="my-element.html">

<!-- becomes -->

<link rel="import" href="my-element.html">
  <!-- my-element.html contents -->
</link>
```

The polyfill fires the `HTMLImportsLoaded` event when imports are loaded, and exposes the `HTMLImports.whenReady` method. This api is necessary because unlike the native implementation, script elements do not force imports to resolve. Instead, users should wrap code in either an `HTMLImportsLoaded` handler or after load time in an `HTMLImports.whenReady(callback)` call.

## Caveats / Limitations

### `<link>.import` is not a `Document`

The polyfill appends the imported contents to the `<link>` itself to leverage the native implementation of [Custom Elements](https://www.w3.org/TR/custom-elements), which expects scripts upgrading the `CustomElementRegistry` to be connected to the main document. Use [`html-imports#v0`](https://github.com/webcomponents/html-imports/tree/v0) if you require document isolation.

### Dynamic imports

The polyfill supports dynamically added imports by observing mutations in `<head>` and within other imports; it won't capture imports appended in `<body>`.

### Imported stylesheets in IE/Edge

In IE/Edge, appending `<link rel=stylesheet>` in a node that is not `<head>` breaks the cascading order; the polyfill checks if an import contains a `<link rel=stylesheet>`, and moves all the imported `<link rel=stylesheet>` and `<style>` to `<head>`. It drops a placeholder element in their original place and assigns a reference to the applied element, `placeholder.__appliedElement`. e.g.

`my-element.html` imports a stylesheet and applies a style:

```html
<link rel="stylesheet" href="my-linked-style.css">
<style> .blue { color: blue }; </style>
```

And is imported in index.html:

```html
<head>
  <link rel="import" href="my-element.html">
</head>
```

This is how the resolved import will look like:

```html
<head>
  <link rel="stylesheet" href="my-linked-style.css">
  <style> .blue { color: blue }; </style>
  <link rel="import" href="my-element.html">
    <link>
    <style></style>
  </link>
</head>
```

The placeholders contain a reference to the applied element:

```javascript
var myImport = document.head.querySelector('link[rel=import]');
var link = myImport.querySelector('link');
console.log(link.__appliedElement || link);
var style = myImport.querySelector('style');
console.log(style.__appliedElement || style);
```

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
