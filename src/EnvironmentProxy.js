import * as Env from './Environment.js';

const getter = descriptor => descriptor ? descriptor.get : () => undefined;
const method = descriptor => descriptor ? descriptor.value : () => undefined;

// Element

const attachShadowMethod = method(Env.Element.attachShadow);
export const attachShadow = (node, options) => attachShadowMethod.call(node, options);

const getAttributeMethod = method(Env.Element.getAttribute);
export const getAttribute = (node, name) => getAttributeMethod.call(node, name);

const getAttributeNSMethod = method(Env.Element.getAttributeNS);
export const getAttributeNS = (node, ns, name) => getAttributeNSMethod.call(node, ns, name);

const localNameGetter = getter(Env.Element.localName);
export const localName = node => localNameGetter.call(node);

const removeAttributeMethod = method(Env.Element.removeAttribute);
export const removeAttribute = (node, name) => removeAttributeMethod.call(node, name);

const removeAttributeNSMethod = method(Env.Element.removeAttributeNS);
export const removeAttributeNS = (node, ns, name) => removeAttributeNSMethod.call(node, ns, name);

const setAttributeMethod = method(Env.Element.setAttribute);
export const setAttribute = (node, name, value) => setAttributeMethod.call(node, name, value);

const setAttributeNSMethod = method(Env.Element.setAttributeNS);
export const setAttributeNS = (node, ns, name, value) => setAttributeNSMethod.call(node, ns, name, value);

// HTMLTemplateElement

const contentGetter = getter(Env.HTMLTemplateElement.content);
export const content = node => contentGetter.call(node);

// MutationObserver

const observeMethod = method(Env.MutationObserver.observe);
export const observe = (mutationObserver, target, options) => observeMethod.call(mutationObserver, target, options);

const disconnectMethod = method(Env.MutationObserver.disconnect);
export const disconnect = mutationObserver => disconnectMethod.call(mutationObserver);

// MutationRecord

const addedNodesGetter = getter(Env.MutationRecord.addedNodes);
export const addedNodes = node => addedNodesGetter.call(node);

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
