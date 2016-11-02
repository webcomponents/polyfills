/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

import * as utils from './utils'

let origAddEventListener = Element.prototype.addEventListener;
let origRemoveEventListener = Element.prototype.removeEventListener;

// https://github.com/w3c/webcomponents/issues/513#issuecomment-224183937
let alwaysComposed = {
  blur: true,
  focus: true,
  focusin: true,
  focusout: true,
  click: true,
  dblclick: true,
  mousedown: true,
  mouseenter: true,
  mouseleave: true,
  mousemove: true,
  mouseout: true,
  mouseover: true,
  mouseup: true,
  wheel: true,
  beforeinput: true,
  input: true,
  keydown: true,
  keyup: true,
  compositionstart: true,
  compositionupdate: true,
  compositionend: true,
  touchstart: true,
  touchend: true,
  touchmove: true,
  touchcancel: true,
  pointerover: true,
  pointerenter: true,
  pointerdown: true,
  pointermove: true,
  pointerup: true,
  pointercancel: true,
  pointerout: true,
  pointerleave: true,
  gotpointercapture: true,
  lostpointercapture: true,
  dragstart: true,
  drag: true,
  dragenter: true,
  dragleave: true,
  dragover: true,
  drop: true,
  dragend: true,
  DOMActivate: true,
  DOMFocusIn: true,
  DOMFocusOut: true,
  keypress: true
};

function pathComposer(startNode, composed) {
  let composedPath = [];
  let current = startNode;
  let startRoot = startNode === window ? window : startNode.getRootNode();
  while (current) {
    composedPath.push(current);
    if (current.assignedSlot) {
      current = current.assignedSlot;
    } else if (current.nodeType === Node.DOCUMENT_FRAGMENT_NODE && current.host && (composed || current !== startRoot)) {
      current = current.host;
    } else {
      current = current.parentNode;
    }
  }
  // event composedPath includes window when startNode's ownerRoot is document
  if (composedPath[composedPath.length - 1] === document) {
    composedPath.push(window);
  }
  return composedPath;
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
    root = ancestor === window ? window : ancestor.getRootNode();
    if (root !== lastRoot) {
      rootIdx = refNodePath.indexOf(root);
      lastRoot = root;
    }
    if (!utils.isShadyRoot(root) || rootIdx > -1) {
      return ancestor;
    }
  }
}

let EventMixin = {

  __patched: 'Event',

  get composed() {
    if (this.isTrusted && this.__composed === undefined) {
      this.__composed = alwaysComposed[this.type];
    }
    return this.__composed || false;
  },

  composedPath() {
    if (!this.__composedPath) {
      this.__composedPath = pathComposer(this.__target, this.composed);
    }
    return this.__composedPath;
  },

  get target() {
    return retarget(this.currentTarget, this.composedPath());
  },

  // http://w3c.github.io/webcomponents/spec/shadow/#event-relatedtarget-retargeting
  get relatedTarget() {
    if (!this.__relatedTarget) {
      return null;
    }
    if (!this.__relatedTargetComposedPath) {
      this.__relatedTargetComposedPath = pathComposer(this.__relatedTarget, true);
    }
    // find the deepest node in relatedTarget composed path that is in the same root with the currentTarget
    return retarget(this.currentTarget, this.__relatedTargetComposedPath);
  },
  stopPropagation() {
    Event.prototype.stopPropagation.call(this);
    this.__propagationStopped = true;
  },
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
    event.__composed = options && Boolean(options.composed);
    return event;
  }
  // put constructor properties on subclass
  utils.mixin(klazz, Base);
  klazz.prototype = Base.prototype;
  return klazz;
}

let nonBubblingEventsToRetarget = {
  focus: true,
  blur: true
};

function fireHandlers(event, node, phase) {
  let hs = node.__handlers && node.__handlers[event.type] &&
    node.__handlers[event.type][phase];
  if (hs) {
    for (let i = 0, fn; (fn = hs[i]); i++) {
      fn.call(node, event);
      if (event.__immediatePropagationStopped) {
        return;
      }
    }
  }
}

function retargetNonBubblingEvent(e) {
  let path = e.composedPath();
  let node;
  // override `currentTarget` to let patched `target` calculate correctly
  Object.defineProperty(e, 'currentTarget', {
    get: function() {
      return node;
    },
    configurable: true
  });
  for (let i = path.length - 1; i >= 0; i--) {
    node = path[i];
    fireHandlers(e, node, 'capture');
    if (e.__propagationStopped) {
      return;
    }
  }
  Object.defineProperty(e, 'eventPhase', {value: Event.BUBBLING_PHASE});
  for (let i = 0; i < path.length; i++) {
    node = path[i];
    fireHandlers(e, node, 'bubble');
    if (e.__propagationStopped) {
      return;
    }
  }
}

function shouldCapture(optionsOrCapture) {
  return Boolean(typeof optionsOrCapture === 'object' ?
    optionsOrCapture.capture : optionsOrCapture);
}

/**
 * Returns an eventWrapperId formatted as "type|options". All these cases return
 * the same result:
 * - getEventWrapperId('some-event', false|{}|null|undefined)
 * - getEventWrapperId('some-event', {capture: false|null|undefined})
 * @param {!string} type
 * @param {(Object|boolean)=} options
 * @return {string}
 */
