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

export class Wrapper {

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

  removeAttribute(name) {
    this.node[utils.SHADY_PREFIX + 'removeAttribute'](name);
  }

  attachShadow(options) {
    return this.node[utils.SHADY_PREFIX + 'attachShadow'](options);
  }

  get activeElement() {
    if (utils.isShadyRoot(this.node) || this.node.nodeType === Node.DOCUMENT_NODE) {
      return this.node[utils.SHADY_PREFIX + 'activeElement'];
    }
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

}

const proto = Wrapper.prototype;

const readAccessors = [
  'parentNode',
  'firstChild', 'lastChild',
  'nextSibling', 'previousSibling',
  'childNodes',
  'parentElement',
  'firstElementChild', 'lastElementChild',
  'nextElementSibling', 'previousElementSibling',
  'children', 'childElementCount',
  //'activeElement',
  'shadowRoot',
  'assignedSlot',
  'isConnected'
];

readAccessors.forEach(name => {
  Object.defineProperty(proto, name, {
    get() {
      return this.node[utils.SHADY_PREFIX + name];
    },
    configurable: true
  });

});

const readWriteAccessors = [
  'innerHTML', 'textContent', 'slot'
].concat(eventPropertyNames);

readWriteAccessors.forEach(name => {
  Object.defineProperty(proto, name, {
    get() {
      return this.node[utils.SHADY_PREFIX + name];
    },
    set(value) {
      this.node[utils.SHADY_PREFIX + name] = value;
    },
    configurable: true
  });

});

const wrapperMap = new WeakMap();

export function wrap(obj) {
  if (utils.isShadyRoot(obj) || obj instanceof Wrapper) {
    return obj;
  }
  if (!wrapperMap.has(obj)) {
    wrapperMap.set(obj, new Wrapper(obj));
  }
  return wrapperMap.get(obj);
}