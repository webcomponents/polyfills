/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from './utils.js';
import {flush} from './flush.js';
import {shadyDataForNode, ensureShadyDataForNode} from './shady-data.js';

/*
Make this name unique so it is unlikely to conflict with properties on objects passed to `addEventListener`
https://github.com/webcomponents/shadydom/issues/173
*/
const /** string */ eventWrappersName = `__eventWrappers${Date.now()}`;

/** @type {?function(!Event): boolean} */
const composedGetter = (() => {
  const composedProp = Object.getOwnPropertyDescriptor(Event.prototype, 'composed');
  return composedProp ? (ev) => composedProp.get.call(ev) : null;
})();

const supportsEventOptions = (() => {
  let supported = false;
  let eventOptions = {
    get capture() {
      supported = true;
      return false;
    }
  }
  const listener = () => {}
  // NOTE: These will be unpatched at this point.
  window.addEventListener('test', listener, eventOptions);
  window.removeEventListener('test', listener, eventOptions);
  return supported;
})();

const parseEventOptions = (optionsOrCapture) => {
  let capture, once, passive, shadyTarget;
  if (optionsOrCapture && typeof optionsOrCapture === 'object') {
    capture = Boolean(optionsOrCapture.capture);
    once = Boolean(optionsOrCapture.once);
    passive = Boolean(optionsOrCapture.passive);
    shadyTarget = optionsOrCapture.__shadyTarget;
  } else {
    capture = Boolean(optionsOrCapture);
    once = false;
    passive = false;
  }
  return {
    shadyTarget,
    capture,
    once,
    passive,
    nativeEventOptions: supportsEventOptions ? optionsOrCapture : capture
  }
}

// https://github.com/w3c/webcomponents/issues/513#issuecomment-224183937
const alwaysComposed = {
  'blur': true,
  'focus': true,
  'focusin': true,
  'focusout': true,
  'click': true,
  'dblclick': true,
  'mousedown': true,
  'mouseenter': true,
  'mouseleave': true,
  'mousemove': true,
  'mouseout': true,
  'mouseover': true,
  'mouseup': true,
  'wheel': true,
  'beforeinput': true,
  'input': true,
  'keydown': true,
  'keyup': true,
  'compositionstart': true,
  'compositionupdate': true,
  'compositionend': true,
  'touchstart': true,
  'touchend': true,
  'touchmove': true,
  'touchcancel': true,
  'pointerover': true,
  'pointerenter': true,
  'pointerdown': true,
  'pointermove': true,
  'pointerup': true,
  'pointercancel': true,
  'pointerout': true,
  'pointerleave': true,
  'gotpointercapture': true,
  'lostpointercapture': true,
  'dragstart': true,
  'drag': true,
  'dragenter': true,
  'dragleave': true,
  'dragover': true,
  'drop': true,
  'dragend': true,
  'DOMActivate': true,
  'DOMFocusIn': true,
  'DOMFocusOut': true,
  'keypress': true
};

const unpatchedEvents = {
  'DOMAttrModified': true,
  'DOMAttributeNameChanged': true,
  'DOMCharacterDataModified': true,
  'DOMElementNameChanged': true,
  'DOMNodeInserted': true,
  'DOMNodeInsertedIntoDocument': true,
  'DOMNodeRemoved': true,
  'DOMNodeRemovedFromDocument': true,
  'DOMSubtreeModified': true
}

/**
 * Some EventTarget subclasses are not Node subclasses, and you cannot call
 * `getRootNode()` on them.
 *
 * @param {!(Node|EventTarget)} eventTarget
 * @return {!(Node|EventTarget)}
 */
function getRootNodeWithFallback(eventTarget) {
  if (eventTarget instanceof Node) {
    return eventTarget[utils.SHADY_PREFIX + 'getRootNode']();
  } else {
    return eventTarget;
  }
}

function pathComposer(startNode, composed) {
  let composedPath = [];
  let current = startNode;
  let startRoot = getRootNodeWithFallback(startNode);
  while (current) {
    composedPath.push(current);
    if (current[utils.SHADY_PREFIX + 'assignedSlot']) {
      current = current[utils.SHADY_PREFIX + 'assignedSlot'];
    } else if (current.nodeType === Node.DOCUMENT_FRAGMENT_NODE && current.host && (composed || current !== startRoot)) {
      current = current.host;
    } else {
      current = current[utils.SHADY_PREFIX + 'parentNode'];
    }
  }
  // event composedPath includes window when startNode's ownerRoot is document
  if (composedPath[composedPath.length - 1] === document) {
    composedPath.push(window);
  }
  return composedPath;
}

