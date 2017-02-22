import CustomElementInternals from '../../CustomElementInternals.js';
import * as Utilities from '../../Utilities.js';

/**
 * @typedef {{
 *   before: !function(...(!Node|string)),
 *   after: !function(...(!Node|string)),
 *   replaceWith: !function(...(!Node|string)),
 *   remove: !function(),
 * }}
 */
let ChildNodeNativeMethods;

/**
 * @param {!CustomElementInternals} internals
 * @param {!Object} destination
 * @param {!ChildNodeNativeMethods} builtIn
 */
export default function(internals, destination, builtIn) {
  /**
   * @param {...(!Node|string)} nodes
   */
  destination['before'] = function(...nodes) {
    // TODO: Fix this for when one of `nodes` is a DocumentFragment!
    const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
      // DocumentFragments are not connected and will not be added to the list.
      return node instanceof Node && Utilities.isConnected(node);
    }));

    builtIn.before.apply(this, nodes);

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
  destination['after'] = function(...nodes) {
    // TODO: Fix this for when one of `nodes` is a DocumentFragment!
    const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
      // DocumentFragments are not connected and will not be added to the list.
      return node instanceof Node && Utilities.isConnected(node);
    }));

    builtIn.after.apply(this, nodes);

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
  destination['replaceWith'] = function(...nodes) {
    // TODO: Fix this for when one of `nodes` is a DocumentFragment!
    const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
      // DocumentFragments are not connected and will not be added to the list.
      return node instanceof Node && Utilities.isConnected(node);
    }));

    const wasConnected = Utilities.isConnected(this);

    builtIn.replaceWith.apply(this, nodes);

    for (let i = 0; i < connectedBefore.length; i++) {
      internals.disconnectTree(connectedBefore[i]);
    }

    if (wasConnected) {
      internals.disconnectTree(this);
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node instanceof Element) {
          internals.connectTree(node);
        }
      }
    }
  };

  destination['remove'] = function() {
    const wasConnected = Utilities.isConnected(this);

    builtIn.remove.call(this);

    if (wasConnected) {
      internals.disconnectTree(this);
    }
  };
};
