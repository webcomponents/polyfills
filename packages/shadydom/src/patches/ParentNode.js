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
import {ComplexSelectorParts, parseSelectorList} from '../selector-parser.js'; // eslint-disable-line @typescript-eslint/no-unused-vars

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
 * @param {!ParentNode} contextNode
 * @param {string} selectorList
 * @return {!Array<!Element>}
 */
const logicalQuerySelectorAll = (contextNode, selectorList) => {
  /**
   * @type {!Array<!ComplexSelectorParts>}
   */
  const complexSelectors = parseSelectorList(selectorList);

  if (complexSelectors.length < 1) {
    return [];
  }

  /**
   * Determines if a single compound selector matches an element. If the
   * selector contains `:scope` (as a substring), then the selector only is only
   * considered matching if `element` is `contextNode`.
   *
   * @param {!Element} element
   * @param {string} compoundSelector
   * @return {boolean}
   */
  const matchesCompoundSelector = (element, compoundSelector) => {
    return (
      (element === contextNode || compoundSelector.indexOf(':scope') === -1) &&
      utils.matchesSelector(element, compoundSelector)
    );
  };

  /**
   * An object used to track the current position of a potential selector match.
   *
   * - `target` is the element that would be considered matching if the cursor
   * eventually results in a complete match.
   *
   * - `complexSelectorParts` is the parsed representation of the complex
   * selector that this cursor is attempting to match.
   *
   * - `index` is the index into `.complexSelectorParts.compoundSelectors` of
   * the last successfully matched compound selector.
   *
   * - `matchedElement` is the element that successfully matched the compound
   * selector in `.complexSelectorParts.compoundSelectors` at `index`.
   *
   * @typedef {{
   *   target: !Element,
   *   complexSelectorParts: !ComplexSelectorParts,
   *   matchedElement: !Element,
   *   index: number,
   * }}
   */
  let SelectorMatchingCursor; // eslint-disable-line @typescript-eslint/no-unused-vars

  /**
   * The list of `SelectorMatchingCursor`s, initialized with cursors pointing at
   * all descendants of `contextNode` that match the last compound selector in
   * any complex selector in `selectorList`.
   *
   * @type {!Array<!SelectorMatchingCursor>}
   */
  let cursors = utils.flat(
    query(contextNode, (_element) => true).map((element) => {
      return utils.flat(
        complexSelectors.map((complexSelectorParts) => {
          const {compoundSelectors} = complexSelectorParts;
          // Selectors are matched by iterating their compound selectors in
          // reverse order for efficiency. In particular, when finding
          // candidates for the descendant combinator, iterating forwards would
          // imply needing to walk all descendants of the last matched element
          // for possible candidates, but iterating backwards only requires
          // walking up the ancestor chain.
          const index = compoundSelectors.length - 1;
          if (matchesCompoundSelector(element, compoundSelectors[index])) {
            return {
              target: element,
              complexSelectorParts,
              matchedElement: element,
              index,
            };
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
  while (cursors.some((cursor) => cursor.index > 0)) {
    cursors = utils.flat(
      cursors.map((cursor) => {
        // Cursors with `index` of 0 have already matched and should not be
        // replaced or removed.
        if (cursor.index <= 0) {
          return cursor;
        }

        const {
          target,
          matchedElement,
          complexSelectorParts,
          index: lastIndex,
        } = cursor;
        const index = lastIndex - 1;
        const combinator = complexSelectorParts.combinators[index];
        const compoundSelector = complexSelectorParts.compoundSelectors[index];

        if (combinator === ' ') {
          const results = [];

          // For `a b`, where existing cursors have `matchedElement`s matching
          // `b`, the candidates to test against `a` are all ancestors of each
          // cursor's `matchedElement`.
          for (
            let ancestor = matchedElement[utils.SHADY_PREFIX + 'parentElement'];
            ancestor;
            ancestor = ancestor[utils.SHADY_PREFIX + 'parentElement']
          ) {
            if (matchesCompoundSelector(ancestor, compoundSelector)) {
              results.push({
                target,
                complexSelectorParts,
                matchedElement: ancestor,
                index,
              });
            }
          }

          return results;
        } else if (combinator === '>') {
          const parent = matchedElement[utils.SHADY_PREFIX + 'parentElement'];

          // For `a > b`, where existing cursors have `matchedElement`s matching
          // `b`, the candidates to test against `a` are the parents of each
          // cursor's `matchedElement`.
          if (matchesCompoundSelector(parent, compoundSelector)) {
            return {
              target,
              complexSelectorParts,
              matchedElement: parent,
              index,
            };
          }

          return [];
        } else if (combinator === '+') {
          const sibling =
            matchedElement[utils.SHADY_PREFIX + 'previousElementSibling'];

          // For `a + b`, where existing cursors have `matchedElement`s matching
          // `b`, the candidates to test against `a` are the immediately
          // preceding siblings of each cursor's `matchedElement`.
          if (sibling && matchesCompoundSelector(sibling, compoundSelector)) {
            return {
              target,
              complexSelectorParts,
              matchedElement: sibling,
              index,
            };
          }

          return [];
        } else if (combinator === '~') {
          const results = [];

          // For `a ~ b`, where existing cursors have `matchedElement`s matching
          // `b`, the candidates to test against `a` are all preceding siblings
          // of each cursor's `matchedElement`.
          for (
            let sibling =
              matchedElement[utils.SHADY_PREFIX + 'previousElementSibling'];
            sibling;
            sibling = sibling[utils.SHADY_PREFIX + 'previousElementSibling']
          ) {
            if (matchesCompoundSelector(sibling, compoundSelector)) {
              results.push({
                target,
                complexSelectorParts,
                matchedElement: sibling,
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
  return utils.deduplicate(cursors.map(({target}) => target));
};

const querySelectorImplementation =
  utils.settings['querySelectorImplementation'];

export const QueryPatches = utils.getOwnPropertyDescriptors({
  /**
   * @this {!ParentNode}
   * @param {string} selector
   */
  querySelector(selector) {
    if (querySelectorImplementation === 'native') {
      // Polyfilled `ShadowRoot`s don't have a native `querySelectorAll`.
      const target =
        this instanceof ShadowRoot
          ? /** @type {!ShadowRoot} */ (this).host
          : this;
      const candidates = Array.prototype.slice.call(
        target[utils.NATIVE_PREFIX + 'querySelectorAll'](selector)
      );
      const root = this[utils.SHADY_PREFIX + 'getRootNode']();
      // This could use `find`, but Closure doesn't polyfill it.
      for (const candidate of candidates) {
        if (candidate[utils.SHADY_PREFIX + 'getRootNode']() == root) {
          return candidate;
        }
      }
      return null;
    } else if (querySelectorImplementation === 'selectorEngine') {
      return logicalQuerySelectorAll(this, selector)[0] || null;
    } else if (querySelectorImplementation === undefined) {
      // match selector and halt on first result.
      let result = query(
        this,
        function (n) {
          return utils.matchesSelector(n, selector);
        },
        function (n) {
          return Boolean(n);
        }
      )[0];
      return result || null;
    } else {
      throw new Error(
        'Unrecognized value of ShadyDOM.querySelectorImplementation: ' +
          `'${querySelectorImplementation}'`
      );
    }
  },

  /**
   * @this {!ParentNode}
   * @param {string} selector
   * @param {boolean} useNative
   */
  querySelectorAll(selector, useNative) {
    if (useNative || querySelectorImplementation === 'native') {
      // Polyfilled `ShadowRoot`s don't have a native `querySelectorAll`.
      const target =
        this instanceof ShadowRoot
          ? /** @type {!ShadowRoot} */ (this).host
          : this;
      const candidates = Array.prototype.slice.call(
        target[utils.NATIVE_PREFIX + 'querySelectorAll'](selector)
      );
      const root = this[utils.SHADY_PREFIX + 'getRootNode']();
      return utils.createPolyfilledHTMLCollection(
        candidates.filter(
          (e) => e[utils.SHADY_PREFIX + 'getRootNode']() == root
        )
      );
    } else if (querySelectorImplementation === 'selectorEngine') {
      return utils.createPolyfilledHTMLCollection(
        logicalQuerySelectorAll(this, selector)
      );
    } else if (querySelectorImplementation === undefined) {
      return utils.createPolyfilledHTMLCollection(
        query(this, function (n) {
          return utils.matchesSelector(n, selector);
        })
      );
    } else {
      throw new Error(
        'Unrecognized value of ShadyDOM.querySelectorImplementation: ' +
          `'${querySelectorImplementation}'`
      );
    }
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
