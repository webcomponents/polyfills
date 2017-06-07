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

/**
 * Try to add node. Record logical info, track insertion points, perform
 * distribution iff needed. Return true if the add is handled.
 * @param {Node} container
 * @param {Node} node
 * @param {Node} ref_node
 * @return {boolean}
 */
function addNode(container, node, ref_node) {
  let ownerRoot = utils.ownerShadyRootForNode(container);
  let ipAdded;
  if (ownerRoot) {
    // optimization: special insertion point tracking
    // TODO(sorvell): verify that the renderPending check here should not be needed.
    if (node['__noInsertionPoint'] && !ownerRoot._changePending) {
      ownerRoot._skipUpdateInsertionPoints = true;
    }
    // note: we always need to see if an insertion point is added
    // since this saves logical tree info; however, invalidation state
    // needs
    ipAdded = _maybeAddInsertionPoint(node, container, ownerRoot);
    // invalidate insertion points IFF not already invalid!
    if (ipAdded) {
      ownerRoot._skipUpdateInsertionPoints = false;
    }
  }
  if (container.__shady && container.__shady.firstChild !== undefined) {
    logicalTree.recordInsertBefore(node, container, ref_node);
  }
  // if not distributing and not adding to host, do a fast path addition
  // TODO(sorvell): revisit flow since `ipAdded` needed here if
  // node is a fragment that has a patched QSA.
  let handled = _maybeDistribute(node, container, ownerRoot, ipAdded) ||
    container.__shady.root ||
    // TODO(sorvell): we *should* consider the add "handled"
    // if the container or ownerRoot is `_renderPending`.
    // However, this will regress performance right now and is blocked on a
    // fix for https://github.com/webcomponents/shadydom/issues/95
    // handled if ref_node parent is a root that is rendering.
    (ref_node && utils.isShadyRoot(ref_node.parentNode) &&
      ref_node.parentNode._renderPending);
  return handled;
}


/**
 * Try to remove node: update logical info and perform distribution iff
 * needed. Return true if the removal has been handled.
 * note that it's possible for both the node's host and its parent
 * to require distribution... both cases are handled here.
 * @param {Node} node
 * @return {boolean}
 */
function removeNode(node) {
  // important that we want to do this only if the node has a logical parent
  let logicalParent = node.__shady && node.__shady.parentNode;
  let distributed;
  let ownerRoot = utils.ownerShadyRootForNode(node);
  if (logicalParent || ownerRoot) {
    // distribute node's parent iff needed
    distributed = maybeDistributeParent(node);
    if (logicalParent) {
      logicalTree.recordRemoveChild(node, logicalParent);
    }
    // remove node from root and distribute it iff needed
    let removedDistributed = ownerRoot &&
      _removeDistributedChildren(ownerRoot, node);
    let addedInsertionPoint = (logicalParent && ownerRoot &&
      logicalParent.localName === ownerRoot.getInsertionPointTag());
    if (removedDistributed || addedInsertionPoint) {
      ownerRoot._skipUpdateInsertionPoints = false;
      updateRootViaContentChange(ownerRoot);
    }
  }
  _removeOwnerShadyRoot(node);
  return distributed;
}

/**
 * @param {Node} node
 * @param {Node=} addedNode
 * @param {Node=} removedNode
 */
