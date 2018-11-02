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
import {getInnerHTML} from './innerHTML.js';
import {addEventListener, removeEventListener} from './patch-events.js';
import {shadyDataForNode, ensureShadyDataForNode} from './shady-data.js';

const doc = window.document;

// Patched `insertBefore`. Note that all mutations that add nodes are routed
// here. When a <slot> is added or a node is added to a host with a shadowRoot
// with a slot, a standard dom `insert` call is aborted and `_asyncRender`
// is called on the relevant shadowRoot. In all other cases, a standard dom
// `insert` can be made, but the location and ref_node may need to be changed.
/**
 * @param {!Node} parent
 * @param {Node} node
 * @param {Node=} ref_node
 */
export function insertBefore(parent, node, ref_node) {
  // optimization: assume native insertBefore is ok if the nodes are not in the document.
  if (parent.ownerDocument !== doc && node.ownerDocument !== doc) {
    parent[utils.NATIVE_PREFIX + 'insertBefore'](node, ref_node);
    return;
  }
  if (node === parent) {
    throw Error(`Failed to execute 'appendChild' on 'Node': The new child element contains the parent.`);
  }
  if (ref_node) {
    const refData = shadyDataForNode(ref_node);
    const p = refData && refData.parentNode;
    if ((p !== undefined && p !== parent) ||
      (p === undefined && ref_node[utils.NATIVE_PREFIX + 'parentNode'] !== parent)) {
      throw Error(`Failed to execute 'insertBefore' on 'Node': The node ` +
       `before which the new node is to be inserted is not a child of this node.`);
    }
  }
  if (ref_node === node) {
    return node;
  }
  /** @type {!Array<!HTMLSlotElement>} */
  let slotsAdded = [];
  /** @type {function(!Node, string): void} */
  let scopingFn = addShadyScoping;
  let ownerRoot = utils.ownerShadyRootForNode(parent);
  /** @type {string} */
  let newScopeName;
  if (ownerRoot) {
    // get scope name from new ShadyRoot host
    newScopeName = ownerRoot.host.localName;
  } else {
    // borrow parent's scope name
    newScopeName = currentScopeForNode(parent);
  }
  // remove from existing location
  const parentNode = ElementAccessors.parentNode.get.call(node);
  if (parentNode) {
    // NOTE: avoid node.removeChild as this *can* trigger another patched
    // method (e.g. custom elements) and we want only the shady method to run.
    // The following table describes what style scoping actions should happen as a result of this insertion.
    // document -> shadowRoot: replace
    // shadowRoot -> shadowRoot: replace
    // shadowRoot -> shadowRoot of same type: do nothing
    // shadowRoot -> document: allow unscoping
    // document -> document: do nothing
    // The "same type of shadowRoot" and "document to document cases rely on `currentScopeIsCorrect` returning true
    const oldScopeName = currentScopeForNode(node);
    removeChild(parentNode, node, Boolean(ownerRoot) || !(getRootNode(node) instanceof ShadowRoot));
    scopingFn = (node, newScopeName) => {
      replaceShadyScoping(node, newScopeName, oldScopeName);
    };
  }
  // add to new parent
  let allowNativeInsert = true;
  // TODO(sorvell): svg hack is just for testing.
  const needsScoping = node['__noInsertionPoint'] === undefined && node.localName !== 'svg' && !currentScopeIsCorrect(node, newScopeName);
  if (ownerRoot) {
    // in a shadowroot, only tree walk if new insertion points may have been added, or scoping is needed
    if (!node['__noInsertionPoint'] || needsScoping) {
      treeVisitor(node, (node) => {
        if (node.localName === 'slot') {
          slotsAdded.push(/** @type {!HTMLSlotElement} */(node));
        }
        if (needsScoping) {
          scopingFn(node, newScopeName);
        }
      });
    }
  } else if (needsScoping) {
    // in a document or disconnected tree, replace scoping if necessary
    const oldScopeName = currentScopeForNode(node);
    treeVisitor(node, (node) => {
      replaceShadyScoping(node, newScopeName, oldScopeName);
    });
  }
  if (slotsAdded.length) {
    ownerRoot._addSlots(slotsAdded);
  }
  // if a slot is added, must render containing root.
  if (parent.localName === 'slot' || slotsAdded.length) {
    if (ownerRoot) {
      ownerRoot._asyncRender();
    }
  }
  if (utils.isTrackingLogicalChildNodes(parent)) {
    recordInsertBefore(node, parent, ref_node);
    // when inserting into a host with a shadowRoot with slot, use
    // `shadowRoot._asyncRender()` via `attach-shadow` module
    const parentData = shadyDataForNode(parent);
    if (utils.hasShadowRootWithSlot(parent)) {
      parentData.root._asyncRender();
      allowNativeInsert = false;
    // when inserting into a host with shadowRoot with NO slot, do nothing
    // as the node should not be added to composed dome anywhere.
    } else if (parentData.root) {
      allowNativeInsert = false;
    }
  }
  if (allowNativeInsert) {
    // if adding to a shadyRoot, add to host instead
    let container = utils.isShadyRoot(parent) ?
      /** @type {ShadowRoot} */(parent).host : parent;
    // if ref_node, get the ref_node that's actually in composed dom.
    if (ref_node) {
      ref_node = firstComposedNode(ref_node);
      container[utils.NATIVE_PREFIX + 'insertBefore'](node, ref_node);
    } else {
      container[utils.NATIVE_PREFIX + 'appendChild'](node);
    }
  // Since ownerDocument is not patched, it can be incorrect afer this call
  // if the node is physically appended via distribution. This can result
  // in the custom elements polyfill not upgrading the node if it's in an inert doc.
  // We correct this by calling `adoptNode`.
  } else if (node.ownerDocument !== parent.ownerDocument) {
    parent.ownerDocument.adoptNode(node);
  }
  scheduleObserver(parent, node);
  return node;
}

