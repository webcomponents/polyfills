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
import * as Utilities from '../Utilities.js';

import PatchParentNode from './Interface/ParentNode.js';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals, prefix = '') {

  const nativeMethods = Utilities.findNativeMethods(Document.prototype, prefix,
    ['importNode']);

  Utilities.setPropertyUnchecked(Document.prototype, prefix + 'createElement',
    /**
     * @this {Document}
     * @param {string} localName
     * @return {!Element}
     */
    function(localName) {
      return internals.createAnElement(this, localName, null);
    });

  Utilities.setPropertyUnchecked(Document.prototype, prefix + 'importNode',
    /**
     * @this {Document}
     * @param {!Node} node
     * @param {boolean=} deep
     * @return {!Node}
     */
    function(node, deep) {
      const clone = /** @type {!Node} */ (nativeMethods.importNode.call(this, node, !!deep));
      // Only create custom elements if this document is associated with the registry.
      if (!this.__CE_registry) {
        internals.patchTree(clone);
      } else {
        internals.patchAndUpgradeTree(clone);
      }
      return clone;
    });

  Utilities.setPropertyUnchecked(Document.prototype, prefix + 'createElementNS',
    /**
     * @this {Document}
     * @param {?string} namespace
     * @param {string} localName
     * @return {!Element}
     */
    function(namespace, localName) {
      return internals.createAnElement(this, localName, namespace);
    });

  PatchParentNode(internals, Document.prototype, {
    prepend: Native.Document_prepend,
    append: Native.Document_append,
  });
};
