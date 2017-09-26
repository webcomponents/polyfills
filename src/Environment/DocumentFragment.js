import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['DocumentFragment'];
export const proto = constructor['prototype'];

export const descriptors = {
  append: getDescriptor(proto, 'append'),
  prepend: getDescriptor(proto, 'prepend'),
};

/** @type {function(this: DocumentFragment, ...(!Node|!string))} */
const appendMethod = method(descriptors.append);
/** @type {function(this: DocumentFragment, ...(!Node|!string))} */
const prependMethod = method(descriptors.prepend);

/**
 * @type {{
 *   append: function(!DocumentFragment, ...(!Node|!string)),
 *   prepend: function(!DocumentFragment, ...(!Node|!string)),
 * }}
 */
export const proxy = {
  append: (fragment, ...nodes) => appendMethod.call(fragment, ...nodes),
  prepend: (fragment, ...nodes) => prependMethod.call(fragment, ...nodes),
};
