/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

import './Externs.js';
import {CustomElementState as CEState} from './CustomElementState.js';
import {CustomElementDefinition, HTMLImportElement} from './Externs.js';
import * as Native from './Patch/Native.js';
import * as Utilities from './Utilities.js';

const NS_HTML = 'http://www.w3.org/1999/xhtml';

export default class CustomElementInternals {
  private readonly _patchesNode: Array<(node: Node) => void> = [];
  private readonly _patchesElement: Array<(elem: Element) => void> = [];
  private _hasPatches = false;
  public readonly shadyDomFastWalk: boolean;
  public readonly useDocumentConstructionObserver: boolean;

  constructor(options: {
    shadyDomFastWalk: boolean,
    noDocumentConstructionObserver: boolean
  }) {
    this.shadyDomFastWalk = options.shadyDomFastWalk;
    this.useDocumentConstructionObserver =
        !options.noDocumentConstructionObserver;
  }

  forEachElement(
      node: Node, callback: (elem: Element) => void,
      visitedImports?: Set<Node>) {
    const sd = window['ShadyDom'];
    if (this.shadyDomFastWalk && sd && sd['inUse']) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        callback(element);
      }
      // most easily gets to document, element, documentFragment
      if ((node as Element).querySelectorAll!) {
        const elements = sd['nativeMethods'].querySelectorAll.call(node, '*');
        for (let i = 0; i < elements.length; i++) {
          callback(elements[i]);
        }
      }
    } else {
      Utilities.walkDeepDescendantElements(node, callback, visitedImports);
    }
  }

  addNodePatch(patch: (node: Node) => void) {
    this._hasPatches = true;
    this._patchesNode.push(patch);
  }

  addElementPatch(patch: (element: Element) => void) {
    this._hasPatches = true;
    this._patchesElement.push(patch);
  }

  patchTree(node: Node) {
    if (!this._hasPatches) {
      return;
    }

    this.forEachElement(node, element => this.patchElement(element));
  }

  patchNode(node: Node) {
    if (!this._hasPatches) {
      return;
    }

    if (node.__CE_patched) {
      return;
    }
    node.__CE_patched = true;

    for (let i = 0; i < this._patchesNode.length; i++) {
      this._patchesNode[i](node);
    }
  }

  patchElement(element: Element) {
    if (!this._hasPatches) {
      return;
    }

    if (element.__CE_patched) {
      return;
    }
    element.__CE_patched = true;

    for (let i = 0; i < this._patchesNode.length; i++) {
      this._patchesNode[i](element);
    }

    for (let i = 0; i < this._patchesElement.length; i++) {
      this._patchesElement[i](element);
    }
  }

  connectTree(root: Node) {
    const elements: Array<Element> = [];

    this.forEachElement(root, element => elements.push(element));

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.__CE_state === CEState.custom) {
        this.connectedCallback(element);
      } else {
        this.upgradeReaction(element as HTMLElement);
      }
    }
  }

  disconnectTree(root: Node) {
    const elements: Array<Element> = [];

    this.forEachElement(root, element => elements.push(element));

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.__CE_state === CEState.custom) {
        this.disconnectedCallback(element);
      }
    }
  }

  /**
   * Upgrades all uncustomized custom elements at and below a root node for
   * which there is a definition. When custom element reaction callbacks are
   * assumed to be called synchronously (which, by the current DOM / HTML spec
   * definitions, they are *not*), callbacks for both elements customized
   * synchronously by the parser and elements being upgraded occur in the same
   * relative order.
   *
   * NOTE: This function, when used to simulate the construction of a tree
   * that is already created but not customized (i.e. by the parser), does
   * *not* prevent the element from reading the 'final' (true) state of the
   * tree. For example, the element, during truly synchronous parsing /
   * construction would see that it contains no children as they have not yet
   * been inserted. However, this function does not modify the tree, the
   * element will (incorrectly) have children. Additionally, self-modification
   * restrictions for custom element constructors imposed by the DOM spec are
   * *not* enforced.
   *
   *
   * The following nested list shows the steps extending down from the HTML
   * spec's parsing section that cause elements to be synchronously created
   * and upgraded:
   *
   * The "in body" insertion mode:
   * https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
   * - Switch on token:
   *   .. other cases ..
   *   -> Any other start tag
   *      - [Insert an HTML element](below) for the token.
   *
   * Insert an HTML element:
   * https://html.spec.whatwg.org/multipage/syntax.html#insert-an-html-element
   * - Insert a foreign element for the token in the HTML namespace:
   *   https://html.spec.whatwg.org/multipage/syntax.html#insert-a-foreign-element
   *   - Create an element for a token:
   *     https://html.spec.whatwg.org/multipage/syntax.html#create-an-element-for-the-token
   *     - Will execute script flag is true?
   *       - (Element queue pushed to the custom element reactions stack.)
   *     - Create an element:
   *       https://dom.spec.whatwg.org/#concept-create-element
   *       - Sync CE flag is true?
   *         - Constructor called.
   *         - Self-modification restrictions enforced.
   *       - Sync CE flag is false?
   *         - (Upgrade reaction enqueued.)
   *     - Attributes appended to element.
   *       (`attributeChangedCallback` reactions enqueued.)
   *     - Will execute script flag is true?
   *       - (Element queue popped from the custom element reactions stack.
   *         Reactions in the popped stack are invoked.)
   *   - (Element queue pushed to the custom element reactions stack.)
   *   - Insert the element:
   *     https://dom.spec.whatwg.org/#concept-node-insert
   *     - Shadow-including descendants are connected. During parsing
   *       construction, there are no shadow-*excluding* descendants.
   *       However, the constructor may have validly attached a shadow
   *       tree to itself and added descendants to that shadow tree.
   *       (`connectedCallback` reactions enqueued.)
   *   - (Element queue popped from the custom element reactions stack.
   *     Reactions in the popped stack are invoked.)
   */
  patchAndUpgradeTree(root: Node, options: {
    visitedImports?: Set<Node>,
    upgrade?: (elem: HTMLElement) => void
  } = {}) {
    const visitedImports = options.visitedImports;
    const upgrade =
        options.upgrade || (element => this.upgradeReaction(element));

    const elements: Array<Element> = [];

    const gatherElements = (element: Element) => {
      if (this._hasPatches) {
        this.patchElement(element);
      }
      if (element.localName === 'link' &&
          element.getAttribute('rel') === 'import') {
        const importElem = element as HTMLImportElement;
        // The HTML Imports polyfill sets a descendant element of the link to
        // the `import` property, specifically this is *not* a Document.
        const importNode = importElem.import;

        if (importNode instanceof Node) {
          importNode.__CE_isImportDocument = true;
          // Connected links are associated with the global registry.
          importNode.__CE_registry = document.__CE_registry;
        }



        if (importNode &&
            (importNode as HTMLImportDocument).readyState === 'complete') {
          importNode.__CE_documentLoadHandled = true;
        } else {
          // If this link's import root is not available, its contents can't
          // be walked. Wait for 'load' and walk it when it's ready.
          element.addEventListener('load', () => {
            const importNode = importElem.import!;

            if (importNode.__CE_documentLoadHandled) {
              return;
            }
            importNode.__CE_documentLoadHandled = true;

            // Clone the `visitedImports` set that was populated sync during
            // the `patchAndUpgradeTree` call that caused this 'load' handler
            // to be added. Then, remove *this* link's import node so that we
            // can walk that import again, even if it was partially walked
            // later during the same `patchAndUpgradeTree` call.
            const clonedVisitedImports = new Set<Node>();
            if (visitedImports) {
              // IE11 does not support constructing a set using an iterable.
              visitedImports.forEach(item => clonedVisitedImports.add(item));
              clonedVisitedImports.delete(importNode);
            }
            this.patchAndUpgradeTree(
                importNode, {visitedImports: clonedVisitedImports, upgrade});
          });
        }
      } else {
        elements.push(element);
      }
    };

    // `forEachElement` populates (and internally checks against)
    // `visitedImports` when traversing a loaded import.
    this.forEachElement(root, gatherElements, visitedImports);

    for (let i = 0; i < elements.length; i++) {
      upgrade(elements[i] as HTMLElement);
    }
  }

  upgradeReaction(element: HTMLElement) {
    try {
      const definition = this._lookupACustomElementDefinition(
          element.ownerDocument!, element.localName);
      if (definition) {
        this._upgradeAnElement(element, definition);
      }
    } catch (e) {
      this.reportTheException(e);
    }
  }

  /**
   * @see https://html.spec.whatwg.org/multipage/custom-elements.html#concept-upgrade-an-element
   */
  private _upgradeAnElement(
      element: HTMLElement, definition: CustomElementDefinition) {
    const currentState = element.__CE_state;
    if (currentState !== undefined) {
      return;
    }

    definition.constructionStack.push(element);

    try {
      try {
        const result = new (definition.constructorFunction)();
        if (result !== element) {
          throw new Error(
              'The custom element constructor did not produce the element being upgraded.');
        }
      } finally {
        definition.constructionStack.pop();
      }
    } catch (e) {
      element.__CE_state = CEState.failed;
      throw e;
    }

    element.__CE_state = CEState.custom;
    element.__CE_definition = definition;

    // Check `hasAttributes` here to avoid iterating when it's not necessary.
    if (definition.attributeChangedCallback && element.hasAttributes()) {
      const observedAttributes = definition.observedAttributes;
      for (let i = 0; i < observedAttributes.length; i++) {
        const name = observedAttributes[i];
        const value = element.getAttribute(name);
        if (value !== null) {
          this.attributeChangedCallback(element, name, null, value, null);
        }
      }
    }

    if (Utilities.isConnected(element)) {
      this.connectedCallback(element);
    }
  }

  connectedCallback(element: Element) {
    const definition = element.__CE_definition!;
    if (definition.connectedCallback) {
      try {
        definition.connectedCallback.call(element);
      } catch (e) {
        this.reportTheException(e);
      }
    }
  }

  disconnectedCallback(element: Element) {
    const definition = element.__CE_definition!;
    if (definition.disconnectedCallback) {
      try {
        definition.disconnectedCallback.call(element);
      } catch (e) {
        this.reportTheException(e);
      }
    }
  }

  attributeChangedCallback(
      element: Element, name: string, oldValue?: string|null,
      newValue?: string|null, namespace?: string|null) {
    const definition = element.__CE_definition!;
    if (definition.attributeChangedCallback &&
        definition.observedAttributes.indexOf(name) > -1) {
      try {
        definition.attributeChangedCallback.call(
            element, name, oldValue, newValue, namespace);
      } catch (e) {
        this.reportTheException(e);
      }
    }
  }

  /**
   * Runs HTML's 'look up a custom element definition', excluding the namespace
   * check.
   *
   * @see https://html.spec.whatwg.org/multipage/custom-elements.html#look-up-a-custom-element-definition
   */
  private _lookupACustomElementDefinition(doc: Document, localName: string):
      CustomElementDefinition|undefined {
    // The document must be associated with a registry.
    const registry = doc.__CE_registry;
    if (!registry) {
      return;
    }

    // Prevent elements created in documents without a browsing context from
    // upgrading.
    //
    // https://html.spec.whatwg.org/multipage/custom-elements.html#look-up-a-custom-element-definition
    //   "If document does not have a browsing context, return null."
    //
    // https://html.spec.whatwg.org/multipage/window-object.html#dom-document-defaultview
    //   "The defaultView IDL attribute of the Document interface, on getting,
    //   must return this Document's browsing context's WindowProxy object, if
    //   this Document has an associated browsing context, or null otherwise."
    if (!doc.defaultView && !doc.__CE_isImportDocument) {
      return;
    }

    return registry.internal_localNameToDefinition(localName);
  }

  /**
   * Runs the DOM's 'create an element'. If namespace is not null, then the
   * native `createElementNS` is used. Otherwise, `createElement` is used.
   *
   * Note, the template polyfill only wraps `createElement`, preventing this
   * function from using `createElementNS` in all cases.
   *
   * @see https://dom.spec.whatwg.org/#concept-create-element
   */
  createAnElement(doc: Document, localName: string, namespace: string|null):
      Element {
    const registry = doc.__CE_registry;
    // Only create custom elements if the document is associated with a
    // registry.
    if (registry && (namespace === null || namespace === NS_HTML)) {
      const definition = registry.internal_localNameToDefinition(localName);
      if (definition) {
        try {
          const result = new (definition.constructorFunction)();

          // These conformance checks can't be performed when the user calls
          // the element's constructor themselves. However, this also true in
          // native implementations.

          if (result.__CE_state === undefined ||
              result.__CE_definition === undefined) {
            throw new Error(
                'Failed to construct \'' + localName + '\': ' +
                'The returned value was not constructed with the HTMLElement ' +
                'constructor.');
          }

          if (result.namespaceURI !== NS_HTML) {
            throw new Error(
                'Failed to construct \'' + localName + '\': ' +
                'The constructed element\'s namespace must be the HTML ' +
                'namespace.');
          }

          // The following Errors should be DOMExceptions but DOMException
          // isn't constructible in all browsers.

          if (result.hasAttributes()) {
            throw new Error(
                'Failed to construct \'' + localName + '\': ' +
                'The constructed element must not have any attributes.');
          }

          // ShadyDOM doesn't wrap `#hasChildNodes`, so we check `#firstChild`
          // instead.
          if (result.firstChild !== null) {
            throw new Error(
                'Failed to construct \'' + localName + '\': ' +
                'The constructed element must not have any children.');
          }

          if (result.parentNode !== null) {
            throw new Error(
                'Failed to construct \'' + localName + '\': ' +
                'The constructed element must not have a parent node.');
          }

          if (result.ownerDocument !== doc) {
            throw new Error(
                'Failed to construct \'' + localName + '\': ' +
                'The constructed element\'s owner document is incorrect.');
          }

          if (result.localName !== localName) {
            throw new Error(
                'Failed to construct \'' + localName + '\': ' +
                'The constructed element\'s local name is incorrect.');
          }

          return result;
        } catch (e) {
          this.reportTheException(e);

          // When construction fails, a new HTMLUnknownElement is produced.
          // However, there's no direct way to create one, so we create a
          // regular HTMLElement and replace its prototype.
          const result = namespace === null ?
              Native.Document_createElement.call(doc, localName) :
              Native.Document_createElementNS.call(doc, namespace, localName);
          Object.setPrototypeOf(result, HTMLUnknownElement.prototype);
          result.__CE_state = CEState.failed;
          result.__CE_definition = undefined;
          this.patchElement(result);
          return result;
        }
      }
    }

    const result = namespace === null ?
        Native.Document_createElement.call(doc, localName) :
        Native.Document_createElementNS.call(doc, namespace, localName);
    this.patchElement(result);
    return result;
  }

  /**
   * Runs the DOM's 'report the exception' algorithm.
   *
   * @see https://html.spec.whatwg.org/multipage/webappapis.html#report-the-exception
   */
  reportTheException(error: Error) {
    const message = error.message;
    const filename =
        /* Safari */ error.sourceURL || /* Firefox */ error.fileName || '';
    const lineno =
        /* Safari */ error.line || /* Firefox */ error.lineNumber || 0;
    const colno =
        /* Safari */ error.column || /* Firefox */ error.columnNumber || 0;

    let event: ErrorEvent|undefined = undefined;
    if (ErrorEvent.prototype.initErrorEvent === undefined) {
      event = new ErrorEvent(
          'error', {cancelable: true, message, filename, lineno, colno, error});
    } else {
      event = document.createEvent('ErrorEvent') as ErrorEvent;
      // initErrorEvent(type, bubbles, cancelable, message, filename, line)
      event.initErrorEvent!('error', false, true, message, filename, lineno);
      // Hack for IE, where ErrorEvent#preventDefault does not set
      // #defaultPrevented to true.
      event.preventDefault = function(this: ErrorEvent) {
        Object.defineProperty(this, 'defaultPrevented', {
          configurable: true,
          get: function(this: ErrorEvent) {
            return true;
          },
        });
      };
    }

    if (event.error === undefined) {
      Object.defineProperty(event, 'error', {
        configurable: true,
        enumerable: true,
        get: function() {
          return error;
        },
      });
    }

    window.dispatchEvent(event);
    if (!event.defaultPrevented) {
      // In 'report the exception', UAs may optionally write errors to the
      // console if their associated ErrorEvent isn't handled during dispatch
      // (indicated by calling `preventDefault`). In practice, these errors are
      // always displayed.
      console.error(error);
    }
  }
}

declare interface HTMLImportDocument extends Node {
  readyState: 'complete'|string;
}