export const composedPath = (event) => {
  if (!event.__composedPath) {
    event.__composedPath = pathComposer(event.target, true);
  }
  return event.__composedPath;
}

function retarget(refNode, path) {
  if (!utils.isShadyRoot) {
    return refNode;
  }
  // If ANCESTOR's root is not a shadow root or ANCESTOR's root is BASE's
  // shadow-including inclusive ancestor, return ANCESTOR.
  let refNodePath = pathComposer(refNode, true);
  let p$ = path;
  for (let i=0, ancestor, lastRoot, root, rootIdx; i < p$.length; i++) {
    ancestor = p$[i];
    root = getRootNodeWithFallback(ancestor);
    if (root !== lastRoot) {
      rootIdx = refNodePath.indexOf(root);
      lastRoot = root;
    }
    if (!utils.isShadyRoot(root) || rootIdx > -1) {
      return ancestor;
    }
  }
}

let EventPatches = {

  /**
   * @this {Event}
   */
  get composed() {
    if (this.__composed === undefined) {
      // if there's an original `composed` getter on the Event prototype, use that
      if (composedGetter) {
        // TODO(web-padawan): see https://github.com/webcomponents/shadydom/issues/275
        this.__composed = this.type === 'focusin' || this.type === 'focusout' || composedGetter(this);
      // If the event is trusted, or `isTrusted` is not supported, check the list of always composed events
      } else if (this.isTrusted !== false) {
        this.__composed = alwaysComposed[this.type];
      }
    }
    return /** @type {!Event} */(this).__composed || false;
  },

  /**
   * @this {Event}
   */
  composedPath() {
    if (!this.__composedPath) {
      this.__composedPath = pathComposer(this['__target'], this.composed);
    }
    return /** @type {!Event} */(this).__composedPath;
  },

  /**
   * @this {Event}
   */
  get target() {
    return retarget(this.currentTarget || this['__previousCurrentTarget'], this.composedPath());
  },

  // http://w3c.github.io/webcomponents/spec/shadow/#event-relatedtarget-retargeting
  /**
   * @this {Event}
   */
  get relatedTarget() {
    if (!this.__relatedTarget) {
      return null;
    }
    if (!this.__relatedTargetComposedPath) {
      this.__relatedTargetComposedPath = pathComposer(this.__relatedTarget, true);
    }
    // find the deepest node in relatedTarget composed path that is in the same root with the currentTarget
    return retarget(this.currentTarget || this['__previousCurrentTarget'], /** @type {!Event} */(this).__relatedTargetComposedPath);
  },
  /**
   * @this {Event}
   */
  stopPropagation() {
    Event.prototype.stopPropagation.call(this);
    this.__propagationStopped = true;
  },
  /**
   * @this {Event}
   */
  stopImmediatePropagation() {
    Event.prototype.stopImmediatePropagation.call(this);
    this.__immediatePropagationStopped = true;
    this.__propagationStopped = true;
  }

};

function mixinComposedFlag(Base) {
  // NOTE: avoiding use of `class` here so that transpiled output does not
  // try to do `Base.call` with a dom construtor.
  let klazz = function(type, options) {
    let event = new Base(type, options);
    event.__composed = options && Boolean(options['composed']);
    return event;
  }
  // put constructor properties on subclass
  klazz.__proto__ = Base;
  klazz.prototype = Base.prototype;
  return klazz;
}

let nonBubblingEventsToRetarget = {
  'focus': true,
  'blur': true
};


/**
 * Check if the event has been retargeted by comparing original `target`, and calculated `target`
 * @param {Event} event
 * @return {boolean} True if the original target and calculated target are the same
 */
function hasRetargeted(event) {
  return event['__target'] !== event.target || event.__relatedTarget !== event.relatedTarget;
}

/**
 *
 * @param {Event} event
 * @param {Node} node
 * @param {string} phase
 */
function fireHandlers(event, node, phase) {
  let hs = node.__handlers && node.__handlers[event.type] &&
    node.__handlers[event.type][phase];
  if (hs) {
    for (let i = 0, fn; (fn = hs[i]); i++) {
      if (hasRetargeted(event) && event.target === event.relatedTarget) {
        return;
      }
      fn.call(node, event);
      if (event.__immediatePropagationStopped) {
        return;
      }
    }
  }
}

