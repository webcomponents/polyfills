import BuiltIn from './BuiltIn';
import CustomElementInternals from '../CustomElementInternals';
import * as CustomElementInternalSymbols from '../CustomElementInternalSymbols';
/** @type {CustomElementInternalSymbols.CustomElementState} */
const CustomElementState = CustomElementInternalSymbols.CustomElementState;
import * as Utilities from '../Utilities';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  // `Node#nodeValue` is implemented on `Attr`.
  // `Node#textContent` is implemented on `Attr`, `Element`.

  /**
   * @param {!Node} node
   * @param {?Node} refNode
   * @return {!Node}
   * @suppress {duplicate}
   */
  Node.prototype.insertBefore = function(node, refNode) {
    if (node instanceof DocumentFragment) {
      const insertedNodes = [...node.childNodes];
      const nativeResult = BuiltIn.Node_insertBefore.call(this, node, refNode);

      // DocumentFragments can't be connected, so `disconnectTree` will never
      // need to be called on a DocumentFragment's children after inserting it.

      if (Utilities.isConnected(this)) {
        for (const node of insertedNodes) {
          internals.connectTree(node);
        }
      }

      return nativeResult;
    }

    const nodeWasConnected = Utilities.isConnected(node);
    const nativeResult = BuiltIn.Node_insertBefore.call(this, node, refNode);

    if (nodeWasConnected) {
      internals.disconnectTree(node);
    }

    if (Utilities.isConnected(this)) {
      internals.connectTree(node);
    }

    return nativeResult;
  };

  /**
   * @param {!Node} node
   * @return {!Node}
   * @suppress {duplicate}
   */
  Node.prototype.appendChild = function(node) {
    if (node instanceof DocumentFragment) {
      const insertedNodes = [...node.childNodes];
      const nativeResult = BuiltIn.Node_appendChild.call(this, node);

      // DocumentFragments can't be connected, so `disconnectTree` will never
      // need to be called on a DocumentFragment's children after inserting it.

      if (Utilities.isConnected(this)) {
        for (const node of insertedNodes) {
          internals.connectTree(node);
        }
      }

      return nativeResult;
    }

    const nodeWasConnected = Utilities.isConnected(node);
    const nativeResult = BuiltIn.Node_appendChild.call(this, node);

    if (nodeWasConnected) {
      internals.disconnectTree(node);
    }

    if (Utilities.isConnected(this)) {
      internals.connectTree(node);
    }

    return nativeResult;
  };

  /**
   * @param {boolean=} deep
   * @return {!Node}
   * @suppress {duplicate}
   */
  Node.prototype.cloneNode = function(deep) {
    const clone = BuiltIn.Node_cloneNode.call(this, deep);
    internals.upgradeTree(clone);
    return clone;
  };

  /**
   * @param {!Node} node
   * @return {!Node}
   * @suppress {duplicate}
   */
  Node.prototype.removeChild = function(node) {
    const nodeWasConnected = Utilities.isConnected(node);
    const nativeResult = BuiltIn.Node_removeChild.call(this, node);

    if (nodeWasConnected) {
      internals.disconnectTree(node);
    }

    return nativeResult;
  };

  /**
   * @param {!Node} nodeToInsert
   * @param {!Node} nodeToRemove
   * @return {!Node}
   * @suppress {duplicate}
   */
  Node.prototype.replaceChild = function(nodeToInsert, nodeToRemove) {
    if (nodeToInsert instanceof DocumentFragment) {
      const insertedNodes = [...nodeToInsert.childNodes];
      const nativeResult = BuiltIn.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);

      // DocumentFragments can't be connected, so `disconnectTree` will never
      // need to be called on a DocumentFragment's children after inserting it.

      if (Utilities.isConnected(this)) {
        internals.disconnectTree(nodeToRemove);
        for (const node of insertedNodes) {
          internals.connectTree(node);
        }
      }

      return nativeResult;
    }

    const nodeToInsertWasConnected = Utilities.isConnected(nodeToInsert);
    const nativeResult = BuiltIn.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);
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
  };
};
