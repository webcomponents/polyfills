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
    /**
     * @this {Node}
     * @param {!Node} node
     * @param {?Node} refNode
     * @return {!Node}
     */
    function(node, refNode) {
      internals.pushCEReactionsQueue();

      if (node instanceof DocumentFragment) {
        // DocumentFragments can't be connected, so `disconnectTree` will never
        // need to be called on a DocumentFragment's children after inserting it.

        if (Utilities.isConnected(this)) {
          internals.connectTree(node);
        }

        const result = Native.Node_insertBefore.call(this, node, refNode);

        internals.popCEReactionsQueue();
        return result;
      }


      if (Utilities.isConnected(node)) {
        internals.disconnectTree(node);
      }

      const nativeResult = Native.Node_insertBefore.call(this, node, refNode);

      if (Utilities.isConnected(node)) {
        internals.connectTree(node);
      }

      internals.popCEReactionsQueue();
      return nativeResult;
    });

  Utilities.setPropertyUnchecked(Node.prototype, 'appendChild',
    /**
     * @this {Node}
     * @param {!Node} node
     * @return {!Node}
     */
    function(node) {
      internals.pushCEReactionsQueue();

      if (node instanceof DocumentFragment) {
        // DocumentFragments can't be connected, so `disconnectTree` will never
        // need to be called on a DocumentFragment's children after inserting it.

        if (Utilities.isConnected(this)) {
          internals.connectTree(node);
        }

        const result = Native.Node_appendChild.call(this, node);

        internals.popCEReactionsQueue();
        return result;
      }


      if (Utilities.isConnected(node)) {
        internals.disconnectTree(node);
      }

      const nativeResult = Native.Node_appendChild.call(this, node);

      if (Utilities.isConnected(node)) {
        internals.connectTree(node);
      }

      internals.popCEReactionsQueue();
      return nativeResult;
    });

  Utilities.setPropertyUnchecked(Node.prototype, 'cloneNode',
    /**
     * @this {Node}
     * @param {boolean=} deep
     * @return {!Node}
     */
    function(deep) {
      internals.pushCEReactionsQueue();

      const clone = Native.Node_cloneNode.call(this, deep);
      // Only create custom elements if this element's owner document is
      // associated with the registry.
      if (!this.ownerDocument.__CE_hasRegistry) {
        internals.patchTree(clone);
      } else {
        internals.patchAndUpgradeTree(clone);
      }

      internals.popCEReactionsQueue();
      return clone;
    });

  Utilities.setPropertyUnchecked(Node.prototype, 'removeChild',
    /**
     * @this {Node}
     * @param {!Node} node
     * @return {!Node}
     */
    function(node) {
      internals.pushCEReactionsQueue();

      if (Utilities.isConnected(node)) {
        internals.disconnectTree(node);
      }
      const result = Native.Node_removeChild.call(this, node);

      internals.popCEReactionsQueue();
      return result;
    });

  Utilities.setPropertyUnchecked(Node.prototype, 'replaceChild',
    /**
     * @this {Node}
     * @param {!Node} nodeToInsert
     * @param {!Node} nodeToRemove
     * @return {!Node}
     */
    function(nodeToInsert, nodeToRemove) {
      internals.pushCEReactionsQueue();

      const thisIsConnected = Utilities.isConnected(this);

      if (nodeToInsert instanceof DocumentFragment) {
        if (thisIsConnected) {
          internals.disconnectTree(nodeToRemove);

          // DocumentFragments can't be connected, so `disconnectTree` will
          // never need to be called on a DocumentFragment's children after
          // inserting it.

          internals.connectTree(nodeToInsert);
        }

        const result = Native.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);

        internals.popCEReactionsQueue();
        return result;
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

      const result = Native.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);

      internals.popCEReactionsQueue();
      return result;
    });


  function patch_textContent(destination, baseDescriptor) {
    Object.defineProperty(destination, 'textContent', {
      enumerable: baseDescriptor.enumerable,
      configurable: true,
      get: baseDescriptor.get,
      set: /** @this {Node} */ function(assignedValue) {
        internals.pushCEReactionsQueue();

        // If this is a text node then there are no nodes to disconnect.
        if (this.nodeType === Node.TEXT_NODE) {
          baseDescriptor.set.call(this, assignedValue);
          internals.popCEReactionsQueue();
          return;
        }

        for (let child = this.firstChild; child; child = child.nextSibling) {
          internals.disconnectTree(child);
        }

        baseDescriptor.set.call(this, assignedValue);

        internals.popCEReactionsQueue();
      },
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
