import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['HTMLLinkElement'];
export const prototype = constructor ? constructor['prototype'] : undefined;

export const descriptors = {
  import: getDescriptor(prototype, 'import'),
};

const importGetter = getter(descriptors.import, function() { return this.import; });

export const proxy = {
  import: node => importGetter.call(node),
};
