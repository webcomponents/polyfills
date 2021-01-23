# Custom Elements (v1) Polyfill [![Build Status](https://travis-ci.org/webcomponents/custom-elements.svg?branch=master)](https://travis-ci.org/webcomponents/custom-elements)

A polyfill for the [custom elements](https://html.spec.whatwg.org/multipage/scripting.html#custom-elements)
v1 spec.

## Using

#### Standalone script tag

Include a script tag at the beginning of your page, _before_ any code that
manipulates the DOM. The custom-elements.min.js can be loaded from a CDN:

```html
<script src="https://unpkg.com/@webcomponents/custom-elements"></script>
```

Or you can build it yourself and then load it:

```html
<script src="custom-elements.min.js"></script>
```

#### Via npm:

If you're using npm, webpack, or similar tools, this package can be installed and imported:

```bash
npm install @webcomponents/custom-elements
```

```js
// Do this import before any code that manipulates the DOM.
import '@webcomponents/custom-elements';
```

#### Via the webcomponents polyfill

Alternatively, you can use this polyfill via the [webcomponentjs polyfills](https://github.com/webcomponents/webcomponentsjs).

## Developing

1. Install and build

   ```
   npm install
   npm run build
   ```

   (Or, `npm i && gulp`, if [gulp](https://github.com/gulpjs/gulp) is installed globally.)

1. Test

   ```
   npm run test
   ```

   (Or, [`wct`](https://github.com/Polymer/web-component-tester), if installed
   globally.)

## Custom element reactions in the DOM and HTML specs

API which might trigger custom element reactions in the [DOM](https://dom.spec.whatwg.org/)
and [HTML](https://html.spec.whatwg.org/) specifications are marked with the
[`CEReactions` extended attribute](https://html.spec.whatwg.org/multipage/scripting.html#cereactions).

## Known Bugs and Limitations

- `adoptedCallback` is not supported.
- Changing an attribute of a customizable (but uncustomized) element will not
  cause that element to upgrade.
- Only DOM API is patched. Notably, this excludes API from the HTML spec marked
  with the `CEReactions` extended attribute.
  - Unpatched API from the DOM spec:
    - Setters on `Element` for `id`, `className`, and `slot`.
    - `DOMTokenList` (`element.classList`)
    - `NamedNodeMap` (`element.attributes`)
    - `Attr` (`element.attributes.getNamedItem('attr-name')`)
- The [custom element reactions stack](https://html.spec.whatwg.org/multipage/scripting.html#custom-element-reactions-stack)
  is not implemented.
  - Typically, DOM operations patched in this polyfill gather the list of
    elements to which a given callback would apply and then iterate that list,
    calling the callback on each element. This mechanism breaks down if an
    element's callback performs another DOM operation that manipulates an area
    of the tree that was captured in the outer operation's list of elements.
    When this happens, the callbacks from the inner DOM operation will be called
    _before_ those of the outer DOM operation (typically, depending on the patch
    implementation), as opposed to a spec-compliant implementation where the
    callbacks are always run in the order they were inserted into each
    particular element's reaction queue.
- Custom elements created by the UA's parser are customized as if they were
  upgraded, rather than constructed.
  - These elements are only learned about _after_ they have been constructed,
    and typically after their descendants have been constructed. When these
    elements are constructed, their children are visible and editable _even
    though they would not yet exist and manipulating them would throw in a
    spec-compliant implementation of custom elements!_
- The [requirements for custom element constructors](https://html.spec.whatwg.org/multipage/scripting.html#custom-element-conformance)
  are not enforced.
  - These requirements are not generally enforceable in user script because of
    the ability to use the `new` operator on a custom element constructor. This
    means there is no way to know when a call to a constructor has begun or
    finished.
- Methods of the `ParentNode` and `ChildNode` interfaces do not support
  `DocumentFragment`s as arguments.
- Your custom element constructor's prototype _must_ have a property named
  `constructor` which is that constructor.
  - By default, for every constructible function `F`, `F.prototype.constructor === F`.
    If you replace the prototype of your constructor `F`, you must make sure
    that `F.prototype.constructor === F` remains true. Otherwise, the polyfill
    will not be able to create or upgrade your custom elements.
- The [`:defined` CSS pseudo-class](https://html.spec.whatwg.org/multipage/semantics-other.html#pseudo-classes)
  is not supported.

### ES5 vs ES2015

The custom elements v1 spec is not compatible with ES5 style classes. This means
ES2015 code compiled to ES5 will not work with a native implementation of Custom
Elements.[0] While it's possible to force the custom elements polyfill to be
used to workaround this issue (by setting (`customElements.forcePolyfill = true;`
before loading the polyfill), you will not be using the UA's native
implementation in that case.

Since this is not ideal, we've provided an alternative:
[native-shim.js](https://github.com/webcomponents/custom-elements/blob/master/src/native-shim.js).
Loading this shim minimally augments the native implementation to be compatible
with ES5 code. We are also working on some future refinements to this approach
that will improve the implementation and automatically detect if it's needed.

[0] The spec requires that an element call the `HTMLElement` constructor.
Typically an ES5 style class would do something like `HTMLElement.call(this)` to
emulate `super()`. However, `HTMLElement` _must_ be called as a constructor and
not as a plain function, i.e. with `Reflect.construct(HTMLElement, [], MyCEConstructor)`,
or it will throw.

### Parser-created elements in the main document

By default, the polyfill uses a `MutationObserver` to learn about and upgrade
elements in the main document as they are parsed. This `MutationObserver` is
attached to `document` synchronously when the script is run.

- If you attach a `MutationObserver` earlier before loading the polyfill, that
  mutation observer will not see upgraded custom elements.
- If you move a node with descendants that have not yet been inserted by the
  parser out of the main document, those nodes will not be noticed or upgraded
  (until another action would trigger an upgrade).

Note: Using `polyfillWrapFlushCallback` disconnects this `MutationObserver`.

### `customElements.polyfillWrapFlushCallback`

tl;dr: The polyfill gets slower as the size of your page and number of custom
element definitions increases. You can use `polyfillWrapFlushCallback` to prevent
redundant work.

To avoid a potential memory leak, the polyfill does not maintain a list of upgrade
candidates. This means that calling `customElements.define` causes a synchronous,
full-document walk to search for elements with `localName`s matching the new
definition. Given that this operation is potentially expensive and, if your page
loads many custom element definitions before using any of them, highly redundant,
an extra method is added to the `CustomElementRegistry` prototype -
`polyfillWrapFlushCallback`.

`polyfillWrapFlushCallback` allows you to block the synchronous, full-document
upgrade attempts made when calling `define` and perform them later. Call
`polyfillWrapFlushCallback` with a function; the next time `customElements.define`
is called and a full-document upgrade would happen, your function will be called
instead. The only argument to your function is _another_ function which, when
called, will run the full-document upgrade attempt.

For example, if you wanted to delay upgrades until the document's ready state
was `'complete'`, you could use the following:

```javascript
customElements.polyfillWrapFlushCallback(function (flush) {
  if (document.readyState === 'complete') {
    // If the document is already complete, flush synchronously.
    flush();
  } else {
    // Otherwise, wait until it is complete.
    document.addEventListener('readystatechange', function () {
      if (document.readyState === 'complete') {
        flush();
      }
    });
  }
});
```

Once your wrapper function is called (because the polyfill wants to upgrade the
document), it will not be called again until you have triggered the
full-document upgrade attempt. If multiple definitions are registered before you
trigger upgrades, all of those definitions will apply when you trigger upgrades -
don't call the provided function multiple times.

Promises returned by `customElements.whenDefined` will not resolve until a
full-document upgrade attempt has been performed _after_ the given local name
has been defined.

```javascript
let flush;
customElements.polyfillWrapFlushCallback((f) => (flush = f));

const p = customElements.whenDefined('c-e');
p.then(() => console.log('c-e defined'));

customElements.define('c-e', class extends HTMLElement {});
// `p` is not yet resolved; `flush` is now a function.

flush(); // Resolves `p`; 'c-e defined' is logged.
```

You can't remove a callback given to `polyfillWrapFlushCallback`. If the
condition your callback was intended to wait on is no longer important, your
callback should call the given function synchronously. (See the
`document.readyState` example above.)

**Calling `polyfillWrapFlushCallback` disconnects the `MutationObserver` watching
the main document.** This means that you must delay until at least
`document.readyState !== 'loading'` to be sure that all elements in the main
document are found (subject to exceptions mentioned in the section above).

You can call `polyfillWrapFlushCallback` multiple times, each function given
will automatically wrap and delay any previous wrappers:

```javascript
customElements.polyfillWrapFlushCallback(function (flush) {
  console.log('added first');
  flush();
});

customElements.polyfillWrapFlushCallback(function (flush) {
  console.log('added second');
  setTimeout(() => flush(), 1000);
});

customElements.define('c-e', class extends HTMLElement {});
// 'added second'
// ~1s delay
// 'added first'
// The document is walked to attempt upgrades.
```

### `customElements.polyfillDefineLazy`

Allows defining an element with a constructor getter function that returns an
element constructor. It provides a small optimization over using
`customElements.define` when producing the element class is expensive. The
constructor getter function is called only the first time the polyfill tries
to upgrade the given element.

```javascript
customElements.polyfillDefineLazy('c-e', () => {
  // do some expensive work then...
  return class extends HTMLElement {};
});
```

Note, this API is not included in the custom elements spec and therefore
requires use of the polyfill to function correctly.

### Settings

The polyfill provides a few settings to improve performance by tweaking behavior.
These settings typically have correctness trade-offs (noted below) and should be
used with caution.

- `customElements.noDocumentConstructionObserver`: Set this flag to true to
  prevent the polyfill from mutation observing and upgrading DOM as it is added
  to the main document. This provides a small performance improvement during
  document parsing. With this setting on, the polyfill will not upgrade elements
  created when parsing the main document's HTML. This setting should be
  used in conjunction with a `polyfillWrapFlushCallback` that defers element
  upgrades until the parser is complete.

- `customElements.shadyDomFastWalk`: Set this flag to true when using the
  ShadyDOM polyfill to optimize how elements are found in the DOM. There are a
  couple of limitations: (1) Elements that are children of Shadow DOM hosts and
  are not distributed to slots may not upgrade; (2) This setting is not compatible
  with using native HTML Imports.
