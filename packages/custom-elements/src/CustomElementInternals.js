/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import Native from './Patch/Native.js';
import * as Utilities from './Utilities.js';
import CustomElementRegistry from './CustomElementRegistry.js';
import CEState from './CustomElementState.js';

const NS_HTML = 'http://www.w3.org/1999/xhtml';

export default class CustomElementInternals {
  /**
   * @param {{
   *   shadyDomFastWalk: boolean,
   *   noDocumentConstructionObserver: boolean,
   * }} options
   */
  constructor(options) {
    /** @type {!Array<!function(!Node)>} */
    this._patchesNode = [];

    /** @type {!Array<!function(!Element)>} */
    this._patchesElement = [];

    /** @type {boolean} */
    this._hasPatches = false;

    /** @const {boolean} */
    this.shadyDomFastWalk = options.shadyDomFastWalk;

    /** @const {boolean} */
    this.useDocumentConstructionObserver = !options.noDocumentConstructionObserver;
  }

  /**
   * @param {!Node} node
   * @param {!function(!Element)} callback
   * @param {!Set<!Node>=} visitedImports
   */
  forEachElement(node, callback, visitedImports) {
    const sd = window['ShadyDOM'];
    if (this.shadyDomFastWalk && sd && sd['inUse']) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = /** @type {!Element} */(node);
        callback(element);
      }
      // most easily gets to document, element, documentFragment
      if (node.querySelectorAll) {
        const elements = sd['nativeMethods'].querySelectorAll.call(node, '*');
        for (let i = 0; i < elements.length; i++) {
          callback(elements[i]);
        }
      }
    } else {
      Utilities.walkDeepDescendantElements(node, callback, visitedImports);
    }
  }

  /**
   * @param {!function(!Node)} patch
   */
  addNodePatch(patch) {
    this._hasPatches = true;
    this._patchesNode.push(patch);
  }

  /**
   * @param {!function(!Element)} patch
   */
  addElementPatch(patch) {
    this._hasPatches = true;
    this._patchesElement.push(patch);
  }

  /**
   * @param {!Node} node
   */
  patchTree(node) {
    if (!this._hasPatches) return;

    this.forEachElement(node, element => this.patchElement(element));
  }

  /**
   * @param {!Node} node
   */
  patchNode(node) {
    if (!this._hasPatches) return;

    if (node.__CE_patched) return;
    node.__CE_patched = true;

    for (let i = 0; i < this._patchesNode.length; i++) {
      this._patchesNode[i](node);
    }
  }

  /**
   * @param {!Element} element
   */
  patchElement(element) {
    if (!this._hasPatches) return;

    if (element.__CE_patched) return;
    element.__CE_patched = true;

    for (let i = 0; i < this._patchesNode.length; i++) {
      this._patchesNode[i](element);
    }

    for (let i = 0; i < this._patchesElement.length; i++) {
      this._patchesElement[i](element);
    }
  }

  /**
   * @param {!Node} root
   */
  connectTree(root) {
    const elements = [];

    this.forEachElement(root, element => elements.push(element));

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.__CE_state === CEState.custom) {
        this.connectedCallback(element);
      } else {
        this.upgradeReaction(element);
      }
    }
  }

  /**
   * @param {!Node} root
   */
  disconnectTree(root) {
    const elements = [];

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
   * NOTE: This function, when used to simulate the construction of a tree that
   * is already created but not customized (i.e. by the parser), does *not*
   * prevent the element from reading the 'final' (true) state of the tree. For
   * example, the element, during truly synchronous parsing / construction would
   * see that it contains no children as they have not yet been inserted.
   * However, this function does not modify the tree, the element will
   * (incorrectly) have children. Additionally, self-modification restrictions
   * for custom element constructors imposed by the DOM spec are *not* enforced.
   *
   *
   * The following nested list shows the steps extending down from the HTML
   * spec's parsing section that cause elements to be synchronously created and
   * upgraded:
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
   *
   * @param {!Node} root
   * @param {{
   *   visitedImports: (!Set<!Node>|undefined),
   *   upgrade: (!function(!Element)|undefined),
   * }=} options
   */
  patchAndUpgradeTree(root, options = {}) {
    const visitedImports = options.visitedImports;
    const upgrade = options.upgrade || (element => this.upgradeReaction(element));

    const elements = [];

    const gatherElements = element => {
      if (this._hasPatches) {
        this.patchElement(element);
      }
      if (element.localName === 'link' &&
          element.getAttribute('rel') === 'import') {
        // The HTML Imports polyfill sets a descendant element of the link to
        // the `import` property, specifically this is *not* a Document.
        const importNode = /** @type {?Node} */ (element.import);

        if (importNode instanceof Node) {
          importNode.__CE_isImportDocument = true;
          // Connected links are associated with the global registry.
          importNode.__CE_registry = document.__CE_registry;
        }

        if (importNode && importNode.readyState === 'complete') {
          importNode.__CE_documentLoadHandled = true;
        } else {
          // If this link's import root is not available, its contents can't be
          // walked. Wait for 'load' and walk it when it's ready.
          element.addEventListener('load', () => {
            const importNode = /** @type {!Node} */ (element.import);

            if (importNode.__CE_documentLoadHandled) return;
            importNode.__CE_documentLoadHandled = true;

            // Clone the `visitedImports` set that was populated sync during
            // the `patchAndUpgradeTree` call that caused this 'load' handler to
            // be added. Then, remove *this* link's import node so that we can
            // walk that import again, even if it was partially walked later
            // during the same `patchAndUpgradeTree` call.
            const clonedVisitedImports = new Set();
            if (visitedImports) {
              // IE11 does not support constructing a set using an iterable.
              visitedImports.forEach(item => clonedVisitedImports.add(item));
              clonedVisitedImports.delete(importNode);
            }
            this.patchAndUpgradeTree(importNode, {visitedImports: clonedVisitedImports, upgrade});
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
      upgrade(elements[i]);
    }
  }

  /**
   * @param {!HTMLElement} element
   */
  upgradeReaction(element) {
    try {
      const definition = this._lookupACustomElementDefinition(
          /** @type {!Document} */ (element.ownerDocument), element.localName);
      if (definition) {
        this._upgradeAnElement(element, definition);
      }
    } catch (e) {
      this.reportTheException(e);
    }
  }

  /**
   * @private
   * @param {!HTMLElement} element
   * @param {!CustomElementDefinition} definition
   * @see https://html.spec.whatwg.org/multipage/custom-elements.html#concept-upgrade-an-element
   */
  _upgradeAnElement(element, definition) {
    const currentState = element.__CE_state;
    if (currentState !== undefined) return;

    definition.constructionStack.push(element);

    try {
      try {
        let result = new (definition.constructorFunction)();
        if (result !== element) {
          throw new Error('The custom element constructor did not produce the element being upgraded.');
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

  /**
   * @param {!Element} element
   */
  connectedCallback(element) {
    const definition = element.__CE_definition;
    if (definition.connectedCallback) {
      try {
        definition.connectedCallback.call(element);
      } catch (e) {
        this.reportTheException(e);
      }
    }
  }

  /**
   * @param {!Element} element
   */
  disconnectedCallback(element) {
    const definition = element.__CE_definition;
    if (definition.disconnectedCallback) {
      try {
        definition.disconnectedCallback.call(element);
      } catch (e) {
        this.reportTheException(e);
      }
    }
  }

  /**
   * @param {!Element} element
   * @param {string} name
   * @param {?string} oldValue
   * @param {?string} newValue
   * @param {?string} namespace
   */
  attributeChangedCallback(element, name, oldValue, newValue, namespace) {
    const definition = element.__CE_definition;
    if (
      definition.attributeChangedCallback &&
      definition.observedAttributes.indexOf(name) > -1
    ) {
      try {
        definition.attributeChangedCallback.call(element, name, oldValue, newValue, namespace);
      } catch (e) {
        this.reportTheException(e);
      }
    }
  }

  /**
   * Runs HTML's 'look up a custom element definition', excluding the namespace
   * check.
   *
   * @private
   * @param {!Document} doc
   * @param {string} localName
   * @return {!CustomElementDefinition|undefined}
   * @see https://html.spec.whatwg.org/multipage/custom-elements.html#look-up-a-custom-element-definition
   */
  _lookupACustomElementDefinition(doc, localName) {
    // The document must be associated with a registry.
    const registry =
        /** @type {!CustomElementRegistry|undefined} */ (doc.__CE_registry);
    if (!registry) return;

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
    if (!doc.defaultView && !doc.__CE_isImportDocument) return;

    return registry.internal_localNameToDefinition(localName);
  }

  /**
   * Runs the DOM's 'create an element'. If namespace is not null, then the
   * native `createElementNS` is used. Otherwise, `createElement` is used.
   *
   * Note, the template polyfill only wraps `createElement`, preventing this
   * function from using `createElementNS` in all cases.
   *
   * @param {!Document} doc
   * @param {string} localName
   * @param {string|null} namespace
   * @return {!Element}
   * @see https://dom.spec.whatwg.org/#concept-create-element
   */
  createAnElement(doc, localName, namespace) {
    const registry =
        /** @type {!CustomElementRegistry|undefined} */ (doc.__CE_registry);
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
            throw new Error('Failed to construct \'' + localName + '\': ' +
                'The returned value was not constructed with the HTMLElement ' +
                'constructor.');
          }

          if (result.namespaceURI !== NS_HTML) {
            throw new Error('Failed to construct \'' + localName + '\': ' +
                'The constructed element\'s namespace must be the HTML ' +
                'namespace.');
          }

          // The following Errors should be DOMExceptions but DOMException
          // isn't constructible in all browsers.

          if (result.hasAttributes()) {
            throw new Error('Failed to construct \'' + localName + '\': ' +
                'The constructed element must not have any attributes.');
          }

          // ShadyDOM doesn't wrap `#hasChildNodes`, so we check `#firstChild`
          // instead.
          if (result.firstChild !== null) {
            throw new Error('Failed to construct \'' + localName + '\': ' +
                'The constructed element must not have any children.');
          }

          if (result.parentNode !== null) {
            throw new Error('Failed to construct \'' + localName + '\': ' +
                'The constructed element must not have a parent node.');
          }

          if (result.ownerDocument !== doc) {
            throw new Error('Failed to construct \'' + localName + '\': ' +
                'The constructed element\'s owner document is incorrect.');
          }

          if (result.localName !== localName) {
            throw new Error('Failed to construct \'' + localName + '\': ' +
                'The constructed element\'s local name is incorrect.');
          }

          return result;
        } catch (e) {
          this.reportTheException(e);

          // When construction fails, a new HTMLUnknownElement is produced.
          // However, there's no direct way to create one, so we create a
          // regular HTMLElement and replace its prototype.
          const result = /** @type {!Element} */ (namespace === null ?
              Native.Document_createElement.call(doc, localName) :
              Native.Document_createElementNS.call(doc, namespace, localName));
          Object.setPrototypeOf(result, HTMLUnknownElement.prototype);
          result.__CE_state = CEState.failed;
          result.__CE_definition = undefined;
          this.patchElement(result);
          return result;
        }
      }
    }

    const result = /** @type {!Element} */ (namespace === null ?
        Native.Document_createElement.call(doc, localName) :
        Native.Document_createElementNS.call(doc, namespace, localName));
    this.patchElement(result);
    return result;
  }

  /**
   * Runs the DOM's 'report the exception' algorithm.
   *
   * @param {!Error} error
   * @see https://html.spec.whatwg.org/multipage/webappapis.html#report-the-exception
   */
  reportTheException(error) {
    const message = error.message;
    /** @type {string} */
    const filename =
        /* Safari */ error.sourceURL || /* Firefox */ error.fileName || "";
    /** @type {number} */
    const lineno =
        /* Safari */ error.line || /* Firefox */ error.lineNumber || 0;
    /** @type {number} */
    const colno =
        /* Safari */ error.column || /* Firefox */ error.columnNumber || 0;

    /** @type {!ErrorEvent|undefined} */
    let event = undefined;
    if (ErrorEvent.prototype.initErrorEvent === undefined) {
      event = new ErrorEvent('error',
          {cancelable: true, message, filename, lineno, colno, error});
    } else {
      event = /** @type {!ErrorEvent} */ (document.createEvent('ErrorEvent'));
      // initErrorEvent(type, bubbles, cancelable, message, filename, line)
      event.initErrorEvent('error', false, true, message, filename, lineno);
      // Hack for IE, where ErrorEvent#preventDefault does not set
      // #defaultPrevented to true.
      /** @this {!ErrorEvent} */
      event.preventDefault = function() {
        Object.defineProperty(this, 'defaultPrevented', {
          configurable: true,
          get: function() { return true; },
        });
      };
    }

    if (event.error === undefined) {
      Object.defineProperty(event, 'error', {
        configurable: true,
        enumerable: true,
        get: function() { return error; },
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
