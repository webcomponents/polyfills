import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['HTMLElement'];
export const proto = constructor['prototype'];

export const descriptors = {
  contains: getDescriptor(proto, 'contains'),
  innerHTML: getDescriptor(proto, 'innerHTML'),
  insertAdjacentElement: getDescriptor(proto, 'insertAdjacentElement'),
  insertAdjacentHTML: getDescriptor(proto, 'insertAdjacentHTML'),
};

/** @type {function(this: Node, ?Node): boolean} */
const containsMethod = method(descriptors.contains);

/**
 * @type {!{
 *   contains: function(!Node, ?Node): boolean,
 * }}
 */
export const proxy = {
  contains: (node, other) => containsMethod.call(node, other),
};
