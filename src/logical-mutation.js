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
import * as logicalTree from './logical-tree.js';
import * as nativeMethods from './native-methods.js';
import {parentNode} from './native-tree.js';

// cases in which we may not be able to just do standard native call
// 1. container has a shadyRoot (needsDistribution IFF the shadyRoot
// has an insertion point)
// 2. container is a shadyRoot (don't distribute, instead set
// container to container.host.
// 3. node is <content> (host of container needs distribution)
/**
 * @param {Node} parent
 * @param {Node} node
 * @param {Node=} ref_node
 */
export function insertBefore(parent, node, ref_node) {
  if (ref_node) {
    let p = ref_node.__shady && ref_node.__shady.parentNode;
    if ((p !== undefined && p !== parent) ||
      (p === undefined && parentNode(ref_node) !== parent)) {
      throw Error(`Failed to execute 'insertBefore' on 'Node': The node ` +
       `before which the new node is to be inserted is not a child of this node.`);
    }
  }
  if (ref_node === node) {
    return node;
  }
  // remove from existing location
  if (node.parentNode) {
    // note: avoid node.removeChild as this *can* trigger another patched
    // method (e.g. custom elements) and we want only the shady method to run.
    removeChild(node.parentNode, node);
  }
  // add to new parent
  let ownerRoot = utils.ownerShadyRootForNode(parent);
  let slotsAdded = ownerRoot && findContainedSlots(node);
  if (parent.__shady && parent.__shady.firstChild !== undefined) {
    logicalTree.recordInsertBefore(node, parent, ref_node);
  }
  if (ownerRoot && (parent.localName === 'slot' || slotsAdded)) {
    ownerRoot._asyncRender();
  }
  let handled = distributeNodeIfNeeded(parent) || parent.__shady.root;
  if (!handled) {
    if (ref_node) {
      // if ref_node is an insertion point replace with first distributed node
      let root = utils.ownerShadyRootForNode(ref_node);
      if (root) {
        ref_node = ref_node.localName === 'slot' ?
          firstComposedNode(/** @type {!HTMLSlotElement} */(ref_node)) : ref_node;
      }
    }
    // if adding to a shadyRoot, add to host instead
    let container = utils.isShadyRoot(parent) ? /** @type {ShadowRoot} */(parent).host : parent;
    if (ref_node) {
      nativeMethods.insertBefore.call(container, node, ref_node);
    } else {
      nativeMethods.appendChild.call(container, node);
    }
  }
  scheduleObserver(parent, node);
  // with insertion complete, can safely update insertion points.
  if (slotsAdded) {
    ownerRoot._addSlots(slotsAdded);
  }
  return node;
}

function findContainedSlots(node) {
  if (!node['__noInsertionPoint']) {
    let slots;
    if (node.localName === 'slot') {
      slots = [node];
    } else if (node.querySelectorAll) {
      slots = node.querySelectorAll('slot');
    }
    if (slots && slots.length) {
      return slots;
    }
  }
}

/**
  Removes the given `node` from the element's `lightChildren`.
  This method also performs dom composition.
*/
export function removeChild(parent, node) {
  if (node.parentNode !== parent) {
    throw Error('The node to be removed is not a child of this node: ' +
      node);
  }
  let logicalParent = node.__shady && node.__shady.parentNode;
  let ownerRoot = utils.ownerShadyRootForNode(node);
  let handled, removingInsertionPoint;
  if (logicalParent) {
    handled = distributeNodeIfNeeded(node.parentNode);
    logicalTree.recordRemoveChild(node, logicalParent);
  }
  removeOwnerShadyRoot(node);
  if (ownerRoot) {
    let changeSlotContent = logicalParent && logicalParent.localName === 'slot';
    removingInsertionPoint = ownerRoot._removeContainerSlots(node);
    if (removingInsertionPoint || changeSlotContent) {
      ownerRoot._asyncRender();
    }
  }
  if (!handled) {
    // if removing from a shadyRoot, remove form host instead
    let container = utils.isShadyRoot(parent) ?
      parent.host :
      parent;
    // not guaranteed to physically be in container; e.g.
    // undistributed nodes.
    let nativeParent = parentNode(node);
    if (container === nativeParent) {
      nativeMethods.removeChild.call(container, node);
    }
  }
  scheduleObserver(parent, null, node);
  return node;
}

