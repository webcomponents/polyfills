/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

export const Document_createElement = window.Document.prototype.createElement;
export const Document_createElementNS =
    window.Document.prototype.createElementNS;
export const Document_importNode = window.Document.prototype.importNode;

export const Document_prepend = window.Document.prototype['prepend'];
export const Document_append = window.Document.prototype['append'];
export const DocumentFragment_prepend =
    window.DocumentFragment.prototype['prepend'];
export const DocumentFragment_append =
    window.DocumentFragment.prototype['append'];
export const Node_cloneNode = window.Node.prototype.cloneNode;
export const Node_appendChild = window.Node.prototype.appendChild;
export const Node_insertBefore = window.Node.prototype.insertBefore;
export const Node_removeChild = window.Node.prototype.removeChild;
export const Node_replaceChild = window.Node.prototype.replaceChild;
export const Node_textContent =
    Object.getOwnPropertyDescriptor(window.Node.prototype, 'textContent');
export const Element_attachShadow = window.Element.prototype['attachShadow'];
export const Element_innerHTML =
    Object.getOwnPropertyDescriptor(window.Element.prototype, 'innerHTML');
export const Element_getAttribute = window.Element.prototype.getAttribute;
export const Element_setAttribute = window.Element.prototype.setAttribute;
export const Element_removeAttribute = window.Element.prototype.removeAttribute;
export const Element_getAttributeNS = window.Element.prototype.getAttributeNS;
export const Element_setAttributeNS = window.Element.prototype.setAttributeNS;
export const Element_removeAttributeNS =
    window.Element.prototype.removeAttributeNS;
export const Element_insertAdjacentElement =
    window.Element.prototype['insertAdjacentElement'];
export const Element_insertAdjacentHTML =
    window.Element.prototype['insertAdjacentHTML'];
export const Element_prepend = window.Element.prototype['prepend'];
export const Element_append = window.Element.prototype['append'];
export const Element_before = window.Element.prototype['before'];
export const Element_after = window.Element.prototype['after'];
export const Element_replaceWith = window.Element.prototype['replaceWith'];
export const Element_remove = window.Element.prototype['remove'];
export const HTMLElement = window.HTMLElement;
export const HTMLElement_innerHTML =
    Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'innerHTML');
export const HTMLElement_insertAdjacentElement =
    window.HTMLElement.prototype['insertAdjacentElement'];
export const HTMLElement_insertAdjacentHTML =
    window.HTMLElement.prototype['insertAdjacentHTML'];