/**
 * Patched `removeChild`. Note that all dom "removals" are routed here.
 * Removes the given `node` from the element's `children`.
 * This method also performs dom composition.
 * @param {Node} parent
 * @param {Node} node
 * @param {boolean=} skipUnscoping
*/
export function removeChild(parent, node, skipUnscoping = false) {
  if (parent.ownerDocument !== doc) {
    return parent[utils.NATIVE_PREFIX + 'removeChild'](node);
  }
  if (ElementAccessors.parentNode.get.call(node) !== parent) {
    throw Error('The node to be removed is not a child of this node: ' +
      node);
  }
  let preventNativeRemove;
  let ownerRoot = utils.ownerShadyRootForNode(node);
  let removingInsertionPoint;
  const parentData = shadyDataForNode(parent);
  if (utils.isTrackingLogicalChildNodes(parent)) {
    recordRemoveChild(node, parent);
    if (utils.hasShadowRootWithSlot(parent)) {
      parentData.root._asyncRender();
      preventNativeRemove = true;
    }
  }
  // unscope a node leaving a ShadowRoot if ShadyCSS is present, and this node
  // is not going to be rescoped in `insertBefore`
  if (getScopingShim() && !skipUnscoping && ownerRoot) {
    const oldScopeName = currentScopeForNode(node);
    treeVisitor(node, (node) => {
      removeShadyScoping(node, oldScopeName);
    });
  }
  removeOwnerShadyRoot(node);
  // if removing slot, must render containing root
  if (ownerRoot) {
    let changeSlotContent = parent && parent.localName === 'slot';
    if (changeSlotContent) {
      preventNativeRemove = true;
    }
    removingInsertionPoint = ownerRoot._removeContainedSlots(node);
    if (removingInsertionPoint || changeSlotContent) {
      ownerRoot._asyncRender();
    }
  }
  if (!preventNativeRemove) {
    // if removing from a shadyRoot, remove from host instead
    let container = utils.isShadyRoot(parent) ?
      /** @type {ShadowRoot} */(parent).host :
      parent;
    // not guaranteed to physically be in container; e.g.
    // (1) if parent has a shadyRoot, element may or may not at distributed
    // location (could be undistributed)
    // (2) if parent is a slot, element may not ben in composed dom
    if (!(parentData.root || node.localName === 'slot') ||
      (container === node[utils.NATIVE_PREFIX + 'parentNode'])) {
      container[utils.NATIVE_PREFIX + 'removeChild'](node);
    }
  }
  scheduleObserver(parent, null, node);
  return node;
}

function removeOwnerShadyRoot(node) {
  // optimization: only reset the tree if node is actually in a root
  if (hasCachedOwnerRoot(node)) {
    let c$ = ElementAccessors.childNodes.get.call(node);
    for (let i=0, l=c$.length, n; (i<l) && (n=c$[i]); i++) {
      removeOwnerShadyRoot(n);
    }
  }
  const nodeData = shadyDataForNode(node);
  if (nodeData) {
    nodeData.ownerShadyRoot = undefined;
  }
}

