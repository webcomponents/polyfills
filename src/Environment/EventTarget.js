import {getDescriptor, getter, method} from "./Utilities.js";

export const constructor = window['EventTarget'];
export const prototype = constructor ? constructor['prototype'] : undefined;

export const descriptors = !prototype ? {} : {
  addEventListener: getDescriptor(prototype, 'addEventListener'),
};

const addEventListenerMethod =
  method(descriptors.addEventListener) ||
  // IE11
  method(getDescriptor(window['Node'].prototype, 'addEventListener'));

export const proxy = {
  addEventListener: (node, type, callback, options) => addEventListenerMethod.call(node, type, callback, options),
};
