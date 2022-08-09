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
  interface ShadyDOMInterface {
    flush: () => void;
    inUse: boolean;
    nativeMethods: {
      querySelectorAll: typeof document.querySelectorAll;
    };
    noPatch: boolean | string;
    patchElementProto: (node: Object) => void;
    querySelectorImplementation?: 'native' | 'selectorEngine';
    wrap: (node: Node) => Node;
  }

  // This type alias exists because Tsickle will replace any type name used in the
  // type of something with the same name with `?`. (Maybe a Closure limitation?)
  // Making `ShadyDOM` an alias to an underlying type with a different name works
  // around this because Tsickle appears to resolve type aliases in its output: it
  // writes `undefined|ShadyDOMInterface` instead of `undefined|?` as the type for
  // the `ShadyDOM` global.
  type ShadyDOM = ShadyDOMInterface;
  // eslint-disable-next-line no-var
  var ShadyDOM: ShadyDOM;
}