function shadyDispatchEvent(e) {
  const path = e.composedPath();
  const retargetedPath = path.map(node => retarget(node, path));
  const bubbles = e.bubbles;

  let currentTarget;
  // override `currentTarget` to let patched `target` calculate correctly
  Object.defineProperty(e, 'currentTarget', {
    configurable: true,
    enumerable: true,
    get: function() {
      return currentTarget;
    },
  });

  let eventPhase = Event.CAPTURING_PHASE;
  Object.defineProperty(e, 'eventPhase', {
    configurable: true,
    enumerable: true,
    get: function() {
      return eventPhase;
    },
  });

  for (let i = path.length - 1; i >= 0; i--) {
    currentTarget = path[i];
    eventPhase = currentTarget === retargetedPath[i] ? Event.AT_TARGET : Event.CAPTURING_PHASE;
    // capture phase fires all capture handlers
    fireHandlers(e, currentTarget, 'capture');
    if (e.__propagationStopped) {
      return;
    }
  }

  for (let i = 0; i < path.length; i++) {
    currentTarget = path[i];
    const atTarget = currentTarget === retargetedPath[i];
    if (atTarget || bubbles) {
      eventPhase = atTarget ? Event.AT_TARGET : Event.BUBBLING_PHASE;
      fireHandlers(e, currentTarget, 'bubble');
      if (e.__propagationStopped) {
        return;
      }
    }
  }

  eventPhase = 0; // `Event.NONE` is not available in IE11.
  currentTarget = null;
}

function listenerSettingsEqual(savedListener, node, type, capture, once, passive) {
  let {
    node: savedNode,
    type: savedType,
    capture: savedCapture,
    once: savedOnce,
    passive: savedPassive
  } = savedListener;
  return node === savedNode &&
    type === savedType &&
    capture === savedCapture &&
    once === savedOnce &&
    passive === savedPassive;
}

export function findListener(wrappers, node, type, capture, once, passive) {
  for (let i = 0; i < wrappers.length; i++) {
    if (listenerSettingsEqual(wrappers[i], node, type, capture, once, passive)) {
      return i;
    }
  }
  return -1;
}

/**
 * Firefox can throw on accessing eventWrappers inside of `removeEventListener` during a selenium run
 * Try/Catch accessing eventWrappers to work around
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1353074
 */
function getEventWrappers(eventLike) {
  let wrappers = null;
  try {
    wrappers = eventLike[eventWrappersName];
  } catch (e) {} // eslint-disable-line no-empty
  return wrappers;
}

function targetNeedsPathCheck(node) {
  return utils.isShadyRoot(node) || node.localName === 'slot';
}

/** @this {Node} */
export function dispatchEvent(event) {
  flush();
  // If the target is disconnected from the real document, it might still be
  // connected in the user-facing tree. To allow its path to potentially
  // include both connected and disconnected parts, dispatch it manually.
  if (!utils.settings.preferPerformance && this instanceof Node &&
      !utils.documentContains(document, this)) {
    if (!event['__target']) {
      patchEvent(event, this);
    }
    return shadyDispatchEvent(event);
  } else {
    return this[utils.NATIVE_PREFIX + 'dispatchEvent'](event);
  }
}

/**
 * @this {EventTarget}
 */
