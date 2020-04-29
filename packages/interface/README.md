# Polyfills Interface

[![Published on npm](https://img.shields.io/npm/v/@webcomponents/interface.svg)](https://www.npmjs.com/package/@webcomponents/interface) [![Test Status](https://github.com/webcomponents/polyfills/workflows/tests/badge.svg?branch=master)](https://github.com/webcomponents/polyfills/actions?query=workflow%3Atests+branch%3Amaster+event%3Apush)

##### [Why?](#why) | [Usage](#usage) | [API](#api) | [Examples](#examples) | [Issues](https://github.com/webcomponents/polyfills/issues?q=is%3Aissue+is%3Aopen+label%3A%22Package%3A+interface%22)

A JavaScript module that provides a safe and typed interface to the [Web
Components polyfills](https://github.com/webcomponents/polyfills/).

> ⚠️ This module does not _load_ the Web Components polyfills. Rather, it
> provides a safe interface to allow you to _interact_ with the polyfills _if_
> they have been loaded. See the [polyfills
> readme](https://github.com/webcomponents/polyfills) for information about
> loading the polyfills.

## Why?

You may need to interface with the Web Components polyfills if you want your
application or re-usable component to work in older browsers, and any of these
scenarios apply to you:

1. You need to imperatively set a CSS custom property.

2. You need to trigger re-evaluation and propagation of a CSS custom property
   after a DOM mutation, like adding a `class`.

3. You have a `document` level `<style>` that sets a CSS custom property.

4. You are authoring a "vanilla" Custom Element without using using LitElement
   or other abstractions that interfaces with the polyfills automatically.

5. You are developing a Custom Elements superclass or framework, and would like
   to automatically interface with the Web Components polyfills so that your
   users don't have to.

## Usage

```bash
npm install --save @webcomponents/interface
```

```typescript
import { prepareTemplate, styleElement } from "@webcomponents/interface";
```

(See [examples](#examples) for more detailed uses.)

## API

### scopedStylesArePolyfilled

```typescript
scopedStylesArePolyfilled(): boolean
```

True if the ShadyCSS scoped style polyfill is loaded and active.

Note that the other functions in this module are safe to call even if the
polyfills are not loaded.

### customPropertiesArePolyfilled

```typescript
customPropertiesArePolyfilled(): boolean
```

True if the ShadyCSS custom properties polyfill is loaded and active.

Note that the other functions in this module are safe to call even if the
polyfills are not loaded.

### prepareTemplate

```typescript
prepareTemplate(templateElement: HTMLTemplateElement, elementName: string)
```

Prepare the given custom element template for use with the ShadyCSS
style scoping polyfill. You only need to do this once per template.

If ShadyCSS is not active, then this function does nothing.

If ShadyCSS is active, then after `styleElement` is called on the first instance
of this element, `<style>` tags within this template will be moved to the
`<head>` and re-written to use globally scoped rules that emulate scoped
behavior.

Note that LitElement and Polymer Library users do not typically need to call
this function, because it is called automatically.

### styleElement

```typescript
styleElement(element: HTMLElement)
```

Activate scoped styles for the given element instance. This function should
typically be called inside `connectedCallback`. The template of this element
class must already have been registered with `prepareTemplate`.

If ShadyCSS is not active, then this function does nothing.

Note that LitElement and Polymer Library users do not typically need to call
this function, because it is called automatically.

### styleSubtree

```typescript
styleSubtree(element: HTMLElement, properties?: {[name: string]: string})
```

Propagate CSS custom properties on this element to all descendant shadow roots,
and optionally set new ones.

Uses ShadyCSS custom property emulation if the polyfill is active, otherwise
calls native `style.setProperty`.

### styleDocument

```typescript
styleDocument(properties: {[name: string]: string})
```

Set CSS custom properties on the `document` and propagate to all shadow roots.

Uses ShadyCSS custom property emulation if the polyfill is active, otherwise
calls native `style.setProperty`.

### addCustomStyle

```typescript
addCustomStyle(style: HTMLStyleElement)
```

Propagate custom properties from the given `document` level `<style>` tag. Changes
occur asynchronously as a microtask.

If ShadyCSS is not active, or if the `custom-style-interface` library has not
been loaded, then this function does nothing.

Note that the `custom-style-interface` library is not automatically loaded by
the `loader` or `bundle` scripts. It must be loaded separately.

## Examples

#### Set a CSS custom property imperatively

While libraries like LitElement automatically handle the core integration with
ShadyCSS, setting CSS Custom Properties imperatively still requires the
component author to interact with ShadyCSS directly.

```typescript
import {LitElement, lit-html, css} from "lit-element";
import {styleSubtree} from "@webcomponents/interface";
import "./my-child-element";

class MyElement extends LitElement {
  static get styles() {
    return css`
      my-child-element {
        --child-color: green;
      }
    `;
  }

  render() {
    return html`
      <button @click="${this.changeChildColor}">change</button>
      <my-child-element></my-child-element>
    `;
  }

  changeChildColor() {
    // Note styleSubtree works both with and without the polyfill loaded, so
    // you can always use it to set a custom property, and don't need to check
    // if the polyfill is loaded.
    styleSubtree(this, { "--child-color": "red" });
  }
}

customElements.define("my-element", MyElement);
```

#### Emulate scoped styles in a vanilla custom element

If you're authoring a vanilla custom element, or implementing a library that
registers custom elements for your users, then you'll need to tell ShadyCSS
about each custom element's template, and every time an instance is connected.

```typescript
import { prepareTemplate, styleElement } from "@webcomponents/interface";

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      color: var(--my-color);
    }
  </style>

  Hello!
`;

// Tell ShadyCSS about the template for every custom element, before any
// instances are connected.
prepareTemplate(template, "my-element");

class MyElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    // Tell ShadyCSS each time an instance is connected.
    styleElement(this);
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

customElements.define("my-element", MyElement);
```

#### Set a CSS custom property from a document style

If you have a `document` level `<style>` that sets a CSS custom property, then
you need to tell ShadyCSS to propagate property values from that `<style>` to
shadow roots.

Note that you also need to load the `custom-style-interface` library, which is
automatically loaded neither by `webcomponents-loader` nor
`webcomponents-bundle`.

```typescript
import "@webcomponents/shadycss/entrypoints/custom-style-interface.js";
import { customStyle } from "@webcomponents/interface";

const style = document.createElement("style");
style.textContent = `
  body {
    --my-color: blue;
  }
`;
document.head.appendChild(style);

// Tell ShadyCSS about the document level style.
addCustomStyle(style);
```
