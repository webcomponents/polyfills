import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['HTMLTemplateElement'];
export const proto = constructor ? constructor['prototype'] : undefined;

export const descriptors = !proto ? {} : {
  content: getDescriptor(proto, 'content'),
};

/** @type {function(this: HTMLTemplateElement): !DocumentFragment} */
const contentGetter = getter(descriptors.content, function() { return this.content; });

export const proxy = {
  /** @type {function(!HTMLTemplateElement): !DocumentFragment} */
  content: node => contentGetter.call(node),
};