function hasCachedOwnerRoot(node) {
  const nodeData = shadyDataForNode(node);
  return Boolean(nodeData && nodeData.ownerShadyRoot !== undefined);
}

/**
 * Finds the first flattened node that is composed in the node's parent.
 * If the given node is a slot, then the first flattened node is returned
 * if it exists, otherwise advance to the node's nextSibling.
 * @param {Node} node within which to find first composed node
 * @returns {Node} first composed node
 */
function firstComposedNode(node) {
  let composed = node;
  if (node && node.localName === 'slot') {
    const nodeData = shadyDataForNode(node);
    const flattened = nodeData && nodeData.flattenedNodes;
    composed = flattened && flattened.length ? flattened[0] :
      firstComposedNode(node.nextSibling);
  }
  return composed;
}

/**
 * @param {Node} node
 * @param {Node=} addedNode
 * @param {Node=} removedNode
 */
function scheduleObserver(node, addedNode, removedNode) {
  const nodeData = shadyDataForNode(node);
  const observer = nodeData && nodeData.observer;
  if (observer) {
    if (addedNode) {
      observer.addedNodes.push(addedNode);
    }
    if (removedNode) {
      observer.removedNodes.push(removedNode);
    }
    observer.schedule();
  }
}

/**
 * @param {Node} node
 * @param {Object=} options
 */
export function getRootNode(node, options) { // eslint-disable-line no-unused-vars
  if (!node || !node.nodeType) {
    return;
  }
  const nodeData = ensureShadyDataForNode(node);
  let root = nodeData.ownerShadyRoot;
  if (root === undefined) {
    if (utils.isShadyRoot(node)) {
      root = node;
      nodeData.ownerShadyRoot = root;
    } else {
      let parent = ElementAccessors.parentNode.get.call(node);
      root = parent ? getRootNode(parent) : node;
      // memo-ize result for performance but only memo-ize
      // result if node is in the document. This avoids a problem where a root
      // can be cached while an element is inside a fragment.
      // If this happens and we cache the result, the value can become stale
      // because for perf we avoid processing the subtree of added fragments.
      if (document.documentElement[utils.NATIVE_PREFIX + 'contains'](node)) {
        nodeData.ownerShadyRoot = root;
      }
    }

  }
  return root;
}

function getAssignedSlot(node) {
  renderRootNode(node);
  const nodeData = shadyDataForNode(node);
  return nodeData && nodeData.assignedSlot || null;
}

// NOTE: `query` is used primarily for ShadyDOM's querySelector impl,
// but it's also generally useful to recurse through the element tree
// and is used by Polymer's styling system.
/**
 * @param {Node} node
 * @param {Function} matcher
 * @param {Function=} halter
 */
