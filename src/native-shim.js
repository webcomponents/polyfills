/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

/**
 * This shim allows elements written in, or compiled to, ES5 to work on native
 * implementations of Custom Elements.
 *
 * ES5-style classes don't work with native Custom Elements because the
 * HTMLElement constructor uses the value of `new.target` to look up the custom
 * element definition for the currently called constructor. `new.target` is only
 * set when `new` is called and is only propagated via super() calls. super()
 * is not emulatable in ES5. The pattern of `SuperClass.call(this)` only works
 * when extending other ES5-style classes, and does not propagate `new.target`.
 *
 * This shim allows the native HTMLElement constructor to work by overriding the
 * HTMLElement class with a subclass that will try its best to provide to catch
 * up the lack of super call for you. Old inheritance with `SuperClass.call(this)`
 * pattern is still required.
 * 
 * Since both subclasses will be supported by the custom element registry, this
 * shim will let you develop with the target transpilation of your choice.
 *
 * This shim should be better than forcing the polyfill because:
 *   1. It's smaller
 *   2. All reaction timings are the same as native (mostly synchronous)
 *   3. All reaction triggering DOM operations are automatically supported
 *
 * There are some restrictions and requirements on ES5 constructors:
 *   1. All constructors in a inheritance hierarchy must be ES5-style with
 *      `SuperClass.call(this)` pattern or ES6-style with a real or emulated
 *      (with `Reflect.construct`) super() call.
 *   2. Constructors must return the value of the emulated super() call. Like
 *      `return SuperClass.call(this)`
 *   3. The `this` reference should not be used before the emulated super() call
 *      just like `this` is illegal to use before super() in ES6.
 *   4. Constructors should not create other custom elements before the emulated
 *      super() call. This is the same restriction as with native custom
 *      elements.
 *
 *  Compiling valid class-based custom elements to ES5 or ES6 will satisfy these
 *  requirements with the latest version of popular transpilers.
 */
(function() {
  'use strict';

  // Do nothing if `customElements` does not exist.
  if (!window.customElements) return;

  var NativeHTMLElement = window.HTMLElement, newHTMLElement;

  try {
    // Try first with new.target support. Use "eval" in case it does not exists.
    newHTMLElement = eval(`(function(_super) {
      return function HTMLElement() {
        return _super(this, new.target || this.constructor);
      }
    })`)(_super);
  } catch (e) { // Failed on new.target ?
    newHTMLElement = function HTMLElement() {
      return _super(this, this.constructor);
    };
  }

  // Object.setPrototypeOf is surprisingly supported in IE 11
  Object.setPrototypeOf(newHTMLElement.prototype, NativeHTMLElement.prototype);
  Object.setPrototypeOf(newHTMLElement, NativeHTMLElement);

  window.HTMLElement = newHTMLElement;

  // Tries to make a super call to the native HTMLElement with the first available solution.
  function _super(_this, _target) {
    if (typeof Reflect === 'object' && typeof Reflect.construct === 'function') {
      return Reflect.construct(NativeHTMLElement, [], _target);
    } else {
      return NativeHTMLElement.call(_this);
    }
  }
})();
