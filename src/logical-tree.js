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

import {hasProperty} from './logical-properties'
import {patchInsideElementAccessors, patchOutsideElementAccessors} from './patch-accessors'
import {firstChild, lastChild, childNodes} from './native-tree'

export function recordInsertBefore(node, container, ref_node) {
  patchInsideElementAccessors(container);
  container.__shady = container.__shady || {};
  if (hasProperty(container, 'firstChild')) {
    container.__shady.childNodes = null;
  }
  // handle document fragments
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    let c$ = node.childNodes;
    for (let i=0; i < c$.length; i++) {
      linkNode(c$[i], container, ref_node);
    }
    // cleanup logical dom in doc fragment.
    node.__shady = node.__shady || {};
    let resetTo = hasProperty(node, 'firstChild') ? null : undefined;
    node.__shady.firstChild = node.__shady.lastChild = resetTo;
    node.__shady.childNodes = resetTo;
  } else {
    linkNode(node, container, ref_node);
  }
}

function linkNode(node, container, ref_node) {
  patchOutsideElementAccessors(node);
  ref_node = ref_node || null;
  node.__shady = node.__shady || {};
  container.__shady = container.__shady || {};
  if (ref_node) {
    ref_node.__shady = ref_node.__shady || {};
  }
  // update ref_node.previousSibling <-> node
  node.__shady.previousSibling = ref_node ? ref_node.__shady.previousSibling :
    container.lastChild;
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
  if (ref_node) {
    if (ref_node === container.__shady.firstChild) {
      container.__shady.firstChild = node;
    }
  } else {
    container.__shady.lastChild = node;
    if (!container.__shady.firstChild) {
      container.__shady.firstChild = node;
    }
  }
  // remove caching of childNodes
  container.__shady.childNodes = null;
}

export function recordRemoveChild(node, container) {
  node.__shady = node.__shady || {};
  container.__shady = container.__shady || {};
  if (node === container.__shady.firstChild) {
    container.__shady.firstChild = node.__shady.nextSibling;
  }
  if (node === container.__shady.lastChild) {
    container.__shady.lastChild = node.__shady.previousSibling;
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
    node.__shady.nextSibling = undefined;
  if (hasProperty(container, 'childNodes')) {
    // remove caching of childNodes
    container.__shady.childNodes = null;
  }
}

export let recordChildNodes = function(node) {
  if (!hasProperty(node, 'firstChild')) {
    node.__shady = node.__shady || {};
    node.__shady.firstChild = firstChild(node);
    node.__shady.lastChild = lastChild(node);
    patchInsideElementAccessors(node);
    let c$ = node.__shady.childNodes = childNodes(node);
    for (let i=0, n; (i<c$.length) && (n=c$[i]); i++) {
      n.__shady = n.__shady || {};
      n.__shady.parentNode = node;
      n.__shady.nextSibling = c$[i+1] || null;
      n.__shady.previousSibling = c$[i-1] || null;
      patchOutsideElementAccessors(n);
    }
  }
}