function query(node, matcher, halter) {
  let list = [];
  queryElements(ElementAccessors.childNodes.get.call(node), matcher,
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
  queryElements(ElementAccessors.childNodes.get.call(node), matcher,
    halter, list);
}

function renderRootNode(element) {
  var root = getRootNode(element);
  if (utils.isShadyRoot(root)) {
    root._render();
  }
}

export function cloneNode(node, deep) {
  if (node.localName == 'template') {
    return node[utils.NATIVE_PREFIX + 'cloneNode'](deep);
  } else {
    let n = node[utils.NATIVE_PREFIX + 'cloneNode'](false);
    // Attribute nodes historically had childNodes, but they have later
    // been removed from the spec.
    // Make sure we do not do a deep clone on them for old browsers (IE11)
    if (deep && n.nodeType !== Node.ATTRIBUTE_NODE) {
      let c$ = ElementAccessors.childNodes.get.call(node);
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
  if (node.ownerDocument !== doc || node.localName === 'template') {
    return doc[utils.NATIVE_PREFIX + 'importNode'](node, deep);
  }
  let n = doc[utils.NATIVE_PREFIX + 'importNode'](node, false);
  if (deep) {
    let c$ = ElementAccessors.childNodes.get.call(node);
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

export const IsConnectedAccessor = {

  isConnected: {
    /**
     * @this {Node}
     */
    get() {
      if (nativeIsConnected && nativeIsConnected.call(this)) {
        return true;
      }
      if (this.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
        return false;
      }
      // Fast path for distributed nodes.
      const ownerDocument = this.ownerDocument;
      if (utils.hasDocumentContains) {
        if (ownerDocument[utils.NATIVE_PREFIX + 'contains'](this)) {
          return true;
        }
      } else if (ownerDocument.documentElement &&
        ownerDocument.documentElement[utils.NATIVE_PREFIX + 'contains'](this)) {
        return true;
      }
      // Slow path for non-distributed nodes.
      let node = this;
      while (node && !(node instanceof Document)) {
        node = OutsideAccessors.parentNode.get.call(node) || (utils.isShadyRoot(node) ? /** @type {ShadowRoot} */(node).host : undefined);
      }
      return !!(node && node instanceof Document);
    },
    configurable: true
  }
};

const nativeActiveElementDescriptor =
  /** @type {ObjectPropertyDescriptor} */(
    Object.getOwnPropertyDescriptor(Document.prototype, 'activeElement')
  );
function getDocumentActiveElement() {
  if (nativeActiveElementDescriptor && nativeActiveElementDescriptor.get) {
    return nativeActiveElementDescriptor.get.call(document);
  } else if (!utils.settings.hasDescriptors) {
    return document.activeElement;
  }
}

function activeElementForNode(node) {
  let active = getDocumentActiveElement();
  // In IE11, activeElement might be an empty object if the document is
  // contained in an iframe.
  // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10998788/
  if (!active || !active.nodeType) {
    return null;
  }
  let isShadyRoot = !!(utils.isShadyRoot(node));
  if (node !== document) {
    // If this node isn't a document or shady root, then it doesn't have
    // an active element.
    if (!isShadyRoot) {
      return null;
    }
    // If this shady root's host is the active element or the active
    // element is not a descendant of the host (in the composed tree),
    // then it doesn't have an active element.
    if (node.host === active ||
        !node.host[utils.NATIVE_PREFIX + 'contains'](active)) {
      return null;
    }
  }
  // This node is either the document or a shady root of which the active
  // element is a (composed) descendant of its host; iterate upwards to
  // find the active element's most shallow host within it.
  let activeRoot = utils.ownerShadyRootForNode(active);
  while (activeRoot && activeRoot !== node) {
    active = activeRoot.host;
    activeRoot = utils.ownerShadyRootForNode(active);
  }
  if (node === document) {
    // This node is the document, so activeRoot should be null.
    return activeRoot ? null : active;
  } else {
    // This node is a non-document shady root, and it should be
    // activeRoot.
    return activeRoot === node ? active : null;
  }
}

// Note: Can be patched on document prototype on browsers with builtin ElementAccessors.
// Must be patched separately on simulated ShadowRoot.
// Must be patched as `_activeElement` on browsers without builtin ElementAccessors.
export const ActiveElementAccessor = {

  activeElement: {
    /**
     * @this {HTMLElement}
     */
    get() {
      return activeElementForNode(this);
    },
    /**
     * @this {HTMLElement}
     */
    set() {},
    configurable: true
  }

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
    return this[utils.NATIVE_PREFIX + 'dispatchEvent'](event);
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
      const o = Array.prototype.slice.call(this[utils.NATIVE_PREFIX + 'querySelectorAll'](selector));
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

// Note: Can be patched on element prototype on all browsers.
// Must be patched on instance on browsers that support native Shadow DOM
// but do not have builtin accessors (old Chrome).
export let ShadowRootAccessor = {

  shadowRoot: {
    /**
     * @this {HTMLElement}
     */
    get() {
      const nodeData = shadyDataForNode(this);
      return nodeData && nodeData.publicRoot || null;
    },
    configurable: true
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
    return utils.attachShadow(this, options);
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

});

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

/**
 * Should be called whenever an attribute changes. If the `slot` attribute
 * changes, provokes rendering if necessary. If a `<slot>` element's `name`
 * attribute changes, updates the root's slot map and renders.
 * @param {Node} node
 * @param {string} name
 */
function distributeAttributeChange(node, name) {
  if (name === 'slot') {
    const parent = ElementAccessors.parentNode.get.call(node);
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

export function setAttribute(node, attr, value) {
  if (node.ownerDocument !== doc) {
    node[utils.NATIVE_PREFIX + 'setAttribute'](attr, value);
  } else {
    const scopingShim = getScopingShim();
    if (scopingShim && attr === 'class') {
      scopingShim['setElementClass'](node, value);
    } else {
      node[utils.NATIVE_PREFIX + 'setAttribute'](attr, value);
      distributeAttributeChange(node, attr);
    }
  }
}

export function removeAttribute(node, attr) {
  node[utils.NATIVE_PREFIX + 'removeAttribute'](attr);
  distributeAttributeChange(node, attr);
}

function clearNode(node) {
  let firstChild;
  while ((firstChild = ElementAccessors.firstChild.get.call(node))) {
    removeChild(node, firstChild);
  }
}

const hasDescriptors = utils.settings.hasDescriptors;
const inertDoc = document.implementation.createHTMLDocument('inert');

const nativeIsConnectedAccessors =
/** @type {ObjectPropertyDescriptor} */(
  Object.getOwnPropertyDescriptor(Node.prototype, 'isConnected')
);

const nativeIsConnected = nativeIsConnectedAccessors && nativeIsConnectedAccessors.get;

export const OutsideAccessors = {

  parentElement: {
    /** @this {Node} */
    get() {
      const nodeData = shadyDataForNode(this);
      let l = nodeData && nodeData.parentNode;
      if (l && l.nodeType !== Node.ELEMENT_NODE) {
        l = null;
      }
      return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'parentElement'];
    },
    configurable: true
  },

  parentNode: {
    /** @this {Node} */
    get() {
      const nodeData = shadyDataForNode(this);
      const l = nodeData && nodeData.parentNode;
      return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'parentNode'];
    },
    configurable: true
  },

  nextSibling: {
    /** @this {Node} */
    get() {
      const nodeData = shadyDataForNode(this);
      const l = nodeData && nodeData.nextSibling;
      return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'nextSibling'];
    },
    configurable: true
  },

  previousSibling: {
    /** @this {Node} */
    get() {
      const nodeData = shadyDataForNode(this);
      const l = nodeData && nodeData.previousSibling;
      return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'previousSibling'];
    },
    configurable: true
  },

  // fragment, element, document
  nextElementSibling: {
    /**
     * @this {HTMLElement}
     */
    get() {
      const nodeData = shadyDataForNode(this);
      if (nodeData && nodeData.nextSibling !== undefined) {
        let n = OutsideAccessors.nextSibling.get.call(this);
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = OutsideAccessors.nextSibling.get.call(n);
        }
        return n;
      } else {
        return this[utils.NATIVE_PREFIX + 'nextElementSibling'];
      }
    },
    configurable: true
  },

  previousElementSibling: {
    /**
     * @this {HTMLElement}
     */
    get() {
      const nodeData = shadyDataForNode(this);
      if (nodeData && nodeData.previousSibling !== undefined) {
        let n = OutsideAccessors.previousSibling.get.call(this);
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = OutsideAccessors.previousSibling.get.call(n);
        }
        return n;
      } else {
        return this[utils.NATIVE_PREFIX + 'previousElementSibling'];
      }
    },
    configurable: true
  }

};

export const ClassNameAccessor = {
  className: {
    /**
     * @this {HTMLElement}
     */
    get() {
      return this.getAttribute('class') || '';
    },
    /**
     * @this {HTMLElement}
     */
    set(value) {
      setAttribute(this, 'class', value);
    },
    configurable: true
  }
}

export const InsideAccessors = {

  childNodes: {
    /**
     * @this {HTMLElement}
     */
    get() {
      let childNodes;
      if (utils.isTrackingLogicalChildNodes(this)) {
        const nodeData = shadyDataForNode(this);
        if (!nodeData.childNodes) {
          nodeData.childNodes = [];
          for (let n=InsideAccessors.firstChild.get.call(this); n; n=OutsideAccessors.nextSibling.get.call(n)) {
            nodeData.childNodes.push(n);
          }
        }
        childNodes = nodeData.childNodes;
      } else {
        childNodes = this[utils.NATIVE_PREFIX + 'childNodes'];
      }
      childNodes.item = function(index) {
        return childNodes[index];
      }
      return childNodes;
    },
    configurable: true
  },

  childElementCount: {
    /** @this {HTMLElement} */
    get() {
      return InsideAccessors.children.get.call(this).length;
    },
    configurable: true
  },

  firstChild: {
    /** @this {HTMLElement} */
    get() {
      const nodeData = shadyDataForNode(this);
      const l = nodeData && nodeData.firstChild;
      return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'firstChild'];
    },
    configurable: true
  },

  lastChild: {
  /** @this {HTMLElement} */
    get() {
      const nodeData = shadyDataForNode(this);
      const l = nodeData && nodeData.lastChild;
      return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'lastChild'];
    },
    configurable: true
  },

  textContent: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (utils.isTrackingLogicalChildNodes(this)) {
        let tc = [];
        for (let i = 0, cn = InsideAccessors.childNodes.get.call(this), c; (c = cn[i]); i++) {
          if (c.nodeType !== Node.COMMENT_NODE) {
            tc.push(InsideAccessors.textContent.get.call(c));
          }
        }
        return tc.join('');
      } else {
        return this[utils.NATIVE_PREFIX + 'textContent'];
      }
    },
    /**
     * @this {HTMLElement}
     * @param {string} text
     */
    set(text) {
      if (typeof text === 'undefined' || text === null) {
        text = ''
      }
      switch (this.nodeType) {
        case Node.ELEMENT_NODE:
        case Node.DOCUMENT_FRAGMENT_NODE:
          if (!utils.isTrackingLogicalChildNodes(this) && hasDescriptors) {
            // may be removing a nested slot but fast path if we know we are not.
            const firstChild = InsideAccessors.firstChild.get.call(this);
            if (firstChild != InsideAccessors.lastChild.get.call(this) ||
              (firstChild && firstChild.nodeType != Node.TEXT_NODE)) {
              clearNode(this);
            }
            this[utils.NATIVE_PREFIX + 'textContent'] = text;
          } else {
            clearNode(this);
            // Document fragments must have no childnodes if setting a blank string
            if (text.length > 0 || this.nodeType === Node.ELEMENT_NODE) {
              insertBefore(this, document.createTextNode(text))
            }
          }
          break;
        default:
          // TODO(sorvell): can't do this if patch nodeValue.
          this.nodeValue = text;
          break;
      }
    },
    configurable: true
  },

  // fragment, element, document
  firstElementChild: {
    /**
     * @this {HTMLElement}
     */
    get() {
      const nodeData = shadyDataForNode(this);
      if (nodeData && nodeData.firstChild !== undefined) {
        let n = InsideAccessors.firstChild.get.call(this);
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = OutsideAccessors.nextSibling.get.call(n);
        }
        return n;
      } else {
        return this[utils.NATIVE_PREFIX + 'firstElementChild'];
      }
    },
    configurable: true
  },

  lastElementChild: {
    /**
     * @this {HTMLElement}
     */
    get() {
      const nodeData = shadyDataForNode(this);
      if (nodeData && nodeData.lastChild !== undefined) {
        let n = InsideAccessors.lastChild.get.call(this);
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = OutsideAccessors.previousSibling.get.call(n);
        }
        return n;
      } else {
        return this[utils.NATIVE_PREFIX + 'lastElementChild'];
      }
    },
    configurable: true
  },

  children: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (!utils.isTrackingLogicalChildNodes(this)) {
        return this[utils.NATIVE_PREFIX + 'children'];
      }
      return utils.createPolyfilledHTMLCollection(Array.prototype.filter.call(InsideAccessors.childNodes.get.call(this), function(n) {
        return (n.nodeType === Node.ELEMENT_NODE);
      }));
    },
    configurable: true
  },

  // element (HTMLElement on IE11)
  innerHTML: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (utils.isTrackingLogicalChildNodes(this)) {
        const content = this.localName === 'template' ?
        /** @type {HTMLTemplateElement} */(this).content : this;
        return getInnerHTML(content, (e) => InsideAccessors.childNodes.get.call(e));
      } else {
        return this[utils.NATIVE_PREFIX + 'innerHTML'];
      }
    },
    /**
     * @this {HTMLElement}
     */
    set(text) {
      const content = this.localName === 'template' ?
        /** @type {HTMLTemplateElement} */(this).content : this;
      clearNode(content);
      const containerName = this.localName || 'div';
      let htmlContainer;
      if (!this.namespaceURI || this.namespaceURI === inertDoc.namespaceURI) {
        htmlContainer = inertDoc.createElement(containerName);
      } else {
        htmlContainer = inertDoc.createElementNS(this.namespaceURI, containerName);
      }
      if (hasDescriptors) {
        htmlContainer[utils.NATIVE_PREFIX + 'innerHTML'] = text;
      } else {
        htmlContainer.innerHTML = text;
      }
      const newContent = this.localName === 'template' ?
        /** @type {HTMLTemplateElement} */(htmlContainer).content : htmlContainer;
      let firstChild;
      while ((firstChild = InsideAccessors.firstChild.get.call(newContent))) {
        insertBefore(content, firstChild);
      }
    },
    configurable: true
  }

};

