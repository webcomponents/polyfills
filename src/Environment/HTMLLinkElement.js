import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['HTMLLinkElement'];
export const proto = constructor ? constructor['prototype'] : undefined;

export const descriptors = {
  import: getDescriptor(proto, 'import'),
};

/** @type {function(this: HTMLLinkElement): ?Document} */
const importGetter = getter(descriptors.import, function() { return this.import; });

export const proxy = {
  /** @type {function(!HTMLLinkElement): ?Document} */
  import: node => importGetter.call(node),
};
