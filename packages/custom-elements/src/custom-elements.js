/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import CustomElementInternals from './CustomElementInternals.js';
import CustomElementRegistry from './CustomElementRegistry.js';

import PatchHTMLElement from './Patch/HTMLElement.js';
import PatchDocument from './Patch/Document.js';
import PatchDocumentFragment from './Patch/DocumentFragment.js';
import PatchNode from './Patch/Node.js';
import PatchElement from './Patch/Element.js';

const priorCustomElements = window['customElements'];

function installPolyfill() {
  const noDocumentConstructionObserver = priorCustomElements && priorCustomElements['noDocumentConstructionObserver'];
  const shadyDomFastWalk = priorCustomElements && priorCustomElements['shadyDomFastWalk'];

  /** @type {!CustomElementInternals} */
  const internals = new CustomElementInternals({
    noDocumentConstructionObserver,
    shadyDomFastWalk
  });

  PatchHTMLElement(internals);
  PatchDocument(internals);
  PatchDocumentFragment(internals);
  PatchNode(internals);
  PatchElement(internals);

  // The main document is always associated with the registry.
  document.__CE_hasRegistry = true;

  /** @type {!CustomElementRegistry} */
  const customElements = new CustomElementRegistry(internals);

  Object.defineProperty(window, 'customElements', {
    configurable: true,
    enumerable: true,
    value: customElements,
  });
};

if (!priorCustomElements ||
     priorCustomElements['forcePolyfill'] ||
     (typeof priorCustomElements['define'] != 'function') ||
     (typeof priorCustomElements['get'] != 'function')) {
  installPolyfill();
}

// This is NOT public API and is only meant to work around a GC bug in older
// versions of Safari that randomly removes the polyfill during tests. Adding
// "__CE_installPolyfill" to the search portion of the URL will cause the
// polyfill installation function to be added to the global object. Ideally,
// this would use URLSearchParams but IE11 does not support it.
//
// This behavior can't be triggered by a scoped flag on `customElements` (like
// `forcePolyfill`) because the flag may be garbage collected by the same bug.
if (location.search.indexOf('__CE_installPolyfill') !== -1) {
  window['__CE_installPolyfill'] = installPolyfill;
}
