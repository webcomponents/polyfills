/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from '../utils.js';
import {scopeClassAttribute} from '../style-scoping.js';
import {shadyDataForNode} from '../shady-data.js';
import {attachShadow} from '../attach-shadow.js';

const doc = window.document;

/**
 * Should be called whenever an attribute changes. If the `slot` attribute
 * changes, provokes rendering if necessary. If a `<slot>` element's `name`
 * attribute changes, updates the root's slot map and renders.
 * @param {Node} node
 * @param {string} name
 */
function distributeAttributeChange(node, name) {
  if (name === 'slot') {
    const parent = node[utils.SHADY_PREFIX + 'parentNode'];
    if (utils.hasShadowRootWithSlot(parent)) {
      shadyDataForNode(parent).root._asyncRender();
    }
  } else if (node.localName === 'slot' && name === 'name') {
    let root = utils.ownerShadyRootForNode(node);
    if (root) {
      root._updateSlotName(node);
      root._asyncRender();
    }
  }
}

export const ElementPatches = utils.getOwnPropertyDescriptors({

  /** @this {Element} */
  get previousElementSibling() {
    const nodeData = shadyDataForNode(this);
    if (nodeData && nodeData.previousSibling !== undefined) {
      let n = this[utils.SHADY_PREFIX + 'previousSibling'];
      while (n && n.nodeType !== Node.ELEMENT_NODE) {
        n = n[utils.SHADY_PREFIX + 'previousSibling'];
      }
      return n;
    } else {
      return this[utils.NATIVE_PREFIX + 'previousElementSibling'];
    }
  },

  /** @this {Element} */
  get nextElementSibling() {
    const nodeData = shadyDataForNode(this);
    if (nodeData && nodeData.nextSibling !== undefined) {
      let n = this[utils.SHADY_PREFIX + 'nextSibling'];
      while (n && n.nodeType !== Node.ELEMENT_NODE) {
        n = n[utils.SHADY_PREFIX + 'nextSibling'];
      }
      return n;
    } else {
      return this[utils.NATIVE_PREFIX + 'nextElementSibling'];
    }
  },

  /** @this {Element} */
  get slot() {
    return this.getAttribute('slot');
  },

  /** @this {Element} */
  set slot(value) {
    this[utils.SHADY_PREFIX + 'setAttribute']('slot', value);
  },

  // Note: Can be patched on element prototype on all browsers.
  // Must be patched on instance on browsers that support native Shadow DOM
  // but do not have builtin accessors (old Chrome).
  /** @this {Element} */
  get shadowRoot() {
    const nodeData = shadyDataForNode(this);
    return nodeData && nodeData.publicRoot || null;
  },

  /** @this {Element} */
  get className() {
    return this.getAttribute('class') || '';
  },

  /**
   * @this {Element}
   * @param {string} value
   */
  set className(value) {
    this[utils.SHADY_PREFIX + 'setAttribute']('class', value);
  },

  /**
   * @this {Element}
   * @param {string} attr
   * @param {string} value
   */
  setAttribute(attr, value) {
    if (this.ownerDocument !== doc) {
      this[utils.NATIVE_PREFIX + 'setAttribute'](attr, value);
    } else if (!scopeClassAttribute(this, attr, value)) {
      this[utils.NATIVE_PREFIX + 'setAttribute'](attr, value);
      distributeAttributeChange(this, attr);
    }
  },

  /**
   * @this {Element}
   * @param {string} attr
   */
  removeAttribute(attr) {
    this[utils.NATIVE_PREFIX + 'removeAttribute'](attr);
    distributeAttributeChange(this, attr);
  },

  /**
   * @this {Element}
   * @param {object} options
   */
  attachShadow(options) {
    return attachShadow(this, options);
  }

});