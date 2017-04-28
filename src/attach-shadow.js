/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

import {calculateSplices} from './array-splice'
import * as utils from './utils'
import {enqueue} from './flush'
import {recordChildNodes} from './logical-tree'
import {removeChild, insertBefore, dispatchEvent} from './native-methods'
import {parentNode, childNodes} from './native-tree'
import {patchShadowRootAccessors} from './patch-accessors'

// Do not export this object. It must be passed as the first argument to the
// ShadyRoot constructor in `attachShadow` to prevent the constructor from
// throwing. This prevents the user from being able to manually construct a
// ShadyRoot (i.e. `new ShadowRoot()`).
const ShadyRootConstructionToken = {};

const CATCHALL_NAME = '__catchall';

/**
 * @constructor
 * @extends {ShadowRoot}
 */
export let ShadyRoot = function(token, host) {
  if (token !== ShadyRootConstructionToken) {
    throw new TypeError('Illegal constructor');
  }
  // NOTE: this strange construction is necessary because
  // DocumentFragment cannot be subclassed on older browsers.
  let shadowRoot = document.createDocumentFragment();
  shadowRoot.__proto__ = ShadyRoot.prototype;
  /** @type {ShadyRoot} */ (shadowRoot)._init(host);
  return shadowRoot;
};

ShadyRoot.prototype = Object.create(DocumentFragment.prototype);

ShadyRoot.prototype._init = function(host) {
  // NOTE: set a fake local name so this element can be
  // distinguished from a DocumentFragment when patching.
  // FF doesn't allow this to be `localName`
  this.__localName = 'ShadyRoot';
  // logical dom setup
  recordChildNodes(host);
  recordChildNodes(this);
  // root <=> host
  host.shadowRoot = this;
  this.host = host;
  // state flags
  this._renderPending = false;
  this._hasRendered = false;
  this._slotList = [];
  this._slotMap = null;
  // fast path initial render: remove existing physical dom.
  let c$ = childNodes(host);
  for (let i=0, l=c$.length; i < l; i++) {
    removeChild.call(host, c$[i])
  }
}

// async render
ShadyRoot.prototype._asyncRender = function() {
  if (!this._renderPending) {
    this._renderPending = true;
    enqueue(() => this._render());
  }
}

// returns the oldest renderPending ancestor root.
ShadyRoot.prototype._getRenderRoot = function() {
  let renderRoot = this;
  let root = this;
  while (root) {
    if (root._renderPending) {
      renderRoot = root;
    }
    root = root._rendererForHost();
  }
  return renderRoot;
}

// Returns the shadyRoot `this.host` if `this.host`
// has children that require distribution.
ShadyRoot.prototype._rendererForHost = function() {
  let root = this.host.getRootNode();
  if (utils.isShadyRoot(root)) {
    let c$ = this.host.childNodes;
    for (let i=0, c; i < c$.length; i++) {
      c = c$[i];
      if (this._isInsertionPoint(c)) {
        return root;
      }
    }
  }
}

ShadyRoot.prototype._render = function() {
  if (this._renderPending) {
    this._getRenderRoot()['_renderRoot']();
  }
}

// NOTE: avoid renaming to ease testability.
ShadyRoot.prototype['_renderRoot'] = function() {
  this._renderPending = false;
  this._distribute();
  this._compose();
  this._hasRendered = true;
}

ShadyRoot.prototype._distribute = function() {
  // capture # of previously assigned nodes to help determin if dirty.
  for (let i=0, slot; i < this._slotList.length; i++) {
    slot = this._slotList[i];
    this._clearSlotAssignedNodes(slot);
  }
  if (!this._slotMap) {
    this._updateSlotMap();
  }
  // distribute host children.
  for (let n=this.host.firstChild; n; n=n.nextSibling) {
    this._distributeNodeToSlot(n);
  }
  // fallback content, slotchange, and dirty roots
  for (let i=0, slot; i < this._slotList.length; i++) {
    slot = this._slotList[i];
    // distribute fallback content
    if (!slot.__shady.assignedNodes.length) {
      for (let n=slot.firstChild; n; n=n.nextSibling) {
        this._distributeNodeToSlot(n, slot);
      }
    }
    let slotParentRoot = slot.parentNode.shadowRoot;
    if (slotParentRoot && slotParentRoot._hasInsertionPoint()) {
      slotParentRoot['_renderRoot']();
    }
    slot.__shady.distributedNodes = [];
    this._addDistributedNodes(slot.__shady.distributedNodes, slot);
    let prevAssignedNodes = slot.__shady._previouslyAssignedNodes;
    if (prevAssignedNodes) {
      for (let i=0; i < prevAssignedNodes.length; i++) {
        prevAssignedNodes[i].__shady._prevAssignedSlot = null;
      }
      slot.__shady._previouslyAssignedNodes = null;
      // dirty if previously less assigned nodes than previously assigned.
      if (prevAssignedNodes.length > slot.__shady.assignedNodes.length) {
        slot.__shady.dirty = true;
      }
    }
    // NOTE: cannot bubble correctly here so not setting bubbles: true
    // Safari tech preview does not bubble but chrome does
    // Spec says it bubbles (https://dom.spec.whatwg.org/#mutation-observers)
    if (slot.__shady.dirty) {
      slot.__shady.dirty = false;
      this._fireSlotChange(slot);
    }
  }
}

