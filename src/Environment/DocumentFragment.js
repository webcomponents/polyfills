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

export const proxy = {
  /** @type {function(!DocumentFragment, ...(!Node|!string))} */
  append: (fragment, ...nodes) => appendMethod.call(fragment, ...nodes),
  /** @type {function(!DocumentFragment, ...(!Node|!string))} */
  prepend: (fragment, ...nodes) => prependMethod.call(fragment, ...nodes),
};
