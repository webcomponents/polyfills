import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['MutationRecord'];
export const proto = constructor['prototype'];

export const descriptors = {
  addedNodes: getDescriptor(proto, 'addedNodes'),
};

const addedNodesGetter = getter(descriptors.addedNodes, function() { return this.addedNodes; });

export const proxy = {
  addedNodes: node => addedNodesGetter.call(node),
};
