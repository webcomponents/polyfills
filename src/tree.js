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

// TODO(sorvell): circular (patch loads tree and tree loads patch)
// for now this is stuck on `utils`
//import {patchNode} from './patch'
import * as utils from './utils'

// native add/remove
let nativeInsertBefore = Element.prototype.insertBefore;
let nativeAppendChild = Element.prototype.appendChild;
let nativeRemoveChild = Element.prototype.removeChild;

// if `__patched` is >= this then children must be patched.
let patchedChildren = 2;

/**
 * `tree` is a dom manipulation library used by ShadyDom to
 * manipulate composed and logical trees.
 */
export let tree = {

  // sad but faster than slice...
  arrayCopyChildNodes(parent) {
    let copy=[], i=0;
    for (let n=parent.firstChild; n; n=n.nextSibling) {
      copy[i++] = n;
    }
    return copy;
  },

  arrayCopyChildren(parent) {
    let copy=[], i=0;
    for (let n=parent.firstElementChild; n; n=n.nextElementSibling) {
      copy[i++] = n;
    }
    return copy;
  },

  arrayCopy(a$) {
    let l = a$.length;
    let copy = new Array(l);
    for (let i=0; i < l; i++) {
      copy[i] = a$[i];
    }
    return copy;
  },

  saveChildNodes(node) {
    tree.Logical.saveChildNodes(node);
    if (!tree.Composed.hasParentNode(node)) {
      tree.Composed.saveComposedData(node);
    }
    tree.Composed.saveChildNodes(node);
  },

  needsChildren(node) {
    return (node.__patched >= patchedChildren);
  }

};

