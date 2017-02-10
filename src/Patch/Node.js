import Native from './Native';
import CustomElementInternals from '../CustomElementInternals';
import * as Utilities from '../Utilities';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  // `Node#nodeValue` is implemented on `Attr`.
  // `Node#textContent` is implemented on `Attr`, `Element`.

  Utilities.setPropertyUnchecked(Node.prototype, 'insertBefore',
    internals.CEReactions(
      /**
       * @this {Node}
       * @param {!Node} node
       * @param {?Node} refNode
       * @return {!Node}
       */
      function(node, refNode) {
        if (node instanceof DocumentFragment) {
          // DocumentFragments can't be connected, so `disconnectTree` will never
          // need to be called on a DocumentFragment's children after inserting it.

          if (Utilities.isConnected(this)) {
            internals.connectTree(node);
          }

          return Native.Node_insertBefore.call(this, node, refNode);
        }


        if (Utilities.isConnected(node)) {
          internals.disconnectTree(node);
        }

        const nativeResult = Native.Node_insertBefore.call(this, node, refNode);

        if (Utilities.isConnected(node)) {
          internals.connectTree(node);
        }

        return nativeResult;
      }));

  Utilities.setPropertyUnchecked(Node.prototype, 'appendChild',
    internals.CEReactions(
      /**
       * @this {Node}
       * @param {!Node} node
       * @return {!Node}
       */
      function(node) {
        if (node instanceof DocumentFragment) {
          // DocumentFragments can't be connected, so `disconnectTree` will never
          // need to be called on a DocumentFragment's children after inserting it.

          if (Utilities.isConnected(this)) {
            internals.connectTree(node);
          }

          return Native.Node_appendChild.call(this, node);
        }


        if (Utilities.isConnected(node)) {
          internals.disconnectTree(node);
        }

        const nativeResult = Native.Node_appendChild.call(this, node);

        if (Utilities.isConnected(node)) {
          internals.connectTree(node);
        }

        return nativeResult;
      }));

  Utilities.setPropertyUnchecked(Node.prototype, 'cloneNode',
    internals.CEReactions(
      /**
       * @this {Node}
       * @param {boolean=} deep
       * @return {!Node}
       */
      function(deep) {
        const clone = Native.Node_cloneNode.call(this, deep);
        // Only create custom elements if this element's owner document is
        // associated with the registry.
        if (!this.ownerDocument.__CE_hasRegistry) {
          internals.patchTree(clone);
        } else {
          internals.patchAndUpgradeTree(clone);
        }
        return clone;
      }));

  Utilities.setPropertyUnchecked(Node.prototype, 'removeChild',
    internals.CEReactions(
      /**
       * @this {Node}
       * @param {!Node} node
       * @return {!Node}
       */
      function(node) {
        if (Utilities.isConnected(node)) {
          internals.disconnectTree(node);
        }
        return Native.Node_removeChild.call(this, node);
      }));

  Utilities.setPropertyUnchecked(Node.prototype, 'replaceChild',
    internals.CEReactions(
      /**
       * @this {Node}
       * @param {!Node} nodeToInsert
       * @param {!Node} nodeToRemove
       * @return {!Node}
       */
      function(nodeToInsert, nodeToRemove) {
        const thisIsConnected = Utilities.isConnected(this);

        if (nodeToInsert instanceof DocumentFragment) {
          if (thisIsConnected) {
            internals.disconnectTree(nodeToRemove);

            // DocumentFragments can't be connected, so `disconnectTree` will
            // never need to be called on a DocumentFragment's children after
            // inserting it.

            internals.connectTree(nodeToInsert);
          }

          return Native.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);
        }


        if (thisIsConnected) {
          internals.disconnectTree(nodeToRemove);
        }

        if (Utilities.isConnected(nodeToInsert)) {
          internals.disconnectTree(nodeToInsert);
        }

        if (thisIsConnected) {
          internals.connectTree(nodeToInsert);
        }

        return Native.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);
      }));


  function patch_textContent(destination, baseDescriptor) {
    Object.defineProperty(destination, 'textContent', {
      enumerable: baseDescriptor.enumerable,
      configurable: true,
      get: baseDescriptor.get,
      set: internals.CEReactions(/** @this {Node} */ function(assignedValue) {
        // If this is a text node then there are no nodes to disconnect.
        if (this.nodeType === Node.TEXT_NODE) {
          baseDescriptor.set.call(this, assignedValue);
          return;
        }

        for (let child = this.firstChild; child; child = child.nextSibling) {
          internals.disconnectTree(child);
        }

        baseDescriptor.set.call(this, assignedValue);
      }),
    });
  }

  if (Native.Node_textContent && Native.Node_textContent.get) {
    patch_textContent(Node.prototype, Native.Node_textContent);
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

          for (let i = 0; i < this.childNodes.length; i++) {
            parts.push(this.childNodes[i].textContent);
          }

          return parts.join('');
        },
        set: /** @this {Node} */ function(assignedValue) {
          while (this.firstChild) {
            Native.Node_removeChild.call(this, this.firstChild);
          }
          Native.Node_appendChild.call(this, document.createTextNode(assignedValue));
        },
      });
    });
  }
};
