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
var IMPORT_LINK_TYPE = 'import';
var IMPORT_SELECTOR = 'link[rel=' + IMPORT_LINK_TYPE + ']';
var useNative = Boolean(IMPORT_LINK_TYPE in document.createElement('link'));
var flags = {bust: false, log: false};

/**
  Support `currentScript` on all browsers as `document._currentScript.`

  NOTE: We cannot polyfill `document.currentScript` because it's not possible
  both to override and maintain the ability to capture the native value.
  Therefore we choose to expose `_currentScript` both when native imports
  and the polyfill are in use.
*/
// NOTE: ShadowDOMPolyfill intrusion.
var hasShadowDOMPolyfill = Boolean(window.ShadowDOMPolyfill);
var wrap = function(node) {
  return hasShadowDOMPolyfill ? window.ShadowDOMPolyfill.wrapIfNeeded(node) : node;
};
var rootDocument = wrap(document);

var currentScriptDescriptor = {
  get: function() {
    var script = scope.currentScript || document.currentScript ||
        // NOTE: only works when called in synchronously executing code.
        // readyState should check if `loading` but IE10 is
        // interactive when scripts run so we cheat.
        (document.readyState !== 'complete' ?
        document.scripts[document.scripts.length - 1] : null);
    return wrap(script);
  },
  configurable: true
};

Object.defineProperty(document, '_currentScript', currentScriptDescriptor);
Object.defineProperty(rootDocument, '_currentScript', currentScriptDescriptor);