ShadyRoot.prototype._distributeNodeToSlot = function(node, slot) {
  node.__shady = node.__shady || {};
  let oldSlot = node.__shady._prevAssignedSlot;
  node.__shady._prevAssignedSlot = null;
  if (!slot) {
    let name = node.slot || CATCHALL_NAME;
    slot = this._slotMap[name];
  }
  if (slot) {
    slot.__shady.assignedNodes.push(node);
    node.__shady.assignedSlot = slot;
  } else {
    node.__shady.assignedSlot = undefined;
  }
  if (oldSlot !== node.__shady.assignedSlot) {
    // TODO(sorvell): add test to verify this is needed.
    if (oldSlot) {
      oldSlot.__shady.dirty = true;
    }
    if (node.__shady.assignedSlot) {
      node.__shady.assignedSlot.__shady.dirty = true;
    }
  }
}

ShadyRoot.prototype._clearSlotAssignedNodes = function(slot) {
  let n$ = slot.__shady.assignedNodes;
  slot.__shady.assignedNodes = [];
  slot.__shady._previouslyAssignedNodes = n$;
  if (n$) {
    for (let i=0; i < n$.length; i++) {
      let n = n$[i];
      n.__shady._prevAssignedSlot = n.__shady.assignedSlot;
      // only clear if it was previously set to this slot;
      // this helps ensure that if the node has otherwise been distributed
      // ignore it.
      if (n.__shady.assignedSlot === slot) {
        n.__shady.assignedSlot = null;
      }
    }
  }
}

ShadyRoot.prototype._addDistributedNodes = function(list, insertionPoint) {
  let n$ = insertionPoint.__shady.assignedNodes;
  for (let i=0, n; (i<n$.length) && (n=n$[i]); i++) {
    if (n.localName == 'slot') {
      this._addDistributedNodes(list, n);
    } else {
      list.push(n$[i]);
    }
  }
}

ShadyRoot.prototype._fireSlotChange = function(slot) {
  // NOTE: cannot bubble correctly here so not setting bubbles: true
  // Safari tech preview does not bubble but chrome does
  // Spec says it bubbles (https://dom.spec.whatwg.org/#mutation-observers)
  dispatchEvent.call(slot, new Event('slotchange'));
  if (slot.__shady.assignedSlot) {
    this._fireSlotChange(slot.__shady.assignedSlot);
  }
}

// Reify dom such that it is at its correct rendering position
// based on logical distribution.
ShadyRoot.prototype._compose = function() {
  this._updateChildNodes(this.host, this._composeNode(this.host));
  let p$ = this._slotList;
  for (let i=0, l=p$.length, p, parent; (i<l) && (p=p$[i]); i++) {
    parent = p.parentNode;
    if ((parent !== this.host) && (parent !== this)) {
      this._updateChildNodes(parent, this._composeNode(parent));
    }
  }
}

// Returns the list of nodes which should be rendered inside `node`.
ShadyRoot.prototype._composeNode = function(node) {
  let children = [];
  let c$ = ((node.__shady && node.__shady.root) || node).childNodes;
  for (let i = 0; i < c$.length; i++) {
    let child = c$[i];
    if (this._isInsertionPoint(child)) {
      let distributedNodes = child.__shady.distributedNodes ||
        (child.__shady.distributedNodes = []);
      for (let j = 0; j < distributedNodes.length; j++) {
        let distributedNode = distributedNodes[j];
        // this is final destination if insertionPoint has no assignedSlot.
        if (this._isFinalDestination(child)) {
          children.push(distributedNode);
        }
      }
    } else {
      children.push(child);
    }
  }
  return children;
}

ShadyRoot.prototype._isFinalDestination = function(slot) {
  return !slot.__shady.assignedSlot;
}

ShadyRoot.prototype._isInsertionPoint = function(node) {
    return node.localName == 'slot';
  }

// Ensures that the rendered node list inside `container` is `children`.
ShadyRoot.prototype._updateChildNodes = function(container, children) {
  let composed = childNodes(container);
  let splices = calculateSplices(children, composed);
  // process removals
  for (let i=0, d=0, s; (i<splices.length) && (s=splices[i]); i++) {
    for (let j=0, n; (j < s.removed.length) && (n=s.removed[j]); j++) {
      // check if the node is still where we expect it is before trying
      // to remove it; this can happen if we move a node and
      // then schedule its previous host for distribution resulting in
      // the node being removed here.
      if (parentNode(n) === container) {
        removeChild.call(container, n);
      }
      composed.splice(s.index + d, 1);
    }
    d -= s.addedCount;
  }
  // process adds
  for (let i=0, s, next; (i<splices.length) && (s=splices[i]); i++) { //eslint-disable-line no-redeclare
    next = composed[s.index];
    for (let j=s.index, n; j < s.index + s.addedCount; j++) {
      n = children[j];
      insertBefore.call(container, n, next);
      composed.splice(j, 0, n);
    }
  }
}