export const ElementAccessors = {};
utils.extendAll(ElementAccessors, InsideAccessors, OutsideAccessors, ClassNameAccessor, IsConnectedAccessor, ShadowRootAccessor);

// TODO(sorvell): style scoping

let scopingShim = null;

export function getScopingShim() {
  if (!scopingShim) {
    scopingShim = window['ShadyCSS'] && window['ShadyCSS']['ScopingShim'];
  }
  return scopingShim || null;
}

/**
 * @param {!Node} node
 * @param {string} newScopeName
 */
export function addShadyScoping(node, newScopeName) {
  const scopingShim = getScopingShim();
  if (!scopingShim) {
    return;
  }
  scopingShim['scopeNode'](node, newScopeName);
}

/**
 * @param {!Node} node
 * @param {string} currentScopeName
 */
export function removeShadyScoping(node, currentScopeName) {
  const scopingShim = getScopingShim();
  if (!scopingShim) {
    return;
  }
  scopingShim['unscopeNode'](node, currentScopeName);
}

/**
 * @param {!Node} node
 * @param {string} newScopeName
 * @param {string} oldScopeName
 */
export function replaceShadyScoping(node, newScopeName, oldScopeName) {
  const scopingShim = getScopingShim();
  if (!scopingShim) {
    return;
  }
  removeShadyScoping(node, oldScopeName);
  addShadyScoping(node, newScopeName);
}