function removeOwnerShadyRoot(node) {
  // optimization: only reset the tree if node is actually in a root
  if (hasCachedOwnerRoot(node)) {
    let c$ = node.childNodes;
    for (let i=0, l=c$.length, n; (i<l) && (n=c$[i]); i++) {
      removeOwnerShadyRoot(n);
    }
  }
  node.__shady = node.__shady || {};
  node.__shady.ownerShadyRoot = undefined;
}

function hasCachedOwnerRoot(node) {
  return Boolean(node.__shady && node.__shady.ownerShadyRoot !== undefined);
}

// NOTE(sorvell): This will fail if distribution that affects this
// question is pending; this is expected to be exceedingly rare, but if
// the issue comes up, we can force a flush in this case.
function firstComposedNode(insertionPoint) {
  let n$ = insertionPoint.assignedNodes({flatten: true});
  let root = getRootNode(insertionPoint);
  for (let i=0, l=n$.length, n; (i<l) && (n=n$[i]); i++) {
    // means that we're composed to this spot.
    if (root._isFinalDestination(insertionPoint, n)) {
      return n;
    }
  }
}

function distributeNodeIfNeeded(node) {
  let root = node && node.__shady && node.__shady.root;
  if (root && root._hasInsertionPoint()) {
    root._asyncRender();
    return true;
  }
}

function distributeAttributeChange(node, name) {
  if (name === 'slot') {
    distributeNodeIfNeeded(node.parentNode);
  } else if (node.localName === 'slot' && name === 'name') {
    let root = utils.ownerShadyRootForNode(node);
    if (root) {
      root._removeSlot(node);
      root._addSlots([node]);
      root._asyncRender();
    }
  }
}


/**
 * @param {Node} node
 * @param {Node=} addedNode
 * @param {Node=} removedNode
 */
function scheduleObserver(node, addedNode, removedNode) {
  let observer = node.__shady && node.__shady.observer;
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
  node.__shady = node.__shady || {};
  let root = node.__shady.ownerShadyRoot;
  if (root === undefined) {
    if (utils.isShadyRoot(node)) {
      root = node;
    } else {
      let parent = node.parentNode;
      root = parent ? getRootNode(parent) : node;
    }
    // memo-ize result for performance but only memo-ize
    // result if node is in the document. This avoids a problem where a root
    // can be cached while an element is inside a fragment.
    // If this happens and we cache the result, the value can become stale
    // because for perf we avoid processing the subtree of added fragments.
    if (document.documentElement.contains(node)) {
      node.__shady.ownerShadyRoot = root;
    }
  }
  return root;
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
  queryElements(node.childNodes, matcher,
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
  queryElements(node.childNodes, matcher,
    halter, list);
}

export function renderRootNode(element) {
  var root = element.getRootNode();
  if (utils.isShadyRoot(root)) {
    root._render();
  }
}

let scopingShim = null;

export function setAttribute(node, attr, value) {
  if (!scopingShim) {
    scopingShim = window['ShadyCSS'] && window['ShadyCSS']['ScopingShim'];
  }
  if (scopingShim && attr === 'class') {
    scopingShim['setElementClass'](node, value);
  } else {
    nativeMethods.setAttribute.call(node, attr, value);
    distributeAttributeChange(node, attr);
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
    if (deep) {
      let c$ = node.childNodes;
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
  if (node.ownerDocument !== document) {
    return nativeMethods.importNode.call(document, node, deep);
  }
  let n = nativeMethods.importNode.call(document, node, false);
  if (deep) {
    let c$ = node.childNodes;
    for (let i=0, nc; i < c$.length; i++) {
      nc = importNode(c$[i], true);
      n.appendChild(nc);
    }
  }
  return n;
}