# Web Components Polyfills

[![Test Status](https://github.com/webcomponents/polyfills/workflows/tests/badge.svg?branch=master)](https://github.com/webcomponents/polyfills/actions?query=workflow%3Atests+branch%3Amaster+event%3Apush)

##### [Getting Started](#getting-started) | [Usage](#usage) | [Packages](#packages) | [Roadmap](#roadmap)

The Web Components polyfills are a suite of JavaScript libraries that implement
[Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) APIs
for browsers that don't have built-in support.

If you use Custom Elements, Shadow DOM, or the `<template>` element, either
directly or through a library like
[LitElement](https://lit-element.polymer-project.org), then you can use these
polyfills to make your app work in older browsers like IE11.

We're also working on polyfills for cutting edge new APIs for Web Components
that aren't built into all modern browsers yet, like Shadow Parts and Adopted
Stylesheets.

## Getting Started

Install the `webcomponentsjs` package to get all of the Web Components
polyfills and a _loader_ that automatically downloads only the polyfills each
browser needs:

```bash
npm install --save @webcomponents/webcomponentsjs
```

Load the polyfills loader before any of your application code:

```html
<html>
  <head>
    <!-- If your application is compiled to ES5, then load this script first. -->
    <script src="./node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js"></script>

    <!-- Add support for Web Components to older browsers. -->
    <script src="./node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js"></script>

    <!-- Load your application code anytime after loader.js -->
  </head>
  <body>
    <!-- Your custom elements will work in older browsers like IE11. -->
    <my-custom-element></my-custom-element>
  </body>
</html>
```

For more ways to load the Web Components polyfills, see the
[webcomponentsjs](https://github.com/webcomponents/polyfills/tree/master/packages/webcomponentsjs#how-to-use)
package.

## Usage

The Web Components polyfills handle many usage patterns automatically, but
there are certain patterns that require direct interaction with the library:

#### Setting Custom Properties

- To set a CSS custom property value imperatively, pass the value to
  [`styleSubtree`](https://github.com/webcomponents/polyfills/tree/master/packages/shadycss#imperative-values-for-custom-properties).

- To re-compute CSS custom properties after a DOM mutuation that affects the
  matching condition of a CSS rule containing a custom property (e.g. changing
  a `class` attribute), call [`styleSubtree`](https://github.com/webcomponents/polyfills/tree/master/packages/shadycss#imperative-values-for-custom-properties).

#### Registering styles

- To use a style in the main document that sets or consumes a CSS Custom
  Property, register it with
  [`addCustomStyle`](https://github.com/webcomponents/polyfills/tree/master/packages/shadycss#about-customstyleinterface).

- To use a style in a Custom Element, pass the element's template to
  [`prepareTemplate`](https://github.com/webcomponents/polyfills/tree/master/packages/shadycss#usage)
  before first cloning it. (Note that
  [LitElement](https://lit-element.polymer-project.org) and the [Polymer
  Library](https://polymer-library.polymer-project.org) perform this
  registration step automatically.)

## Packages

This repo is a _monorepo_. Each package lives under `packages/<package>`.

### [![Published on npm](https://img.shields.io/npm/v/@webcomponents/webcomponentsjs.svg)](https://www.npmjs.com/package/@webcomponents/webcomponentsjs) [webcomponentsjs](https://github.com/webcomponents/polyfills/tree/master/packages/webcomponentsjs)

##### [Documentation](https://github.com/webcomponents/polyfills/tree/master/packages/webcomponentsjs#readme) | [Changelog](https://github.com/webcomponents/polyfills/blob/master/packages/webcomponentsjs/CHANGELOG.md) | [Issues](https://github.com/webcomponents/polyfills/issues?q=is%3Aissue+is%3Aopen+label%3A%22Package%3A+webcomponentsjs%22)

Loader and pre-minimized bundles for the full suite of Web Components
polyfills.

Most users only need to install this package, but it is also possible to
separately install any of the individual polyfills listed below.

---

### [![Published on npm](https://img.shields.io/npm/v/@webcomponents/custom-elements.svg)](https://www.npmjs.com/package/@webcomponents/custom-elements) [custom-elements](https://github.com/webcomponents/polyfills/tree/master/packages/custom-elements)

##### [Documentation](https://github.com/webcomponents/polyfills/tree/master/packages/custom-elements#readme) | [Changelog](https://github.com/webcomponents/polyfills/blob/master/packages/custom-elements/CHANGELOG.md) | [Issues](https://github.com/webcomponents/polyfills/issues?q=is%3Aissue+is%3Aopen+label%3A%22Package%3A+custom-elements%22)

Polyfill for Custom Elements ([MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements), [Spec](https://html.spec.whatwg.org/multipage/custom-elements.html))

---

### [![Published on npm](https://img.shields.io/npm/v/@webcomponents/template.svg)](https://www.npmjs.com/package/@webcomponents/template) [template](https://github.com/webcomponents/polyfills/tree/master/packages/template)

##### [Documentation](https://github.com/webcomponents/polyfills/tree/master/packages/template#readme) | [Changelog](https://github.com/webcomponents/polyfills/blob/master/packages/template/CHANGELOG.md) | [Issues](https://github.com/webcomponents/polyfills/issues?q=is%3Aissue+is%3Aopen+label%3A%22Package%3A+template%22)

Polyfill for Template Element ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement), [Spec](https://html.spec.whatwg.org/multipage/scripting.html#the-template-element))

---

### [![Published on npm](https://img.shields.io/npm/v/@webcomponents/shadydom.svg)](https://www.npmjs.com/package/@webcomponents/shadydom) [shadydom](https://github.com/webcomponents/polyfills/tree/master/packages/shadydom)

##### [Documentation](https://github.com/webcomponents/polyfills/tree/master/packages/shadydom#readme) | [Changelog](https://github.com/webcomponents/polyfills/blob/master/packages/shadydom/CHANGELOG.md) | [Issues](https://github.com/webcomponents/polyfills/issues?q=is%3Aissue+is%3Aopen+label%3A%22Package%3A+shadydom%22)

Polyfill for Shadow DOM ([MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM), [Spec](https://dom.spec.whatwg.org/#shadow-trees))

---

### [![Published on npm](https://img.shields.io/npm/v/@webcomponents/shadycss.svg)](https://www.npmjs.com/package/@webcomponents/shadycss) [shadycss](https://github.com/webcomponents/polyfills/tree/master/packages/shadycss)

##### [Documentation](https://github.com/webcomponents/polyfills/tree/master/packages/shadycss#readme) | [Changelog](https://github.com/webcomponents/polyfills/blob/master/packages/shadycss/CHANGELOG.md) | [Issues](https://github.com/webcomponents/polyfills/issues?q=is%3Aissue+is%3Aopen+label%3A%22Package%3A+shadycss%22)

Polyfill for Scoped CSS ([Spec](https://drafts.csswg.org/css-scoping))

---

### [![Published on npm](https://img.shields.io/npm/v/@webcomponents/html-imports.svg)](https://www.npmjs.com/package/@webcomponents/html-imports) [html-imports](https://github.com/webcomponents/polyfills/tree/master/packages/html-imports)

##### [Documentation](https://github.com/webcomponents/polyfills/tree/master/packages/html-imports#readme) | [Changelog](https://github.com/webcomponents/polyfills/blob/master/packages/html-imports/CHANGELOG.md) | [Issues](https://github.com/webcomponents/polyfills/issues?q=is%3Aissue+is%3Aopen+label%3A%22Package%3A+html-imports%22)

Polyfill for HTML Imports ([Spec](https://w3c.github.io/webcomponents/spec/imports/))

Note that HTML Imports are
[deprecated](https://groups.google.com/a/chromium.org/d/topic/blink-dev/h-JwMiPUnuU/discussion)
in favor of [JavaScript
modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).
As of Chrome 81, HTML Imports are no longer natively supported by any browser.
The current version of the Web Components loader does **not** automatically
polyfill HTML Imports. Applications that still depend on HTML Imports are
recommended to install `@webcomponents/html-imports` and load it separately.

## Roadmap

The following APIs are on the roadmap for 2020:

- **CSS Shadow Parts**
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/::part),
  [Spec](https://www.w3.org/TR/css-shadow-parts-1/)). Follow Issue [#252](https://github.com/webcomponents/polyfills/issues/252).

- **Constructable & Adopted Stylesheets** ([Spec](https://wicg.github.io/construct-stylesheets/), [Explainer](https://github.com/WICG/construct-stylesheets/blob/gh-pages/explainer.md), [Article](https://developers.google.com/web/updates/2019/02/constructable-stylesheets)). Follow Issue [#44](https://github.com/webcomponents/polyfills/issues/44).

- **FormData event** ([Spec](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#the-formdataevent-interface), [Explainer](https://docs.google.com/document/d/1JO8puctCSpW-ZYGU8lF-h4FWRIDQNDVexzHoOQ2iQmY/edit#heading=h.veshh4ug726u)). Follow Issue [#172](https://github.com/webcomponents/polyfills/issues/172).

- **Form Associated Custom Elements** ([Spec](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements-face-example), [Explainer](https://docs.google.com/document/d/1JO8puctCSpW-ZYGU8lF-h4FWRIDQNDVexzHoOQ2iQmY/edit?pli=1#heading=h.2hgix04sc53t)). Follow Issue [#173](https://github.com/webcomponents/polyfills/issues/173).
