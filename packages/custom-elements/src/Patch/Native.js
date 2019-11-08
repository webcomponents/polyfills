/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

export default {
  Document_createElement: window.Document.prototype.createElement,
  Document_createElementNS: window.Document.prototype.createElementNS,
  Document_prepend: window.Document.prototype['prepend'],
  Document_append: window.Document.prototype['append'],
  DocumentFragment_prepend: window.DocumentFragment.prototype['prepend'],
  DocumentFragment_append: window.DocumentFragment.prototype['append'],
  Node_cloneNode: window.Node.prototype.cloneNode,
  Node_appendChild: window.Node.prototype.appendChild,
  Node_removeChild: window.Node.prototype.removeChild,
  Element_attachShadow: window.Element.prototype['attachShadow'],
  Element_insertAdjacentElement: window.Element.prototype['insertAdjacentElement'],
  Element_insertAdjacentHTML: window.Element.prototype['insertAdjacentHTML'],
  Element_prepend: window.Element.prototype['prepend'],
  Element_append: window.Element.prototype['append'],
  Element_before: window.Element.prototype['before'],
  Element_after: window.Element.prototype['after'],
  Element_replaceWith: window.Element.prototype['replaceWith'],
  Element_remove: window.Element.prototype['remove'],
  HTMLElement: window.HTMLElement,
  HTMLElement_insertAdjacentElement: window.HTMLElement.prototype['insertAdjacentElement'],
  HTMLElement_insertAdjacentHTML: window.HTMLElement.prototype['insertAdjacentHTML'],
};