/**
 * @param {!Node} node
 * @param {string} newScopeName
 * @return {boolean}
 */
export function currentScopeIsCorrect(node, newScopeName) {
  const scopingShim = getScopingShim();
  if (!scopingShim) {
    return true;
  }
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    // NOTE: as an optimization, only check that all the top-level children
    // have the correct scope.
    let correctScope = true;
    const childNodes = ElementAccessors.childNodes.get.call(node);
    for (let idx = 0; correctScope && (idx < childNodes.length); idx++) {
      correctScope = correctScope &&
        currentScopeIsCorrect(childNodes[idx], newScopeName);
    }
    return correctScope;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return true;
  }
  const currentScope = scopingShim['currentScopeForNode'](node);
  return currentScope === newScopeName;
}

/**
 * @param {!Node} node
 * @return {string}
 */
export function currentScopeForNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  const scopingShim = getScopingShim();
  if (!scopingShim) {
    return '';
  }
  return scopingShim['currentScopeForNode'](node);
}

/**
 * Walk over a node's tree and apply visitorFn to each element node
 *
 * @param {Node} node
 * @param {function(!Node):void} visitorFn
 */
export function treeVisitor(node, visitorFn) {
  if (!node) {
    return;
  }
  // this check is necessary if `node` is a Document Fragment
  if (node.nodeType === Node.ELEMENT_NODE) {
    visitorFn(node);
  }
  const childNodes = ElementAccessors.childNodes.get.call(node);
  for (let idx = 0, n; idx < childNodes.length; idx++) {
    n = childNodes[idx];
    if (n.nodeType === Node.ELEMENT_NODE) {
      treeVisitor(n, visitorFn);
    }
  }
}