ShadyRoot.prototype._addSlots = function(slots) {
  let slotNamesToSort;
  for (let i=0; i < slots.length; i++) {
    let slot = slots[i];
    // ensure insertionPoints's and their parents have logical dom info.
    // save logical tree info
    // a. for shadyRoot
    // b. for insertion points (fallback)
    // c. for parents of insertion points
    slot.__shady = slot.__shady || {};
    recordChildNodes(slot);
    recordChildNodes(slot.parentNode);
    let name = this._nameForSlot(slot);
    if (this._slotMap && this._slotMap[name]) {
      slotNamesToSort = slotNamesToSort || {};
      slotNamesToSort[name] = true;
    }
    this._slotList.push(slot);
  }
  // TODO(sorvell): add tests to verify slots add/removing slots
    // with the same name (or catchall)
  if (slotNamesToSort) {
    for (let n in slotNamesToSort) {
      let slotsForName = this._extractSlotsOfName(n);
      let sorted = this._sortSlots(slotsForName);
      this._slotList.push(...sorted);
    }
  }
  this._updateSlotMap();
}

ShadyRoot.prototype._nameForSlot = function(slot) {
  return slot['name'] || slot.getAttribute('name') || CATCHALL_NAME;
}

ShadyRoot.prototype._extractSlotsOfName = function(name) {
  let slots;
  for (let i=0; i < this._slotList.length; i++) {
    let slot = this._slotList[i];
    let n = this._nameForSlot(slot);
    if (n == name) {
      this._slotList.splice(i, 1);
      i--;
      slots = slots || [];
      slots.push(slot);
    }
  }
  return slots;
}

ShadyRoot.prototype._sortSlots = function(slots) {
  return slots.sort((a, b) => {
    let listA = ancestorList(a);
    let listB = ancestorList(b);
    for (var i=0; i < listA.length; i++) {
      let nA = listA[i];
      let nB = listB[i];
      if (nA !== nB) {
        let c$ = Array.from(nA.parentNode.childNodes);
        return c$.indexOf(nA) - c$.indexOf(nB);
      }
    }
  });
}

function ancestorList(node) {
  let ancestors = [];
  do {
    ancestors.unshift(node);
  } while ((node = node.parentNode));
  return ancestors;
}

function contains(container, node) {
  while (node) {
    if (node == container) {
      return true;
    }
    node = node.parentNode;
  }
}

ShadyRoot.prototype._removeContainerSlots = function(container) {
  let didRemove;
  for (let i=0; i<this._slotList.length; i++) {
    let slot = this._slotList[i];
    if (contains(container, slot)) {
      this._slotList.splice(i, 1);
      this._removeAssignedNodes(slot);
      i--;
      didRemove = true;
    }
  }
  this._updateSlotMap();
  return didRemove;
}

ShadyRoot.prototype._removeSlot = function(slot) {
  let i = this._slotList.indexOf(slot);
  if (i > -1) {
    this._slotList.splice(i, 1);
    this._removeAssignedNodes(slot);
  }
}

ShadyRoot.prototype._removeAssignedNodes = function(slot) {
  let n$ = slot.assignedNodes({flatten: true});
  for (let i=0; i<n$.length; i++) {
    let node = n$[i];
    let parent = parentNode(node);
    if (parent) {
      removeChild.call(parent, node);
    }
  }
}

ShadyRoot.prototype._updateSlotMap = function() {
  this._slotMap = {};
  for (let i=0; i<this._slotList.length; i++) {
    let slot = this._slotList[i];
    let name = this._nameForSlot(slot);
    if (!this._slotMap[name]) {
      this._slotMap[name] = slot;
    }
  }
}

ShadyRoot.prototype._hasInsertionPoint = function() {
  return Boolean(this._slotList.length);
}

ShadyRoot.prototype.addEventListener = function(type, fn, optionsOrCapture) {
  if (typeof optionsOrCapture !== 'object') {
    optionsOrCapture = {
      capture: Boolean(optionsOrCapture)
    }
  }
  optionsOrCapture.__shadyTarget = this;
  this.host.addEventListener(type, fn, optionsOrCapture);
}

ShadyRoot.prototype.removeEventListener = function(type, fn, optionsOrCapture) {
  if (typeof optionsOrCapture !== 'object') {
    optionsOrCapture = {
      capture: Boolean(optionsOrCapture)
    }
  }
  optionsOrCapture.__shadyTarget = this;
  this.host.removeEventListener(type, fn, optionsOrCapture);
}

ShadyRoot.prototype.getElementById = function(id) {
  return this.querySelector(`#${id}`);
}

/**
  Implements a pared down version of ShadowDOM's scoping, which is easy to
  polyfill across browsers.
*/
export function attachShadow(host, options) {
  if (!host) {
    throw 'Must provide a host.';
  }
  if (!options) {
    throw 'Not enough arguments.'
  }
  return new ShadyRoot(ShadyRootConstructionToken, host);
}

patchShadowRootAccessors(ShadyRoot.prototype);