/**
 * @fileoverview Externs to upstream to closure compiler
 * @externs
 */

/** @type {boolean} */
Event.prototype.composed;

/**
 * @return {!Array<!(Element|ShadowRoot|Document|Window)>}
 */
Event.prototype.composedPath = function(){};

/**
 * @param {!{mode: string}} options
 * @return {!ShadowRoot}
 */
HTMLElement.prototype.attachShadow = function(options){};

/**
 * @constructor
 * @extends {HTMLElement}
 */
function HTMLSlotElement(){}

/**
 * @param {!{flatten: boolean}=} options
 * @return {!Array<!Node>}
 */
HTMLSlotElement.prototype.assignedNodes = function(options){};

/** @type {HTMLSlotElement} */
Node.prototype.assignedSlot;

/** @type {boolean} */
Node.prototype.isConnected;

/** @type {string} */
Element.prototype.slot;

