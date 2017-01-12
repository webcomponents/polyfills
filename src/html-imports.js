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
  const flags = {
    bust: false,
    log: false
  };

  // Polyfill `currentScript` for browsers without it.
  let currentScript = null;
  if ('currentScript' in document === false) {
    Object.defineProperty(document, 'currentScript', {
      get: function() {
        return currentScript ||
          // NOTE: only works when called in synchronously executing code.
          // readyState should check if `loading` but IE10 is
          // interactive when scripts run so we cheat.
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


  // path fixup: style elements in imports must be made relative to the main
  // document. We fixup url's in url() and @import.
  const Path = {
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
      if (flags.bust) {
        url += '?' + Math.random();
      }
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
  // NOTE: The polyfill currently does *not* need this dynamism or the
  // onComplete concept. Because of this, the loader could be simplified
  // quite a bit.
  class Loader {
    constructor(onLoad, onComplete) {
      this.cache = {};
      this.onload = onLoad;
      this.oncomplete = onComplete;
      this.inflight = 0;
      this.pending = {};
    }

    addNodes(nodes) {
      // number of transactions to complete
      this.inflight += nodes.length;
      // commence transactions
      for (let i = 0, l = nodes.length, n;
        (i < l) && (n = nodes[i]); i++) {
        this.require(n);
      }
      // anything to do?
      this.checkDone();
    }

    addNode(node) {
      // number of transactions to complete
      this.inflight++;
      // commence transactions
      this.require(node);
      // anything to do?
      this.checkDone();
    }

    require(elt) {
      const url = elt.src || elt.href;
      // deduplication
      if (!this.dedupe(url, elt)) {
        // fetch this resource
        this.fetch(url, elt);
      }
    }

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

    fetch(url, elt) {
      flags.log && console.log('fetch', url, elt);
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

  const stylesSelector = [
    'style:not([type])',
    'link[rel=stylesheet][href]:not([type])'
  ].join(',');

  const stylesInImportsSelector = [
    `${IMPORT_SELECTOR} style:not([type])`,
    `${IMPORT_SELECTOR} link[rel=stylesheet][href]:not([type])`
  ].join(',');

  const importsSelectors = [
    IMPORT_SELECTOR,
    stylesSelector,
    'script:not([type])',
    'script[type="application/javascript"]',
    'script[type="text/javascript"]'
  ].join(',');

  /**
   * Importer will:
   * - load any linked import documents (with deduping)
   * - whenever an import is loaded, prompt the parser to try to parse
   * - observe imported documents for new elements (these are handled via the
   *   dynamic importer)
   */
  class Importer {
    /**
     * @param {!HTMLDocument} doc
     */
    constructor(doc) {
      this.documents = {};
      this._doc = doc;
      // Make sure to catch any imports that are in the process of loading
      // when this script is run.
      const imports = doc.querySelectorAll(IMPORT_SELECTOR);
      for (let i = 0, l = imports.length; i < l; i++) {
        whenElementLoaded(imports[i]);
      }
      // Observe only document head
      new MutationObserver(this._onMutation.bind(this)).observe(doc.head, {
        childList: true
      });

      if (!useNative) {
        this._loader = new Loader(
          this._onLoaded.bind(this), this._onLoadedAll.bind(this)
        );
        whenDocumentReady(doc).then(() => this._loadSubtree(doc));
      }
    }

    _loadSubtree(doc) {
      const nodes = doc.querySelectorAll(IMPORT_SELECTOR);
      // add these nodes to loader's queue
      this._loader.addNodes(nodes);
    }

    _onLoaded(url, elt, resource, err, redirectedUrl) {
      flags.log && console.log('loaded', url, elt);
      // We've already seen a document at this url, return.
      if (this.documents[url] !== undefined) {
        return;
      }
      if (err) {
        this.documents[url] = null;
      } else {
        // Generate an HTMLDocument from data.
        const doc = makeDocument(resource, redirectedUrl || url);
        // note, we cannot use MO to detect parsed nodes because
        // SD polyfill does not report these as mutations.
        this._loadSubtree(doc);
        this.documents[url] = doc;
      }
    }

    _onLoadedAll() {
      this._flatten(this._doc);
      Promise.all([
        runScripts(this._doc),
        waitForStyles(this._doc)
      ]).then(() => fireEvents(this._doc));
    }

    _flatten(element) {
      const n$ = element.querySelectorAll(IMPORT_SELECTOR);
      for (let i = 0, l = n$.length, n; i < l && (n = n$[i]); i++) {
        n.import = this.documents[n.href];
        if (n.import && !n.import.__firstImport) {
          n.import.__firstImport = n;
          this._flatten(n.import);
          // If in the main document, observe for any imports added later.
          if (element === document) {
            // In IE/Edge, when imports have link stylesheets/styles, the cascading order
            // isn't respected https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10472273/
            if (isIE || isEdge) {
              cloneAndMoveStyles(n);
            }
            this._observe(n.import);
          }
          n.appendChild(n.import);
        }
      }
    }

    _observe(element) {
      if (element.__importObserver) {
        return;
      }
      element.__importObserver = new MutationObserver(this._onMutation.bind(this));
      element.__importObserver.observe(element, {
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
          const n = /** @type {Element} */ (m.addedNodes[i]);
          if (n && isImportLink(n)) {
            if (useNative) {
              whenElementLoaded(n);
            } else {
              this._loader.addNode(n);
            }
          }
        }
      }
    }

  }

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
   * @param {!Node} node
   * @return {boolean}
   */
  function isImportLink(node) {
    return node.nodeType === Node.ELEMENT_NODE && MATCHES.call(node, IMPORT_SELECTOR);
  }

  /********************* vulcanize style inline processing  *********************/
  const attrs = ['action', 'src', 'href', 'url', 'style'];

  function fixUrlAttributes(element, base) {
    attrs.forEach((a) => {
      const at = element.attributes[a];
      const v = at && at.value;
      if (v && (v.search(/({{|\[\[)/) < 0)) {
        at.value = (a === 'style') ?
          Path.resolveUrlsInCssText(v, base) :
          Path.replaceAttrUrl(v, base);
      }
    });
  }

  function fixUrlsInTemplate(template, base) {
    const content = template.content;
    if (!content) { // Template not supported.
      return;
    }
    const n$ = content.querySelectorAll('style, form[action], [src], [href], [url], [style]');
    for (let i = 0; i < n$.length; i++) {
      const n = n$[i];
      if (n.localName == 'style') {
        Path.resolveUrlsInStyle(n, base);
      } else {
        fixUrlAttributes(n, base);
      }
    }
    fixUrlsInTemplates(content, base);
  }

  function fixUrlsInTemplates(element, base) {
    const t$ = element.querySelectorAll('template');
    for (let i = 0; i < t$.length; i++) {
      fixUrlsInTemplate(t$[i], base);
    }
  }

  const scriptType = 'import-script';

  function fixUrls(element, base) {
    const n$ = element.querySelectorAll(importsSelectors);
    for (let i = 0, l = n$.length, n; i < l && (n = n$[i]); i++) {
      // Ensure we add load/error listeners before modifying urls or appending
      // these to the main document.
      whenElementLoaded(n);
      if (n.href) {
        n.setAttribute('href', Path.replaceAttrUrl(n.getAttribute('href'), base));
      }
      if (n.src) {
        n.setAttribute('src', Path.replaceAttrUrl(n.getAttribute('src'), base));
      }
      if (n.localName == 'style') {
        Path.resolveUrlsInStyle(n, base);
      } else if (n.localName === 'script') {
        if (n.textContent) {
          n.textContent += `\n//# sourceURL=${base}`;
        }
        // NOTE: we override the type here, might need to keep track of original
        // type and apply it to clone when running the script.
        n.setAttribute('type', scriptType);
      }
    }
    fixUrlsInTemplates(element, base);
  }

  function fixDomModules(element, url) {
    const s$ = element.querySelectorAll('dom-module');
    for (let i = 0; i < s$.length; i++) {
      const o = s$[i];
      const assetpath = o.getAttribute('assetpath') || '';
      o.setAttribute('assetpath', Path.replaceAttrUrl(assetpath, url));
    }
  }

  /**
   * Replaces all the imported scripts with a clone in order to execute them.
   * Updates the `currentScript`.
   * @param {!HTMLDocument} doc
   * @return {Promise} Resolved when scripts are loaded.
   */
  function runScripts(doc) {
    const s$ = doc.querySelectorAll(`script[type=${scriptType}]`);
    let promise = Promise.resolve();
    for (let i = 0, l = s$.length, s; i < l && (s = s$[i]); i++) {
      promise = promise.then(() => {
        const c = doc.createElement('script');
        c.textContent = s.textContent;
        if (s.src) {
          c.setAttribute('src', s.getAttribute('src'));
        }
        // Listen for load/error events before adding the clone to the document.
        // Catch failures, always return c.
        const whenLoadedPromise = whenElementLoaded(c).catch(() => c);
        // Update currentScript and replace original with clone script.
        currentScript = c;
        s.parentNode.replaceChild(c, s);
        // After is loaded, reset currentScript.
        return whenLoadedPromise.then((script) => {
          if (script === currentScript) {
            currentScript = null;
          }
        });
      });
    }
    return promise;
  }

  /**
   * Waits for all the imported stylesheets/styles to be loaded.
   * @param {!HTMLDocument} doc
   * @return {Promise}
   */
  function waitForStyles(doc) {
    const s$ = doc.querySelectorAll(stylesInImportsSelector);
    const promises = [];
    for (let i = 0, l = s$.length, s; i < l && (s = s$[i]); i++) {
      // Catch failures, always return s
      promises.push(
        whenElementLoaded(s).catch(() => s)
      );
    }
    return Promise.all(promises);
  }

  /**
   * Clones styles and stylesheets links contained in imports and moves them
   * as siblings of the root import link.
   * @param {!HTMLLinkElement} importLink
   */
  function cloneAndMoveStyles(importLink) {
    const n$ = importLink.import.querySelectorAll(stylesSelector);
    for (let i = 0, l = n$.length, n; i < l && (n = n$[i]); i++) {
      const clone = document.createElement(n.localName);
      // Ensure we listen for load/error for this element.
      whenElementLoaded(clone);
      // Copy textContent and attributes.
      clone.textContent = n.textContent;
      for (let j = 0, ll = n.attributes.length; j < ll; j++) {
        clone.setAttribute(n.attributes[j].name, n.attributes[j].value);
      }

      // Remove old, add new.
      n.parentNode.removeChild(n);
      importLink.parentNode.insertBefore(clone, importLink);
    }
  }

  /**
   * Fires load/error events for loaded imports.
   * @param {!HTMLDocument} doc
   */
  function fireEvents(doc) {
    const n$ = /** @type {!NodeList<!HTMLLinkElement>} */
      (doc.querySelectorAll(IMPORT_SELECTOR));
    // Inverse order to have events firing bottom-up.
    for (let i = n$.length - 1, n; i >= 0 && (n = n$[i]); i--) {
      // Don't fire twice same event.
      if (!n.__fired) {
        n.__fired = true;
        const eventType = n.import ? 'load' : 'error';
        flags.log && console.warn('fire', eventType, n.href);
        // Ensure the load promise is setup before firing the event.
        whenElementLoaded(n);
        n.dispatchEvent(new CustomEvent(eventType, {
          bubbles: false,
          cancelable: false,
          detail: undefined
        }));
      }
    }
  }

  /**
   * Waits for an element to finish loading. If already done loading, it will
   * mark the element accordingly.
   * @param {!Element} element
   * @return {Promise}
   */
  function whenElementLoaded(element) {
    if (!element.__loadPromise) {
      element.__loadPromise = new Promise((resolve, reject) => {
        if (isElementLoaded(element)) {
          resolve(element);
        } else {
          element.addEventListener('load', () => resolve(element));
          element.addEventListener('error', () => reject(element));
        }
      });
    }
    return element.__loadPromise;
  }

  /**
   * @param {!Element} element
   * @return {boolean}
   */
  function isElementLoaded(element) {
    let isLoaded = false;
    if (useNative && isImportLink(element) && element.import &&
      element.import.readyState !== 'loading') {
      isLoaded = true;
    } else if (isIE && element.localName === 'style') {
      // NOTE: IE does not fire "load" event for styles that have already
      // loaded. This is in violation of the spec, so we try our hardest to
      // work around it.
      // If there's not @import in the textContent, assume it has loaded
      if (element.textContent.indexOf('@import') == -1) {
        isLoaded = true;
        // if we have a sheet, we have been parsed
      } else if (element.sheet) {
        isLoaded = true;
        const csr = element.sheet.cssRules;
        // search the rules for @import's
        for (let i = 0, l = csr ? csr.length : 0; i < l && isLoaded; i++) {
          if (csr[i].type === CSSRule.IMPORT_RULE) {
            // if every @import has resolved, fake the load
            isLoaded = Boolean(csr[i].styleSheet);
          }
        }
      }
    } else if (element.localName === 'script' && !element.src) {
      isLoaded = true;
    }
    return isLoaded;
  }

  /**
   * Creates a new document containing resource and normalizes urls accordingly.
   * @param {string=} resource
   * @param {string=} url
   * @return {HTMLElement}
   */
  function makeDocument(resource, url) {
    const content = /** @type {HTMLElement} */
      (document.createElement('import-content'));
    content.style.display = 'none';
    if (url) {
      content.setAttribute('import-href', url);
    }
    if (resource) {
      content.innerHTML = resource;
    }

    // Support <base> in imported docs. Resolve url and remove it from the parent.
    const baseEl = /** @type {HTMLBaseElement} */ (content.querySelector('base'));
    if (baseEl) {
      url = Path._resolveUrl(baseEl.getAttribute('href'), url);
      baseEl.parentNode.removeChild(baseEl);
    }
    // TODO(sorvell): this is specific to users of <dom-module> (Polymer).
    fixDomModules(content, url);
    fixUrls(content, url);
    return content;
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

  const isIE = /Trident/.test(navigator.userAgent);
  const isEdge = !isIE && /Edge\/\d./i.test(navigator.userAgent);

  /**
   * Calls the callback when all HTMLImports in the document at call time
   * (or at least document ready) have loaded.
   * @param {function(!HTMLImportInfo)=} callback
   * @param {HTMLDocument=} doc
   * @return {Promise}
   */
  function whenReady(callback, doc) {
    doc = doc || document;
    // 1. ensure the document is in a ready state (has dom), then
    // 2. watch for loading of imports and call callback when done
    return whenDocumentReady(doc).then(watchImportsLoad).then((importInfo) => {
      callback && callback(importInfo);
      return importInfo;
    });
  }


  /**
   * Resolved when document is in ready state.
   * @param {!HTMLDocument} doc
   * @returns {Promise}
   */
  function whenDocumentReady(doc) {
    return new Promise((resolve) => {
      if (doc.readyState !== 'loading') {
        resolve(doc);
      } else {
        doc.addEventListener('readystatechange', () => {
          if (doc.readyState !== 'loading') {
            resolve(doc);
          }
        });
      }
    });
  }

  /**
   * Resolved when all imports are done loading. The promise returns the import
   * details as HTMLImportInfo object.
   * @param {!HTMLDocument} doc
   * @returns {Promise}
   */
  function watchImportsLoad(doc) {
    let imports = doc.querySelectorAll(IMPORT_SELECTOR);
    const promises = [];
    const importInfo = /** @type {!HTMLImportInfo} */ ({
      allImports: [],
      loadedImports: [],
      errorImports: []
    });
    for (let i = 0, l = imports.length, imp; i < l && (imp = imports[i]); i++) {
      // Skip nested imports.
      if (MATCHES.call(imp, `${IMPORT_SELECTOR} ${IMPORT_SELECTOR}`)) {
        continue;
      }
      importInfo.allImports.push(imp);
      promises.push(whenElementLoaded(imp).then((imp) => {
        importInfo.loadedImports.push(imp);
        return imp;
      }).catch((imp) => {
        importInfo.errorImports.push(imp);
        // Capture failures, always return imp.
        return imp;
      }));
    }
    // Return aggregated info.
    return Promise.all(promises).then(() => importInfo);
  }

  new Importer(document);

  // Fire the 'HTMLImportsLoaded' event when imports in document at load time
  // have loaded. This event is required to simulate the script blocking
  // behavior of native imports. A main document script that needs to be sure
  // imports have loaded should wait for this event.
  whenReady((detail) =>
    document.dispatchEvent(new CustomEvent('HTMLImportsLoaded', {
      cancelable: true,
      bubbles: true,
      detail: detail
    })));

  // exports
  scope.useNative = useNative;
  scope.whenReady = whenReady;

})(window.HTMLImports = (window.HTMLImports || {}));
