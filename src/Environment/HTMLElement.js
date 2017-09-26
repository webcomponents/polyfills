import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['HTMLElement'];
export const proto = constructor['prototype'];

export const descriptors = {
  innerHTML: getDescriptor(proto, 'innerHTML'),
  insertAdjacentElement: getDescriptor(proto, 'insertAdjacentElement'),
};

export const proxy = {};
