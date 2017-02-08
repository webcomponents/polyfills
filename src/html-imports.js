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
  const useNative = Boolean('import' in document.createElement('link'));

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

  /********************* path fixup *********************/
  const ABS_URL_TEST = /(^\/)|(^#)|(^[\w-\d]*:)/;
  const CSS_URL_REGEXP = /(url\()([^)]*)(\))/g;
  const CSS_IMPORT_REGEXP = /(@import[\s]+(?!url\())([^;]*)(;)/g;
  const STYLESHEET_REGEXP = /(<link[^>]*)(rel=['|"]?stylesheet['|"]?[^>]*>)/g;

  // path fixup: style elements in imports must be made relative to the main
  // document. We fixup url's in url() and @import.
  const Path = {

    fixUrls(element, base) {
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
      }
    },

    fixUrlAttributes(element, base) {
      const attrs = ['action', 'src', 'href', 'url', 'style'];
      for (let i = 0, a; i < attrs.length && (a = attrs[i]); i++) {
        const at = element.attributes[a];
        const v = at && at.value;
        // Skip bound attribute values (assume binding is done via {} and []).
        // TODO(valdrin) consider exposing a library-implementable hook.
        if (v && (v.search(/({{|\[\[)/) < 0)) {
          at.value = (a === 'style') ?
            Path.resolveUrlsInCssText(v, base) :
            Path.replaceAttrUrl(v, base);
        }
      }
    },

    fixUrlsInTemplates(element, base) {
      const t$ = element.querySelectorAll('template');
      for (let i = 0; i < t$.length; i++) {
        Path.fixUrlsInTemplate(t$[i], base);
      }
    },

    fixUrlsInTemplate(template, base) {
      // If template is not supported, still resolve urls within it.
      const content = template.content || template;
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

    resolveUrlsInStyle(style, linkUrl) {
      style.textContent = Path.resolveUrlsInCssText(style.textContent, linkUrl);
    },

    resolveUrlsInCssText(cssText, linkUrl) {
      let r = Path.replaceUrls(cssText, linkUrl, CSS_URL_REGEXP);
      r = Path.replaceUrls(r, linkUrl, CSS_IMPORT_REGEXP);
      return r;
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

    replaceAttrUrl(text, linkUrl) {
      if (text && ABS_URL_TEST.test(text)) {
        return text;
      } else {
        return Path.resolveUrl(text, linkUrl);
      }
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
          let redirectedUrl = request.getResponseHeader('Location');
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

  const importDependenciesSelector = `${importSelector}, ${disabledLinkSelector},
    style:not([type]), link[rel=stylesheet][href]:not([type]),
    script:not([type]), script[type="application/javascript"],
    script[type="text/javascript"]`;

  const importDependencyAttr = 'import-dependency';

  const rootImportSelector = `${importSelector}:not(${importDependencyAttr})`;

  const pendingScriptsSelector = `script[${importDependencyAttr}]`;

  const pendingStylesSelector = `style[${importDependencyAttr}],
    link[rel=stylesheet][${importDependencyAttr}]`;

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
      // 1. Load imports contents
      // 2. Assign them to first import links on the document
      // 3. Wait for import styles & scripts to be done loading/running
      // 4. Fire load/error events
      whenDocumentReady(() => {
        // Observe changes on <head>.
        new MutationObserver(m => this.handleMutations(m)).observe(document.head, {
          childList: true,
          subtree: true
        });
        this.loadImports(document);
      });
    }

    /**
     * @param {!(HTMLDocument|DocumentFragment)} doc
     */
    loadImports(doc) {
      const links = /** @type {!NodeList<!HTMLLinkElement>} */
        (doc.querySelectorAll(importSelector));
      for (let i = 0, l = links.length; i < l; i++) {
        this.loadImport(links[i]);
      }
      this.processImportsIfLoadingDone();
    }

    /**
     * @param {!HTMLLinkElement} link
     */
    loadImport(link) {
      const url = link.href;
      // This resource is already being handled by another import.
      if (this.documents[url] !== undefined) {
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
        // This creates issues in Safari10 when used with shadydom (see #12).
        content = template.content;
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
        url = Path.replaceAttrUrl(baseEl.getAttribute('href'), url);
        baseEl.removeAttribute('href');
      }

      // This is specific to users of <dom-module> (Polymer).
      // TODO(valdrin) remove this when Polymer uses importForElement.
      const s$ = content.querySelectorAll('dom-module');
      for (let i = 0, s; i < s$.length && (s = s$[i]); i++) {
        s.setAttribute('assetpath',
          Path.replaceAttrUrl(s.getAttribute('assetpath') || '', url));
      }

      const n$ = /** @type {!NodeList<!(HTMLLinkElement|HTMLScriptElement|HTMLStyleElement)>} */
        (content.querySelectorAll(importDependenciesSelector));
      // For source map hints.
      let inlineScriptIndex = 0;
      for (let i = 0, l = n$.length, n; i < l && (n = n$[i]); i++) {
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
      }
      Path.fixUrlsInTemplates(content, url);
      return content;
    }

    /**
     * Waits for loaded imports to finish loading scripts and styles, then fires
     * the load/error events.
     */
    processImportsIfLoadingDone() {
      // Wait until all resources are ready, then load import resources.
      if (this.inflight) {
        return;
      }
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
      this.waitForStyles(() => {
        stylesOk = true;
        if (scriptsOk) {
          this.fireEvents();
        }
      });
      this.runScripts(() => {
        scriptsOk = true;
        if (stylesOk) {
          this.fireEvents();
        }
      });
    }

    /**
     * @param {!HTMLDocument} doc
     */
    flatten(doc) {
      const n$ = /** @type {!NodeList<!HTMLLinkElement>} */
        (doc.querySelectorAll(importSelector));
      for (let i = 0, l = n$.length, n; i < l && (n = n$[i]); i++) {
        const imp = this.documents[n.href];
        n.import = /** @type {!Document} */ (imp);
        if (imp && imp.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          // We set the .import to be the link itself, and update its readyState.
          // Other links with the same href will point to this link.
          this.documents[n.href] = n;
          n.readyState = 'loading';
          // Suppress Closure warning about incompatible subtype assignment.
          ( /** @type {!HTMLElement} */ (n).import = n);
          this.flatten(imp);
          n.appendChild(imp);
        }
      }
    }

    /**
     * Replaces all the imported scripts with a clone in order to execute them.
     * Updates the `currentScript`.
     * @param {!function()} callback
     */
    runScripts(callback) {
      const s$ = document.querySelectorAll(pendingScriptsSelector);
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
          for (let j = 0, ll = s.attributes.length; j < ll; j++) {
            clone.setAttribute(s.attributes[j].name, s.attributes[j].value);
          }
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
        (document.querySelectorAll(pendingStylesSelector));
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
      for (let i = 0, l = s$.length, s; i < l && (s = s$[i]); i++) {
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
          // Disable this from appearing in document.styleSheets.
          placeholder.setAttribute('type', 'import-placeholder');
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
    }

    /**
     * Fires load/error events for imports in the right order .
     */
    fireEvents() {
      const n$ = /** @type {!NodeList<!HTMLLinkElement>} */
        (document.querySelectorAll(importSelector));
      // Inverse order to have events firing bottom-up.
      for (let i = n$.length - 1, n; i >= 0 && (n = n$[i]); i--) {
        this.fireEventIfNeeded(n);
      }
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
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (!m.addedNodes) {
          continue;
        }
        for (let ii = 0; ii < m.addedNodes.length; ii++) {
          const link = m.addedNodes[ii];
          if (!link || link.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }
          // NOTE: added scripts are not updating currentScript in IE.
          // TODO add test w/ script & stylesheet maybe
          const imports = /** @type {!NodeList<!HTMLLinkElement>} */
            (isImportLink(link) ? [link] : link.querySelectorAll(importSelector));
          for (let iii = 0; iii < imports.length; iii++) {
            const n = imports[iii];
            const imp = this.documents[n.href];
            // First time we see this import, load.
            if (imp === undefined) {
              this.loadImport(n);
            }
            // If nothing else is loading, we can safely associate the import
            // and fire the load/error event.
            else if (!this.inflight) {
              n.import = imp;
              this.fireEventIfNeeded(n);
            }
          }
        }
      }
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
    } else if (element.localName === 'script' && !element.src) {
      // Inline scripts don't trigger load/error events, consider them already loaded.
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
    if (document.readyState !== 'loading') {
      callback();
    } else {
      const stateChanged = () => {
        if (document.readyState !== 'loading') {
          document.removeEventListener('readystatechange', stateChanged);
          callback();
        }
      }
      document.addEventListener('readystatechange', stateChanged);
    }
  }

  /**
   * Invokes the callback after all imports are loaded. Callback is called
   * synchronously if imports are already done loading.
   * @param {!function()} callback
   */
  const whenImportsReady = callback => {
    let imports = /** @type {!NodeList<!HTMLLinkElement>} */
      (document.querySelectorAll(rootImportSelector));
    let pending = imports.length;
    if (!pending) {
      callback();
      return;
    }
    for (let i = 0, l = imports.length, imp; i < l && (imp = imports[i]); i++) {
      whenElementLoaded(imp, () => {
        if (--pending === 0) {
          callback();
        }
      });
    }
  }

  /**
   * Returns the link that imported the element.
   * @param {!Node} element
   * @return {HTMLLinkElement|Document|undefined}
   */
  const importForElement = element => {
    if (useNative) {
      return element.ownerDocument;
    }
    let owner = element['__ownerImport'];
    if (!owner) {
      owner = element;
      // Walk up the parent tree until we find an import.
      while ((owner = owner.parentNode || owner.host) && !isImportLink(owner)) {}
      element['__ownerImport'] = owner;
    }
    return owner;
  }

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
      (document.querySelectorAll(importSelector));
    for (let i = 0, l = imps.length, imp; i < l && (imp = imps[i]); i++) {
      if (!imp.import || imp.import.readyState !== 'loading') {
        imp['__loaded'] = true;
      }
    }
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
    new Importer();
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

})(window.HTMLImports = (window.HTMLImports || {}));
