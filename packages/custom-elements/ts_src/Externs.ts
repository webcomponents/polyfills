/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {AlreadyConstructedMarkerType} from './AlreadyConstructedMarker.js';
import PolyfilledCustomElementRegistry from './CustomElementRegistry.js';
import CustomElementState from './CustomElementState.js';

// These properties are defined with 'declare' in a ts file so that they will
// not be renamed by Closure Compiler.

// Used for both Documents and Nodes which represent documents in the HTML
// Imports polyfill.
declare global {
  interface CustomElementRegistry {
    forcePolyfill?: boolean;
    polyfillWrapFlushCallback?(outer: (fn: () => void) => void): void;
    noDocumentConstructionObserver?: boolean;
    shadyDomFastWalk?: boolean;
  }

  interface Node {
    __CE_registry?: PolyfilledCustomElementRegistry;
    __CE_isImportDocument?: boolean;
    __CE_documentLoadHandled?: boolean;
    __CE_patched?: boolean;
  }

  interface Element {
    __CE_state?: CustomElementState;
    __CE_definition?: CustomElementDefinition;
    __CE_shadowRoot?: DocumentFragment;
  }

  interface DocumentFragment {
    // Note, the closure type is incorrect here.
    children: HTMLCollection;
  }

  interface Error {
    /**
     * Non-standard Safari property.
     */
    sourceURL?: string;
    fileName?: string;
    /**
     * Non-standard Safari property.
     */
    line?: number;
    lineNumber?: number;
    /**
     * Non-standard Safari property.
     */
    column?: number;

    /**
     * Non-standard Firefox property.
     */
    columnNumber?: number;
  }

  interface ErrorEvent {
    /**
     * Used by IE to configure ErrorEvents.
     * @see https://docs.microsoft.com/en-us/openspecs/ie_standards/ms-html5e/30b18240-7be6-4379-9e0a-262c99ed9529
     */
    initErrorEvent?
        (type: string, canBubble: boolean, cancelable: boolean, message: string,
         filename: string, lineno: number): void;
  }

  // eslint-disable-next-line no-var
  var ShadyDom: undefined|{
    inUse: boolean,
    nativeMethods: {querySelectorAll: typeof document.querySelectorAll}
  };
}

export declare interface HTMLImportElement extends HTMLLinkElement {
import?: Node;
}

export interface CustomElementDefinition {
  localName: string;
  constructorFunction: {new(): HTMLElement};
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  adoptedCallback?(): void;
  attributeChangedCallback?
      (name: string, oldValue?: string|null, newValue?: string|null,
       namespace?: string|null): void;
  observedAttributes: Array<string>;
  constructionStack: Array<HTMLElement|AlreadyConstructedMarkerType>;
}

export interface Constructor<T> {
  new(): T;
}
