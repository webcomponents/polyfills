import Native from './Native.js';
import CustomElementInternals from '../CustomElementInternals.js';
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
      // Only create custom elements if this document is associated with the registry.
      if (this.__CE_hasRegistry) {
        const definition = internals.localNameToDefinition(localName);
        if (definition) {
          return new (definition.constructor)();
        }
      }

      const result = /** @type {!Element} */
        (Native.Document_createElement.call(this, localName));
      internals.patch(result);
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
      const clone = Native.Document_importNode.call(this, node, deep);
      // Only create custom elements if this document is associated with the registry.
      if (!this.__CE_hasRegistry) {
        internals.patchTree(clone);
      } else {
        internals.patchAndUpgradeTree(clone);
      }
      return clone;
    });

  const NS_HTML = "http://www.w3.org/1999/xhtml";

  Utilities.setPropertyUnchecked(Document.prototype, 'createElementNS',
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
        (Native.Document_createElementNS.call(this, namespace, localName));
      internals.patch(result);
      return result;
    });

  function patch_body(destination, baseDescriptor) {
    Object.defineProperty(destination, 'body', {
      get: baseDescriptor.get,
      set: /** @this {Document} */ function(body) {
        const replacedBody = baseDescriptor.get.call(this);
        const bodyWasConnected = Utilities.isConnected(body);

        baseDescriptor.set.call(this, body);

        if (body === replacedBody) {
          return;
        }

        if (bodyWasConnected) {
          internals.disconnectTree(body);
        }

        internals.disconnectTree(replacedBody);
        internals.connectTree(body);
      }
    });
  }

  if (Native.Document_body && Native.Document_body.get) {
    patch_body(Document.prototype, Native.Document_body);
  } else if (Native.HTMLDocument_body && Native.HTMLDocument_body.get) {
    patch_body(HTMLDocument.prototype, Native.HTMLDocument_body);
  }

  PatchParentNode(internals, Document.prototype, {
    prepend: Native.Document_prepend,
    append: Native.Document_append,
  });
};
