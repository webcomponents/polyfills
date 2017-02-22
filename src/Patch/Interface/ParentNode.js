import CustomElementInternals from '../../CustomElementInternals.js';
import * as Utilities from '../../Utilities.js';

/**
 * @typedef {{
 *   prepend: !function(...(!Node|string)),
  *  append: !function(...(!Node|string)),
 * }}
 */
let ParentNodeNativeMethods;

/**
 * @param {!CustomElementInternals} internals
 * @param {!Object} destination
 * @param {!ParentNodeNativeMethods} builtIn
 */
export default function(internals, destination, builtIn) {
  /**
   * @param {...(!Node|string)} nodes
   */
  destination['prepend'] = function(...nodes) {
    // TODO: Fix this for when one of `nodes` is a DocumentFragment!
    const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
      // DocumentFragments are not connected and will not be added to the list.
      return node instanceof Node && Utilities.isConnected(node);
    }));

    builtIn.prepend.apply(this, nodes);

    for (let i = 0; i < connectedBefore.length; i++) {
      internals.disconnectTree(connectedBefore[i]);
    }

    if (Utilities.isConnected(this)) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node instanceof Element) {
          internals.connectTree(node);
        }
      }
    }
  };

  /**
   * @param {...(!Node|string)} nodes
   */
  destination['append'] = function(...nodes) {
    // TODO: Fix this for when one of `nodes` is a DocumentFragment!
    const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
      // DocumentFragments are not connected and will not be added to the list.
      return node instanceof Node && Utilities.isConnected(node);
    }));

    builtIn.append.apply(this, nodes);

    for (let i = 0; i < connectedBefore.length; i++) {
      internals.disconnectTree(connectedBefore[i]);
    }

    if (Utilities.isConnected(this)) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node instanceof Element) {
          internals.connectTree(node);
        }
      }
    }
  };
};
