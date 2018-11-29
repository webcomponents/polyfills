/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from './utils.js';
import {eventPropertyNames} from './patch-events.js';

/** @implements {IWrapper} */
class Wrapper {

  constructor(node) {
    this.node = node;
  }

  // node
  addEventListener(name, fn, options) {
    return this.node[utils.SHADY_PREFIX + 'addEventListener'](name, fn, options);
  }

  removeEventListener(name, fn, options) {
    return this.node[utils.SHADY_PREFIX + 'removeEventListener'](name, fn, options);
  }

  appendChild(node) {
    return this.node[utils.SHADY_PREFIX + 'appendChild'](node);
  }

  insertBefore(node, ref_node) {
    return this.node[utils.SHADY_PREFIX + 'insertBefore'](node, ref_node);
  }

  removeChild(node) {
    return this.node[utils.SHADY_PREFIX + 'removeChild'](node);
  }

  replaceChild(node, ref_node) {
    return this.node[utils.SHADY_PREFIX + 'replaceChild'](node, ref_node);
  }

  cloneNode(deep) {
    return this.node[utils.SHADY_PREFIX + 'cloneNode'](deep);
  }

  getRootNode(options) {
    return this.node[utils.SHADY_PREFIX + 'getRootNode'](options);
  }

  contains(node) {
    return this.node[utils.SHADY_PREFIX + 'contains'](node);
  }

  dispatchEvent(event) {
    return this.node[utils.SHADY_PREFIX + 'dispatchEvent'](event);
  }

  // element
  setAttribute(name, value) {
    this.node[utils.SHADY_PREFIX + 'setAttribute'](name, value);
  }

  // NOTE: not needed, just here for balance
  getAttribute(name) {
    return this.node[utils.NATIVE_PREFIX + 'getAttribute'](name);
  }

  // NOTE: not needed, just here for balance
  hasAttribute(name) {
    return this.node[utils.NATIVE_PREFIX + 'hasAttribute'](name);
  }

  removeAttribute(name) {
    this.node[utils.SHADY_PREFIX + 'removeAttribute'](name);
  }

  attachShadow(options) {
    return this.node[utils.SHADY_PREFIX + 'attachShadow'](options);
  }

  get activeElement() {
    if (utils.isShadyRoot(this.node) || this.node.nodeType === Node.DOCUMENT_NODE) {
      const e = this.node[utils.SHADY_PREFIX + 'activeElement'];
      return e;
    }
  }

  // Installed for compatibility with browsers (older Chrome/Safari) that do
  // not have a configurable `activeElement` accessor. Enables noPatch and
  // patch mode both to consistently use ShadyDOM.wrap(document)._activeElement.
  get _activeElement() {
    return this.activeElement;
  }

  // NOTE: not needed, just here for balance
  focus() {
    this.node[utils.NATIVE_PREFIX + 'focus']();
  }

  blur() {
    this.node[utils.SHADY_PREFIX + 'blur']();
  }

  // document
  importNode(node, deep) {
    if (this.node.nodeType === Node.DOCUMENT_NODE) {
      return this.node[utils.SHADY_PREFIX + 'importNode'](node, deep);
    }
  }

  getElementById(id) {
    if (this.node.nodeType === Node.DOCUMENT_NODE) {
      return this.node[utils.SHADY_PREFIX + 'getElementById'](id);
    }
  }

  // query
  querySelector(selector) {
    return this.node[utils.SHADY_PREFIX + 'querySelector'](selector);
  }

  querySelectorAll(selector, useNative) {
    return this.node[utils.SHADY_PREFIX + 'querySelectorAll'](selector, useNative);
  }

  // slot
  assignedNodes(options) {
    if (this.node.localName === 'slot') {
      return this.node[utils.SHADY_PREFIX + 'assignedNodes'](options);
    }
  }

  get host() {
    if (utils.isShadyRoot(this.node)) {
      return this.node.host;
    }
  }

  get parentNode() {
    return this.node[utils.SHADY_PREFIX + 'parentNode'];
  }

  get firstChild() {
    return this.node[utils.SHADY_PREFIX + 'firstChild'];
  }

  get lastChild() {
    return this.node[utils.SHADY_PREFIX + 'lastChild'];
  }

  get nextSibling() {
    return this.node[utils.SHADY_PREFIX + 'nextSibling'];
  }

  get previousSibling() {
    return this.node[utils.SHADY_PREFIX + 'previousSibling'];
  }

  get childNodes() {
    return this.node[utils.SHADY_PREFIX + 'childNodes'];
  }

  get parentElement() {
    return this.node[utils.SHADY_PREFIX + 'parentElement'];
  }

  get firstElementChild() {
    return this.node[utils.SHADY_PREFIX + 'firstElementChild'];
  }

  get lastElementChild() {
    return this.node[utils.SHADY_PREFIX + 'lastElementChild'];
  }

  get nextElementSibling() {
    return this.node[utils.SHADY_PREFIX + 'nextElementSibling'];
  }

  get previousElementSibling() {
    return this.node[utils.SHADY_PREFIX + 'previousElementSibling'];
  }

  get children() {
    return this.node[utils.SHADY_PREFIX + 'children'];
  }

  get childElementCount() {
    return this.node[utils.SHADY_PREFIX + 'childElementCount'];
  }

  get shadowRoot() {
    return this.node[utils.SHADY_PREFIX + 'shadowRoot'];
  }

  get assignedSlot() {
    return this.node[utils.SHADY_PREFIX + 'assignedSlot'];
  }

  get isConnected() {
    return this.node[utils.SHADY_PREFIX + 'isConnected'];
  }

  get innerHTML() {
    return this.node[utils.SHADY_PREFIX + 'innerHTML'];
  }

  set innerHTML(value) {
    this.node[utils.SHADY_PREFIX + 'innerHTML'] = value;
  }

  get textContent() {
    return this.node[utils.SHADY_PREFIX + 'textContent'];
  }

  set textContent(value) {
    this.node[utils.SHADY_PREFIX + 'textContent'] = value;
  }

  get slot() {
    return this.node[utils.SHADY_PREFIX + 'slot'];
  }

  set slot(value) {
    this.node[utils.SHADY_PREFIX + 'slot'] = value;
  }

}

eventPropertyNames.forEach(name => {
  Object.defineProperty(Wrapper.prototype, name, {
    get() {
      return this.node[utils.SHADY_PREFIX + name];
    },
    set(value) {
      this.node[utils.SHADY_PREFIX + name] = value;
    },
    configurable: true
  });

});

export {Wrapper};

const wrapperMap = new WeakMap();

export function wrap(obj) {
  if (utils.isShadyRoot(obj) || obj instanceof Wrapper) {
    return obj;
  }
  let wrapper = wrapperMap.get(obj)
  if (!wrapper) {
    wrapper = new Wrapper(obj);
    wrapperMap.set(obj, wrapper);
  }
  return wrapper;
}