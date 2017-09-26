import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['MutationObserver'];
export const proto = constructor['prototype'];

export const descriptors = {
  disconnect: getDescriptor(proto, 'disconnect'),
  observe: getDescriptor(proto, 'observe'),
};

const disconnectMethod = method(descriptors.disconnect);
const observeMethod = method(descriptors.observe);

export const proxy = {
  disconnect: mutationObserver => disconnectMethod.call(mutationObserver),
  observe: (mutationObserver, target, options) => observeMethod.call(mutationObserver, target, options),
};
