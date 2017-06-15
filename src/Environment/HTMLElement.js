import {getDescriptor, getter, method} from "./Utilities.js";

const envHTMLElement = window['HTMLElement'];
const envHTMLElement_proto = envHTMLElement['prototype'];

const HTMLElement = {
  self: envHTMLElement,
  proto: envHTMLElement_proto,

  innerHTML: getDescriptor(envHTMLElement_proto, 'innerHTML'),
  insertAdjacentElement: getDescriptor(envHTMLElement_proto, 'insertAdjacentElement'),
};
export default HTMLElement;

export const Proxy = {};
