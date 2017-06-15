import {getDescriptor, getter, method} from "./Utilities.js";

const envMutationObserver = window['MutationObserver'];
const envMutationObserver_proto = envMutationObserver['prototype'];

const MutationObserver = {
  self: envMutationObserver,
  proto: envMutationObserver_proto,

  disconnect: getDescriptor(envMutationObserver_proto, 'disconnect'),
  observe: getDescriptor(envMutationObserver_proto, 'observe'),
};
export default MutationObserver;

const disconnectMethod = method(MutationObserver.disconnect);
const observeMethod = method(MutationObserver.observe);

export const Proxy = {
  disconnect: mutationObserver => disconnectMethod.call(mutationObserver),
  observe: (mutationObserver, target, options) => observeMethod.call(mutationObserver, target, options),
};
