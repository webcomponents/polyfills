/**
 * @fileoverview Externs for closure compiler
 * @externs
 */

/**
 * Upstream to closure-compiler
 * @type {string}
 */
Element.prototype.slot;

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

/** @type {Object} */
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
