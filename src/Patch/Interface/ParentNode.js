import CustomElementInternals from '../../CustomElementInternals';
import * as Utilities from '../../Utilities';

/**
 * @typedef {{
 *  prepend: !function(...(!Node|string)),
 *  append: !function(...(!Node|string)),
 * }}
 */
let ParentNodeBuiltIns;

/**
 * @param {!CustomElementInternals} internals
 * @param {!Object} destination
 * @param {!ParentNodeBuiltIns} builtIn
 */
export default function(internals, destination, builtIn) {
  /**
   * @param {...(!Node|string)} nodes
   */
  destination['prepend'] = function(...nodes) {
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
