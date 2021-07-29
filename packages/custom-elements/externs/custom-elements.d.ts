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
  interface CustomElementRegistry {
    forcePolyfill?: boolean;
    polyfillWrapFlushCallback?(outer: (fn: () => void) => void): void;
    noDocumentConstructionObserver?: boolean;
    shadyDomFastWalk?: boolean;
  }
}
