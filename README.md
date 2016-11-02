# custom-elements
A polyfill for HTML Custom Elements

[![Build Status](https://travis-ci.org/webcomponents/custom-elements.svg?branch=master)](https://travis-ci.org/webcomponents/custom-elements)

## Building & Running Tests

  1. Install web-component-tester

    ```bash
    $ npm i -g web-component-tester
    ```

  2. Checkout the webcomponentsjs v1 branch

    ```bash
    $ git clone https://github.com/webcomponents/webcomponentsjs.git
    $ cd webcomponentsjs
    $ npm i
    $ gulp build
    ```

  3. Run tests

    ```bash
    $ wct tests/CustomElements/v1/index.html -l chrome
    ```

  4. Bower link to use in another project

    ```bash
    $ bower link
    $ cd {your project directory}
    $ bower link webcomponentsjs
    ```

## Differences from Spec

Most custom element reactions in the polyfill are driven from Mutation Observers
and so are async in cases where the spec calls for synchronous reactions. There
are some exceptions, like for `Document.importNode()` and `Element.setAttribute`.

To ensure that queued operations are complete, mostly useful for tests, you can
enable flushing:

```javascript
customElements.enableFlush = true;

// some DOM operations

customElements.flush();

// some more DOM operations dependent on reactions in the first set
```

## Known Issues

The Custom Elements v1 spec is not compatible with ES5 style classes. This means ES6 code compiled to ES5 will not work with a native implementation of Custom Elements.* While it's possible to force the custom elements polyfill to be used to workaround this issue (by setting (`customElements.forcePolyfill = true`), you will obviously not be using the browser's native implementation in that case.

Since this is not ideal, we've provided an alternative: [native-shim.js](https://github.com/webcomponents/custom-elements/blob/master/src/native-shim.js). Loading this shim minimally augments the native implementation to be compatible with ES5 code. We are also working on some future refinements to this approach that will improve the implementation and automatically detect if it's needed.

* The spec requires that an element call the HTMLElement constructor. You might do this in an ES5 style class like this HTMLElement.call(this). However, that code results in an exception (on Chrome): "Uncaught TypeError: Failed to construct 'HTMLElement': Please use the 'new' operator, this DOM object constructor cannot be called as a function.
