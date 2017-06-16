import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['HTMLElement'];
export const prototype = constructor['prototype'];

export const descriptors = {
  innerHTML: getDescriptor(prototype, 'innerHTML'),
  insertAdjacentElement: getDescriptor(prototype, 'insertAdjacentElement'),
};

export const proxy = {};
