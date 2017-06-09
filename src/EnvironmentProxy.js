import * as Env from './Environment.js';

const getter = descriptor => descriptor ? descriptor.get : () => undefined;
const method = descriptor => descriptor ? descriptor.value : () => undefined;

// Document

const createElementMethod = method(Env.Document.createElement);
export const createElement = (doc, localName) => createElementMethod.call(doc, localName);

const createElementNSMethod = method(Env.Document.createElementNS);
export const createElementNS = (doc, namespace, qualifiedName) => createElementNSMethod.call(doc, namespace, qualifiedName);

const importNodeMethod = method(Env.Document.importNode);
export const importNode = (doc, node, deep) => importNodeMethod.call(doc, node, deep);

const readyStateGetter = getter(Env.Document.readyState);
export const readyState = doc => readyStateGetter.call(doc);

// Element

const getAttributeMethod = method(Env.Element.getAttribute);
export const getAttribute = (node, attrName) => getAttributeMethod.call(node, attrName);

const localNameGetter = getter(Env.Element.localName);
export const localName = node => localNameGetter.call(node);

// MutationObserver

export const MutationObserver = method(Env.MutationObserver.constructor);

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

const firstChildGetter = getter(Env.Node.firstChild);
export const firstChild = node => firstChildGetter.call(node);

const isConnectedGetter = getter(Env.Node.isConnected);
export const isConnected = node => isConnectedGetter.call(node);

const nextSiblingGetter = getter(Env.Node.nextSibling);
export const nextSibling = node => nextSiblingGetter.call(node);

const nodeTypeGetter = getter(Env.Node.nodeType);
export const nodeType = node => nodeTypeGetter.call(node);

const parentNodeGetter = getter(Env.Node.parentNode);
export const parentNode = node => parentNodeGetter.call(node);
