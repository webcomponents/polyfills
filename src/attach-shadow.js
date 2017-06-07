/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {calculateSplices} from './array-splice.js';
import * as utils from './utils.js';
import {enqueue} from './flush.js';
import {recordChildNodes} from './logical-tree.js';
import {removeChild, insertBefore} from './native-methods.js';
import {parentNode, childNodes} from './native-tree.js';
import {patchShadowRootAccessors} from './patch-accessors.js';
import Distributor from './distributor.js';

// Do not export this object. It must be passed as the first argument to the
// ShadyRoot constructor in `attachShadow` to prevent the constructor from
// throwing. This prevents the user from being able to manually construct a
// ShadyRoot (i.e. `new ShadowRoot()`).
const ShadyRootConstructionToken = {};

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
  this._changePending = false;
  this._distributor = new Distributor(this);
  this.update();
}


// async render
ShadyRoot.prototype.update = function() {
  if (!this._renderPending) {
    this._renderPending = true;
    enqueue(() => this.render());
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
      if (this._distributor.isInsertionPoint(c)) {
        return root;
      }
    }
  }
}

ShadyRoot.prototype.render = function() {
  if (this._renderPending) {
    this._getRenderRoot()['_render']();
  }
}

// NOTE: avoid renaming to ease testability.
ShadyRoot.prototype['_render'] = function() {
  this._renderPending = false;
  this._changePending = false;
  if (!this._skipUpdateInsertionPoints) {
    this.updateInsertionPoints();
  } else if (!this._hasRendered) {
    this.__insertionPoints = [];
  }
  this._skipUpdateInsertionPoints = false;
  // TODO(sorvell): can add a first render optimization here
  // to use if there are no insertion points
  // 1. clear host node of composed children
  // 2. appendChild the shadowRoot itself or (more robust) its logical children
  // NOTE: this didn't seem worth it in perf testing
  // but not ready to delete this info.
  // logical
  this.distribute();
  // physical
  this.compose();
  this._hasRendered = true;
}

ShadyRoot.prototype.forceRender = function() {
  this._renderPending = true;
  this.render();
}

ShadyRoot.prototype.distribute = function() {
  let dirtyRoots = this._distributor.distribute();
  for (let i=0; i<dirtyRoots.length; i++) {
    dirtyRoots[i]['_render']();
  }
}

ShadyRoot.prototype.updateInsertionPoints = function() {
  let i$ = this._insertionPoints;
  // if any insertion points have been removed, clear their distribution info
  if (i$) {
    for (let i=0, c; i < i$.length; i++) {
      c = i$[i];
      if (c.getRootNode() !== this) {
        this._distributor.clearAssignedSlots(c);
      }
    }
  }
  i$ = this._insertionPoints = this._distributor.getInsertionPoints();
  // ensure insertionPoints's and their parents have logical dom info.
  // save logical tree info
  // a. for shadyRoot
  // b. for insertion points (fallback)
  // c. for parents of insertion points
  for (let i=0, c; i < i$.length; i++) {
    c = i$[i];
    c.__shady = c.__shady || {};
    recordChildNodes(c);
    recordChildNodes(c.parentNode);
  }
}

ShadyRoot.prototype.compose = function() {
  // compose self
  // note: it's important to mark this clean before distribution
  // so that attachment that provokes additional distribution (e.g.
  // adding something to your parentNode) works
  this._composeTree();
  // TODO(sorvell): See fast paths here in Polymer v1
  // (these seem unnecessary)
}

// Reify dom such that it is at its correct rendering position
// based on logical distribution.
ShadyRoot.prototype._composeTree = function() {
  this._updateChildNodes(this.host, this._composeNode(this.host));
  let p$ = this._getInsertionPoints();
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
    if (this._distributor.isInsertionPoint(child)) {
      let distributedNodes = child.__shady.distributedNodes ||
        (child.__shady.distributedNodes = []);
      for (let j = 0; j < distributedNodes.length; j++) {
        let distributedNode = distributedNodes[j];
        if (this.isFinalDestination(child, distributedNode)) {
          children.push(distributedNode);
        }
      }
    } else {
      children.push(child);
    }
  }
  return children;
}

ShadyRoot.prototype.isFinalDestination = function(insertionPoint, node) {
  return this._distributor.isFinalDestination(
    insertionPoint, node);
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
      // TODO(sorvell): is this splice strictly needed?
      composed.splice(j, 0, n);
    }
  }
}

ShadyRoot.prototype.getInsertionPointTag = function() {
  return this._distributor.insertionPointTag;
}

ShadyRoot.prototype.hasInsertionPoint = function() {
  return Boolean(this._insertionPoints && this._insertionPoints.length);
}

ShadyRoot.prototype._getInsertionPoints = function() {
  if (!this._insertionPoints) {
    this.updateInsertionPoints();
  }
  return this._insertionPoints;
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
