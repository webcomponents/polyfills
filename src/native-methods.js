/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

export let appendChild = Element.prototype.appendChild;
export let insertBefore = Element.prototype.insertBefore;
export let replaceChild = Element.prototype.replaceChild;
export let removeChild = Element.prototype.removeChild;
export let setAttribute = Element.prototype.setAttribute;
export let removeAttribute = Element.prototype.removeAttribute;
export let cloneNode = Element.prototype.cloneNode;
export let importNode = Document.prototype.importNode;
export let addEventListener = Element.prototype.addEventListener;
export let removeEventListener = Element.prototype.removeEventListener;
export let windowAddEventListener = Window.prototype.addEventListener;
export let windowRemoveEventListener = Window.prototype.removeEventListener;
export let dispatchEvent = Element.prototype.dispatchEvent;
export let contains = Node.prototype.contains || HTMLElement.prototype.contains;
export let getElementById = Document.prototype.getElementById;
export let elementQuerySelector = Element.prototype.querySelector;
export let fragmentQuerySelector = DocumentFragment.prototype.querySelector;
export let documentQuerySelector = Document.prototype.querySelector;
export let querySelector = /** @this {Element|Document|DocumentFragment} */ function(selector) {
  switch (this.nodeType) {
    case Node.ELEMENT_NODE:
      return elementQuerySelector.call(/** @type {Element} */ (this), selector);
    case Node.DOCUMENT_NODE:
      return documentQuerySelector.call(/** @type {Document} */ (this), selector);
    default:
      return fragmentQuerySelector.call(this, selector);
  }
};
export let elementQuerySelectorAll = Element.prototype.querySelectorAll;
export let fragmentQuerySelectorAll = DocumentFragment.prototype.querySelectorAll;
export let documentQuerySelectorAll = Document.prototype.querySelectorAll;
export let querySelectorAll = /** @this {Element|Document|DocumentFragment} */ function(selector) {
  switch (this.nodeType) {
    case Node.ELEMENT_NODE:
      return elementQuerySelectorAll.call(/** @type {Element} */ (this), selector);
    case Node.DOCUMENT_NODE:
      return documentQuerySelectorAll.call(/** @type {Document} */ (this), selector);
    default:
      return fragmentQuerySelectorAll.call(this, selector);
  }
};
