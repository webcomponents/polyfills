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

let scopingShim = null;

export function getScopingShim() {
  if (!scopingShim) {
    scopingShim = window['ShadyCSS'] && window['ShadyCSS']['ScopingShim'];
  }
  return scopingShim || null;
}

/**
 * @param {!Node} node
 * @param {string} attr
 * @param {string} value
 */
export function scopeClassAttribute(node, attr, value) {
  const scopingShim = getScopingShim();
  if (scopingShim && attr === 'class') {
    scopingShim['setElementClass'](node, value);
    return true;
  }
  return false;
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
  if (oldScopeName) {
    removeShadyScoping(node, oldScopeName);
  }
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
    const childNodes = node[utils.SHADY_PREFIX + 'childNodes'];
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
  const childNodes = node[utils.SHADY_PREFIX + 'childNodes'];
  for (let idx = 0, n; idx < childNodes.length; idx++) {
    n = childNodes[idx];
    if (n.nodeType === Node.ELEMENT_NODE) {
      treeVisitor(n, visitorFn);
    }
  }
}