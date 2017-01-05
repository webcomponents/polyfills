import {CustomElementInternals} from '../../CustomElementInternals';
import * as CustomElementInternalSymbols from '../../CustomElementInternalSymbols';
/** @type {CustomElementInternalSymbols.CustomElementState} */
const CustomElementState = CustomElementInternalSymbols.CustomElementState;
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
      return node instanceof Node && Utilities.isConnected(node);
    }));

    builtIn.prepend.apply(this, nodes);

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
  destination['append'] = function(...nodes) {
    const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
      return node instanceof Node && Utilities.isConnected(node);
    }));

    builtIn.append.apply(this, nodes);

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
};