/********************* path fixup *********************/
var ABS_URL_TEST = /(^\/)|(^#)|(^[\w-\d]*:)/;
var CSS_URL_REGEXP = /(url\()([^)]*)(\))/g;
var CSS_IMPORT_REGEXP = /(@import[\s]+(?!url\())([^;]*)(;)/g;

// path fixup: style elements in imports must be made relative to the main
// document. We fixup url's in url() and @import.
var path = {

  resolveUrlsInStyle: function(style, linkUrl) {
    style.textContent = this.resolveUrlsInCssText(style.textContent, linkUrl);
  },

  resolveUrlsInCssText: function(cssText, linkUrl) {
    var r = this.replaceUrls(cssText, linkUrl, CSS_URL_REGEXP);
    r = this.replaceUrls(r, linkUrl, CSS_IMPORT_REGEXP);
    return r;
  },

  replaceUrls: function(text, linkUrl, regexp) {
    return text.replace(regexp, function(m, pre, url, post) {
      var urlPath = url.replace(/["']/g, '');
      if (linkUrl) {
        urlPath = (new URL(urlPath, linkUrl)).href;
      }
      return pre + '\'' + urlPath + '\'' + post;
    });
  },

  replaceAttrUrl: function(text, linkUrl) {
    if (text && ABS_URL_TEST.test(text)) {
      return text;
    } else {
      return new URL(text, linkUrl).href;
    }
  }

};

/********************* xhr processor *********************/
var xhr = {
  async: true,

  ok: function(request) {
    return (request.status >= 200 && request.status < 300)
        || (request.status === 304)
        || (request.status === 0);
  },

  load: function(url, next, nextContext) {
    var request = new XMLHttpRequest();
    if (flags.bust) {
      url += '?' + Math.random();
    }
    request.open('GET', url, xhr.async);
    request.addEventListener('readystatechange', function(e) {
      if (request.readyState === 4) {
        // Servers redirecting an import can add a Location header to help us
        // polyfill correctly.
        var redirectedUrl = null;
        try {
          var locationHeader = request.getResponseHeader("Location");
          if (locationHeader) {
            redirectedUrl = (locationHeader.substr( 0, 1 ) === "/")
              ? location.origin + locationHeader  // Location is a relative path
              : locationHeader;                   // Full path
          }
        } catch ( e ) {
            console.error( e.message );
        }
        next.call(nextContext, !xhr.ok(request) && request,
            request.response || request.responseText, redirectedUrl);
      }
    });
    request.send();
    return request;
  },

  loadDocument: function(url, next, nextContext) {
    this.load(url, next, nextContext).responseType = 'document';
  }

};

/********************* loader *********************/
// This loader supports a dynamic list of urls
// and an oncomplete callback that is called when the loader is done.
// NOTE: The polyfill currently does *not* need this dynamism or the
// onComplete concept. Because of this, the loader could be simplified
// quite a bit.
var Loader = function(onLoad, onComplete) {
  this.cache = {};
  this.onload = onLoad;
  this.oncomplete = onComplete;
  this.inflight = 0;
  this.pending = {};
};

Loader.prototype = {

  addNodes: function(nodes) {
    // number of transactions to complete
    this.inflight += nodes.length;
    // commence transactions
    for (var i=0, l=nodes.length, n; (i<l) && (n=nodes[i]); i++) {
      this.require(n);
    }
    // anything to do?
    this.checkDone();
  },

  addNode: function(node) {
    // number of transactions to complete
    this.inflight++;
    // commence transactions
    this.require(node);
    // anything to do?
    this.checkDone();
  },

  require: function(elt) {
    var url = elt.src || elt.href;
    // deduplication
    if (!this.dedupe(url, elt)) {
      // fetch this resource
      this.fetch(url, elt);
    }
  },

  dedupe: function(url, elt) {
    if (this.pending[url]) {
      // add to list of nodes waiting for inUrl
      this.pending[url].push(elt);
      // don't need fetch
      return true;
    }
    var resource;
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
  },

  fetch: function(url, elt) {
    flags.log && console.log('fetch', url, elt);
    if (!url) {
      setTimeout(this.receive.bind(this, url, elt, {
        error: 'href must be specified'
      }, null), 0);
    } else if (url.match(/^data:/)) {
      // Handle Data URI Scheme
      var pieces = url.split(',');
      var header = pieces[0];
      var body = pieces[1];
      if(header.indexOf(';base64') > -1) {
        body = atob(body);
      } else {
        body = decodeURIComponent(body);
      }
      setTimeout(this.receive.bind(this, url, elt, null, body), 0);
    } else {
      xhr.load(url, this.receive.bind(this, url, elt));
    }
  },

  receive: function(url, elt, err, resource, redirectedUrl) {
    this.cache[url] = resource;
    var $p = this.pending[url];
    for (var i=0, l=$p.length, p; (i<l) && (p=$p[i]); i++) {
      // If url was redirected, use the redirected location so paths are
      // calculated relative to that.
      this.onload(url, p, resource, err, redirectedUrl);
      this.tail();
    }
    this.pending[url] = null;
  },

  tail: function() {
    --this.inflight;
    this.checkDone();
  },

  checkDone: function() {
    if (!this.inflight) {
      this.oncomplete();
    }
  }
};

/********************* importer *********************/
var importsSelectors = [
    IMPORT_SELECTOR,
    'link[rel=stylesheet]:not([type])',
    'style:not([type])',
    'script:not([type])',
    'script[type="application/javascript"]',
    'script[type="text/javascript"]'
  ].join(',');

// importer
// highlander object to manage loading of imports
// for any document, importer:
// - loads any linked import documents (with deduping)
// - whenever an import is loaded, prompts the parser to try to parse
// - observes imported documents for new elements (these are handled via the
// dynamic importer)
var importer = {

  documents: {},

  loadNode: function(node) {
    importLoader.addNode(node);
  },

  // load all loadable elements within the parent element
  loadSubtree: function(parent) {
    var nodes = parent.querySelectorAll(IMPORT_SELECTOR);
    // add these nodes to loader's queue
    importLoader.addNodes(nodes);
  },

  loaded: function(url, elt, resource, err, redirectedUrl) {
    flags.log && console.log('loaded', url, elt);
    // store generic resource
    // TODO(sorvell): fails for nodes inside <template>.content
    // see https://code.google.com/p/chromium/issues/detail?id=249381.
    elt.__resource = resource;
    elt.__error = err;
    if (isImportLink(elt)) {
      var doc = this.documents[url];
      // if we've never seen a document at this url
      if (doc === undefined) {
        // generate an HTMLDocument from data
        doc = err ? null : makeDocument(resource, redirectedUrl || url);
        if (doc) {
          doc.__importLink = elt;
          // note, we cannot use MO to detect parsed nodes because
          // SD polyfill does not report these as mutations.
          this.bootDocument(doc);
        }
        // cache document
        this.documents[url] = doc;
      }
      // don't store import record until we're actually loaded
      // store document resource
      elt.__doc = doc;
    }
  },

  bootDocument: function(doc) {
    this.loadSubtree(doc);
  },

  loadedAll: function() {
    this._flatten(document);
    runScripts();
    this._fireEvents(document);
    this.observe(document.head);
  },

  _flatten: function(element) {
    const n$ = element.querySelectorAll(IMPORT_SELECTOR);
    for (let i = 0, l = n$.length, n; i < l && (n = n$[i]); i++) {
      n.import = this.documents[n.href];
      if (n.import && !n.import.__firstImport) {
        n.import.__firstImport = n;
        this._flatten(n.import);
        if (!n.import.parentNode) {
          // Get pending stylesheets, init the __pendingResources array.
          var styles = n.import.querySelectorAll('link[rel=stylesheet][href]');
          n.import.__pendingResources = Array.from(styles).map(getLoadingDonePromise);
          n.appendChild(n.import);
          if (document.contains(n.parentNode)) {
            // TODO(sorvell): need to coordinate with observer in document.head.
            //this.observe(n.import);
          }
        }
      }
    }
  },

  _fireEvents: function(element) {
    const n$ = element.querySelectorAll(IMPORT_SELECTOR);
    for (let i = 0, l = n$.length, n; i < l && (n = n$[i]); i++) {
      if (n.__loaded === undefined) {
        n.__loaded = false;
        const eventType = n.import ? 'load' : 'error';
        flags.log && console.warn('fire', eventType, n.href);
        Promise.all(n.import ? n.import.__pendingResources : []).then(() => {
          n.__loaded = true;
          n.dispatchEvent(new CustomEvent(eventType));
        });
      }
    }
  },

  observe: function(element) {
    if (element.__importObserver) {
      return;
    }
    element.__importObserver = new MutationObserver(function (mxns) {
      mxns.forEach(function(m) {
        if (m.addedNodes) {
          for (var i=0; i < m.addedNodes.length; i++) {
            var p = m.addedNodes[i];
            // TODO(sorvell): x-platform matches
            if (p.nodeType === Node.ELEMENT_NODE &&
                p.matches(IMPORT_SELECTOR)) {
              importer.loadNode(p);
            }
          }
        }
      });
    });
    element.__importObserver.observe(element, {childList: true, subtree: true});
  }

};

// loader singleton to handle loading imports
var importLoader = new Loader(importer.loaded.bind(importer),
    importer.loadedAll.bind(importer));

function isImportLink(elt) {
  return isLinkRel(elt, IMPORT_LINK_TYPE);
}

function isLinkRel(elt, rel) {
  return elt.localName === 'link' && elt.getAttribute('rel') === rel;
}

function hasBaseURIAccessor(doc) {
  return !! Object.getOwnPropertyDescriptor(doc, 'baseURI');
}

/********************* vulcanize style inline processing  *********************/
var attrs = ['action', 'src', 'href', 'url', 'style'];
function fixUrlAttributes(element, base) {
  for (var i=0, l=attrs.length, a, at, v; (i<l) && (a=attrs[i]); i++) {
    at = element.attributes[a];
    v = at && at.value;
    if (v && (v.search(/({{|\[\[)/) < 0)) {
      at.value = (a === 'style') ?
        path.resolveUrlsInCssText(v, base) :
        path.replaceAttrUrl(v, base);
    }
  }
}

function fixUrlsInTemplate(template, base) {
  var content = template.content;
  var n$ = content.querySelectorAll('style, form[action], [src], [href], [url], [style]');
  for (var i=0; i < n$.length; i++) {
    var n = n$[i];
    if (n.localName == 'style') {
      path.resolveUrlsInStyle(n, base);
    } else {
      fixUrlAttributes(n, base);
    }
  }
  fixUrlsInTemplates(content, base);
}

function fixUrlsInTemplates(element, base) {
  var t$ = element.querySelectorAll('template');
  for (var i=0; i < t$.length; i++) {
    fixUrlsInTemplate(t$[i], base);
  }
}

function fixUrls(element, base) {
  var n$ = element.querySelectorAll(importsSelectors);
  for (var i=0; i < n$.length; i++) {
    var n = n$[i];
    if (n.href) {
      n.href = new URL(n.getAttribute('href'), base);
    }
    if (n.src) {
      n.src = new URL(n.getAttribute('src'), base);
    }
    if (n.localName == 'style') {
      path.resolveUrlsInStyle(n, base);
    }
  }
  fixUrlsInTemplates(element, base);
}

function markScripts(element, url) {
  var s$ = element.querySelectorAll('script');
  for (var i=0; i < s$.length; i++) {
    var o = s$[i];
    o.__baseURI = url;
    o.__parentImportContent = element;
  }
}

// done for security reasons. TODO(valdrin) document
function runScripts() {
  var s$ = document.querySelectorAll('import-content script');
  for (var i = 0; i < s$.length; i++) {
    var o = s$[i];
    var c = document.createElement('script');
    if (o.textContent) {
      c.textContent = o.textContent + '\n//# sourceURL=' +
        o.__baseURI + (s$.length > 1 ? i : '') + '.js';
    }
    if (o.src) {
      var src = path.replaceAttrUrl(o.getAttribute('src'), o.__baseURI);
      c.setAttribute('src', src);
      o.__parentImportContent.__pendingResources.push(getLoadingDonePromise(c));
    }
    o.parentNode.replaceChild(c, o);
  }
}

function getLoadingDonePromise(element) {
  return new Promise(resolve => {
    element.addEventListener('load', resolve);
    element.addEventListener('error', resolve);
  });
}

function fixDomModules(element, url) {
  var s$ = element.querySelectorAll('dom-module');
  for (var i=0; i < s$.length; i++) {
    var o = s$[i];
    var assetpath = o.getAttribute('assetpath') || '';
    o.setAttribute('assetpath', path.replaceAttrUrl(assetpath, url));
  }
}



function makeDocument(resource, url) {
  // TODO(valdrin): better to use a disconnected document here so that
  // elements don't upgrade until inserted into main document,
  // however, this is blocked on https://bugs.webkit.org/show_bug.cgi?id=165617
  // let doc = document.implementation.createHTMLDocument();
  var content = document.createElement('import-content');
  content.setAttribute('import-href', url);
  content.style.display = 'none';
  content.innerHTML = resource;
  markScripts(content, url);
  // TODO(sorvell): this is specific to users (Polymer) of the dom-module element.
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

var isIE = /Trident/.test(navigator.userAgent);

// call a callback when all HTMLImports in the document at call time
// (or at least document ready) have loaded.
// 1. ensure the document is in a ready state (has dom), then
// 2. watch for loading of imports and call callback when done
function whenReady(callback, doc) {
  doc = doc || rootDocument;
  // if document is loading, wait and try again
  whenDocumentReady(function() {
    watchImportsLoad(callback, doc);
  }, doc);
}

// call the callback when the document is in a ready state (has dom)
var requiredReadyState = isIE ? 'complete' : 'interactive';
var READY_EVENT = 'readystatechange';
function isDocumentReady(doc) {
  return (doc.readyState === 'complete' ||
      doc.readyState === requiredReadyState);
}

// call <callback> when we ensure the document is in a ready state
function whenDocumentReady(callback, doc) {
  if (!isDocumentReady(doc)) {
    var checkReady = function() {
      if (doc.readyState === 'complete' ||
          doc.readyState === requiredReadyState) {
        doc.removeEventListener(READY_EVENT, checkReady);
        whenDocumentReady(callback, doc);
      }
    };
    doc.addEventListener(READY_EVENT, checkReady);
  } else if (callback) {
    callback();
  }
}

function markTargetLoaded(event) {
  event.target.__loaded = true;
}

// call <callback> when we ensure all imports have loaded
function watchImportsLoad(callback, doc) {
  var imports = doc.querySelectorAll(IMPORT_SELECTOR);
  // only non-nested imports
  imports = Array.prototype.slice.call(imports).filter(function(n) {
    return !n.matches('import-content ' + IMPORT_SELECTOR);
  });
  var parsedCount = 0, importCount = imports.length, newImports = [], errorImports = [];
  function checkDone() {
    if (parsedCount == importCount && callback) {
      callback({
        allImports: imports,
        loadedImports: newImports,
        errorImports: errorImports
      });
    }
  }
  function loadedImport(e) {
    markTargetLoaded(e);
    newImports.push(this);
    parsedCount++;
    checkDone();
  }
  function errorLoadingImport(e) {
    errorImports.push(this);
    parsedCount++;
    checkDone();
  }
  if (importCount) {
    for (var i=0, imp; i<importCount && (imp=imports[i]); i++) {
      if (isImportLoaded(imp)) {
        if (imp.import) {
          newImports.push(imp);
        } else {
          errorImports.push(imp);
        }
        parsedCount++;
        checkDone();
      } else {
        imp.addEventListener('load', loadedImport);
        imp.addEventListener('error', errorLoadingImport);
      }
    }
  } else {
    checkDone();
  }
}

function isImportLoaded(link) {
  return useNative ? link.__loaded ||
      (link.import && link.import.readyState !== 'loading') :
      link.__loaded;
}

// make `whenReady` work with native HTMLImports
if (useNative) {
  new MutationObserver(function(mxns) {
    for (var i=0, l=mxns.length, m; (i < l) && (m=mxns[i]); i++) {
      if (m.addedNodes) {
        handleImports(m.addedNodes);
      }
    }
  }).observe(document.head, {childList: true});

  function handleImports(nodes) {
    for (var i=0, l=nodes.length, n; (i<l) && (n=nodes[i]); i++) {
      if (isImport(n)) {
        handleImport(n);
      }
    }
  }

  function isImport(element) {
    return element.localName === 'link' && element.rel === 'import';
  }

  function handleImport(element) {
    var loaded = element.import;
    if (loaded) {
      markTargetLoaded({target: element});
    } else {
      element.addEventListener('load', markTargetLoaded);
      element.addEventListener('error', markTargetLoaded);
    }
  }

  // make sure to catch any imports that are in the process of loading
  // when this script is run.
  (function() {
    if (document.readyState === 'loading') {
      var imports = document.querySelectorAll(IMPORT_SELECTOR);
      for (var i=0, l=imports.length, imp; (i<l) && (imp=imports[i]); i++) {
        handleImport(imp);
      }
    }
  })();

}

// Fire the 'HTMLImportsLoaded' event when imports in document at load time
// have loaded. This event is required to simulate the script blocking
// behavior of native imports. A main document script that needs to be sure
// imports have loaded should wait for this event.
whenReady(function(detail) {
  scope.ready = true;
  scope.readyTime = new Date().getTime();
  var evt = rootDocument.createEvent("CustomEvent");
  evt.initCustomEvent("HTMLImportsLoaded", true, true, detail);
  rootDocument.dispatchEvent(evt);
});

// Polyfill document.baseURI for browsers without it.
if (!document.baseURI) {
  var baseURIDescriptor = {
    get: function() {
      var base = document.querySelector('base');
      return base ? base.href : window.location.href;
    },
    configurable: true
  };

  Object.defineProperty(document, 'baseURI', baseURIDescriptor);
  Object.defineProperty(rootDocument, 'baseURI', baseURIDescriptor);
}

if (!useNative) {
  function bootstrap() {
    importer.bootDocument(document);
  }

  if (document.readyState === 'complete' ||
      (document.readyState === 'interactive' && !window.attachEvent)) {
    bootstrap();
  } else {
    document.addEventListener('DOMContentLoaded', bootstrap);
  }
}

// exports
scope.useNative = useNative;
scope.whenReady = whenReady;

})(window.HTMLImports = (window.HTMLImports || {}));