// TODO(sorvell) patch-accessors
// patch a group of descriptors on an object only if it exists or if the `force`
// argument is true.
/**
 * @param {!Object} obj
 * @param {!Object} descriptors
 * @param {boolean=} force
 */
export function patchAccessorGroup(obj, descriptors, force) {
  for (let p in descriptors) {
    let objDesc = Object.getOwnPropertyDescriptor(obj, p);
    if ((objDesc && objDesc.configurable) ||
      (!objDesc && force)) {
      Object.defineProperty(obj, p, descriptors[p]);
    } else if (force) {
      console.warn('Could not define', p, 'on', obj); // eslint-disable-line no-console
    }
  }
}

// ensure an element has patched "outside" accessors; no-op when not needed
export let patchOutsideElementAccessors = utils.settings.hasDescriptors ?
  function() {} : function(element) {
    const sd = ensureShadyDataForNode(element);
    if (!sd.__outsideAccessors) {
      sd.__outsideAccessors = true;
      patchAccessorGroup(element, OutsideAccessors, true);
      patchAccessorGroup(element, ClassNameAccessor, true);
    }
  }

// ensure an element has patched "inside" accessors; no-op when not needed
export let patchInsideElementAccessors = utils.settings.hasDescriptors ?
  function() {} : function(element) {
    const sd = ensureShadyDataForNode(element);
    if (!sd.__insideAccessors) {
      patchAccessorGroup(element, InsideAccessors, true);
      patchAccessorGroup(element, ShadowRootAccessor, true);
    }
  }


