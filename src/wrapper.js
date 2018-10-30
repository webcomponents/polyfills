/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {ElementAccessors, nodeMixin, queryMixin, elementMixin, documentMixin, slotMixin} from './patches.js';
import * as utils from './utils.js';

const elementDescriptors = Object.getOwnPropertyDescriptors(elementMixin);

export class Wrapper {

  constructor(node) {
    this.node = node;
  }

  // node
  addEventListener(name, fn, options) {
    return nodeMixin.addEventListener.call(this.node, name, fn, options);
  }

  removeEventListener(name, fn, options) {
    return nodeMixin.removeEventListener.call(this.node, name, fn, options);
  }

  appendChild(node) {
    return nodeMixin.appendChild.call(this.node, node);
  }

  insertBefore(node, ref_node) {
    return nodeMixin.insertBefore.call(this.node, node, ref_node);
  }

  removeChild(node) {
    return nodeMixin.removeChild.call(this.node, node);
  }

  replaceChild(node, ref_node) {
    return nodeMixin.replaceChild.call(this.node, node, ref_node);
  }

  cloneNode(deep) {
    return nodeMixin.cloneNode.call(this.node, deep);
  }

  getRootNode(options) {
    return nodeMixin.getRootNode.call(this.node, options);
  }

  contains(node) {
    return nodeMixin.contains.call(this.node, node);
  }

  dispatchEvent(event) {
    return nodeMixin.dispatchEvent.call(this.node, event);
  }

  // element
  setAttribute(name, value) {
    elementMixin.setAttribute.call(this.node, name, value);
  }

  removeAttribute(name) {
    elementMixin.removeAttribute.call(this.node, name);
  }

  attachShadow(options) {
    return elementMixin.attachShadow.call(this.node, options);
  }

  get slot() {
    return elementDescriptors.slot.get.call(this.node);
  }

  set slot(value) {
    elementDescriptors.slot.set.call(this.node, value);
  }

  get assignedSlot() {
    return elementDescriptors.assignedSlot.get.call(this.node);
  }

  // document
  importNode(node, deep) {
    if (this.node.nodeType === Node.DOCUMENT_NODE) {
      return documentMixin.importNode.call(this.node, node, deep);
    }
  }

  getElementById(id) {
    if (this.node.nodeType === Node.DOCUMENT_NODE) {
      return documentMixin.getElementById.call(this.node, id);
    }
  }

  // query
  querySelector(selector) {
    return queryMixin.querySelector.call(this.node, selector);
  }

  querySelectorAll(selector, useNative) {
    return queryMixin.querySelectorAll.call(this.node, selector, useNative);
  }

  // slot
  assignedNodes(options) {
    if (this.node.localName === 'slot') {
      return slotMixin.assignedNodes.call(this.node, options);
    }
  }

}

const proto = Wrapper.prototype;
for (let prop in ElementAccessors) {
  const source = ElementAccessors[prop];
  const target = { configurable: true };
  if (source.get) {
    target.get = function() {
      return source.get.call(this.node);
    }
  }
  if (source.set) {
    target.set = function(value) {
      source.set.call(this.node, value);
    }
  }
  Object.defineProperty(proto, prop, target);
}

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