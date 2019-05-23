import {getDescriptor, getter, method} from "./Utilities.js";

/** @type {function(new: MutationObserver, function(...?): ?)} */
export const constructor = window['MutationObserver'];
export const proto = constructor['prototype'];

export const descriptors = {
  disconnect: getDescriptor(proto, 'disconnect'),
  observe: getDescriptor(proto, 'observe'),
};

/** @type {function(this: MutationObserver)} */
const disconnectMethod = method(descriptors.disconnect);
/** @type {function(this: MutationObserver, !Node, !MutationObserverInit=)} */
const observeMethod = method(descriptors.observe);

export const proxy = {
  /** @type {function(!MutationObserver)} */
  disconnect: mutationObserver => disconnectMethod.call(mutationObserver),
  /** @type {function(!MutationObserver, !Node, !MutationObserverInit=)} */
  observe: (mutationObserver, target, options) => observeMethod.call(mutationObserver, target, options),
};
