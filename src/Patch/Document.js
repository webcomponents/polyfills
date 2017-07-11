import {
  descriptors as DocumentDesc,
  prototype as DocumentProto,
  proxy as DocumentProxy,
} from '../Environment/Document.js';
import CustomElementInternals from '../CustomElementInternals.js';
import * as Utilities from '../Utilities.js';

import PatchParentNode from './Interface/ParentNode.js';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  Utilities.setPropertyUnchecked(DocumentProto, 'createElement',
    /**
     * @this {Document}
     * @param {string} localName
     * @return {!Element}
     */
    function(localName) {
      // Only create custom elements if this document is associated with the registry.
      if (this.__CE_hasRegistry) {
        const definition = internals.localNameToDefinition(localName);
        if (definition) {
          return new (definition.constructor)();
        }
      }

      const result = /** @type {!Element} */
        (DocumentProxy.createElement(this, localName));
      internals.patch(result);
      return result;
    });

  Utilities.setPropertyUnchecked(DocumentProto, 'importNode',
    /**
     * @this {Document}
     * @param {!Node} node
     * @param {boolean=} deep
     * @return {!Node}
     */
    function(node, deep) {
      const clone = DocumentProxy.importNode(this, node, deep);
      // Only create custom elements if this document is associated with the registry.
      if (!this.__CE_hasRegistry) {
        internals.patchTree(clone);
      } else {
        internals.patchAndUpgradeTree(clone);
      }
      return clone;
    });

  const NS_HTML = "http://www.w3.org/1999/xhtml";

  Utilities.setPropertyUnchecked(DocumentProto, 'createElementNS',
    /**
     * @this {Document}
     * @param {?string} namespace
     * @param {string} localName
     * @return {!Element}
     */
    function(namespace, localName) {
      // Only create custom elements if this document is associated with the registry.
      if (this.__CE_hasRegistry && (namespace === null || namespace === NS_HTML)) {
        const definition = internals.localNameToDefinition(localName);
        if (definition) {
          return new (definition.constructor)();
        }
      }

      const result = /** @type {!Element} */
        (DocumentProxy.createElementNS(this, namespace, localName));
      internals.patch(result);
      return result;
    });

  PatchParentNode(internals, DocumentProto, {
    prepend: (DocumentDesc.prepend || {}).value,
    append: (DocumentDesc.append || {}).value,
  });
};
