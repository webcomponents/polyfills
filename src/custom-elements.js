/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {
  AlreadyConstructedMarker,
  CustomElementDefinition,
} from './CustomElementDefinition';
import {
  CustomElementInternals,
} from './CustomElementInternals';
import * as CustomElementInternalSymbols from './CustomElementInternalSymbols';
const CustomElementState = CustomElementInternalSymbols.CustomElementState;
import CustomElementRegistry from './CustomElementRegistry';
import DocumentConstructionObserver from './DocumentConstructionObserver';
import * as Utilities from './Utilities';

import BuiltIn from './Patch/BuiltIn';
import PatchHTMLElement from './Patch/HTMLElement';
import PatchDocument from './Patch/Document';
import PatchNode from './Patch/Node';
import PatchElement from './Patch/Element';

if (!window['customElements'] || window['customElements']['forcePolyfill']) {
  /** @type {!CustomElementInternals} */
  const internals = new CustomElementInternals();

  /** @type {!CustomElementRegistry} */
  const customElements = new CustomElementRegistry(internals);

  Object.defineProperty(window, 'customElements', {
    configurable: true,
    enumerable: true,
    value: customElements,
  });

  /** @type {!DocumentConstructionObserver} */
  const constructionObserver = new DocumentConstructionObserver(internals, document);

  PatchHTMLElement(internals);
  PatchDocument(internals);
  PatchNode(internals);
  PatchElement(internals);
}