tree.Logical = {

  hasParentNode(node) {
    return Boolean(node.__shady && node.__shady.parentNode);
  },

  hasChildNodes(node) {
    return Boolean(node.__shady && node.__shady.childNodes !== undefined);
  },

  getChildNodes(node) {
    // note: we're distinguishing here between undefined and false-y:
    // hasChildNodes uses undefined check to see if this element has logical
    // children; the false-y check indicates whether or not we should rebuild
    // the cached childNodes array.
    return this.hasChildNodes(node) ? this._getChildNodes(node) :
      tree.Composed.getChildNodes(node);
  },

  _getChildNodes(node) {
    if (!node.__shady.childNodes) {
      node.__shady.childNodes = [];
      for (let n=this.getFirstChild(node); n; n=this.getNextSibling(n)) {
        node.__shady.childNodes.push(n);
      }
    }
    return node.__shady.childNodes;
  },

  // NOTE: __shady can be created under 2 conditions: (1) an element has a
  // logical tree, or (2) an element is in a logical tree. In case (1), the
  // element will store firstChild/lastChild, and in case (2), the element
  // will store parentNode, nextSibling, previousSibling. This means that
  // the mere existence of __shady is not enough to know if the requested
  // logical data is available and instead we do an explicit undefined check.
  getParentNode(node) {
    return node.__shady && node.__shady.parentNode !== undefined ?
      node.__shady.parentNode : tree.Composed.getParentNode(node);
  },

  getFirstChild(node) {
    return node.__shady && node.__shady.firstChild !== undefined ?
      node.__shady.firstChild : tree.Composed.getFirstChild(node);
  },

  getLastChild(node) {
    return node.__shady && node.__shady.lastChild  !== undefined ?
      node.__shady.lastChild : tree.Composed.getLastChild(node);
  },

  getNextSibling(node) {
    return node.__shady && node.__shady.nextSibling  !== undefined ?
      node.__shady.nextSibling : tree.Composed.getNextSibling(node);
  },

  getPreviousSibling(node) {
    return node.__shady && node.__shady.previousSibling  !== undefined ?
      node.__shady.previousSibling : tree.Composed.getPreviousSibling(node);
  },

  getFirstElementChild(node) {
    return node.__shady && node.__shady.firstChild !== undefined ?
      this._getFirstElementChild(node) :
      tree.Composed.getFirstElementChild(node);
  },

  _getFirstElementChild(node) {
    let n = node.__shady.firstChild;
    while (n && n.nodeType !== Node.ELEMENT_NODE) {
      n = n.__shady.nextSibling;
    }
    return n;
  },

  getLastElementChild(node) {
    return node.__shady && node.__shady.lastChild !== undefined ?
      this._getLastElementChild(node) :
      tree.Composed.getLastElementChild(node);
  },

  _getLastElementChild(node) {
    let n = node.__shady.lastChild;
    while (n && n.nodeType !== Node.ELEMENT_NODE) {
      n = n.__shady.previousSibling;
    }
    return n;
  },

  getNextElementSibling(node) {
    return node.__shady && node.__shady.nextSibling !== undefined ?
      this._getNextElementSibling(node) :
      tree.Composed.getNextElementSibling(node);
  },

  _getNextElementSibling(node) {
    let n = node.__shady.nextSibling;
    while (n && n.nodeType !== Node.ELEMENT_NODE) {
      n = this.getNextSibling(n);
    }
    return n;
  },

  getPreviousElementSibling(node) {
    return node.__shady && node.__shady.previousSibling !== undefined ?
      this._getPreviousElementSibling(node) :
      tree.Composed.getPreviousElementSibling(node);
  },

  _getPreviousElementSibling(node) {
    let n = node.__shady.previousSibling;
    while (n && n.nodeType !== Node.ELEMENT_NODE) {
      n = this.getPreviousSibling(n);
    }
    return n;
  },

  // Capture the list of light children. It's important to do this before we
  // start transforming the DOM into "rendered" state.
  // Children may be added to this list dynamically. It will be treated as the
  // source of truth for the light children of the element. This element's
  // actual children will be treated as the rendered state once this function
  // has been called.
  saveChildNodes(node) {
    if (!this.hasChildNodes(node)) {
      node.__shady = node.__shady || {};
      node.__shady.firstChild = node.firstChild;
      node.__shady.lastChild = node.lastChild;
      let c$ = node.__shady.childNodes = tree.arrayCopyChildNodes(node);
      for (let i=0, n; (i<c$.length) && (n=c$[i]); i++) {
        n.__shady = n.__shady || {};
        n.__shady.parentNode = node;
        n.__shady.nextSibling = c$[i+1] || null;
        n.__shady.previousSibling = c$[i-1] || null;
        utils.common.patchNode(n);
      }
    }
  },

  // TODO(sorvell): may need to patch saveChildNodes iff the tree has
  // already been distributed.
  // NOTE: ensure `node` is patched...
  recordInsertBefore(node, container, ref_node) {
    container.__shady = container.__shady || {};
    if (tree.needsChildren(container)) {
      container.__shady.childNodes = null;
    }
    // handle document fragments
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      let c$ = tree.arrayCopyChildNodes(node);
      for (let i=0; i < c$.length; i++) {
        this._linkNode(c$[i], container, ref_node);
      }
      // cleanup logical dom in doc fragment.
      node.__shady = node.__shady || {};
      let resetTo = node.__patched ? null : undefined;
      node.__shady.firstChild = node.__shady.lastChild = resetTo;
      node.__shady.childNodes = resetTo;
    } else {
      this._linkNode(node, container, ref_node);
    }
  },

  _linkNode(node, container, ref_node) {
    utils.common.patchNode(node);
    ref_node = ref_node || null;
    node.__shady = node.__shady || {};
    container.__shady = container.__shady || {};
    if (ref_node) {
      ref_node.__shady = ref_node.__shady || {};
    }
    // update ref_node.previousSibling <-> node
    node.__shady.previousSibling = ref_node ? ref_node.__shady.previousSibling :
      this.getLastChild(container);
    let ps = node.__shady.previousSibling;
    if (ps && ps.__shady) {
      ps.__shady.nextSibling = node;
    }
    // update node <-> ref_node
    let ns = node.__shady.nextSibling = ref_node;
    if (ns && ns.__shady) {
      ns.__shady.previousSibling = node;
    }
    // update node <-> container
    node.__shady.parentNode = container;
    if (container.__patched) {
      if (ref_node) {
        if (ref_node === container.__shady.firstChild) {
          container.__shady.firstChild = node;
        }
      } else {
        container.__shady.lastChild = node;
        if (!this.getFirstChild(container)) {
          container.__shady.firstChild = node;
        }
      }
      // remove caching of childNodes
      container.__shady.childNodes = null;
    }
  },

  recordRemoveChild(node, container) {
    node.__shady = node.__shady || {};
    if (container.__patched) {
      container.__shady = container.__shady || {};
      if (node === container.__shady.firstChild) {
        container.__shady.firstChild = node.__shady.nextSibling;
      }
      if (node === container.__shady.lastChild) {
        container.__shady.lastChild = node.__shady.previousSibling;
      }
    }
    let p = node.__shady.previousSibling;
    let n = node.__shady.nextSibling;
    if (p) {
      p.__shady = p.__shady || {};
      p.__shady.nextSibling = n;
    }
    if (n) {
      n.__shady = n.__shady || {};
      n.__shady.previousSibling = p;
    }
    // When an element is removed, logical data is no longer tracked.
    // Explicitly set `undefined` here to indicate this. This is disginguished
    // from `null` which is set if info is null.
    node.__shady.parentNode = node.__shady.previousSibling =
      node.__shady.nextSibling = null;
    if (container.__patched) {
      // remove caching of childNodes
      container.__shady.childNodes = null;
    }
  }

}


