import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['MutationRecord'];
export const proto = constructor['prototype'];

export const descriptors = {
  addedNodes: getDescriptor(proto, 'addedNodes'),
};

/** @type {function(this: MutationRecord): (!NodeList|undefined)} */
const addedNodesGetter = getter(descriptors.addedNodes, function() { return this.addedNodes; });

/**
 * @type {{
 *   addedNodes: function(!MutationRecord): (!NodeList|undefined),
 * }}
 */
export const proxy = {
  addedNodes: node => addedNodesGetter.call(node),
};
