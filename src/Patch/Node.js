import BuiltIn from './BuiltIn';
import {CustomElementInternals} from '../CustomElementInternals';
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
    const inserted = node instanceof DocumentFragment ? [...node.childNodes] : [node];
    const nativeResult = BuiltIn.Node_insertBefore.call(this, node, refNode);

    if (Utilities.isConnected(this)) {
      for (const node of inserted) {
        internals.connectTree(node);
      }
    }

    return nativeResult;
  };

  /**
   * @param {!Node} node
   * @return {!Node}
   * @suppress {duplicate}
   */
  Node.prototype.appendChild = function(node) {
    const inserted = node instanceof DocumentFragment ? [...node.childNodes] : [node];
    const nativeResult = BuiltIn.Node_appendChild.call(this, node);

    if (Utilities.isConnected(this)) {
      for (const node of inserted) {
        internals.connectTree(node);
      }
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
    const nativeResult = BuiltIn.Node_removeChild.call(this, node);

    if (Utilities.isConnected(this)) {
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
    const nativeResult = BuiltIn.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);

    if (Utilities.isConnected(this)) {
      internals.disconnectTree(nodeToRemove);
      internals.connectTree(nodeToInsert);
    }

    return nodeToRemove;
  };
};
