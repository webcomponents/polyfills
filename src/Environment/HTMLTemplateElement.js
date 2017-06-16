import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['HTMLTemplateElement'];
export const prototype = constructor ? constructor['prototype'] : undefined;

export const descriptors = !prototype ? {} : {
  content: getDescriptor(prototype, 'content'),
};

const contentGetter = getter(descriptors.content, function() { return this.content; });

export const proxy = {
  content: node => contentGetter.call(node),
};
