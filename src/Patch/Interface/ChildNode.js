import {CustomElementInternals} from '../../CustomElementInternals';
import * as Utilities from '../../Utilities';

/**
 * @typedef {{
 *   before: !function(...(!Node|string)),
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
    builtIn.before.apply(this, nodes);

    if (Utilities.isConnected(this)) {
      for (const node of nodes) {
        if (node instanceof Element) {
          internals.connectTree(node);
        }
      }
    }
  };
};
