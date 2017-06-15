import * as Env from './Environment.js';

const getter = descriptor => descriptor ? descriptor.get : () => undefined;
const method = descriptor => descriptor ? descriptor.value : () => undefined;

// Node

const addEventListenerMethod = method(Env.Node.addEventListener);
export const addEventListener = (node, type, callback, options) => addEventListenerMethod.call(node, type, callback, options);

const appendChildMethod = method(Env.Node.appendChild);
export const appendChild = (node, deep) => appendChildMethod.call(node, deep);

const childNodesGetter = getter(Env.Node.childNodes);
export const childNodes = node => childNodesGetter.call(node);

const cloneNodeMethod = method(Env.Node.cloneNode);
export const cloneNode = (node, deep) => cloneNodeMethod.call(node, deep);

const firstChildGetter = getter(Env.Node.firstChild);
export const firstChild = node => firstChildGetter.call(node);

const insertBeforeMethod = method(Env.Node.insertBefore);
export const insertBefore = (node, newChild, refChild) => insertBeforeMethod.call(node, newChild, refChild);

const isConnectedGetter = getter(Env.Node.isConnected);
export const isConnected = node => isConnectedGetter.call(node);

const nextSiblingGetter = getter(Env.Node.nextSibling);
export const nextSibling = node => nextSiblingGetter.call(node);

const nodeTypeGetter = getter(Env.Node.nodeType);
export const nodeType = node => nodeTypeGetter.call(node);

const parentNodeGetter = getter(Env.Node.parentNode);
export const parentNode = node => parentNodeGetter.call(node);

const removeChildMethod = method(Env.Node.removeChild);
export const removeChild = (node, deep) => removeChildMethod.call(node, deep);

const replaceChildMethod = method(Env.Node.replaceChild);
export const replaceChild = (node, newChild, oldChild) => replaceChildMethod.call(node, newChild, oldChild);
