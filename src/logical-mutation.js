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
import {accessors} from './native-tree.js';
import {ensureShadyDataForNode, shadyDataForNode} from './shady-data.js';

const {parentNode} = accessors;

const doc = window.document;

const preferPerformance = utils.settings.preferPerformance;

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
  if (parent.ownerDocument !== doc && node.ownerDocument !== doc) {
    return nativeMethods.insertBefore.call(parent, node, ref_node);
  }
  if (node === parent) {
    throw Error(`Failed to execute 'appendChild' on 'Node': The new child element contains the parent.`);
  }
  if (ref_node) {
    const refData = shadyDataForNode(ref_node);
    const p = refData && refData.parentNode;
    if ((p !== undefined && p !== parent) ||
      (p === undefined && parentNode(ref_node) !== parent)) {
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
  if (node.parentNode) {
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
    removeChild(node.parentNode, node, Boolean(ownerRoot) || !(node.getRootNode() instanceof ShadowRoot));
    scopingFn = (node, newScopeName) => {
      replaceShadyScoping(node, newScopeName, oldScopeName);
    };
  }
  // add to new parent
  let allowNativeInsert = true;
  const needsScoping = (!preferPerformance || node['__noInsertionPoint'] === undefined)
    && !currentScopeIsCorrect(node, newScopeName);
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
    logicalTree.recordInsertBefore(node, parent, ref_node);
    // when inserting into a host with a shadowRoot with slot, use
    // `shadowRoot._asyncRender()` via `attach-shadow` module
    const parentData = shadyDataForNode(parent);
    if (hasShadowRootWithSlot(parent)) {
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
      nativeMethods.insertBefore.call(container, node, ref_node);
    } else {
      nativeMethods.appendChild.call(container, node);
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
    return nativeMethods.removeChild.call(parent, node);
  }
  if (node.parentNode !== parent) {
    throw Error('The node to be removed is not a child of this node: ' +
      node);
  }
  let preventNativeRemove;
  let ownerRoot = utils.ownerShadyRootForNode(node);
  let removingInsertionPoint;
  const parentData = shadyDataForNode(parent);
  if (utils.isTrackingLogicalChildNodes(parent)) {
    logicalTree.recordRemoveChild(node, parent);
    if (hasShadowRootWithSlot(parent)) {
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
      (container === parentNode(node))) {
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

function hasShadowRootWithSlot(node) {
  const nodeData = shadyDataForNode(node);
  let root = nodeData && nodeData.root;
  return (root && root._hasInsertionPoint());
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
    const parent = node.parentNode;
    if (hasShadowRootWithSlot(parent)) {
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
      let parent = node.parentNode;
      root = parent ? getRootNode(parent) : node;
      // memo-ize result for performance but only memo-ize
      // result if node is in the document. This avoids a problem where a root
      // can be cached while an element is inside a fragment.
      // If this happens and we cache the result, the value can become stale
      // because for perf we avoid processing the subtree of added fragments.
      if (nativeMethods.contains.call(document.documentElement, node)) {
        nodeData.ownerShadyRoot = root;
      }
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

function getScopingShim() {
  if (!scopingShim) {
    scopingShim = window['ShadyCSS'] && window['ShadyCSS']['ScopingShim'];
  }
  return scopingShim || null;
}

export function setAttribute(node, attr, value) {
  if (node.ownerDocument !== doc) {
    nativeMethods.setAttribute.call(node, attr, value);
  } else {
    const scopingShim = getScopingShim();
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
  // A template element normally has no children with shadowRoots, so make
  // sure we always make a deep copy to correctly construct the template.content
  if (node.ownerDocument !== document || node.localName === 'template') {
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

/**
 * @param {!Node} node
 * @param {string} newScopeName
 */
function addShadyScoping(node, newScopeName) {
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
function removeShadyScoping(node, currentScopeName) {
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
function replaceShadyScoping(node, newScopeName, oldScopeName) {
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
function currentScopeIsCorrect(node, newScopeName) {
  const scopingShim = getScopingShim();
  if (!scopingShim) {
    return true;
  }
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    // NOTE: as an optimization, only check that all the top-level children
    // have the correct scope.
    let correctScope = true;
    for (let idx = 0; correctScope && (idx < node.childNodes.length); idx++) {
      correctScope = correctScope &&
        currentScopeIsCorrect(node.childNodes[idx], newScopeName);
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
function currentScopeForNode(node) {
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
function treeVisitor(node, visitorFn) {
  if (!node) {
    return;
  }
  // this check is necessary if `node` is a Document Fragment
  if (node.nodeType === Node.ELEMENT_NODE) {
    visitorFn(node);
  }
  for (let idx = 0, n; idx < node.childNodes.length; idx++) {
    n = node.childNodes[idx];
    if (n.nodeType === Node.ELEMENT_NODE) {
      treeVisitor(n, visitorFn);
    }
  }
}