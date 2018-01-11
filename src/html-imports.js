/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
(scope => {

  /********************* base setup *********************/
  const link = document.createElement('link');
  const useNative = Boolean('import' in link);
  const emptyNodeList = link.querySelectorAll('*');

  // Polyfill `currentScript` for browsers without it.
  let currentScript = null;
  if ('currentScript' in document === false) {
    Object.defineProperty(document, 'currentScript', {
      get() {
        return currentScript ||
          // NOTE: only works when called in synchronously executing code.
          // readyState should check if `loading` but IE10 is
          // interactive when scripts run so we cheat. This is not needed by
          // html-imports polyfill but helps generally polyfill `currentScript`.
          (document.readyState !== 'complete' ?
            document.scripts[document.scripts.length - 1] : null);
      },
      configurable: true
    });
  }

  /**
   * @param {Array|NodeList|NamedNodeMap} list
   * @param {!Function} callback
   * @param {boolean=} inverseOrder
   */
  const forEach = (list, callback, inverseOrder) => {
    const length = list ? list.length : 0;
    const increment = inverseOrder ? -1 : 1;
    let i = inverseOrder ? length - 1 : 0;
    for (; i < length && i >= 0; i = i + increment) {
      callback(list[i], i);
    }
  };

  /**
   * @param {!Node} node
   * @param {!string} selector
   * @return {!NodeList<!Element>}
   */
  const QSA = (node, selector) => {
    // IE 11 throws a SyntaxError if a node with no children is queried with
    // a selector containing the `:not([type])` syntax.
    if (!node.childNodes.length) {
      return emptyNodeList;
    }
    return node.querySelectorAll(selector);
  };

  /**
   * @param {!DocumentFragment} fragment
   */
  const replaceScripts = (fragment) => {
    forEach(QSA(fragment, 'template'), template => {
      forEach(QSA(template.content, scriptsSelector), script => {
        const clone = /** @type {!HTMLScriptElement} */
          (document.createElement('script'));
        forEach(script.attributes, attr => clone.setAttribute(attr.name, attr.value));
        clone.textContent = script.textContent;
        script.parentNode.replaceChild(clone, script);
      });
      replaceScripts(template.content);
    });
  };

  /********************* path fixup *********************/
  const CSS_URL_REGEXP = /(url\()([^)]*)(\))/g;
  const CSS_IMPORT_REGEXP = /(@import[\s]+(?!url\())([^;]*)(;)/g;
  const STYLESHEET_REGEXP = /(<link[^>]*)(rel=['|"]?stylesheet['|"]?[^>]*>)/g;

  // path fixup: style elements in imports must be made relative to the main
  // document. We fixup url's in url() and @import.
  const Path = {

    fixUrls(element, base) {
      if (element.href) {
        element.setAttribute('href',
          Path.resolveUrl(element.getAttribute('href'), base));
      }
      if (element.src) {
        element.setAttribute('src',
          Path.resolveUrl(element.getAttribute('src'), base));
      }
      if (element.localName === 'style') {
        const r = Path.replaceUrls(element.textContent, base, CSS_URL_REGEXP);
        element.textContent = Path.replaceUrls(r, base, CSS_IMPORT_REGEXP);
      }
    },

    replaceUrls(text, linkUrl, regexp) {
      return text.replace(regexp, (m, pre, url, post) => {
        let urlPath = url.replace(/["']/g, '');
        if (linkUrl) {
          urlPath = Path.resolveUrl(urlPath, linkUrl);
        }
        return pre + '\'' + urlPath + '\'' + post;
      });
    },

    resolveUrl(url, base) {
      // Lazy feature detection.
      if (Path.__workingURL === undefined) {
        Path.__workingURL = false;
        try {
          const u = new URL('b', 'http://a');
          u.pathname = 'c%20d';
          Path.__workingURL = (u.href === 'http://a/c%20d');
        } catch (e) {}
      }

      if (Path.__workingURL) {
        return (new URL(url, base)).href;
      }

      // Fallback to creating an anchor into a disconnected document.
      let doc = Path.__tempDoc;
      if (!doc) {
        doc = document.implementation.createHTMLDocument('temp');
        Path.__tempDoc = doc;
        doc.__base = doc.createElement('base');
        doc.head.appendChild(doc.__base);
        doc.__anchor = doc.createElement('a');
      }
      doc.__base.href = base;
      doc.__anchor.href = url;
      return doc.__anchor.href || url;
    }
  };

  /********************* Xhr processor *********************/
  const Xhr = {

    async: true,

    /**
     * @param {!string} url
     * @param {!function(!string, string=)} success
     * @param {!function(!string)} fail
     */
    load(url, success, fail) {
      if (!url) {
        fail('error: href must be specified');
      } else if (url.match(/^data:/)) {
        // Handle Data URI Scheme
        const pieces = url.split(',');
        const header = pieces[0];
        let resource = pieces[1];
        if (header.indexOf(';base64') > -1) {
          resource = atob(resource);
        } else {
          resource = decodeURIComponent(resource);
        }
        success(resource);
      } else {
        const request = new XMLHttpRequest();
        request.open('GET', url, Xhr.async);
        request.onload = () => {
          // Servers redirecting an import can add a Location header to help us
          // polyfill correctly. Handle relative and full paths.
          // Prefer responseURL which already resolves redirects
          // https://xhr.spec.whatwg.org/#the-responseurl-attribute
          let redirectedUrl = request.responseURL || request.getResponseHeader('Location');
          if (redirectedUrl && redirectedUrl.indexOf('/') === 0) {
            // In IE location.origin might not work
            // https://connect.microsoft.com/IE/feedback/details/1763802/location-origin-is-undefined-in-ie-11-on-windows-10-but-works-on-windows-7
            const origin = (location.origin || location.protocol + '//' + location.host);
            redirectedUrl = origin + redirectedUrl;
          }
          const resource = /** @type {string} */ (request.response || request.responseText);
          if (request.status === 304 || request.status === 0 ||
            request.status >= 200 && request.status < 300) {
            success(resource, redirectedUrl);
          } else {
            fail(resource);
          }
        };
        request.send();
      }
    }
  };

  /********************* importer *********************/

  const isIE = /Trident/.test(navigator.userAgent) ||
    /Edge\/\d./i.test(navigator.userAgent);

  const importSelector = 'link[rel=import]';

  // Used to disable loading of resources.
  const importDisableType = 'import-disable';

  const disabledLinkSelector = `link[rel=stylesheet][href][type=${importDisableType}]`;

  const scriptsSelector = `script:not([type]),script[type="application/javascript"],` +
    `script[type="text/javascript"]`;

  const importDependenciesSelector = `${importSelector},${disabledLinkSelector},` +
    `style:not([type]),link[rel=stylesheet][href]:not([type]),` + scriptsSelector;

  const importDependencyAttr = 'import-dependency';

  const rootImportSelector = `${importSelector}:not([${importDependencyAttr}])`;

  const pendingScriptsSelector = `script[${importDependencyAttr}]`;

  const pendingStylesSelector = `style[${importDependencyAttr}],` +
    `link[rel=stylesheet][${importDependencyAttr}]`;

  /**
   * Importer will:
   * - load any linked import documents (with deduping)
   * - whenever an import is loaded, prompt the parser to try to parse
   * - observe imported documents for new elements (these are handled via the
   *   dynamic importer)
   */
  class Importer {
    constructor() {
      this.documents = {};
      // Used to keep track of pending loads, so that flattening and firing of
      // events can be done when all resources are ready.
      this.inflight = 0;
      this.dynamicImportsMO = new MutationObserver(m => this.handleMutations(m));
      // Observe changes on <head>.
      this.dynamicImportsMO.observe(document.head, {
        childList: true,
        subtree: true
      });
      // 1. Load imports contents
      // 2. Assign them to first import links on the document
      // 3. Wait for import styles & scripts to be done loading/running
      // 4. Fire load/error events
      this.loadImports(document);
    }

    /**
     * @param {!(HTMLDocument|DocumentFragment|Element)} doc
     */
    loadImports(doc) {
      const links = /** @type {!NodeList<!HTMLLinkElement>} */
        (QSA(doc, importSelector));
      forEach(links, link => this.loadImport(link));
    }

    /**
     * @param {!HTMLLinkElement} link
     */
    loadImport(link) {
      const url = link.href;
      // This resource is already being handled by another import.
      if (this.documents[url] !== undefined) {
        // If import is already loaded, we can safely associate it to the link
        // and fire the load/error event.
        const imp = this.documents[url];
        if (imp && imp['__loaded']) {
          link['__import'] = imp;
          this.fireEventIfNeeded(link);
        }
        return;
      }
      this.inflight++;
      // Mark it as pending to notify others this url is being loaded.
      this.documents[url] = 'pending';
      Xhr.load(url, (resource, redirectedUrl) => {
        const doc = this.makeDocument(resource, redirectedUrl || url);
        this.documents[url] = doc;
        this.inflight--;
        // Load subtree.
        this.loadImports(doc);
        this.processImportsIfLoadingDone();
      }, () => {
        // If load fails, handle error.
        this.documents[url] = null;
        this.inflight--;
        this.processImportsIfLoadingDone();
      });
    }

    /**
     * Creates a new document containing resource and normalizes urls accordingly.
     * @param {string=} resource
     * @param {string=} url
     * @return {!DocumentFragment}
     */
    makeDocument(resource, url) {
      if (!resource) {
        return document.createDocumentFragment();
      }

      if (isIE) {
        // <link rel=stylesheet> should be appended to <head>. Not doing so
        // in IE/Edge breaks the cascading order. We disable the loading by
        // setting the type before setting innerHTML to avoid loading
        // resources twice.
        resource = resource.replace(STYLESHEET_REGEXP, (match, p1, p2) => {
          if (match.indexOf('type=') === -1) {
            return `${p1} type=${importDisableType} ${p2}`;
          }
          return match;
        });
      }

      let content;
      const template = /** @type {!HTMLTemplateElement} */
        (document.createElement('template'));
      template.innerHTML = resource;
      if (template.content) {
        content = template.content;
        // Clone scripts inside templates since they won't execute when the
        // hosting template is cloned.
        replaceScripts(content);
      } else {
        // <template> not supported, create fragment and move content into it.
        content = document.createDocumentFragment();
        while (template.firstChild) {
          content.appendChild(template.firstChild);
        }
      }

      // Support <base> in imported docs. Resolve url and remove its href.
      const baseEl = content.querySelector('base');
      if (baseEl) {
        url = Path.resolveUrl(baseEl.getAttribute('href'), url);
        baseEl.removeAttribute('href');
      }

      const n$ = /** @type {!NodeList<!(HTMLLinkElement|HTMLScriptElement|HTMLStyleElement)>} */
        (QSA(content, importDependenciesSelector));
      // For source map hints.
      let inlineScriptIndex = 0;
      forEach(n$, n => {
        // Listen for load/error events, then fix urls.
        whenElementLoaded(n);
        Path.fixUrls(n, url);
        // Mark for easier selectors.
        n.setAttribute(importDependencyAttr, '');
        // Generate source map hints for inline scripts.
        if (n.localName === 'script' && !n.src && n.textContent) {
          const num = inlineScriptIndex ? `-${inlineScriptIndex}` : '';
          const content = n.textContent + `\n//# sourceURL=${url}${num}.js\n`;
          // We use the src attribute so it triggers load/error events, and it's
          // easier to capture errors (e.g. parsing) like this.
          n.setAttribute('src', 'data:text/javascript;charset=utf-8,' + encodeURIComponent(content));
          n.textContent = '';
          inlineScriptIndex++;
        }
      });
      return content;
    }

    /**
     * Waits for loaded imports to finish loading scripts and styles, then fires
     * the load/error events.
     */
    processImportsIfLoadingDone() {
      // Wait until all resources are ready, then load import resources.
      if (this.inflight) return;

      // Stop observing, flatten & load resource, then restart observing <head>.
      this.dynamicImportsMO.disconnect();
      this.flatten(document);
      // We wait for styles to load, and at the same time we execute the scripts,
      // then fire the load/error events for imports to have faster whenReady
      // callback execution.
      // NOTE: This is different for native behavior where scripts would be
      // executed after the styles before them are loaded.
      // To achieve that, we could select pending styles and scripts in the
      // document and execute them sequentially in their dom order.
      let scriptsOk = false,
        stylesOk = false;
      const onLoadingDone = () => {
        if (stylesOk && scriptsOk) {
          // Catch any imports that might have been added while we
          // weren't looking, wait for them as well.
          this.loadImports(document);
          if (this.inflight) return;

          // Restart observing.
          this.dynamicImportsMO.observe(document.head, {
            childList: true,
            subtree: true
          });
          this.fireEvents();
        }
      }
      this.waitForStyles(() => {
        stylesOk = true;
        onLoadingDone();
      });
      this.runScripts(() => {
        scriptsOk = true;
        onLoadingDone();
      });
    }

    /**
     * @param {!HTMLDocument} doc
     */
    flatten(doc) {
      const n$ = /** @type {!NodeList<!HTMLLinkElement>} */
        (QSA(doc, importSelector));
      forEach(n$, n => {
        const imp = this.documents[n.href];
        n['__import'] = /** @type {!Document} */ (imp);
        if (imp && imp.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          // We set the .import to be the link itself, and update its readyState.
          // Other links with the same href will point to this link.
          this.documents[n.href] = n;
          n.readyState = 'loading';
          n['__import'] = n;
          this.flatten(imp);
          n.appendChild(imp);
        }
      });
    }

    /**
     * Replaces all the imported scripts with a clone in order to execute them.
     * Updates the `currentScript`.
     * @param {!function()} callback
     */
    runScripts(callback) {
      const s$ = QSA(document, pendingScriptsSelector);
      const l = s$.length;
      const cloneScript = i => {
        if (i < l) {
          // The pending scripts have been generated through innerHTML and
          // browsers won't execute them for security reasons. We cannot use
          // s.cloneNode(true) either, the only way to run the script is manually
          // creating a new element and copying its attributes.
          const s = s$[i];
          const clone = /** @type {!HTMLScriptElement} */
            (document.createElement('script'));
          // Remove import-dependency attribute to avoid double cloning.
          s.removeAttribute(importDependencyAttr);
          forEach(s.attributes, attr => clone.setAttribute(attr.name, attr.value));
          // Update currentScript and replace original with clone script.
          currentScript = clone;
          s.parentNode.replaceChild(clone, s);
          whenElementLoaded(clone, () => {
            currentScript = null;
            cloneScript(i + 1);
          });
        } else {
          callback();
        }
      };
      cloneScript(0);
    }

    /**
     * Waits for all the imported stylesheets/styles to be loaded.
     * @param {!function()} callback
     */
    waitForStyles(callback) {
      const s$ = /** @type {!NodeList<!(HTMLLinkElement|HTMLStyleElement)>} */
        (QSA(document, pendingStylesSelector));
      let pending = s$.length;
      if (!pending) {
        callback();
        return;
      }
      // <link rel=stylesheet> should be appended to <head>. Not doing so
      // in IE/Edge breaks the cascading order
      // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10472273/
      // If there is one <link rel=stylesheet> imported, we must move all imported
      // links and styles to <head>.
      const needsMove = isIE && !!document.querySelector(disabledLinkSelector);
      forEach(s$, s => {
        // Listen for load/error events, remove selector once is done loading.
        whenElementLoaded(s, () => {
          s.removeAttribute(importDependencyAttr);
          if (--pending === 0) {
            callback();
          }
        });
        // Check if was already moved to head, to handle the case where the element
        // has already been moved but it is still loading.
        if (needsMove && s.parentNode !== document.head) {
          // Replace the element we're about to move with a placeholder.
          const placeholder = document.createElement(s.localName);
          // Add reference of the moved element.
          placeholder['__appliedElement'] = s;
          // Disable this from appearing in document.styleSheets.
          placeholder.setAttribute('type', 'import-placeholder');
          // Append placeholder next to the sibling, and move original to <head>.
          s.parentNode.insertBefore(placeholder, s.nextSibling);
          let newSibling = importForElement(s);
          while (newSibling && importForElement(newSibling)) {
            newSibling = importForElement(newSibling);
          }
          if (newSibling.parentNode !== document.head) {
            newSibling = null;
          }
          document.head.insertBefore(s, newSibling);
          // Enable the loading of <link rel=stylesheet>.
          s.removeAttribute('type');
        }
      });
    }

    /**
     * Fires load/error events for imports in the right order .
     */
    fireEvents() {
      const n$ = /** @type {!NodeList<!HTMLLinkElement>} */
        (QSA(document, importSelector));
      // Inverse order to have events firing bottom-up.
      forEach(n$, n => this.fireEventIfNeeded(n), true);
    }

    /**
     * Fires load/error event for the import if this wasn't done already.
     * @param {!HTMLLinkElement} link
     */
    fireEventIfNeeded(link) {
      // Don't fire twice same event.
      if (!link['__loaded']) {
        link['__loaded'] = true;
        // Update link's import readyState.
        link.import && (link.import.readyState = 'complete');
        const eventType = link.import ? 'load' : 'error';
        link.dispatchEvent(newCustomEvent(eventType, {
          bubbles: false,
          cancelable: false,
          detail: undefined
        }));
      }
    }

    /**
     * @param {Array<MutationRecord>} mutations
     */
    handleMutations(mutations) {
      forEach(mutations, m => forEach(m.addedNodes, elem => {
        if (elem && elem.nodeType === Node.ELEMENT_NODE) {
          // NOTE: added scripts are not updating currentScript in IE.
          if (isImportLink(elem)) {
            this.loadImport( /** @type {!HTMLLinkElement} */ (elem));
          } else {
            this.loadImports( /** @type {!Element} */ (elem));
          }
        }
      }));
    }
  }

  /**
   * @param {!Node} node
   * @return {boolean}
   */
  const isImportLink = node => {
    return node.nodeType === Node.ELEMENT_NODE && node.localName === 'link' &&
      ( /** @type {!HTMLLinkElement} */ (node).rel === 'import');
  };

  /**
   * Waits for an element to finish loading. If already done loading, it will
   * mark the element accordingly.
   * @param {!(HTMLLinkElement|HTMLScriptElement|HTMLStyleElement)} element
   * @param {function()=} callback
   */
  const whenElementLoaded = (element, callback) => {
    if (element['__loaded']) {
      callback && callback();
    } else if ((element.localName === 'script' && !element.src) ||
      (element.localName === 'style' && !element.firstChild)) {
      // Inline scripts and empty styles don't trigger load/error events,
      // consider them already loaded.
      element['__loaded'] = true;
      callback && callback();
    } else {
      const onLoadingDone = event => {
        element.removeEventListener(event.type, onLoadingDone);
        element['__loaded'] = true;
        callback && callback();
      };
      element.addEventListener('load', onLoadingDone);
      // NOTE: We listen only for load events in IE/Edge, because in IE/Edge
      // <style> with @import will fire error events for each failing @import,
      // and finally will trigger the load event when all @import are
      // finished (even if all fail).
      if (!isIE || element.localName !== 'style') {
        element.addEventListener('error', onLoadingDone);
      }
    }
  }

  /**
   * Calls the callback when all imports in the document at call time
   * (or at least document ready) have loaded. Callback is called synchronously
   * if imports are already done loading.
   * @param {function()=} callback
   */
  const whenReady = callback => {
    // 1. ensure the document is in a ready state (has dom), then
    // 2. watch for loading of imports and call callback when done
    whenDocumentReady(() => whenImportsReady(() => callback && callback()));
  }

  /**
   * Invokes the callback when document is in ready state. Callback is called
   *  synchronously if document is already done loading.
   * @param {!function()} callback
   */
  const whenDocumentReady = callback => {
    const stateChanged = () => {
      // NOTE: Firefox can hit readystate interactive without document.body existing.
      // This is anti-spec, but we handle it here anyways by waiting for next change.
      if (document.readyState !== 'loading' && !!document.body) {
        document.removeEventListener('readystatechange', stateChanged);
        callback();
      }
    }
    document.addEventListener('readystatechange', stateChanged);
    stateChanged();
  }

  /**
   * Invokes the callback after all imports are loaded. Callback is called
   * synchronously if imports are already done loading.
   * @param {!function()} callback
   */
  const whenImportsReady = callback => {
    let imports = /** @type {!NodeList<!HTMLLinkElement>} */
      (QSA(document, rootImportSelector));
    let pending = imports.length;
    if (!pending) {
      callback();
      return;
    }
    forEach(imports, imp => whenElementLoaded(imp, () => {
      if (--pending === 0) {
        callback();
      }
    }));
  }

  /**
   * Returns the import document containing the element.
   * @param {!Node} element
   * @return {HTMLLinkElement|Document|undefined}
   */
  const importForElement = element => {
    if (useNative) {
      // Return only if not in the main doc!
      return element.ownerDocument !== document ? element.ownerDocument : null;
    }
    let doc = element['__importDoc'];
    if (!doc && element.parentNode) {
      doc = /** @type {!Element} */ (element.parentNode);
      if (typeof doc.closest === 'function') {
        // Element.closest returns the element itself if it matches the selector,
        // so we search the closest import starting from the parent.
        doc = doc.closest(importSelector);
      } else {
        // Walk up the parent tree until we find an import.
        while (!isImportLink(doc) && (doc = doc.parentNode)) {}
      }
      element['__importDoc'] = doc;
    }
    return doc;
  }

  let importer = null;
  /**
   * Ensures imports contained in the element are imported.
   * Use this to handle dynamic imports attached to body.
   * @param {!(HTMLDocument|Element)} doc
   */
  const loadImports = (doc) => {
    if (importer) {
      importer.loadImports(doc);
    }
  };

  const newCustomEvent = (type, params) => {
    if (typeof window.CustomEvent === 'function') {
      return new CustomEvent(type, params);
    }
    const event = /** @type {!CustomEvent} */ (document.createEvent('CustomEvent'));
    event.initCustomEvent(type, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
    return event;
  };

  if (useNative) {
    // Check for imports that might already be done loading by the time this
    // script is actually executed. Native imports are blocking, so the ones
    // available in the document by this time should already have failed
    // or have .import defined.
    const imps = /** @type {!NodeList<!HTMLLinkElement>} */
      (QSA(document, importSelector));
    forEach(imps, imp => {
      if (!imp.import || imp.import.readyState !== 'loading') {
        imp['__loaded'] = true;
      }
    });
    // Listen for load/error events to capture dynamically added scripts.
    /**
     * @type {!function(!Event)}
     */
    const onLoadingDone = event => {
      const elem = /** @type {!Element} */ (event.target);
      if (isImportLink(elem)) {
        elem['__loaded'] = true;
      }
    };
    document.addEventListener('load', onLoadingDone, true /* useCapture */ );
    document.addEventListener('error', onLoadingDone, true /* useCapture */ );
  } else {
    // Override baseURI so that imported elements' baseURI can be used seemlessly
    // on native or polyfilled html-imports.
    // NOTE: a <link rel=import> will have `link.baseURI === link.href`, as the link
    // itself is used as the `import` document.
    /** @type {Object|undefined} */
    const native_baseURI = Object.getOwnPropertyDescriptor(Node.prototype, 'baseURI');
    // NOTE: if not configurable (e.g. safari9), set it on the Element prototype. 
    const klass = !native_baseURI || native_baseURI.configurable ? Node : Element;
    Object.defineProperty(klass.prototype, 'baseURI', {
      get() {
        const ownerDoc = /** @type {HTMLLinkElement} */ (isImportLink(this) ? this : importForElement(this));
        if (ownerDoc) return ownerDoc.href;
        // Use native baseURI if possible.
        if (native_baseURI && native_baseURI.get) return native_baseURI.get.call(this);
        // Polyfill it if not available.
        const base = /** @type {HTMLBaseElement} */ (document.querySelector('base'));
        return (base || window.location).href;
      },
      configurable: true,
      enumerable: true
    });

    // Define 'import' read-only property.
    Object.defineProperty(HTMLLinkElement.prototype, 'import', {
      get() {
        return /** @type {HTMLLinkElement} */ (this)['__import'] || null;
      },
      configurable: true,
      enumerable: true
    });

    whenDocumentReady(() => {
      importer = new Importer()
    });
  }

  /**
    Add support for the `HTMLImportsLoaded` event and the `HTMLImports.whenReady`
    method. This api is necessary because unlike the native implementation,
    script elements do not force imports to resolve. Instead, users should wrap
    code in either an `HTMLImportsLoaded` handler or after load time in an
    `HTMLImports.whenReady(callback)` call.

    NOTE: This module also supports these apis under the native implementation.
    Therefore, if this file is loaded, the same code can be used under both
    the polyfill and native implementation.
   */
  whenReady(() => document.dispatchEvent(newCustomEvent('HTMLImportsLoaded', {
    cancelable: true,
    bubbles: true,
    detail: undefined
  })));

  // exports
  scope.useNative = useNative;
  scope.whenReady = whenReady;
  scope.importForElement = importForElement;
  scope.loadImports = loadImports;

})(window.HTMLImports = (window.HTMLImports || {}));