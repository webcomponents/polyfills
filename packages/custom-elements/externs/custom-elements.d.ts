/**
 * @externs
 * @license
 * Copyright (c) 2021 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

interface CustomElementRegistry {
  forcePolyfill?: boolean;
  noDocumentConstructionObserver?: boolean;
  shadyDomFastWalk?: boolean;
  polyfillWrapFlushCallback?: (outer: (fn: () => void) => void) => void;
}

interface AlreadyConstructedMarkerType {
  _alreadyConstructedMarker: never;
}

interface CustomElementDefinition {
  localName: string;
  constructorFunction: Function;
  connectedCallback: Function;
  disconnectedCallback: Function;
  adoptedCallback: Function;
  attributeChangedCallback: Function;
  observedAttributes: Array<string>;
  constructionStack: Array<HTMLElement | AlreadyConstructedMarkerType>;
}

// These properties are defined in the externs so that they will not be
// renamed during minification.

// Used for both Documents and Nodes which represent documents in the HTML
// Imports polyfill.

interface Node {
  __CE_registry?: CustomElementRegistry;
  __CE_isImportDocument?: boolean;
  __CE_documentLoadHandled?: boolean;
  __CE_patched?: boolean;
  readyState: string;
}

interface Element {
  __CE_state?: number;
  __CE_definition?: CustomElementDefinition;
  __CE_shadowRoot?: DocumentFragment;
}

interface DocumentFragment {
  // Note, the closure type is incorrect here.
  children: HTMLCollection;
}

interface Error {
  // Non-standard Safari property.
  sourceURL?: string;
  // Non-standard Safari property.
  line?: number;
  // Non-standard Safari property.
  column?: number;
  // Non-standard Firefox property.
  columnNumber?: number;
}

interface ErrorEvent {
  // Used by IE to configure ErrorEvents.
  // https://docs.microsoft.com/en-us/openspecs/ie_standards/ms-html5e/30b18240-7be6-4379-9e0a-262c99ed9529
  initErrorEvent?: (
    typeArg: string,
    canBubbleArg: boolean,
    cancelableArg: boolean,
    messageArg: string,
    filenameArg: string,
    linenoArg: number
  ) => void;
}
