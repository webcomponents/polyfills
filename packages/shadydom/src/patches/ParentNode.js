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
 * Performs the equivalent of `querySelectorAll` within Shady DOM's logical
 * model of the tree for a selector list.
 *
 * See <./logicalQuerySelectorAll.md> for implementation details.
 *
 * @param {!Element} contextElement
 * @param {string} selectorList
 * @return {!Array<!Element>}
 */
const logicalQuerySelectorAll = (contextElement, selectorList) => {
  /**
   * A key-renamed version of the return value of `extractSelectors`, which
   * describes a single complex selector.
   *
   * @typedef {{
   *   compoundSelectors: !Array<string>,
   *   combinators: !Array<string>,
   * }}
   */
  let ComplexSelectorParts;

  /**
   * @type {!Array<!ComplexSelectorParts>}
   */
  const complexSelectors = extractSelectors(selectorList)
    .map((complexSelector) => {
      const {
        'selectors': compoundSelectors,
        'joiners': combinators,
      } = splitSelectorBlocks(complexSelector);

      return {
        compoundSelectors,
        combinators,
      };
    })
    .filter(({compoundSelectors}) => compoundSelectors.length > 0);

  if (complexSelectors.length < 1) {
    return [];
  }

  /**
   * Determines if a single compound selector matches an element. If the
   * selector contains `:scope` (as a substring), then `element` must be
   * `contextElement`.
   *
   * @param {!Element} element
   * @param {string} compoundSelector
   * @return {boolean}
   */
  const matchesCompoundSelector = (element, compoundSelector) => {
    return (
      utils.matchesSelector(element, compoundSelector) &&
      (compoundSelector.indexOf(':scope') === -1 || element === contextElement)
    );
  };

  /**
   * An object used to track the current position of a potential selector match.
   *
   * - `target` is the element that matches the selector if the cursor
   * eventually results in a complete match.
   *
   * - `complexSelectorParts` is the decomposed version of the selector that
   * this cursor is attempting to match.
   *
   * - `position` is an element that matches a compound selector in
   * `complexSelectorParts`.
   *
   * - `index` is the index of the compound selector in `complexSelectorParts`
   * that matched `position`.
   *
   * @typedef {{
   *   target: !Element,
   *   complexSelectorParts: !ComplexSelectorParts,
   *   position: !Element,
   *   index: number,
   * }}
   */
  let SelectorMatchingCursor;

  /**
   * The list of `SelectorMatchingCursor`s, initialized with cursors pointing at
   * all descendants of `contextElement` that match the last compound selector
   * in any complex selector in `selectorList`.
   *
   * @type {!Array<!SelectorMatchingCursor>}
   */
  let cursors = utils.flat(
    query(contextElement, (_element) => true).map((element) => {
      return utils.flat(
        complexSelectors.map((complexSelectorParts) => {
          const {compoundSelectors} = complexSelectorParts;
          const index = compoundSelectors.length - 1;
          if (matchesCompoundSelector(element, compoundSelectors[index])) {
            return [
              {
                target: element,
                complexSelectorParts,
                position: element,
                index,
              },
            ];
          } else {
            return [];
          }
        })
      );
    })
  );

  // At each step, any remaining cursors that have not finished matching (i.e.
  // with `cursor.index > 0`) should be replaced with new cursors for any valid
  // candidates that match the next compound selector.
  while (cursors.length > 0 && cursors.some((cursor) => cursor.index > 0)) {
    cursors = utils.flat(
      cursors.map((cursor) => {
        // Cursors with `index` of 0 have already matched and should not be
        // replaced or removed.
        if (cursor.index <= 0) {
          return cursor;
        }

        const {
          target,
          position,
          complexSelectorParts,
          index: lastIndex,
        } = cursor;
        const index = lastIndex - 1;
        const combinator = complexSelectorParts.combinators[index];
        const compoundSelector = complexSelectorParts.compoundSelectors[index];

        if (combinator === ' ') {
          const results = [];

          // For `a b`, where existing cursors have `position`s matching `b`,
          // the candidates to test against `a` are all ancestors each cursor's
          // `position`.
          for (
            let ancestor = position[utils.SHADY_PREFIX + 'parentNode'];
            ancestor && ancestor instanceof Element;
            ancestor = ancestor[utils.SHADY_PREFIX + 'parentNode']
          ) {
            if (matchesCompoundSelector(ancestor, compoundSelector)) {
              results.push({
                target,
                complexSelectorParts,
                position: ancestor,
                index,
              });
            }
          }

          return results;
        } else if (combinator === '>') {
          const parent = position[utils.SHADY_PREFIX + 'parentNode'];

          // For `a > b`, where existing cursors have `position`s matching `b`,
          // the candidates to test against `a` are the parents of each cursor's
          // `position`.
          if (
            parent &&
            parent instanceof Element &&
            matchesCompoundSelector(parent, compoundSelector)
          ) {
            return [
              {
                target,
                complexSelectorParts,
                position: parent,
                index,
              },
            ];
          }

          return [];
        } else if (combinator === '+') {
          const sibling =
            position[utils.SHADY_PREFIX + 'previousElementSibling'];

          // For `a + b`, where existing cursors have `position`s matching `b`,
          // the candidates to test against `a` are the immediately preceding
          // siblings of each cursor's `position`.
          if (sibling && matchesCompoundSelector(sibling, compoundSelector)) {
            return [
              {
                target,
                complexSelectorParts,
                position: sibling,
                index,
              },
            ];
          }

          return [];
        } else if (combinator === '~') {
          const results = [];

          // For `a ~ b`, where existing cursors have `position`s matching `b`,
          // the candidates to test against `a` are all preceding siblings of
          // each cursor's `position`.
          for (
            let sibling =
              position[utils.SHADY_PREFIX + 'previousElementSibling'];
            sibling;
            sibling = sibling[utils.SHADY_PREFIX + 'previousElementSibling']
          ) {
            if (matchesCompoundSelector(sibling, compoundSelector)) {
              results.push({
                target,
                complexSelectorParts,
                position: sibling,
                index,
              });
            }
          }

          return results;
        } else {
          // As of writing, there are no other combinators:
          // <https://drafts.csswg.org/selectors/#combinators>
          throw new Error(`Unrecognized combinator: '${combinator}'.`);
        }
      })
    );
  }

  // Map remaining cursors to their `target` and deduplicate.
  return Array.from(new Set(cursors.map(({target}) => target)));
};

export const QueryPatches = utils.getOwnPropertyDescriptors({
  // TODO(sorvell): consider doing native QSA and filtering results.
  /**
   * @this {Element}
   * @param  {string} selector
   */
  querySelector(selector) {
    return logicalQuerySelectorAll(this, selector)[0] || null;
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
      logicalQuerySelectorAll(this, selector)
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
