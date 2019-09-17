/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import Native from './Native.js';
import CustomElementInternals from '../CustomElementInternals.js';
import CEState from '../CustomElementState.js';
import * as Utilities from '../Utilities.js';

import PatchParentNode from './Interface/ParentNode.js';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  Utilities.setPropertyUnchecked(Document.prototype, 'createElement',
    /**
     * @this {Document}
     * @param {string} localName
     * @return {!Element}
     */
    function(localName) {
      internals.pushCEReactionsQueue();
      const result = internals.createAnElement(this, localName, null);
      internals.popCEReactionsQueue();
      return result;
    });

  Utilities.setPropertyUnchecked(Document.prototype, 'importNode',
    /**
     * @this {Document}
     * @param {!Node} node
     * @param {boolean=} deep
     * @return {!Node}
     */
    function(node, deep) {
      internals.pushCEReactionsQueue();

      const clone = /** @type {!Node} */ (Native.Document_importNode.call(this, node, !!deep));
      // Only create custom elements if this document is associated with the registry.
      if (!this.__CE_registry) {
        internals.patchTree(clone);
      } else {
        internals.patchAndUpgradeTree(clone);
      }

      internals.popCEReactionsQueue();
      return clone;
    });

  Utilities.setPropertyUnchecked(Document.prototype, 'createElementNS',
    /**
     * @this {Document}
     * @param {?string} namespace
     * @param {string} localName
     * @return {!Element}
     */
    function(namespace, localName) {
      internals.pushCEReactionsQueue();
      const result = internals.createAnElement(this, localName, namespace);
      internals.popCEReactionsQueue();
      return result;
    });

  PatchParentNode(internals, Document.prototype, {
    prepend: Native.Document_prepend,
    append: Native.Document_append,
  });
};
