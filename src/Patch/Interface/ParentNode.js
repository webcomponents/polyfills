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
    builtIn.prepend.apply(this, nodes);

    const connected = Utilities.isConnected(this);
    if (connected) {
      for (const node of nodes) {
        if (!(node instanceof Element)) continue;

        Utilities.walkDeepDescendantElements(node, element => {
          if (element[CustomElementInternalSymbols.state] === CustomElementState.custom) {
            internals.connectedCallback(element);
          } else {
            internals.upgradeElement(element);
          }
        });
      }
    }
  };

  /**
   * @param {...(!Node|string)} nodes
   */
  destination['append'] = function(...nodes) {
    builtIn.append.apply(this, nodes);

    const connected = Utilities.isConnected(this);
    if (connected) {
      for (const node of nodes) {
        if (!(node instanceof Element)) continue;

        Utilities.walkDeepDescendantElements(node, element => {
          if (element[CustomElementInternalSymbols.state] === CustomElementState.custom) {
            internals.connectedCallback(element);
          } else {
            internals.upgradeElement(element);
          }
        });
      }
    }
  };
};
