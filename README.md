![tests](https://github.com/webcomponents/polyfills/workflows/tests/badge.svg?branch=master)
[![Mentioned in Web Components the Right Way](https://awesome.re/mentioned-badge.svg)](https://github.com/mateusortiz/webcomponents-the-right-way)

# Monorepository for WebComponents v1 polyfills

> **Note**. For polyfills that work with the older Custom Elements and Shadow DOM v0 specs,
see the [v0 branch of the webcomponentsjs repo](https://github.com/webcomponents/webcomponentsjs/tree/v0).

> **Note**. For polyfills that work with HTML Imports,
see the [v1 branch of the webcomponentsjs repo](https://github.com/webcomponents/webcomponentsjs/tree/v1).

A suite of polyfills supporting the [Web Components](http://webcomponents.org) specs:

- **Custom Elements v1**: allows authors to define their own custom tags ([spec](https://w3c.github.io/webcomponents/spec/custom/), [tutorial](https://developers.google.com/web/fundamentals/getting-started/primers/customelements), [polyfill](https://github.com/webcomponents/polyfills/tree/master/packages/custom-elements)).
- **Shadow DOM v1**: provides encapsulation by hiding DOM subtrees under shadow roots ([spec](https://w3c.github.io/webcomponents/spec/shadow/), [tutorial](https://developers.google.com/web/fundamentals/getting-started/primers/shadowdom),
[shadydom polyfill](https://github.com/webcomponents/polyfills/tree/master/packages/shadydom), [shadycss polyfill](https://github.com/webcomponents/polyfills/tree/master/packages/shadycss)).

For browsers that need it, there are also some minor polyfills included:
- [`HTMLTemplateElement`](https://github.com/webcomponents/polyfills/tree/master/packages/template)
- [`Promise`](https://github.com/taylorhakes/promise-polyfill)
- `Event`, `CustomEvent`, `MouseEvent` constructors and `Object.assign`, `Array.from`
(see [webcomponentsjs](https://github.com/webcomponents/polyfills/tree/master/packages/webcomponentsjs/src/platform/))
- [`URL constructor`](https://github.com/webcomponents/URL)

# How to Install
## Everything
### [WebcomponentsJS](https://github.com/webcomponents/polyfills/tree/master/packages/webcomponentsjs)
The entire WebComponents suite can be installed at once and loaded together for maximum compatibility.

More information about how the polyfill bundles, and feature-detecting loader work are in the [webcomponentsjs README](https://github.com/webcomponents/polyfills/tree/master/packages/webcomponentsjs#how-to-use).

## Individually
Individual polyfills can be installed with the `@webcomponentsjs/` scope

### [Custom Elements](https://github.com/webcomponents/polyfills/tree/master/packages/custom-elements)
```
npm install @webcomponents/custom-elements
```

### [Shadow DOM](https://github.com/webcomponents/polyfills/tree/master/packages/shadydom) with [ShadyCSS](https://github.com/webcomponents/polyfills/tree/master/packages/shadycss)
> Note: This polyfill requires [manual setup and API calls](https://github.com/webcomponents/polyfills/tree/master/packages/shadycss/README.md) for style encapsulation

```
npm install @webcomponents/shadydom @webcomponents/shadycss
```

### [HTMLTemplateElement](https://github.com/webcomponents/polyfills/tree/master/packages/template)

```
npm install @webcomponents/template
```

### [HTML Imports](https://github.com/webcomponents/polyfills/tree/master/packages/html-imports)
>⚠️ HTML Imports has been deprecated, and will be removed from Chrome in the future. Please transition to ES Modules! ⚠️

```
npm install @webcomponents/html-imports
```

# How to Develop
```
npm install
npm run bootstrap
npm run build
```

# How to Test
```
npm run build
npm test
```
