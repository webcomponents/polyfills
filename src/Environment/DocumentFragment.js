import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['DocumentFragment'];
export const prototype = constructor['prototype'];

export const descriptors = {
  append: getDescriptor(prototype, 'append'),
  prepend: getDescriptor(prototype, 'prepend'),
};

const appendMethod = method(descriptors.append);
const prependMethod = method(descriptors.prepend);

export const proxy = {
  append: (fragment, ...nodes) => appendMethod.call(fragment, ...nodes),
  prepend: (fragment, ...nodes) => prependMethod.call(fragment, ...nodes),
};
