/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from '../utils.js';
import {shadyDataForNode} from '../shady-data.js';

/**
 * @param {Node} node
 * @param {Function} matcher
 * @param {Function=} halter
 */
export function query(node, matcher, halter) {
  let list = [];
  queryElements(node[utils.SHADY_PREFIX + 'childNodes'], matcher,
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
  queryElements(node[utils.SHADY_PREFIX + 'childNodes'], matcher,
    halter, list);
}

// Needed on Element, DocumentFragment, Document
export const ParentNodePatches = utils.getOwnPropertyDescriptors({

  /** @this {Element} */
  get firstElementChild() {
    const nodeData = shadyDataForNode(this);
    if (nodeData && nodeData.firstChild !== undefined) {
      let n = this[utils.SHADY_PREFIX + 'firstChild'];
      while (n && n.nodeType !== Node.ELEMENT_NODE) {
        n = n[utils.SHADY_PREFIX + 'nextSibling'];
      }
      return n;
    } else {
      return this[utils.NATIVE_PREFIX + 'firstElementChild'];
    }
  },

  /** @this {Element} */
  get lastElementChild() {
    const nodeData = shadyDataForNode(this);
    if (nodeData && nodeData.lastChild !== undefined) {
      let n = this[utils.SHADY_PREFIX + 'lastChild'];
      while (n && n.nodeType !== Node.ELEMENT_NODE) {
        n = n[utils.SHADY_PREFIX + 'previousSibling'];
      }
      return n;
    } else {
      return this[utils.NATIVE_PREFIX + 'lastElementChild'];
    }
  },

  /** @this {Element} */
  get children() {
    if (!utils.isTrackingLogicalChildNodes(this)) {
      return this[utils.NATIVE_PREFIX + 'children'];
    }
    return utils.createPolyfilledHTMLCollection(Array.prototype.filter.call(
        this[utils.SHADY_PREFIX + 'childNodes'], function(n) {
      return (n.nodeType === Node.ELEMENT_NODE);
    }));
  },

  /** @this {Element} */
  get childElementCount() {
    return this[utils.SHADY_PREFIX + 'children'].length;
  }

});

export const QueryPatches = utils.getOwnPropertyDescriptors({
  // TODO(sorvell): consider doing native QSA and filtering results.
  /**
   * @this {Element}
   * @param  {string} selector
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
   * @this {Element}
   * @param  {string} selector
   * @param  {boolean} useNative
   */
  // TODO(sorvell): `useNative` option relies on native querySelectorAll and
  // misses distributed nodes, see
  // https://github.com/webcomponents/shadydom/pull/210#issuecomment-361435503
  querySelectorAll(selector, useNative) {
    if (useNative) {
      const o = Array.prototype.slice.call(this[utils.NATIVE_PREFIX + 'querySelectorAll'](selector));
      const root = this[utils.SHADY_PREFIX + 'getRootNode']();
      return o.filter(e => e[utils.SHADY_PREFIX + 'getRootNode']() == root);
    }
    return query(this, function(n) {
      return utils.matchesSelector(n, selector);
    });
  }

});

// Create a custom `ParentNodeDocumentOrFragment` that optionally does not
// mixin querySelector/All; this is a performance optimization.
export const ParentNodeDocumentOrFragmentPatches = utils.settings.preferPerformance ?
  Object.assign({}, ParentNodePatches) : ParentNodePatches;

Object.assign(ParentNodePatches, QueryPatches);