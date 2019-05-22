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

/**
 * @type {{
 *   disconnect: function(!MutationObserver),
 *   observe: function(!MutationObserver, !Node, !MutationObserverInit=),
 * }}
 */
export const proxy = {
  disconnect: mutationObserver => disconnectMethod.call(mutationObserver),
  observe: (mutationObserver, target, options) => observeMethod.call(mutationObserver, target, options),
};
