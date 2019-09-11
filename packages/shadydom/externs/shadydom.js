/**
 * @fileoverview Externs for closure compiler
 * @externs
 */

/**
 * Block renaming of properties added to Node to
 * prevent conflicts with other closure-compiler code.
 * @type {Object}
 */
EventTarget.prototype.__handlers;

/** @type {Object} */
Node.prototype.__shady;

/** @interface */
function IWrapper() {}

/** @type {!Node|undefined} */
IWrapper.prototype._activeElement;

// NOTE: For some reason, Closure likes to remove focus() from the IWrapper
// class. Not yet clear why focus() is affected and not any other methods (e.g.
// blur).
IWrapper.prototype.focus = function() {};

/** @type {!boolean|undefined} */
Event.prototype.__composed;

/** @type {!boolean|undefined} */
Event.prototype.__immediatePropagationStopped;

/** @type {!Node|undefined} */
Event.prototype.__relatedTarget;

/** @type {!Array<!EventTarget>|undefined} */
Event.prototype.__composedPath;

/** @type {!Array<!EventTarget>|undefined} */
Event.prototype.__relatedTargetComposedPath;

/**
 * Prevent renaming of this method on ShadyRoot for testing and debugging.
 */
ShadowRoot.prototype._renderSelf = function(){};

// Prevent renaming of properties used by Polymer templates with
// shadyUpgradeFragment optimization
/** @type {!Object} */
DocumentFragment.prototype.$;
/** @type {boolean} */
DocumentFragment.prototype.__noInsertionPoint;
/** @type {!Array<!Node>} */
DocumentFragment.prototype.nodeList;
/** @type {!Object} */
DocumentFragment.prototype.templateInfo;
