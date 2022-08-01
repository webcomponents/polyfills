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
import extractSelectors, {
  splitSelectorBlocks,
} from './css-selector-splitter.js';

/**
 * @param {Node} node
 * @param {Function} matcher
 * @param {Function=} halter
 */
export function query(node, matcher, halter) {
  let list = [];
  queryChildNodes(node, matcher, halter, list);
  return list;
}

function queryChildNodes(parent, matcher, halter, list) {
  for (
    let n = parent[utils.SHADY_PREFIX + 'firstChild'];
    n;
    n = n[utils.SHADY_PREFIX + 'nextSibling']
  ) {
    if (
      n.nodeType === Node.ELEMENT_NODE &&
      queryElement(n, matcher, halter, list)
    ) {
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
  queryChildNodes(node, matcher, halter, list);
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
    return utils.createPolyfilledHTMLCollection(
      Array.prototype.filter.call(utils.childNodesArray(this), (n) => {
        return n.nodeType === Node.ELEMENT_NODE;
      })
    );
  },

  /** @this {Element} */
  get childElementCount() {
    let children = this[utils.SHADY_PREFIX + 'children'];
    if (children) {
      return children.length;
    }
    return 0;
  },

  /** @this {Element} */
  append(...args) {
    this[utils.SHADY_PREFIX + 'insertBefore'](
      utils.convertNodesIntoANode(...args),
      null
    );
  },

  /** @this {Element} */
  prepend(...args) {
    this[utils.SHADY_PREFIX + 'insertBefore'](
      utils.convertNodesIntoANode(...args),
      this[utils.SHADY_PREFIX + 'firstChild']
    );
  },

  /** @this {Element} */
  ['replaceChildren'](...args) {
    let child;
    while ((child = this[utils.SHADY_PREFIX + 'firstChild']) !== null) {
      this[utils.SHADY_PREFIX + 'removeChild'](child);
    }
    this[utils.SHADY_PREFIX + 'insertBefore'](
      utils.convertNodesIntoANode(...args),
      null
    );
  },
});

/**
 * @param {!Array<T>} array
 * @return {!Array<T>}
 * @template T
 */
const deduplicateArray = (array) => Array.from(new Set(array));

/**
 * @param {!Element} ancestor
 * @param {!Array<!Element>} elements
 * @return {!Array<!Element>}
 */
const deduplicateAndFilterToDescendants = (ancestor, elements) => {
  return deduplicateArray(elements).filter((element) => {
    return (
      element !== ancestor && ancestor[utils.SHADY_PREFIX + 'contains'](element)
    );
  });
};

/**
 * @param {!Element} contextElement
 * @param {string} selectorList
 * @return {!Array<!Element>}
 */
const logicalQuerySelectorList = (contextElement, selectorList) => {
  return deduplicateAndFilterToDescendants(
    contextElement,
    utils.flat(
      extractSelectors(selectorList).map((selector) => {
        return logicalQuerySingleSelector(contextElement, selector);
      })
    )
  );
};

/**
 * @param {!Element} contextElement
 * @param {string} complexSelector
 * @return {!Array<!Element>}
 */
const logicalQuerySingleSelector = (contextElement, complexSelector) => {
  const {
    'selectors': simpleSelectors,
    'joiners': combinators,
  } = splitSelectorBlocks(complexSelector);

  if (simpleSelectors.length < 1) {
    return [];
  }

  /**
   * @type {!Array<!{
   *   position: !Element,
   *   target: !Element,
   * }>}
   */
  let cursors = query(
    contextElement[utils.SHADY_PREFIX + 'getRootNode'](),
    (node) => {
      return utils.matchesSelector(
        node,
        simpleSelectors[simpleSelectors.length - 1]
      );
    }
  ).map((element) => ({position: element, target: element}));

  /**
   * @param {!Element} element
   * @param {string} simpleSelector
   * @return {boolean}
   */
  const matchesSimpleSelector = (element, simpleSelector) => {
    return (
      utils.matchesSelector(element, simpleSelector) &&
      (simpleSelector.indexOf(':scope') === -1 || element === contextElement)
    );
  };

  for (let i = combinators.length - 1; i >= 0; i--) {
    const combinator = combinators[i];
    const simpleSelector = simpleSelectors[i];

    if (combinator === ' ') {
      // Descendant combinator
      cursors = utils.flat(
        cursors.map((cursor) => {
          const results = [];

          for (
            let ancestor = cursor.position[utils.SHADY_PREFIX + 'parentNode'];
            ancestor && ancestor instanceof Element;
            ancestor = ancestor[utils.SHADY_PREFIX + 'parentNode']
          ) {
            if (matchesSimpleSelector(ancestor, simpleSelector)) {
              results.push({position: ancestor, target: cursor.target});
            }
          }

          return results;
        })
      );
    } else if (combinator === '>') {
      // Child combinator
      cursors = utils.flat(
        cursors.map((cursor) => {
          const parent = cursor.position[utils.SHADY_PREFIX + 'parentNode'];

          if (
            parent &&
            parent instanceof Element &&
            matchesSimpleSelector(parent, simpleSelector)
          ) {
            return [{position: parent, target: cursor.target}];
          }

          return [];
        })
      );
    } else if (combinator === '+') {
      // Next-sibling combinator
      cursors = utils.flat(
        cursors.map((cursor) => {
          const sibling =
            cursor.position[utils.SHADY_PREFIX + 'previousElementSibling'];

          if (sibling && matchesSimpleSelector(sibling, simpleSelector)) {
            return [{position: sibling, target: cursor.target}];
          }

          return [];
        })
      );
    } else if (combinator === '~') {
      // Subsequent-sibling combinator
      cursors = utils.flat(
        cursors.map((cursor) => {
          const results = [];

          for (
            let sibling =
              cursor.position[utils.SHADY_PREFIX + 'previousElementSibling'];
            sibling;
            sibling = sibling[utils.SHADY_PREFIX + 'previousElementSibling']
          ) {
            if (matchesSimpleSelector(sibling, simpleSelector)) {
              results.push({position: sibling, target: cursor.target});
            }
          }

          return results;
        })
      );
    } else {
      throw new Error(`Unrecognized combinator: '${combinator}'.`);
    }
  }

  return deduplicateAndFilterToDescendants(
    contextElement,
    cursors.map((cursor) => cursor.target)
  );
};

export const QueryPatches = utils.getOwnPropertyDescriptors({
  // TODO(sorvell): consider doing native QSA and filtering results.
  /**
   * @this {Element}
   * @param  {string} selector
   */
  querySelector(selector) {
    return logicalQuerySelectorList(this, selector)[0] || null;
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
      const o = Array.prototype.slice.call(
        this[utils.NATIVE_PREFIX + 'querySelectorAll'](selector)
      );
      const root = this[utils.SHADY_PREFIX + 'getRootNode']();
      return utils.createPolyfilledHTMLCollection(
        o.filter((e) => e[utils.SHADY_PREFIX + 'getRootNode']() == root)
      );
    }
    return utils.createPolyfilledHTMLCollection(
      logicalQuerySelectorList(this, selector)
    );
  },
});

// In preferPerformance mode, create a custom `ParentNodeDocumentOrFragment`
// that optionally does not mixin querySelector/All; this is a performance
// optimization. In noPatch, we need to keep the query patches here in order to
// ensure the query API is available on the wrapper
export const ParentNodeDocumentOrFragmentPatches =
  utils.settings.preferPerformance && !utils.settings.noPatch
    ? utils.assign({}, ParentNodePatches)
    : ParentNodePatches;

utils.assign(ParentNodePatches, QueryPatches);
