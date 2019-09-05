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

  const customElements = new CustomElementRegistry(internals);

  // The main document is associated with the global registry.
  document.__CE_registry = customElements;

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
// versions of Safari that randomly removes the polyfill during tests.
window['__CE_installPolyfill'] = installPolyfill;
