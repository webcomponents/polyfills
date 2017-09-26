import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['HTMLTemplateElement'];
export const proto = constructor ? constructor['prototype'] : undefined;

export const descriptors = !proto ? {} : {
  content: getDescriptor(proto, 'content'),
};

const contentGetter = getter(descriptors.content, function() { return this.content; });

export const proxy = {
  content: node => contentGetter.call(node),
};