export function addEventListener(type, fnOrObj, optionsOrCapture) {
  const {capture, once, passive, shadyTarget, nativeEventOptions} =
    parseEventOptions(optionsOrCapture);
  if (!fnOrObj) {
    return;
  }

  const handlerType = typeof fnOrObj;

  // bail if `fnOrObj` is not a function, not an object
  if (handlerType !== 'function' && handlerType !== 'object') {
    return;
  }

  // bail if `fnOrObj` is an object without a `handleEvent` method
  if (handlerType === 'object' && (!fnOrObj.handleEvent || typeof fnOrObj.handleEvent !== 'function')) {
    return;
  }

  if (unpatchedEvents[type]) {
    return this[utils.NATIVE_PREFIX + 'addEventListener'](type, fnOrObj, nativeEventOptions);
  }

  // hack to let ShadyRoots have event listeners
  // event listener will be on host, but `currentTarget`
  // will be set to shadyroot for event listener
  let target = shadyTarget || this;

  let wrappers = fnOrObj[eventWrappersName];
  if (wrappers) {
    // The callback `fn` might be used for multiple nodes/events. Since we generate
    // a wrapper function, we need to keep track of it when we remove the listener.
    // It's more efficient to store the node/type/options information as Array in
    // `fn` itself rather than the node (we assume that the same callback is used
    // for few nodes at most, whereas a node will likely have many event listeners).
    // NOTE(valdrin) invoking external functions is costly, inline has better perf.
    // Stop if the wrapper function has already been created.
    if (findListener(wrappers, target, type, capture, once, passive) > -1) {
      return;
    }
  } else {
    fnOrObj[eventWrappersName] = [];
  }

  /**
   * @this {HTMLElement}
   * @param {Event} e
   */
  const wrapperFn = function(e) {
    // Support `once` option.
    if (once) {
      this[utils.SHADY_PREFIX + 'removeEventListener'](type, fnOrObj, optionsOrCapture);
    }
    if (!e['__target']) {
      patchEvent(e);
    }
    let lastCurrentTargetDesc;
    let lastEventPhaseDesc;
    if (target !== this) {
      // replace `currentTarget` to make `target` and `relatedTarget` correct for inside the shadowroot
      lastCurrentTargetDesc = Object.getOwnPropertyDescriptor(e, 'currentTarget');
      Object.defineProperty(e, 'currentTarget', {get() { return target }, configurable: true});
      lastEventPhaseDesc = Object.getOwnPropertyDescriptor(e, 'eventPhase');
      Object.defineProperty(e, 'eventPhase', {
        configurable: true,
        enumerable: true,
        get() {
          // Shady DOM doesn't support dispatching to a shadow root as the
          // target, so we don't need to handle Event.AT_TARGET.
          return capture ? Event.CAPTURING_PHASE : Event.BUBBLING_PHASE;
        },
      });
    }
    e['__previousCurrentTarget'] = e['currentTarget'];
    // Always check if a shadowRoot or slot is in the current event path.
    // If it is not, the event was generated on either the host of the shadowRoot
    // or a children of the host.
    if (targetNeedsPathCheck(target) && e.composedPath().indexOf(target) == -1) {
      return;
    }
    // There are two critera that should stop events from firing on this node
    // 1. the event is not composed and the current node is not in the same root as the target
    // 2. when bubbling, if after retargeting, relatedTarget and target point to the same node
    if (e.composed || e.composedPath().indexOf(target) > -1) {
      if (hasRetargeted(e) && e.target === e.relatedTarget) {
        if (e.eventPhase === Event.BUBBLING_PHASE) {
          e.stopImmediatePropagation();
        }
        return;
      }
      // prevent non-bubbling events from triggering bubbling handlers on shadowroot, but only if not in capture phase
      if (e.eventPhase !== Event.CAPTURING_PHASE && !e.bubbles && e.target !== target && !(target instanceof Window)) {
        return;
      }
      let ret = handlerType === 'function' ?
        fnOrObj.call(target, e) :
        (fnOrObj.handleEvent && fnOrObj.handleEvent(e));
      if (target !== this) {
        // Replace the original descriptors for `currentTarget` and `eventPhase`.
        if (lastCurrentTargetDesc) {
          Object.defineProperty(e, 'currentTarget', lastCurrentTargetDesc);
          lastCurrentTargetDesc = null;
        } else {
          delete e['currentTarget'];
        }
        if (lastEventPhaseDesc) {
          Object.defineProperty(e, 'eventPhase', lastEventPhaseDesc);
          lastEventPhaseDesc = null;
        } else {
          delete e['eventPhase'];
        }
      }
      return ret;
    }
  };

  // Store the wrapper information.
  fnOrObj[eventWrappersName].push({
    // note: use target here which is either a shadowRoot
    // (when the host element is proxy'ing the event) or this element
    node: target,
    type: type,
    capture: capture,
    once: once,
    passive: passive,
    wrapperFn: wrapperFn
  });

  this.__handlers = this.__handlers || {};
  this.__handlers[type] = this.__handlers[type] ||
    {'capture': [], 'bubble': []};
  this.__handlers[type][capture ? 'capture' : 'bubble'].push(wrapperFn);

  if (!nonBubblingEventsToRetarget[type]) {
    this[utils.NATIVE_PREFIX + 'addEventListener'](type, wrapperFn, nativeEventOptions);
  }
}

/**
 * @this {EventTarget}
 */