function getEventWrapperId(type, options) {
  return type + '|' + normalizedOptions(options);
}

/**
 * Normalizes the options into a string with format "[CAPTURE][ONCE][PASSIVE]"
 * e.g.
 * normalizedOptions(false|{}|undefined|null) -> "000"
 * normalizedOptions({capture: true}) -> "100"
 * normalizedOptions({passive: true, once: true}) -> "011"
 * @param {(Object|boolean)=} options
 * @return {string}
 */
function normalizedOptions(options) {
  const capture = shouldCapture(options);
  let passive = false;
  let once = false;
  if (typeof options === 'object') {
    passive = Boolean(options.passive);
    once = Boolean(options.once);
  }
  return '' + Number(capture) + Number(once) + Number(passive);
}

export function addEventListener(type, fn, optionsOrCapture) {
  if (!fn) {
    return;
  }
  // TODO: investigate if this is worth tracking, as it is only used for
  // deciding if the `slotchanged` event should be fired
  if (!this.__eventListenerCount) {
    this.__eventListenerCount = 0;
  }
  this.__eventListenerCount++;

  // The function might be used for multiple events, so we need to keep track of
  // the event type, options, and node into this object where the key determines
  // the Id of the wrapped function (type+options), and the value is a WeakMap where
  // we associate a node to the wrapped function.
  fn.__eventWrappers = fn.__eventWrappers || {};
  // This event listener might be added multiple times, we need to be able to remove
  // all the wrappers we add.
  const eventWrapperId = getEventWrapperId(type, optionsOrCapture);
  const wrappersForType = fn.__eventWrappers[eventWrapperId] || new WeakMap();
  fn.__eventWrappers[eventWrapperId] = wrappersForType;
  // If this event listener was already added, no need to create a new wrapper
  // for the function.
  if (wrappersForType.has(this)) {
    return;
  }

  const wrappedFn = function(e) {
    // Support `once` option.
    if (optionsOrCapture && optionsOrCapture.once) {
      this.removeEventListener(type, fn, optionsOrCapture);
    }
    if (!e.__target) {
      e.__target = e.target;
      e.__relatedTarget = e.relatedTarget;
      utils.patchPrototype(e, EventMixin);
    }
    // There are two critera that should stop events from firing on this node
    // 1. the event is not composed and the current node is not in the same root as the target
    // 2. when bubbling, if after retargeting, relatedTarget and target point to the same node
    if (e.composed || e.composedPath().indexOf(this) > -1) {
      if (e.eventPhase === Event.BUBBLING_PHASE) {
        if (e.target === e.relatedTarget) {
          e.stopImmediatePropagation();
          return;
        }
      }
      return fn(e);
    }
  };
  // Store the wrapped function.
  wrappersForType.set(this, wrappedFn);

  if (nonBubblingEventsToRetarget[type]) {
    this.__handlers = this.__handlers || {};
    this.__handlers[type] = this.__handlers[type] || {capture: [], bubble: []};
    if (shouldCapture(optionsOrCapture)) {
      this.__handlers[type].capture.push(wrappedFn);
    } else {
      this.__handlers[type].bubble.push(wrappedFn);
    }
  } else {
    origAddEventListener.call(this, type, wrappedFn, optionsOrCapture);
  }
}

export function removeEventListener(type, fn, optionsOrCapture) {
  if (!fn) {
    return;
  }
  // Search the wrapped function.
  const wrappers = fn.__eventWrappers || {};
  const wrappersForType = wrappers[getEventWrapperId(type, optionsOrCapture)] || new WeakMap();
  const wrapperFn = wrappersForType.get(this);
  wrappersForType.delete(this);

  origRemoveEventListener.call(this, type, wrapperFn || fn, optionsOrCapture);
  if (wrapperFn) {
    this.__eventListenerCount--;
    if (nonBubblingEventsToRetarget[type]) {
      if (this.__handlers) {
        if (this.__handlers[type]) {
          let idx;
          if (shouldCapture(optionsOrCapture)) {
            idx = this.__handlers[type].capture.indexOf(wrapperFn);
            if (idx > -1) {
              this.__handlers[type].capture.splice(idx, 1);
            }
          } else {
            idx = this.__handlers[type].bubble.indexOf(wrapperFn);
            if (idx > -1) {
              this.__handlers[type].bubble.splice(idx, 1);
            }
          }
        }
      }
    }
  }
}

export function activateFocusEventOverrides() {
  for (let ev in nonBubblingEventsToRetarget) {
    window.addEventListener(ev, function(e) {
      if (!e.__target) {
        e.__target = e.target;
        e.__relatedTarget = e.relatedTarget;
        utils.patchPrototype(e, EventMixin);
        retargetNonBubblingEvent(e);
        e.stopImmediatePropagation();
      }
    }, true);
  }
}

export let OriginalEvent = Event;
export let PatchedEvent = mixinComposedFlag(Event);
export let PatchedCustomEvent = mixinComposedFlag(CustomEvent);
export let PatchedMouseEvent = mixinComposedFlag(MouseEvent);