// TODO(sorvell): logical-tree
export function recordInsertBefore(node, container, ref_node) {
  patchInsideElementAccessors(container);
  const containerData = ensureShadyDataForNode(container);
  if (containerData.firstChild !== undefined) {
    containerData.childNodes = null;
  }
  // handle document fragments
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    let c$ = ElementAccessors.childNodes.get.call(node);
    for (let i=0; i < c$.length; i++) {
      linkNode(c$[i], container, ref_node);
    }
    // cleanup logical dom in doc fragment.
    const nodeData = ensureShadyDataForNode(node);
    let resetTo = (nodeData.firstChild !== undefined) ? null : undefined;
    nodeData.firstChild = nodeData.lastChild = resetTo;
    nodeData.childNodes = resetTo;
  } else {
    linkNode(node, container, ref_node);
  }
}

function linkNode(node, container, ref_node) {
  patchOutsideElementAccessors(node);
  ref_node = ref_node || null;
  const nodeData = ensureShadyDataForNode(node);
  const containerData = ensureShadyDataForNode(container);
  const ref_nodeData = ref_node ? ensureShadyDataForNode(ref_node) : null;
  // update ref_node.previousSibling <-> node
  nodeData.previousSibling = ref_node ? ref_nodeData.previousSibling :
    ElementAccessors.lastChild.get.call(container);
  let psd = shadyDataForNode(nodeData.previousSibling);
  if (psd) {
    psd.nextSibling = node;
  }
  // update node <-> ref_node
  let nsd = shadyDataForNode(nodeData.nextSibling = ref_node);
  if (nsd) {
    nsd.previousSibling = node;
  }
  // update node <-> container
  nodeData.parentNode = container;
  if (ref_node) {
    if (ref_node === containerData.firstChild) {
      containerData.firstChild = node;
    }
  } else {
    containerData.lastChild = node;
    if (!containerData.firstChild) {
      containerData.firstChild = node;
    }
  }
  // remove caching of childNodes
  containerData.childNodes = null;
}

export function recordRemoveChild(node, container) {
  const nodeData = ensureShadyDataForNode(node);
  const containerData = ensureShadyDataForNode(container);
  if (node === containerData.firstChild) {
    containerData.firstChild = nodeData.nextSibling;
  }
  if (node === containerData.lastChild) {
    containerData.lastChild = nodeData.previousSibling;
  }
  let p = nodeData.previousSibling;
  let n = nodeData.nextSibling;
  if (p) {
    ensureShadyDataForNode(p).nextSibling = n;
  }
  if (n) {
    ensureShadyDataForNode(n).previousSibling = p;
  }
  // When an element is removed, logical data is no longer tracked.
  // Explicitly set `undefined` here to indicate this. This is disginguished
  // from `null` which is set if info is null.
  nodeData.parentNode = nodeData.previousSibling =
  nodeData.nextSibling = undefined;
  if (containerData.childNodes !== undefined) {
    // remove caching of childNodes
    containerData.childNodes = null;
  }
}

/**
 * @param  {!Node} node
 * @param  {Array<Node>=} nodes
 */
export function recordChildNodes(node, nodes) {
  const nodeData = ensureShadyDataForNode(node);
  if (nodeData.firstChild === undefined) {
    // remove caching of childNodes
    nodeData.childNodes = null;
    const c$ = nodes || node[utils.NATIVE_PREFIX + 'childNodes'];
    nodeData.firstChild = c$[0] || null;
    nodeData.lastChild = c$[c$.length-1] || null;
    patchInsideElementAccessors(node);
    for (let i=0; i<c$.length; i++) {
      const n = c$[i];
      const sd = ensureShadyDataForNode(n);
      sd.parentNode = node;
      sd.nextSibling = c$[i+1] || null;
      sd.previousSibling = c$[i-1] || null;
      patchOutsideElementAccessors(n);
    }
  }
}