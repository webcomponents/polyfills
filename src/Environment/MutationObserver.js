import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['MutationObserver'];
export const prototype = constructor['prototype'];

export const descriptors = {
  disconnect: getDescriptor(prototype, 'disconnect'),
  observe: getDescriptor(prototype, 'observe'),
};

const disconnectMethod = method(descriptors.disconnect);
const observeMethod = method(descriptors.observe);

export const proxy = {
  disconnect: mutationObserver => disconnectMethod.call(mutationObserver),
  observe: (mutationObserver, target, options) => observeMethod.call(mutationObserver, target, options),
};