function _scheduleObserver(node, addedNode, removedNode) {
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

function removeNodeFromParent(node, logicalParent) {
  if (logicalParent) {
    _scheduleObserver(logicalParent, null, node);
    return removeNode(node);
  } else {
    // composed but not logical parent
    if (node.parentNode) {
      nativeMethods.removeChild.call(node.parentNode, node);
    }
    _removeOwnerShadyRoot(node);
  }
}

function _hasCachedOwnerRoot(node) {
  return Boolean(node.__shady && node.__shady.ownerShadyRoot !== undefined);
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

function _maybeDistribute(node, container, ownerRoot, ipAdded) {
  // TODO(sorvell): technically we should check non-fragment nodes for
  // <content> children but since this case is assumed to be exceedingly
  // rare, we avoid the cost and will address with some specific api
  // when the need arises.  For now, the user must call
  // distributeContent(true), which updates insertion points manually
  // and forces distribution.
  let insertionPointTag = ownerRoot && ownerRoot.getInsertionPointTag() || '';
  let fragContent = (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) &&
    !node['__noInsertionPoint'] &&
    insertionPointTag && node.querySelector(insertionPointTag);
  let wrappedContent = fragContent &&
    (fragContent.parentNode.nodeType !==
    Node.DOCUMENT_FRAGMENT_NODE);
  let hasContent = fragContent || (node.localName === insertionPointTag);
  // There are 3 possible cases where a distribution may need to occur:
  // 1. <content> being inserted (the host of the shady root where
  //    content is inserted needs distribution)
  // 2. children being inserted into parent with a shady root (parent
  //    needs distribution)
  // 3. container is an insertionPoint
  if (hasContent || (container.localName === insertionPointTag) || ipAdded) {
    if (ownerRoot) {
      // note, insertion point list update is handled after node
      // mutations are complete
      updateRootViaContentChange(ownerRoot);
    }
  }
  let needsDist = _nodeNeedsDistribution(container);
  if (needsDist) {
    let root = container.__shady && container.__shady.root;
    updateRootViaContentChange(root);
  }
  // Return true when distribution will fully handle the composition
  // Note that if a content was being inserted that was wrapped by a node,
  // and the parent does not need distribution, return false to allow
  // the nodes to be added directly, after which children may be
  // distributed and composed into the wrapping node(s)
  return needsDist || (hasContent && !wrappedContent);
}

/* note: parent argument is required since node may have an out
of date parent at this point; returns true if a <content> is being added */
function _maybeAddInsertionPoint(node, parent, root) {
  let added;
  let insertionPointTag = root.getInsertionPointTag();
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
    !node['__noInsertionPoint']) {
    let c$ = node.querySelectorAll(insertionPointTag);
    for (let i=0, n, np, na; (i<c$.length) && (n=c$[i]); i++) {
      np = n.parentNode;
      // don't allow node's parent to be fragment itself
      if (np === node) {
        np = parent;
      }
      na = _maybeAddInsertionPoint(n, np, root);
      added = added || na;
    }
  } else if (node.localName === insertionPointTag) {
    logicalTree.recordChildNodes(parent);
    logicalTree.recordChildNodes(node);
    added = true;
  }
  return added;
}

function _nodeNeedsDistribution(node) {
  let root = node && node.__shady && node.__shady.root;
  return root && root.hasInsertionPoint();
}

function _removeDistributedChildren(root, container) {
  let hostNeedsDist;
  let ip$ = root._getInsertionPoints();
  for (let i=0; i<ip$.length; i++) {
    let insertionPoint = ip$[i];
    if (_contains(container, insertionPoint)) {
      let dc$ = insertionPoint.assignedNodes({flatten: true});
      for (let j=0; j<dc$.length; j++) {
        hostNeedsDist = true;
        let node = dc$[j];
        let parent = parentNode(node);
        if (parent) {
          nativeMethods.removeChild.call(parent, node);
        }
      }
    }
  }
  return hostNeedsDist;
}

function _contains(container, node) {
  while (node) {
    if (node == container) {
      return true;
    }
    node = node.parentNode;
  }
}

function _removeOwnerShadyRoot(node) {
  // optimization: only reset the tree if node is actually in a root
  if (_hasCachedOwnerRoot(node)) {
    let c$ = node.childNodes;
    for (let i=0, l=c$.length, n; (i<l) && (n=c$[i]); i++) {
      _removeOwnerShadyRoot(n);
    }
  }
  node.__shady = node.__shady || {};
  node.__shady.ownerShadyRoot = undefined;
}

// TODO(sorvell): This will fail if distribution that affects this
// question is pending; this is expected to be exceedingly rare, but if
// the issue comes up, we can force a flush in this case.
function firstComposedNode(insertionPoint) {
  let n$ = insertionPoint.assignedNodes({flatten: true});
  let root = getRootNode(insertionPoint);
  for (let i=0, l=n$.length, n; (i<l) && (n=n$[i]); i++) {
    // means that we're composed to this spot.
    if (root.isFinalDestination(insertionPoint, n)) {
      return n;
    }
  }
}

function maybeDistributeParent(node) {
  let parent = node.parentNode;
  if (_nodeNeedsDistribution(parent)) {
    updateRootViaContentChange(parent.__shady.root);
    return true;
  }
}

function updateRootViaContentChange(root) {
  // mark root as mutation based on a mutation
  root._changePending = true;
  root.update();
}

function distributeAttributeChange(node, name) {
  if (name === 'slot') {
    maybeDistributeParent(node);
  } else if (node.localName === 'slot' && name === 'name') {
    let root = utils.ownerShadyRootForNode(node);
    if (root) {
      root.update();
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
  _queryElements(node.childNodes, matcher,
    halter, list);
  return list;
}

function _queryElements(elements, matcher, halter, list) {
  for (let i=0, l=elements.length, c; (i<l) && (c=elements[i]); i++) {
    if (c.nodeType === Node.ELEMENT_NODE &&
        _queryElement(c, matcher, halter, list)) {
      return true;
    }
  }
}

function _queryElement(node, matcher, halter, list) {
  let result = matcher(node);
  if (result) {
    list.push(node);
  }
  if (halter && halter(result)) {
    return result;
  }
  _queryElements(node.childNodes, matcher,
    halter, list);
}

export function renderRootNode(element) {
  var root = element.getRootNode();
  if (utils.isShadyRoot(root)) {
    root.render();
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
  // remove node from its current position iff it's in a tree.
  if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    let parent = node.__shady && node.__shady.parentNode;
    removeNodeFromParent(node, parent);
  }
  if (!addNode(parent, node, ref_node)) {
    if (ref_node) {
      // if ref_node is an insertion point replace with first distributed node
      let root = utils.ownerShadyRootForNode(ref_node);
      if (root) {
        ref_node = ref_node.localName === root.getInsertionPointTag() ?
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
  _scheduleObserver(parent, node);
  return node;
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
  if (!removeNode(node)) {
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
  _scheduleObserver(parent, null, node);
  return node;
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
