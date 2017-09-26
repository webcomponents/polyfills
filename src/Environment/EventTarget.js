import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['EventTarget'];
export const proto = constructor ? constructor['prototype'] : undefined;

export const descriptors = !proto ? {} : {
  addEventListener: getDescriptor(proto, 'addEventListener'),
};

const addEventListenerMethod =
  method(descriptors.addEventListener) ||
  // IE11
  method(getDescriptor(window['Node']['prototype'], 'addEventListener'));

export const proxy = {
  addEventListener: (node, type, callback, options) => addEventListenerMethod.call(node, type, callback, options),
};
