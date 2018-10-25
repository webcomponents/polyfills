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
import {flush} from './flush.js';
import * as nativeMethods from './native-methods.js';
import {insertBefore, removeChild} from './methods-mutation.js';
import {getRootNode} from './methods-get-root-node.js';
import {ElementAccessors as accessors, ActiveElementAccessor, ShadowRootAccessor, IsConnectedAccessor} from './accessors.js';
import {addEventListener, removeEventListener} from './patch-events.js';
import {attachShadow} from './attach-shadow.js';
import {shadyDataForNode, ensureShadyDataForNode} from './shady-data.js';

const doc = window.document;

function getAssignedSlot(node) {
  renderRootNode(node);
  const nodeData = shadyDataForNode(node);
  return nodeData && nodeData.assignedSlot || null;
}

/**
 * Should be called whenever an attribute changes. If the `slot` attribute
 * changes, provokes rendering if necessary. If a `<slot>` element's `name`
 * attribute changes, updates the root's slot map and renders.
 * @param {Node} node
 * @param {string} name
 */
function distributeAttributeChange(node, name) {
  if (name === 'slot') {
    const parent = accessors.parentNode.get.call(node);
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

// NOTE: `query` is used primarily for ShadyDOM's querySelector impl,
// but it's also generally useful to recurse through the element tree
// and is used by Polymer's styling system.
/**
 * @param {Node} node
 * @param {Function} matcher
 * @param {Function=} halter
 */
export function query(node, matcher, halter) {
  let list = [];
  queryElements(accessors.childNodes.get.call(node), matcher,
    halter, list);
  return list;
}

function queryElements(elements, matcher, halter, list) {
  for (let i=0, l=elements.length, c; (i<l) && (c=elements[i]); i++) {
    if (c.nodeType === Node.ELEMENT_NODE &&
        queryElement(c, matcher, halter, list)) {
      return true;
    }
  }
}

function queryElement(node, matcher, halter, list) {
  let result = matcher(node);
  if (result) {
    list.push(node);
  }
  if (halter && halter(result)) {
    return result;
  }
  queryElements(accessors.childNodes.get.call(node), matcher,
    halter, list);
}

export function renderRootNode(element) {
  var root = getRootNode(element);
  if (utils.isShadyRoot(root)) {
    root._render();
  }
}

export function setAttribute(node, attr, value) {
  if (node.ownerDocument !== doc) {
    nativeMethods.setAttribute.call(node, attr, value);
  } else {
    const scopingShim = utils.getScopingShim();
    if (scopingShim && attr === 'class') {
      scopingShim['setElementClass'](node, value);
    } else {
      nativeMethods.setAttribute.call(node, attr, value);
      distributeAttributeChange(node, attr);
    }
  }
}

export function removeAttribute(node, attr) {
  nativeMethods.removeAttribute.call(node, attr);
  distributeAttributeChange(node, attr);
}

export function cloneNode(node, deep) {
  if (node.localName == 'template') {
    return nativeMethods.cloneNode.call(node, deep);
  } else {
    let n = nativeMethods.cloneNode.call(node, false);
    // Attribute nodes historically had childNodes, but they have later
    // been removed from the spec.
    // Make sure we do not do a deep clone on them for old browsers (IE11)
    if (deep && n.nodeType !== Node.ATTRIBUTE_NODE) {
      let c$ = accessors.childNodes.get.call(node);
      for (let i=0, nc; i < c$.length; i++) {
        nc = c$[i].cloneNode(true);
        n.appendChild(nc);
      }
    }
    return n;
  }
}

// note: Though not technically correct, we fast path `importNode`
// when called on a node not owned by the main document.
// This allows, for example, elements that cannot
// contain custom elements and are therefore not likely to contain shadowRoots
// to cloned natively. This is a fairly significant performance win.
export function importNode(node, deep) {
  // A template element normally has no children with shadowRoots, so make
  // sure we always make a deep copy to correctly construct the template.content
  if (node.ownerDocument !== document || node.localName === 'template') {
    return nativeMethods.importNode.call(document, node, deep);
  }
  let n = nativeMethods.importNode.call(document, node, false);
  if (deep) {
    let c$ = accessors.childNodes.get.call(node);
    for (let i=0, nc; i < c$.length; i++) {
      nc = importNode(c$[i], true);
      n.appendChild(nc);
    }
  }
  return n;
}

export const windowMixin = {

  // NOTE: ensure these methods are bound to `window` so that `this` is correct
  // when called directly from global context without a receiver; e.g.
  // `addEventListener(...)`.
  addEventListener: addEventListener.bind(window),

  removeEventListener: removeEventListener.bind(window)

};

export const nodeMixin = {

  addEventListener: addEventListener,

  removeEventListener: removeEventListener,

  appendChild(node) {
    return insertBefore(this, node);
  },

  insertBefore(node, ref_node) {
    return insertBefore(this, node, ref_node);
  },

  removeChild(node) {
    return removeChild(this, node);
  },

  /**
   * @this {Node}
   */
  replaceChild(node, ref_node) {
    insertBefore(this, node, ref_node);
    removeChild(this, ref_node);
    return node;
  },

  /**
   * @this {Node}
   */
  cloneNode(deep) {
    return cloneNode(this, deep);
  },

  /**
   * @this {Node}
   */
  getRootNode(options) {
    return getRootNode(this, options);
  },

  contains(node) {
    return utils.contains(this, node);
  },

  /**
   * @this {Node}
   */
  dispatchEvent(event) {
    flush();
    return nativeMethods.dispatchEvent.call(this, event);
  }

};

// NOTE: we can do this regardless of the browser supporting native accessors
// since this is always "new" in that case.
Object.defineProperties(nodeMixin, IsConnectedAccessor);

// NOTE: For some reason 'Text' redefines 'assignedSlot'
export const textMixin = {
  /**
   * @this {Text}
   */
  get assignedSlot() {
    return getAssignedSlot(this);
  }
};

export const queryMixin = {

  // TODO(sorvell): consider doing native QSA and filtering results.
  /**
   * @this {DocumentFragment}
   */
  querySelector(selector) {
    // match selector and halt on first result.
    let result = query(this, function(n) {
      return utils.matchesSelector(n, selector);
    }, function(n) {
      return Boolean(n);
    })[0];
    return result || null;
  },

  /**
   * @this {DocumentFragment}
   */
  // TODO(sorvell): `useNative` option relies on native querySelectorAll and
  // misses distributed nodes, see
  // https://github.com/webcomponents/shadydom/pull/210#issuecomment-361435503
  querySelectorAll(selector, useNative) {
    if (useNative) {
      const o = Array.prototype.slice.call(nativeMethods.querySelectorAll.call(this, selector));
      const root = getRootNode(this);
      return o.filter(e => e.getRootNode() == root);
    }
    return query(this, function(n) {
      return utils.matchesSelector(n, selector);
    });
  }

};

export const slotMixin = {

  /**
   * @this {HTMLSlotElement}
   */
  assignedNodes(options) {
    if (this.localName === 'slot') {
      renderRootNode(this);
      const nodeData = shadyDataForNode(this);
      return nodeData ?
        ((options && options.flatten ? nodeData.flattenedNodes :
          nodeData.assignedNodes) || []) :
        [];
    }
  }

};

export const elementMixin = utils.extendAll({

  /**
   * @this {HTMLElement}
   */
  setAttribute(name, value) {
    setAttribute(this, name, value);
  },

  /**
   * @this {HTMLElement}
   */
  removeAttribute(name) {
    removeAttribute(this, name);
  },

  /**
   * @this {HTMLElement}
   */
  attachShadow(options) {
    return attachShadow(this, options);
  },

  /**
   * @this {HTMLElement}
   */
  get slot() {
    return this.getAttribute('slot');
  },

  /**
   * @this {HTMLElement}
   */
  set slot(value) {
    setAttribute(this, 'slot', value);
  },

  /**
   * @this {HTMLElement}
   */
  get assignedSlot() {
    return getAssignedSlot(this);
  }

}, queryMixin, slotMixin);

Object.defineProperties(elementMixin, ShadowRootAccessor);

export const documentMixin = utils.extendAll({
  /**
   * @this {Document}
   */
  importNode(node, deep) {
    return importNode(node, deep);
  },

  /**
   * @this {Document}
   */
  getElementById(id) {
    let result = query(this, function(n) {
      return n.id == id;
    }, function(n) {
      return Boolean(n);
    })[0];
    return result || null;
  }

}, queryMixin);

Object.defineProperties(documentMixin, {
  '_activeElement': ActiveElementAccessor.activeElement
});

const nativeBlur = HTMLElement.prototype.blur;

export const htmlElementMixin = {
  /**
   * @this {HTMLElement}
   */
  blur() {
    const nodeData = shadyDataForNode(this);
    let root = nodeData && nodeData.root;
    let shadowActive = root && root.activeElement;
    if (shadowActive) {
      shadowActive.blur();
    } else {
      nativeBlur.call(this);
    }
  }
};

for (const property of Object.getOwnPropertyNames(Document.prototype)) {
  if (property.substring(0,2) === 'on') {
    Object.defineProperty(htmlElementMixin, property, {
      /** @this {HTMLElement} */
      set: function(fn) {
        const shadyData = ensureShadyDataForNode(this);
        const eventName = property.substring(2);
        shadyData.__onCallbackListeners[property] && this.removeEventListener(eventName, shadyData.__onCallbackListeners[property]);
        this.addEventListener(eventName, fn, {});
        shadyData.__onCallbackListeners[property] = fn;
      },
      /** @this {HTMLElement} */
      get() {
        const shadyData = shadyDataForNode(this);
        return shadyData && shadyData.__onCallbackListeners[property];
      },
      configurable: true
    });
  }
}

export const shadowRootMixin = {
  /**
   * @this {ShadowRoot}
   */
  addEventListener(type, fn, optionsOrCapture) {
    if (typeof optionsOrCapture !== 'object') {
      optionsOrCapture = {
        capture: Boolean(optionsOrCapture)
      }
    }
    optionsOrCapture.__shadyTarget = this;
    this.host.addEventListener(type, fn, optionsOrCapture);
  },

  /**
   * @this {ShadowRoot}
   */
  removeEventListener(type, fn, optionsOrCapture) {
    if (typeof optionsOrCapture !== 'object') {
      optionsOrCapture = {
        capture: Boolean(optionsOrCapture)
      }
    }
    optionsOrCapture.__shadyTarget = this;
    this.host.removeEventListener(type, fn, optionsOrCapture);
  },

  /**
   * @this {ShadowRoot}
   */
  getElementById(id) {
    let result = query(this, function(n) {
      return n.id == id;
    }, function(n) {
      return Boolean(n);
    })[0];
    return result || null;
  }
}