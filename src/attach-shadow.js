/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as mutation from './logical-mutation.js';
import {calculateSplices} from './array-splice.js';
import * as utils from './utils.js';
import {enqueue} from './flush.js';
import {recordChildNodes} from './logical-tree.js';
import {removeChild, insertBefore, dispatchEvent} from './native-methods.js';
import {parentNode, childNodes} from './native-tree.js';
import {patchShadowRootAccessors} from './patch-accessors.js';

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
export let ShadyRoot = function(token, host, options) {
  if (token !== ShadyRootConstructionToken) {
    throw new TypeError('Illegal constructor');
  }
  // NOTE: this strange construction is necessary because
  // DocumentFragment cannot be subclassed on older browsers.
  let shadowRoot = document.createDocumentFragment();
  shadowRoot.__proto__ = ShadyRoot.prototype;
  /** @type {ShadyRoot} */ (shadowRoot)._init(host, options);
  return shadowRoot;
};

ShadyRoot.prototype = Object.create(DocumentFragment.prototype);

ShadyRoot.prototype._init = function(host, options) {
  // NOTE: set a fake local name so this element can be
  // distinguished from a DocumentFragment when patching.
  // FF doesn't allow this to be `localName`
  this.__localName = 'ShadyRoot';
  // logical dom setup
  recordChildNodes(host);
  recordChildNodes(this);
  // root <=> host
  this.host = host;
  this._mode = options && options.mode;
  host.__shady = host.__shady || {};
  host.__shady.root = this;
  host.__shady.publicRoot = this._mode !== 'closed' ? this : null;
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
  // capture # of previously assigned nodes to help determine if dirty.
  for (let i=0, slot; i < this._slotList.length; i++) {
    slot = this._slotList[i];
    this._clearSlotAssignedNodes(slot);
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
    const slotParent = slot.parentNode;
    const slotParentRoot = slotParent.__shady && slotParent.__shady.root;
    if (slotParentRoot && slotParentRoot._hasInsertionPoint()) {
      slotParentRoot['_renderRoot']();
    }
    this._addAssignedToFlattenedNodes(slot.__shady.flattenedNodes,
      slot.__shady.assignedNodes);
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
    /* Note: A slot is marked dirty whenever a node is newly assigned to it
    or a node is assigned to a different slot (done in `_distributeNodeToSlot`)
    or if the number of nodes assigned to the slot has decreased (done above);
     */
    if (slot.__shady.dirty) {
      slot.__shady.dirty = false;
      this._fireSlotChange(slot);
    }
  }
}

/**
 * Distributes given `node` to the appropriate slot based on its `slot`
 * attribute. If `forcedSlot` is given, then the node is distributed to the
 * `forcedSlot`.
 * Note: slot to which the node is assigned will be marked dirty for firing
 * `slotchange`.
 * @param {Node} node
 * @param {Node=} forcedSlot
 *
 */
ShadyRoot.prototype._distributeNodeToSlot = function(node, forcedSlot) {
  node.__shady = node.__shady || {};
  let oldSlot = node.__shady._prevAssignedSlot;
  node.__shady._prevAssignedSlot = null;
  let slot = forcedSlot;
  if (!slot) {
    let name = node.slot || CATCHALL_NAME;
    const list = this._slotMap[name];
    slot = list && list[0];
  }
  if (slot) {
    slot.__shady.assignedNodes.push(node);
    node.__shady.assignedSlot = slot;
  } else {
    node.__shady.assignedSlot = undefined;
  }
  if (oldSlot !== node.__shady.assignedSlot) {
    if (node.__shady.assignedSlot) {
      node.__shady.assignedSlot.__shady.dirty = true;
    }
  }
}

/**
 * Clears the assignedNodes tracking data for a given `slot`. Note, the current
 * assigned node data is tracked (via _previouslyAssignedNodes and
 * _prevAssignedSlot) to see if `slotchange` should fire. This data may be out
 *  of date at this time because the assigned nodes may have already been
 * distributed to another root. This is ok since this data is only used to
 * track changes.
 * @param {HTMLSlotElement} slot
 */
