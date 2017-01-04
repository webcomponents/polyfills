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
  /**
   * @param {!Node} node
   * @param {?Node} refNode
   * @return {!Node}
   * @suppress {duplicate}
   */
  Node.prototype.insertBefore = function(node, refNode) {
    let nodes;
    if (node instanceof DocumentFragment) {
      nodes = [...node.childNodes];
    } else {
      nodes = [node];
    }

    const nativeResult = BuiltIn.Node_insertBefore.call(this, node, refNode);

    const connected = Utilities.isConnected(this);
    if (connected) {
      for (const node of nodes) {
        internals.connectTree(node);
      }
    }

    return nativeResult;
  };

  // Keep a reference in case `Node#insertBefore` is patched again.
  const CE_Node_insertBefore = Node.prototype.insertBefore;

  /**
   * @param {!Node} node
   * @return {!Node}
   * @suppress {duplicate}
   */
  Node.prototype.appendChild = function(node) {
    return CE_Node_insertBefore.call(this, node, null);
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