export function removeEventListener(type, fnOrObj, optionsOrCapture) {
  if (!fnOrObj) {
    return;
  }
  const {capture, once, passive, shadyTarget, nativeEventOptions} =
    parseEventOptions(optionsOrCapture);
  if (unpatchedEvents[type]) {
    return this[utils.NATIVE_PREFIX + 'removeEventListener'](type, fnOrObj, nativeEventOptions);
  }
  let target = shadyTarget || this;
  // Search the wrapped function.
  let wrapperFn = undefined;
  let wrappers = getEventWrappers(fnOrObj);
  if (wrappers) {
    let idx = findListener(wrappers, target, type, capture, once, passive);
    if (idx > -1) {
      wrapperFn = wrappers.splice(idx, 1)[0].wrapperFn;
      // Cleanup.
      if (!wrappers.length) {
        fnOrObj[eventWrappersName] = undefined;
      }
    }
  }
  this[utils.NATIVE_PREFIX + 'removeEventListener'](type, wrapperFn || fnOrObj,
    nativeEventOptions);
  if (wrapperFn && this.__handlers && this.__handlers[type]) {
    const arr = this.__handlers[type][capture ? 'capture' : 'bubble'];
    const idx = arr.indexOf(wrapperFn);
    if (idx > -1) {
      arr.splice(idx, 1);
    }
  }
}

function activateFocusEventOverrides() {
  for (let ev in nonBubblingEventsToRetarget) {
    window[utils.NATIVE_PREFIX + 'addEventListener'](ev, function(e) {
      if (!e['__target']) {
        patchEvent(e);
        shadyDispatchEvent(e);
      }
    }, true);
  }
}

const EventPatchesDescriptors = utils.getOwnPropertyDescriptors(EventPatches);

const SHADY_PROTO = '__shady_patchedProto';
const SHADY_SOURCE_PROTO = '__shady_sourceProto';

function patchEvent(event, target = event.target) {
  event['__target'] = target;
  event.__relatedTarget = event.relatedTarget;
  // attempt to patch prototype (via cache)
  if (utils.settings.hasDescriptors) {
    const proto = Object.getPrototypeOf(event);
    // eslint-disable-next-line no-prototype-builtins
    if (!proto.hasOwnProperty(SHADY_PROTO)) {
      const patchedProto = Object.create(proto);
      patchedProto[SHADY_SOURCE_PROTO] = proto;
      utils.patchProperties(patchedProto, EventPatchesDescriptors);
      proto[SHADY_PROTO] = patchedProto;
    }
    event.__proto__ = proto[SHADY_PROTO];
  // and fallback to patching instance
  } else {
    utils.patchProperties(event, EventPatchesDescriptors);
  }
}

let PatchedEvent = mixinComposedFlag(Event);
let PatchedCustomEvent = mixinComposedFlag(CustomEvent);
let PatchedMouseEvent = mixinComposedFlag(MouseEvent);


export function patchEvents() {
  activateFocusEventOverrides();
  window.Event = PatchedEvent;
  window.CustomEvent = PatchedCustomEvent;
  window.MouseEvent = PatchedMouseEvent;
}

export function patchClick() {
  // Fix up `Element.prototype.click()` if `isTrusted` is supported, but `composed` isn't
  if (!composedGetter && Object.getOwnPropertyDescriptor(Event.prototype, 'isTrusted')) {
    /** @this {Element} */
    const composedClickFn = function() {
      const ev = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true
      });
      this[utils.SHADY_PREFIX + 'dispatchEvent'](ev);
    };
    if (Element.prototype.click) {
      Element.prototype.click = composedClickFn;
    } else if (HTMLElement.prototype.click) {
      HTMLElement.prototype.click = composedClickFn;
    }
  }
}

export const eventPropertyNamesForElement =
    Object.getOwnPropertyNames(Element.prototype)
    .filter(name => name.substring(0,2) === 'on');

export const eventPropertyNamesForHTMLElement =
    Object.getOwnPropertyNames(HTMLElement.prototype)
    .filter(name => name.substring(0,2) === 'on');

/**
 * @param {string} property
 * @return {!ObjectPropertyDescriptor<Element>}
 */
export const wrappedDescriptorForEventProperty = (property) => {
  return {
    /** @this {Element} */
    set: function(fn) {
      const shadyData = ensureShadyDataForNode(this);
      const eventName = property.substring(2);
      if (!shadyData.__onCallbackListeners) {
        shadyData.__onCallbackListeners = {};
      }
      shadyData.__onCallbackListeners[property] && this.removeEventListener(eventName, shadyData.__onCallbackListeners[property]);
      this[utils.SHADY_PREFIX + 'addEventListener'](eventName, fn);
      shadyData.__onCallbackListeners[property] = fn;
    },
    /** @this {Element} */
    get() {
      const shadyData = shadyDataForNode(this);
      return shadyData && shadyData.__onCallbackListeners && shadyData.__onCallbackListeners[property];
    },
    configurable: true
  };
};
