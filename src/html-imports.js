/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
(function(scope) {

  /********************* base setup *********************/
  const IMPORT_SELECTOR = 'link[rel=import]';
  const useNative = Boolean('import' in document.createElement('link'));

  // Polyfill `currentScript` for browsers without it.
  let currentScript = null;
  if ('currentScript' in document === false) {
    Object.defineProperty(document, 'currentScript', {
      get: function() {
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

  /********************* path fixup *********************/
  const ABS_URL_TEST = /(^\/)|(^#)|(^[\w-\d]*:)/;
  const CSS_URL_REGEXP = /(url\()([^)]*)(\))/g;
  const CSS_IMPORT_REGEXP = /(@import[\s]+(?!url\())([^;]*)(;)/g;
  const STYLESHEET_REGEXP = /(<link[^>]*)(rel=['|"]?stylesheet['|"]?[^>]*>)/g;


  // path fixup: style elements in imports must be made relative to the main
  // document. We fixup url's in url() and @import.
  const Path = {

    fixUrls: function(element, base) {
      if (element.href) {
        element.setAttribute('href',
          Path.replaceAttrUrl(element.getAttribute('href'), base));
      }
      if (element.src) {
        element.setAttribute('src',
          Path.replaceAttrUrl(element.getAttribute('src'), base));
      }
      if (element.localName === 'style') {
        Path.resolveUrlsInStyle(element, base);
      } else if (element.localName === 'script' && element.textContent) {
        element.textContent += `\n//# sourceURL=${base}`;
      }
    },

    fixUrlAttributes: function(element, base) {
      const attrs = ['action', 'src', 'href', 'url', 'style'];
      for (let i = 0, a; i < attrs.length && (a = attrs[i]); i++) {
        const at = element.attributes[a];
        const v = at && at.value;
        if (v && (v.search(/({{|\[\[)/) < 0)) {
          at.value = (a === 'style') ?
            Path.resolveUrlsInCssText(v, base) :
            Path.replaceAttrUrl(v, base);
        }
      }
    },

    fixUrlsInTemplates: function(element, base) {
      const t$ = element.querySelectorAll('template');
      for (let i = 0; i < t$.length; i++) {
        Path.fixUrlsInTemplate(t$[i], base);
      }
    },

    fixUrlsInTemplate: function(template, base) {
      const content = template.content;
      if (!content) { // Template not supported.
        return;
      }
      const n$ = content.querySelectorAll(
        'style, form[action], [src], [href], [url], [style]');
      for (let i = 0; i < n$.length; i++) {
        const n = n$[i];
        if (n.localName == 'style') {
          Path.resolveUrlsInStyle(n, base);
        } else {
          Path.fixUrlAttributes(n, base);
        }
      }
      Path.fixUrlsInTemplates(content, base);
    },

    resolveUrlsInStyle: function(style, linkUrl) {
      style.textContent = Path.resolveUrlsInCssText(style.textContent, linkUrl);
    },

    resolveUrlsInCssText: function(cssText, linkUrl) {
      let r = Path.replaceUrls(cssText, linkUrl, CSS_URL_REGEXP);
      r = Path.replaceUrls(r, linkUrl, CSS_IMPORT_REGEXP);
      return r;
    },

    replaceUrls: function(text, linkUrl, regexp) {
      return text.replace(regexp, function(m, pre, url, post) {
        let urlPath = url.replace(/["']/g, '');
        if (linkUrl) {
          urlPath = Path._resolveUrl(urlPath, linkUrl);
        }
        return pre + '\'' + urlPath + '\'' + post;
      });
    },

    replaceAttrUrl: function(text, linkUrl) {
      if (text && ABS_URL_TEST.test(text)) {
        return text;
      } else {
        return Path._resolveUrl(text, linkUrl);
      }
    },

    _resolveUrl: function(url, base) {
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
     * @param {!function(boolean, ?, string=)} callback
     * @return {XMLHttpRequest}
     */
    load: function(url, callback) {
      const request = new XMLHttpRequest();
      request.open('GET', url, Xhr.async);
      request.addEventListener('readystatechange', (e) => {
        if (request.readyState === 4) {
          // Servers redirecting an import can add a Location header to help us
          // polyfill correctly.
          let redirectedUrl = undefined;
          try {
            const locationHeader = request.getResponseHeader('Location');
            if (locationHeader) {
              // Relative or full path.
              redirectedUrl = (locationHeader.substr(0, 1) === '/') ?
                location.origin + locationHeader : locationHeader;
            }
          } catch (e) {
            console.error(e.message);
          }
          const isOk = ((request.status >= 200 && request.status < 300) ||
            request.status === 304 || request.status === 0);
          const resource = (request.response || request.responseText);
          callback(!isOk, resource, redirectedUrl);
        }
      });
      request.send();
      return request;
    }
  };

  /********************* loader *********************/
  // This loader supports a dynamic list of urls
  // and an oncomplete callback that is called when the loader is done.
  class Loader {
    constructor(onLoad, onComplete) {
      this.cache = {};
      this.onload = onLoad;
      this.oncomplete = onComplete;
      this.inflight = 0;
      this.pending = {};
    }

    /**
     * @param {!NodeList<!Element>} nodes
     */
    addNodes(nodes) {
      const count = nodes.length;
      if (!count) {
        return;
      }
      this.inflight += count;
      for (let i = 0; i < count; i++) {
        this.require(nodes[i]);
      }
      this.checkDone();
    }

    /**
     * @param {!Element} node
     */
    addNode(node) {
      // number of transactions to complete
      this.inflight++;
      // commence transactions
      this.require(node);
      // anything to do?
      this.checkDone();
    }

    /**
     * @param {!Element} elt
     */
    require(elt) {
      const url = elt.href || elt.src;
      // deduplication
      if (!this.dedupe(url, elt)) {
        // fetch this resource
        this.fetch(url, elt);
      }
    }

    /**
     * @param {string} url
     * @param {!Element} elt
     * @return {boolean}
     */
    dedupe(url, elt) {
      if (this.pending[url]) {
        // add to list of nodes waiting for inUrl
        this.pending[url].push(elt);
        // don't need fetch
        return true;
      }
      let resource;
      if (this.cache[url]) {
        this.onload(url, elt, this.cache[url]);
        // finished this transaction
        this.tail();
        // don't need fetch
        return true;
      }
      // first node waiting for inUrl
      this.pending[url] = [elt];
      // need fetch (not a dupe)
      return false;
    }

    /**
     * @param {string} url
     * @param {!Element} elt
     */
    fetch(url, elt) {
      if (!url) {
        this.receive(url, elt, true, 'error: href must be specified');
      } else if (url.match(/^data:/)) {
        // Handle Data URI Scheme
        const pieces = url.split(',');
        const header = pieces[0];
        let body = pieces[1];
        if (header.indexOf(';base64') > -1) {
          body = atob(body);
        } else {
          body = decodeURIComponent(body);
        }
        this.receive(url, elt, false, body);
      } else {
        Xhr.load(url, (error, resource, redirectedUrl) =>
          this.receive(url, elt, error, resource, redirectedUrl));
      }
    }

    /**
     * @param {!string} url
     * @param {!Element} elt
     * @param {boolean} err
     * @param {string=} resource
     * @param {string=} redirectedUrl
     */
    receive(url, elt, err, resource, redirectedUrl) {
      this.cache[url] = resource;
      const $p = this.pending[url];
      for (let i = 0, l = $p.length, p;
        (i < l) && (p = $p[i]); i++) {
        // If url was redirected, use the redirected location so paths are
        // calculated relative to that.
        this.onload(url, p, resource, err, redirectedUrl);
        this.tail();
      }
      this.pending[url] = null;
    }

    tail() {
      --this.inflight;
      this.checkDone();
    }

    checkDone() {
      if (!this.inflight) {
        this.oncomplete();
      }
    }
  }

  /********************* importer *********************/

  const isIE = /Trident/.test(navigator.userAgent) ||
    /Edge\/\d./i.test(navigator.userAgent);

  // Used to disable loading of resources.
  const importDisableType = 'import-disable';

  const disabledLinkSelector = `link[rel=stylesheet][href][type=${importDisableType}]`;

  const importsSelector = `
    ${IMPORT_SELECTOR},
    ${disabledLinkSelector},
    style:not([type]),
    link[rel=stylesheet][href]:not([type]),
    script:not([type]),
    script[type="application/javascript"],
    script[type="text/javascript"]`;

  const importDependencyAttr = 'import-dependency';

  const rootImportsSelector = `${IMPORT_SELECTOR}:not(${importDependencyAttr})`;

  const pendingScriptsSelector = `script[${importDependencyAttr}]`;

  const pendingStylesSelector = `style[${importDependencyAttr}],
    link[rel=stylesheet][${importDependencyAttr}]`;

  /**
   * @type {Function}
   */
  const MATCHES = Element.prototype.matches ||
    Element.prototype.matchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector;

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
      // Observe only document head
      new MutationObserver(this._onMutation.bind(this)).observe(document.head, {
        childList: true
      });
      this._loader = new Loader(
        this._onLoaded.bind(this), this._onLoadedAll.bind(this)
      );
      whenDocumentReady(() => this._loadSubtree(document));
    }

    /**
     * @param {!(HTMLDocument|DocumentFragment)} doc
     */
    _loadSubtree(doc) {
      const nodes = doc.querySelectorAll(IMPORT_SELECTOR);
      this._loader.addNodes(nodes);
    }

    _onLoaded(url, elt, resource, err, redirectedUrl) {
      // We've already seen a document at this url, return.
      if (this.documents[url] !== undefined) {
        return;
      }
      if (err) {
        this.documents[url] = null;
      } else {
        // Generate a document from data.
        const doc = this._makeDocument(resource, redirectedUrl || url);
        this.documents[url] = doc;
        this._loadSubtree(doc);
      }
    }

    /**
     * Creates a new document containing resource and normalizes urls accordingly.
     * @param {string=} resource
     * @param {string=} url
     * @return {!DocumentFragment}
     */
    _makeDocument(resource, url) {
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
        // This creates issues in Safari10 when used with shadydom (see #12).
        content = template.content;
      } else {
        // <template> not supported, create fragment and move children into it.
        content = document.createDocumentFragment();
        while (template.firstElementChild) {
          content.appendChild(template.firstElementChild);
        }
      }

      // Support <base> in imported docs. Resolve url and remove it from the parent.
      const baseEl = content.querySelector('base');
      if (baseEl) {
        url = Path.replaceAttrUrl(baseEl.getAttribute('href'), url);
        baseEl.parentNode.removeChild(baseEl);
      }

      // This is specific to users of <dom-module> (Polymer).
      // TODO(valdrin) remove this when Polymer uses importForElement.
      const s$ = content.querySelectorAll('dom-module');
      for (let i = 0, s; i < s$.length && (s = s$[i]); i++) {
        s.setAttribute('assetpath',
          Path.replaceAttrUrl(s.getAttribute('assetpath') || '', url));
      }

      const n$ = /** @type {!NodeList<!(HTMLLinkElement|HTMLScriptElement|HTMLStyleElement)>} */
        (content.querySelectorAll(importsSelector));
      for (let i = 0, l = n$.length, n; i < l && (n = n$[i]); i++) {
        // Listen for load/error events, then fix urls.
        whenElementLoaded(n);
        Path.fixUrls(n, url);
        // Mark for easier selectors.
        n.setAttribute(importDependencyAttr, '');
      }
      Path.fixUrlsInTemplates(content, url);
      return content;
    }

    _onLoadedAll() {
      this._flatten(document);
      // We wait for styles to load, and at the same time we execute the scripts,
      // then fire the load/error events for imports to have faster whenReady
      // callback execution.
      // NOTE: This is different for native behavior where scripts would be
      // executed after the styles before them are loaded.
      // To achieve that, we could select pending styles and scripts in the
      // document and execute them sequentially in their dom order.
      Promise.all([this._waitForStyles(), this._runScripts()])
        .then(() => this._fireEvents());
    }

    /**
     * @param {!HTMLDocument} doc
     */
    _flatten(doc) {
      const n$ = /** @type {!NodeList<!HTMLLinkElement>} */
        (doc.querySelectorAll(IMPORT_SELECTOR));
      for (let i = 0, l = n$.length, n; i < l && (n = n$[i]); i++) {
        let imp = this.documents[n.href];
        n.import = /** @type {!Document} */ (imp);
        if (imp && imp.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          this.documents[n.href] = n;
          // Suppress Closure warning about incompatible subtype assignment.
          /** @type {!HTMLElement} */
          (n).import = n;
          this._flatten(imp);
          n.appendChild(imp);
          // If in the main document, observe for any imports added later.
          if (doc === document) {
            this._observe(n);
          }
        }
      }
    }

    /**
     * Replaces all the imported scripts with a clone in order to execute them.
     * Updates the `currentScript`.
     * @return {Promise} Resolved when scripts are loaded.
     */
    _runScripts() {
      const s$ = document.querySelectorAll(pendingScriptsSelector);
      let promise = Promise.resolve();
      for (let i = 0, l = s$.length, s; i < l && (s = s$[i]); i++) {
        promise = promise.then(() => {
          // The pending scripts have been generated through innerHTML and
          // browsers won't execute them for security reasons. We cannot use
          // s.cloneNode(true) either, the only way to run the script is manually
          // creating a new element and copying its attributes/textContent.
          const clone = /** @type {!HTMLScriptElement} */
            (document.createElement('script'));
          // Remove import-dependency attribute to avoid double cloning.
          s.removeAttribute(importDependencyAttr);
          // Copy attributes and textContent.
          for (let j = 0, ll = s.attributes.length; j < ll; j++) {
            clone.setAttribute(s.attributes[j].name, s.attributes[j].value);
          }
          clone.textContent = s.textContent;

          // Update currentScript and replace original with clone script.
          currentScript = clone;
          s.parentNode.replaceChild(clone, s);
          // Wait for load/error events; after is loaded, reset currentScript.
          return whenElementLoaded(clone).then(() => currentScript = null);
        });
      }
      return promise;
    }

    /**
     * Waits for all the imported stylesheets/styles to be loaded.
     * @return {Promise}
     */
    _waitForStyles() {
      // <link rel=stylesheet> should be appended to <head>. Not doing so
      // in IE/Edge breaks the cascading order
      // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10472273/
      // If there is one <link rel=stylesheet> imported, we must move all imported
      // links and styles to <head>.
      const needsMove = !!document.querySelector(disabledLinkSelector);
      const s$ = /** @type {!NodeList<!(HTMLLinkElement|HTMLStyleElement)>} */
        (document.querySelectorAll(pendingStylesSelector));
      const promises = [];
      for (let i = 0, l = s$.length, s; i < l && (s = s$[i]); i++) {
        // Listen for load/error events, remove selector once is done loading.
        promises.push(whenElementLoaded(s)
          .then(() => s.removeAttribute(importDependencyAttr)));
        // Check if was already moved to head, to handle the case where the element
        // has already been moved but it is still loading.
        if (needsMove && s.parentNode !== document.head) {
          let rootImport = importForElement(s);
          while (rootImport && importForElement(rootImport)) {
            rootImport = importForElement(rootImport);
          }
          // Replace the element we're about to move with a placeholder.
          // NOTE: we first have to append the element to the new parent, then
          // we can put the placeholder at its place, otherwise load/error events
          // seem to be fired too early.
          const parent = s.parentNode,
            next = s.nextSibling,
            placeholder = document.createElement(s.localName);
          // Add reference of the moved element.
          placeholder['__appliedElement'] = s;
          // First, re-parent the element...
          if (rootImport.parentNode === document.head) {
            document.head.insertBefore(s, rootImport);
          } else {
            document.head.appendChild(s);
          }
          // ...and then, insert the placeholder at the right place.
          parent.insertBefore(placeholder, next);
          // Enable the loading of <link rel=stylesheet>.
          s.removeAttribute('type');
        }
      }
      return Promise.all(promises);
    }

    /**
     * Fires load/error events for loaded imports.
     */
    _fireEvents() {
      const n$ = /** @type {!NodeList<!HTMLLinkElement>} */
        (document.querySelectorAll(IMPORT_SELECTOR));
      // Inverse order to have events firing bottom-up.
      for (let i = n$.length - 1, n; i >= 0 && (n = n$[i]); i--) {
        // Don't fire twice same event.
        if (!n['__loaded']) {
          n['__loaded'] = true;
          const eventType = n.import ? 'load' : 'error';
          n.dispatchEvent(new CustomEvent(eventType, {
            bubbles: false,
            cancelable: false,
            detail: undefined
          }));
        }
      }
    }

    _observe(element) {
      if (element['__importObserver']) {
        return;
      }
      element['__importObserver'] = new MutationObserver(this._onMutation.bind(this));
      element['__importObserver'].observe(element, {
        childList: true,
        subtree: true
      });
    }

    /**
     * @param {Array<MutationRecord>} mutations
     */
    _onMutation(mutations) {
      for (let j = 0, m; j < mutations.length && (m = mutations[j]); j++) {
        for (let i = 0, l = m.addedNodes ? m.addedNodes.length : 0; i < l; i++) {
          const n = /** @type {HTMLLinkElement} */ (m.addedNodes[i]);
          // NOTE: added scripts are not updating currentScript in IE.
          // TODO add test w/ script & stylesheet maybe
          if (n && isImportLink(n)) {
            this._loader.addNode(n);
          }
        }
      }
    }

  }

  /**
   * @param {!Node} node
   * @return {boolean}
   */
  function isImportLink(node) {
    return node.nodeType === Node.ELEMENT_NODE && MATCHES.call(node, IMPORT_SELECTOR);
  }

  /**
   * Waits for an element to finish loading. If already done loading, it will
   * mark the element accordingly.
   * @param {!(HTMLLinkElement|HTMLScriptElement|HTMLStyleElement)} element
   * @return {Promise}
   */
  function whenElementLoaded(element) {
    if (!element['__loadPromise']) {
      element['__loadPromise'] = new Promise((resolve) => {
        if (isElementLoaded(element)) {
          resolve();
        } else if (isIE && element.localName === 'style') {
          // NOTE: We listen only for load events in IE/Edge, because in IE/Edge
          // <style> with @import will fire error events for each failing @import,
          // and finally will trigger the load event when all @import are
          // finished (even if all fail).
          element.addEventListener('load', resolve);
        } else {
          element.addEventListener('load', resolve);
          element.addEventListener('error', resolve);
        }
      }).then(() => {
        element['__loaded'] = true;
        return element;
      });
    }
    return element['__loadPromise'];
  }

  /**
   * @param {!HTMLElement} el
   * @return {boolean}
   */
  function isElementLoaded(el) {
    el['__loaded'] = el['__loaded'] ||
      // Inline scripts don't trigger load/error events, consider them already loaded.
      (el.localName === 'script' && !( /** @type {!HTMLScriptElement} */ (el).src));
    return el['__loaded'];
  }

  /**
   * Calls the callback when all imports in the document at call time
   * (or at least document ready) have loaded. Callback is called synchronously
   * if imports are already done loading.
   * @param {function()=} callback
   */
  function whenReady(callback) {
    // 1. ensure the document is in a ready state (has dom), then
    // 2. watch for loading of imports and call callback when done
    whenDocumentReady(() => whenImportsReady(() => callback && callback()));
  }

  /**
   * Invokes the callback when document is in ready state. Callback is called
   *  synchronously if document is already done loading.
   * @param {!function()} callback
   */
  function whenDocumentReady(callback) {
    if (document.readyState !== 'loading') {
      callback();
    } else {
      document.addEventListener('readystatechange', function stateChanged() {
        if (document.readyState !== 'loading') {
          document.removeEventListener('readystatechange', stateChanged);
          callback();
        }
      });
    }
  }

  /**
   * Invokes the callback after all imports are loaded. Callback is called
   * synchronously if imports are already done loading.
   * @param {!function()} callback
   */
  function whenImportsReady(callback) {
    let imports = /** @type {!NodeList<!HTMLLinkElement>} */
      (document.querySelectorAll(rootImportsSelector));
    const promises = [];
    for (let i = 0, l = imports.length, imp; i < l && (imp = imports[i]); i++) {
      if (!isElementLoaded(imp)) {
        promises.push(whenElementLoaded(imp));
      }
    }
    if (promises.length) {
      Promise.all(promises).then(() => callback());
    } else {
      callback();
    }
  }

  /**
   * Returns the link that imported the element.
   * @param {!Element} element
   * @return {!HTMLLinkElement|undefined}
   */
  function importForElement(element) {
    let target = element;
    while ((target = target['__ownerImport'] || target.parentNode || target.host)) {
      // Found the deepest import.
      if (isImportLink(target)) {
        element['__ownerImport'] = /** @type {!HTMLLinkElement} */ (target);
        break;
      }
    }
    return element['__ownerImport'];
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
  whenReady(() => document.dispatchEvent(new CustomEvent('HTMLImportsLoaded', {
    cancelable: true,
    bubbles: true,
    detail: undefined
  })));

  if (useNative) {
    // Listen for load/error events to capture dynamically added scripts.
    /**
     * @type {!function(!Event)}
     */
    const onLoadingDone = (event) => {
      const elem = /** @type {!Element} */ (event.target);
      if (isImportLink(elem)) {
        elem['__loaded'] = true;
      }
    };
    document.addEventListener('load', onLoadingDone, true /* useCapture */ );
    document.addEventListener('error', onLoadingDone, true /* useCapture */ );
  } else {
    new Importer();
  }

  // exports
  scope.useNative = useNative;
  scope.whenReady = whenReady;
  scope.importForElement = importForElement;

})(window.HTMLImports = (window.HTMLImports || {}));
