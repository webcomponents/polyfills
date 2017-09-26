import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['DocumentFragment'];
export const proto = constructor['prototype'];

export const descriptors = {
  append: getDescriptor(proto, 'append'),
  prepend: getDescriptor(proto, 'prepend'),
};

const appendMethod = method(descriptors.append);
const prependMethod = method(descriptors.prepend);

export const proxy = {
  append: (fragment, ...nodes) => appendMethod.call(fragment, ...nodes),
  prepend: (fragment, ...nodes) => prependMethod.call(fragment, ...nodes),
};
