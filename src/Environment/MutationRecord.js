import {getDescriptor, getter, method} from "./Utilities.js";

const envMutationRecord = window['MutationRecord'];
const envMutationRecord_proto = envMutationRecord['prototype'];

const MutationRecord = {
  self: envMutationRecord,
  proto: envMutationRecord_proto,

  addedNodes: getDescriptor(envMutationRecord_proto, 'addedNodes'),
};
export default MutationRecord;

const addedNodesGetter = getter(MutationRecord.addedNodes, function() { return this.addedNodes; });

export const Proxy = {
  addedNodes: node => addedNodesGetter.call(node),
};