// TODO(sorvell): composed tree manipulation is made available
// (1) to maninpulate the composed tree, and (2) to track changes
// to the tree for optional patching pluggability.
tree.Composed = {

  hasParentNode(node) {
    return Boolean(node.__shady && node.__shady.$parentNode !== undefined);
  },

  hasChildNodes(node) {
    return Boolean(node.__shady && node.__shady.$childNodes !== undefined);
  },

  getChildNodes(node) {
    return tree.needsChildren(node) ?
      this._getChildNodes(node) :
      tree.arrayCopy(node.childNodes);
  },

  _getChildNodes(node) {
    if (!node.__shady.$childNodes) {
      node.__shady.$childNodes = [];
      for (let n=node.__shady.$firstChild; n; n=n.__shady.$nextSibling) {
        node.__shady.$childNodes.push(n);
      }
    }
    return node.__shady.$childNodes;
  },

  getComposedChildNodes(node) {
    return node.__shady.$childNodes;
  },

  getParentNode(node) {
    return this.hasParentNode(node) ? node.__shady.$parentNode :
      (!node.__patched && node.parentNode);
  },

  getFirstChild(node) {
    return node.__patched ? node.__shady.$firstChild : node.firstChild;
  },

  getLastChild(node) {
    return node.__patched ? node.__shady.$lastChild : node.lastChild;
  },

  getNextSibling(node) {
    return node.__patched ? node.__shady.$nextSibling : node.nextSibling;
  },

  getPreviousSibling(node) {
    return node.__patched ? node.__shady.$previousSibling : node.previousSibling;
  },

  getFirstElementChild(node) {
    return node.__patched ? this._getFirstElementChild(node) :
      node.firstElementChild;
  },

  _getFirstElementChild(node) {
    let n = node.__shady.$firstChild;
    while (n && n.nodeType !== Node.ELEMENT_NODE) {
      n = n.__shady.$nextSibling;
    }
    return n;
  },

  getLastElementChild(node) {
    return node.__patched ? this._getLastElementChild(node) :
      node.lastElementChild;
  },

  _getLastElementChild(node) {
    let n = node.__shady.$lastChild;
    while (n && n.nodeType !== Node.ELEMENT_NODE) {
      n = n.__shady.$previousSibling;
    }
    return n;
  },

  getNextElementSibling(node) {
    return node.__patched ? this._getNextElementSibling(node) :
      node.nextElementSibling;
  },

  _getNextElementSibling(node) {
    let n = node.__shady.$nextSibling;
    while (n && n.nodeType !== Node.ELEMENT_NODE) {
      n = this.getNextSibling(n);
    }
    return n;
  },

  getPreviousElementSibling(node) {
    return node.__patched ? this._getPreviousElementSibling(node) :
      node.previousElementSibling;
  },

  _getPreviousElementSibling(node) {
    let n = node.__shady.$previousSibling;
    while (n && n.nodeType !== Node.ELEMENT_NODE) {
      n = this.getPreviousSibling(n);
    }
    return n;
  },

  saveChildNodes(node) {
    if (!this.hasChildNodes(node)) {
      node.__shady = node.__shady || {};
      node.__shady.$firstChild = node.firstChild;
      node.__shady.$lastChild = node.lastChild;
      let c$ = node.__shady.$childNodes = tree.arrayCopyChildNodes(node);
      for (let i=0, n; (i<c$.length) && (n=c$[i]); i++) {
        this.saveComposedData(n);
      }
    }
  },

  saveComposedData(node) {
    node.__shady = node.__shady || {};
    if (node.__shady.$parentNode === undefined) {
      node.__shady.$parentNode = node.parentNode;
    }
    if (node.__shady.$nextSibling === undefined) {
      node.__shady.$nextSibling = node.nextSibling;
    }
    if (node.__shady.$previousSibling === undefined) {
      node.__shady.$previousSibling = node.previousSibling;
    }
  },

  recordInsertBefore(node, container, ref_node) {
    container.__shady.$childNodes = null;
    // handle document fragments
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      // TODO(sorvell): remember this for patching:
      // the act of setting this info can affect patched nodes
      // getters; therefore capture childNodes before patching.
      for (let n=this.getFirstChild(node); n; n=this.getNextSibling(n)) {
        this._linkNode(n, container, ref_node);
      }
    } else {
      this._linkNode(node, container, ref_node);
    }
  },

  _linkNode(node, container, ref_node) {
    node.__shady = node.__shady || {};
    container.__shady = container.__shady || {};
    if (ref_node) {
      ref_node.__shady = ref_node.__shady || {};
    }
    // update ref_node.previousSibling <-> node
    node.__shady.$previousSibling = ref_node ? ref_node.__shady.$previousSibling :
      this.getLastChild(container);
    let ps = node.__shady.$previousSibling;
    if (ps && ps.__shady) {
      ps.__shady.$nextSibling = node;
    }
    // update node <-> ref_node
    let ns = node.__shady.$nextSibling = ref_node;
    if (ns && ns.__shady) {
      ns.__shady.$previousSibling = node;
    }
    // update node <-> container
    node.__shady.$parentNode = container;
    if (tree.needsChildren(container)) {
      if (ref_node) {
        if (ref_node === container.__shady.$firstChild) {
          container.__shady.$firstChild = node;
        }
      } else {
        container.__shady.$lastChild = node;
        if (!this.getFirstChild(container)) {
          container.__shady.$firstChild = node;
        }
      }
    }
    // remove caching of childNodes
    container.__shady.$childNodes = null;

  },

  recordRemoveChild(node, container) {
    node.__shady = node.__shady || {};
    container.__shady = container.__shady || {};
    if (tree.needsChildren(container)) {
      if (node === container.__shady.$firstChild) {
        container.__shady.$firstChild = node.__shady.$nextSibling;
      }
      if (node === container.__shady.$lastChild) {
        container.__shady.$lastChild = node.__shady.$previousSibling;
      }
    }
    let p = node.__shady.$previousSibling;
    let n = node.__shady.$nextSibling;
    if (p) {
      p.__shady = p.__shady || {};
      p.__shady.$nextSibling = n;
    }
    if (n) {
      n.__shady = n.__shady || {};
      n.__shady.$previousSibling = p;
    }
    node.__shady.$parentNode = node.__shady.$previousSibling =
      node.__shady.$nextSibling = null;
    // remove caching of childNodes
    container.__shady.$childNodes = null;
  },

  clearChildNodes(node) {
    let c$ = this.getChildNodes(node);
    for (let i=0, c; i < c$.length; i++) {
      c = c$[i];
      this.recordRemoveChild(c, node);
      nativeRemoveChild.call(node, c)
    }
  },

  saveParentNode(node) {
    node.__shady = node.__shady || {};
    node.__shady.$parentNode = node.parentNode;
  },

  insertBefore(parentNode, newChild, refChild) {
    this.saveChildNodes(parentNode);
    // remove from current location.
    this._addChild(parentNode, newChild, refChild);
    return nativeInsertBefore.call(parentNode, newChild, refChild || null);
  },

  appendChild(parentNode, newChild) {
    this.saveChildNodes(parentNode);
    this._addChild(parentNode, newChild);
    return nativeAppendChild.call(parentNode, newChild);
  },

  removeChild(parentNode, node) {
    let currentParent = this.getParentNode(node);
    this.saveChildNodes(parentNode);
    this._removeChild(parentNode, node);
    if (currentParent === parentNode) {
      return nativeRemoveChild.call(parentNode, node);
    }
  },

  _addChild(parentNode, newChild, refChild) {
    let isFrag = (newChild.nodeType === Node.DOCUMENT_FRAGMENT_NODE);
    let oldParent = this.getParentNode(newChild);
    if (oldParent) {
      this._removeChild(oldParent, newChild);
    }
    if (isFrag) {
      let c$ = this.getChildNodes(newChild);
      for (let i=0; i < c$.length; i++) {
        let c = c$[i];
        // unlink document fragment children
        this._removeChild(newChild, c);
        this.recordInsertBefore(c, parentNode, refChild);
      }
    } else {
      this.recordInsertBefore(newChild, parentNode, refChild);
    }
  },

  _removeChild(parentNode, node) {
    this.recordRemoveChild(node, parentNode);
  }

};

// for testing...
let descriptors = {};
export function getNativeProperty(element, property) {
  if (!descriptors[property]) {
    descriptors[property] = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype, property) ||
    Object.getOwnPropertyDescriptor(
      Element.prototype, property) ||
    Object.getOwnPropertyDescriptor(
      Node.prototype, property);
  }
  return descriptors[property].get.call(element);
}

// for testing...
function assertNative(element, property, tracked) {
  let native = getNativeProperty(element, property);
  if (native != tracked && element.__patched) {
    window.console.warn('tracked', tracked, 'native', native);
  }
  return tracked;
}