ShadyRoot.prototype._clearSlotAssignedNodes = function(slot) {
  let n$ = slot.__shady.assignedNodes;
  slot.__shady.assignedNodes = [];
  slot.__shady.flattenedNodes = [];
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

ShadyRoot.prototype._addAssignedToFlattenedNodes = function(flattened, asssigned) {
  for (let i=0, n; (i<asssigned.length) && (n=asssigned[i]); i++) {
    if (n.localName == 'slot') {
      this._addAssignedToFlattenedNodes(flattened, n.__shady.assignedNodes);
    } else {
      flattened.push(asssigned[i]);
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
// NOTE: here we only compose parents of <slot> elements and not the
// shadowRoot into the host. The latter is performend via a fast path
// in the `logical-mutation`.insertBefore.
ShadyRoot.prototype._compose = function() {
  const slots = this._slotList;
  let composeList = [];
  for (let i=0; i < slots.length; i++) {
    const parent = slots[i].parentNode;
    /* compose node only if:
      (1) parent does not have a shadowRoot since shadowRoot has already
      composed into the host
      (2) we're not already composing it
      [consider (n^2) but rare better than Set]
    */
    if (!(parent.__shady && parent.__shady.root) &&
      composeList.indexOf(parent) < 0) {
      composeList.push(parent);
    }
  }
  for (let i=0; i < composeList.length; i++) {
    const node = composeList[i];
    const targetNode = node === this ? this.host : node;
    this._updateChildNodes(targetNode, this._composeNode(node));
  }
}

// Returns the list of nodes which should be rendered inside `node`.
ShadyRoot.prototype._composeNode = function(node) {
  let children = [];
  let c$ = node.childNodes;
  for (let i = 0; i < c$.length; i++) {
    let child = c$[i];
    // Note: if we see a slot here, the nodes are guaranteed to need to be
    // composed here. This is because if there is redistribution, it has
    // already been handled by this point.
    if (this._isInsertionPoint(child)) {
      let flattenedNodes = child.__shady.flattenedNodes;
      for (let j = 0; j < flattenedNodes.length; j++) {
        let distributedNode = flattenedNodes[j];
          children.push(distributedNode);
      }
    } else {
      children.push(child);
    }
  }
  return children;
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

/**
 * Adds the given slots. Slots are maintained in an dom-ordered list.
 * In addition a map of name to slot is updated.
 */
ShadyRoot.prototype._addSlots = function(slots) {
  let slotNamesToSort;
  this._slotMap = this._slotMap || {};
  this._slotList = this._slotList || [];
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
    if (this._slotMap[name]) {
      slotNamesToSort = slotNamesToSort || {};
      slotNamesToSort[name] = true;
      this._slotMap[name].push(slot);
    } else {
      this._slotMap[name] = [slot];
    }
    this._slotList.push(slot);
  }
  if (slotNamesToSort) {
    for (let n in slotNamesToSort) {
      this._slotMap[n] = this._sortSlots(this._slotMap[n]);
    }
  }
}

ShadyRoot.prototype._nameForSlot = function(slot) {
  const name = slot['name'] || slot.getAttribute('name') || CATCHALL_NAME;
  slot.__slotName = name;
  return name;
}

/**
 * Slots are kept in an ordered list. Slots with the same name
 * are sorted here by tree order.
 */
ShadyRoot.prototype._sortSlots = function(slots) {
  // NOTE: Cannot use `compareDocumentPosition` because it's not polyfilled,
  // but the code here could be used to polyfill the preceeding/following info
  // in `compareDocumentPosition`.
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

// NOTE: could be used to help polyfill `document.contains`.
function contains(container, node) {
  while (node) {
    if (node == container) {
      return true;
    }
    node = node.parentNode;
  }
}

/**
 * Removes from tracked slot data any slots contained within `container` and
 * then updates the tracked data (_slotList and _slotMap).
 * Any removed slots also have their `assignedNodes` removed from comopsed dom.
 */
ShadyRoot.prototype._removeContainedSlots = function(container) {
  let didRemove;
  this._slotMap = this._slotMap || {};
  this._slotList = this._slotList || [];
  const map = this._slotMap;
  for (let n in map) {
    let slots = map[n];
    for (let i=0; i < slots.length; i++) {
      let slot = slots[i];
      if (contains(container, slot)) {
        slots.splice(i, 1);
        const x = this._slotList.indexOf(slot);
        if (x >= 0) {
          this._slotList.splice(x, 1);
        }
        i--;
        this._removeFlattenedNodes(slot);
        didRemove = true;
      }
    }
  }
  return didRemove;
}

ShadyRoot.prototype._updateSlotName = function(slot) {
  const oldName = slot.__slotName;
  const name = this._nameForSlot(slot);
  if (name === oldName) {
    return;
  }
  // remove from existing tracking
  let slots = this._slotMap[oldName];
  const i = slots.indexOf(slot);
  if (i >= 0) {
    slots.splice(i, 1);
  }
  // add to new location and sort if nedessary
  let list = this._slotMap[name] || (this._slotMap[name] = []);
  list.push(slot);
  if (list.length > 1) {
    this._slotMap[name] = this._sortSlots(list);
  }
}

ShadyRoot.prototype._removeFlattenedNodes = function(slot) {
  let n$ = slot.__shady.flattenedNodes;
  if (n$) {
    for (let i=0; i<n$.length; i++) {
      let node = n$[i];
      let parent = parentNode(node);
      if (parent) {
        removeChild.call(parent, node);
      }
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
  let result = mutation.query(this, function(n) {
    return n.id == id;
  }, function(n) {
    return Boolean(n);
  })[0];
  return result || null;
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
  return new ShadyRoot(ShadyRootConstructionToken, host, options);
}

patchShadowRootAccessors(ShadyRoot.prototype);