import {proxy as DocumentProxy} from '../Environment/Document.js';
import {
  descriptors as NodeDesc,
  prototype as NodeProto,
  proxy as NodeProxy,
} from '../Environment/Node.js';
import CustomElementInternals from '../CustomElementInternals.js';
import * as Utilities from '../Utilities.js';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  // `Node#nodeValue` is implemented on `Attr`.
  // `Node#textContent` is implemented on `Attr`, `Element`.

  Utilities.setPropertyUnchecked(NodeProto, 'insertBefore',
    /**
     * @this {Node}
     * @param {!Node} node
     * @param {?Node} refNode
     * @return {!Node}
     */
    function(node, refNode) {
      if (node instanceof DocumentFragment) {
        const insertedNodes = Array.prototype.slice.apply(NodeProxy.childNodes(node));
        const nativeResult = NodeProxy.insertBefore(this, node, refNode);

        // DocumentFragments can't be connected, so `disconnectTree` will never
        // need to be called on a DocumentFragment's children after inserting it.

        if (Utilities.isConnected(this)) {
          for (let i = 0; i < insertedNodes.length; i++) {
            internals.connectTree(insertedNodes[i]);
          }
        }

        return nativeResult;
      }

      const nodeWasConnected = Utilities.isConnected(node);
      const nativeResult = NodeProxy.insertBefore(this, node, refNode);

      if (nodeWasConnected) {
        internals.disconnectTree(node);
      }

      if (Utilities.isConnected(this)) {
        internals.connectTree(node);
      }

      return nativeResult;
    });

  Utilities.setPropertyUnchecked(NodeProto, 'appendChild',
    /**
     * @this {Node}
     * @param {!Node} node
     * @return {!Node}
     */
    function(node) {
      if (node instanceof DocumentFragment) {
        const insertedNodes = Array.prototype.slice.apply(NodeProxy.childNodes(node));
        const nativeResult = NodeProxy.appendChild(this, node);

        // DocumentFragments can't be connected, so `disconnectTree` will never
        // need to be called on a DocumentFragment's children after inserting it.

        if (Utilities.isConnected(this)) {
          for (let i = 0; i < insertedNodes.length; i++) {
            internals.connectTree(insertedNodes[i]);
          }
        }

        return nativeResult;
      }

      const nodeWasConnected = Utilities.isConnected(node);
      const nativeResult = NodeProxy.appendChild(this, node);

      if (nodeWasConnected) {
        internals.disconnectTree(node);
      }

      if (Utilities.isConnected(this)) {
        internals.connectTree(node);
      }

      return nativeResult;
    });

  Utilities.setPropertyUnchecked(NodeProto, 'cloneNode',
    /**
     * @this {Node}
     * @param {boolean=} deep
     * @return {!Node}
     */
    function(deep) {
      const clone = NodeProxy.cloneNode(this, deep);
      // Only create custom elements if this element's owner document is
      // associated with the registry.
      if (!NodeProxy.ownerDocument(this).__CE_hasRegistry) {
        internals.patchTree(clone);
      } else {
        internals.patchAndUpgradeTree(clone);
      }
      return clone;
    });

  Utilities.setPropertyUnchecked(NodeProto, 'removeChild',
    /**
     * @this {Node}
     * @param {!Node} node
     * @return {!Node}
     */
    function(node) {
      const nodeWasConnected = Utilities.isConnected(node);
      const nativeResult = NodeProxy.removeChild(this, node);

      if (nodeWasConnected) {
        internals.disconnectTree(node);
      }

      return nativeResult;
    });

  Utilities.setPropertyUnchecked(NodeProto, 'replaceChild',
    /**
     * @this {Node}
     * @param {!Node} nodeToInsert
     * @param {!Node} nodeToRemove
     * @return {!Node}
     */
    function(nodeToInsert, nodeToRemove) {
      if (nodeToInsert instanceof DocumentFragment) {
        const insertedNodes = Array.prototype.slice.apply(NodeProxy.childNodes(nodeToInsert));
        const nativeResult = NodeProxy.replaceChild(this, nodeToInsert, nodeToRemove);

        // DocumentFragments can't be connected, so `disconnectTree` will never
        // need to be called on a DocumentFragment's children after inserting it.

        if (Utilities.isConnected(this)) {
          internals.disconnectTree(nodeToRemove);
          for (let i = 0; i < insertedNodes.length; i++) {
            internals.connectTree(insertedNodes[i]);
          }
        }

        return nativeResult;
      }

      const nodeToInsertWasConnected = Utilities.isConnected(nodeToInsert);
      const nativeResult = NodeProxy.replaceChild(this, nodeToInsert, nodeToRemove);
      const thisIsConnected = Utilities.isConnected(this);

      if (thisIsConnected) {
        internals.disconnectTree(nodeToRemove);
      }

      if (nodeToInsertWasConnected) {
        internals.disconnectTree(nodeToInsert);
      }

      if (thisIsConnected) {
        internals.connectTree(nodeToInsert);
      }

      return nativeResult;
    });


  function patch_textContent(destination, baseDescriptor) {
    Object.defineProperty(destination, 'textContent', {
      enumerable: baseDescriptor.enumerable,
      configurable: true,
      get: baseDescriptor.get,
      set: /** @this {Node} */ function(assignedValue) {
        // If this is a text node then there are no nodes to disconnect.
        if (NodeProxy.nodeType(this) === Node.TEXT_NODE) {
          baseDescriptor.set.call(this, assignedValue);
          return;
        }

        let removedNodes = undefined;
        // Checking for `firstChild` is faster than reading `childNodes.length`
        // to compare with 0.
        if (NodeProxy.firstChild(this)) {
          // Using `childNodes` is faster than `children`, even though we only
          // care about elements.
          const childNodes = NodeProxy.childNodes(this);
          const childNodesLength = childNodes.length;
          if (childNodesLength > 0 && Utilities.isConnected(this)) {
            // Copying an array by iterating is faster than using slice.
            removedNodes = new Array(childNodesLength);
            for (let i = 0; i < childNodesLength; i++) {
              removedNodes[i] = childNodes[i];
            }
          }
        }

        baseDescriptor.set.call(this, assignedValue);

        if (removedNodes) {
          for (let i = 0; i < removedNodes.length; i++) {
            internals.disconnectTree(removedNodes[i]);
          }
        }
      },
    });
  }

  if (NodeDesc.textContent && NodeDesc.textContent.get) {
    patch_textContent(NodeProto, NodeDesc.textContent);
  } else {
    internals.addPatch(function(element) {
      patch_textContent(element, {
        enumerable: true,
        configurable: true,
        // NOTE: This implementation of the `textContent` getter assumes that
        // text nodes' `textContent` getter will not be patched.
        get: /** @this {Node} */ function() {
          /** @type {!Array<string>} */
          const parts = [];

          const childNodes = NodeProxy.childNodes(this);
          for (let i = 0; i < childNodes.length; i++) {
            parts.push(childNodes[i].textContent);
          }

          return parts.join('');
        },
        set: /** @this {Node} */ function(assignedValue) {
          let child;
          while (child = NodeProxy.firstChild(this)) {
            NodeProxy.removeChild(this, child);
          }
          NodeProxy.appendChild(this, DocumentProxy.createTextNode(document, assignedValue));
        },
      });
    });
  }
};
