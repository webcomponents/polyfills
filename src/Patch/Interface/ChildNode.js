import CustomElementInternals from '../../CustomElementInternals';
import * as Utilities from '../../Utilities';

/**
 * @typedef {{
 *   before: !function(...(!Node|string)),
 *   after: !function(...(!Node|string)),
 *   replaceWith: !function(...(!Node|string)),
 *   remove: !function(),
 * }}
 */
let ChildNodeBuiltIns;

/**
 * @param {!CustomElementInternals} internals
 * @param {!Object} destination
 * @param {!ChildNodeBuiltIns} builtIn
 */
export default function(internals, destination, builtIn) {
  /**
   * @param {...(!Node|string)} nodes
   */
  destination['before'] = function(...nodes) {
    const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
      // DocumentFragments are not connected and will not be added to the list.
      return node instanceof Node && Utilities.isConnected(node);
    }));

    builtIn.before.apply(this, nodes);

    for (const node of connectedBefore) {
      internals.disconnectTree(node);
    }

    if (Utilities.isConnected(this)) {
      for (const node of nodes) {
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
    const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
      // DocumentFragments are not connected and will not be added to the list.
      return node instanceof Node && Utilities.isConnected(node);
    }));

    builtIn.after.apply(this, nodes);

    for (const node of connectedBefore) {
      internals.disconnectTree(node);
    }

    if (Utilities.isConnected(this)) {
      for (const node of nodes) {
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
    const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
      // DocumentFragments are not connected and will not be added to the list.
      return node instanceof Node && Utilities.isConnected(node);
    }));

    const wasConnected = Utilities.isConnected(this);

    builtIn.replaceWith.apply(this, nodes);

    for (const node of connectedBefore) {
      internals.disconnectTree(node);
    }

    if (wasConnected) {
      internals.disconnectTree(this);
      for (const node of nodes) {
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
