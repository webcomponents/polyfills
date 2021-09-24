/**
 * @license
 * Copyright (c) 2021 The Polymer Project Authors. All rights reserved. This
 * code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

// When building externally, this file is always assumed to be a module, but by
// default it isn't when building internally, so we need this export statement.
export {};

declare global {
  /**
   * Block renaming of properties added to Node to
   * prevent conflicts with other closure-compiler code.
   */
  interface EventTarget {
    __handlers?: Object;
  }

  interface Node {
    __shady?: Object;
  }

  interface IWrapper {
    _activeElement?: Node;
    // NOTE: For some reason, Closure likes to remove focus() from the IWrapper
    // class. Not yet clear why focus() is affected and not any other methods
    // (e.g. blur).
    focus(): void;
  }

  interface Event {
    __composed?: boolean;
    __immediatePropagationStopped?: boolean;
    __relatedTarget?: Node;
    __composedPath?: Array<EventTarget>;
    __relatedTargetComposedPath: Array<EventTarget>;
  }

  interface ShadowRoot {
    /**
     * Prevent renaming of this method on ShadyRoot for testing and debugging.
     */
    _renderSelf(): void;
  }

  // Prevent renaming of properties used by Polymer templates with
  // shadyUpgradeFragment optimization
  interface DocumentFragment {
    $: Object;
    __noInsertionPoint: boolean;
    nodeList: Array<Node>;
    templateInfo: Object;
  }
}
