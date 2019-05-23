import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['MutationRecord'];
export const proto = constructor['prototype'];

export const descriptors = {
  addedNodes: getDescriptor(proto, 'addedNodes'),
};

/** @type {function(this: MutationRecord): (!NodeList|undefined)} */
const addedNodesGetter = getter(descriptors.addedNodes, function() { return this.addedNodes; });

export const proxy = {
  /** @type {function(!MutationRecord): (!NodeList|undefined)} */
  addedNodes: node => addedNodesGetter.call(node),
};
