/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import CustomElementInternals from './CustomElementInternals';
import CustomElementRegistry from './CustomElementRegistry';
import DocumentConstructionObserver from './DocumentConstructionObserver';

import PatchHTMLElement from './Patch/HTMLElement';
import PatchDocument from './Patch/Document';
import PatchNode from './Patch/Node';
import PatchElement from './Patch/Element';

const priorCustomElements = window['customElements'];
const HTMLImports = window['HTMLImports'];

if (!priorCustomElements ||
     priorCustomElements['forcePolyfill'] ||
     (typeof priorCustomElements['define'] != 'function') ||
     (typeof priorCustomElements['get'] != 'function')) {
  /** @type {!CustomElementInternals} */
  const internals = new CustomElementInternals();

  PatchHTMLElement(internals);
  PatchDocument(internals);
  PatchNode(internals);
  PatchElement(internals);

  // The main document is always associated with the registry.
  document.__CE_hasRegistry = true;

  /** @type {!CustomElementRegistry} */
  const customElements = new CustomElementRegistry(internals);


  // If `polyfillFlushCallback` existed on the config object, use it.
  if (priorCustomElements && priorCustomElements['polyfillFlushCallback'] instanceof Function) {
    customElements['polyfillFlushCallback'] = priorCustomElements['polyfillFlushCallback'];
  }

  // If the HTML Imports polyfill is in use, delay flushes until it is ready.
  if (HTMLImports && HTMLImports['whenReady'] instanceof Function) {
    /** @type {!Function|undefined} */
    const wrappedCallback = customElements['polyfillFlushCallback'];

    /** @type {!Function|undefined} */
    let doFlush = undefined;
    customElements['polyfillFlushCallback'] = f => doFlush = f;

    HTMLImports['whenReady'](function() {
      // Do we have a pending flush that should be triggered?
      if (doFlush) {
        if (wrappedCallback) {
          wrappedCallback(doFlush);
        } else {
          doFlush();
        }
      }
      // Unwrap the previous callback, if any.
      customElements['polyfillFlushCallback'] = wrappedCallback;
    });
  }

  // If no flush callback was installed, create the document construction observer.
  if (customElements['polyfillFlushCallback'] === undefined) {
    new DocumentConstructionObserver(internals, document);
  }


  Object.defineProperty(window, 'customElements', {
    configurable: true,
    enumerable: true,
    value: customElements,
  });
}
