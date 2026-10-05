// Shared by the WPT test runner plugin (see plugin.mjs) and the manual proxy
// (see ../wpt-proxy.mjs). They adjust WPT pages for documented polyfill
// limitations, so tests check registry behavior instead:
// - the polyfill's host attribute is added to each declarative shadow root
//   with shadowrootcustomelementregistry, in the page's markup and in markup
//   passed to setHTMLUnsafe() / parseHTMLUnsafe() (the parser consumes the
//   template, so the polyfill can't see its attribute);
// - `:defined` in matches(), closest() and querySelector() / querySelectorAll()
//   excludes elements the polyfill hasn't customized yet;
// - same-origin iframes get the polyfill and these shims when a test first
//   reaches their window or document.
import parse5 from 'parse5';

// Runs in the page (and in iframes), so it only uses what it's given.
// Note, a named function, since it installs itself into iframes.
export function installTestShims(window, polyfillPath, force) {
  const {
    Element,
    Document,
    DocumentFragment,
    ShadowRoot,
    HTMLIFrameElement,
  } = window;
  const patch = (proto, name, wrap) => {
    const native = proto?.[name];
    if (typeof native === 'function') {
      proto[name] = wrap(native);
    }
  };
  // Note, `:not(:defined)` becomes `:not(:defined:not(:state(...)))`, which
  // also matches elements the polyfill hasn't customized yet.
  const rewriteSelector = (selector) =>
    String(selector).replace(
      /:defined\b/g,
      ':defined:not(:state(polyfill-undefined))'
    );
  const withSelector = (native) =>
    function (selector, ...args) {
      return native.call(this, rewriteSelector(selector), ...args);
    };
  patch(Element.prototype, 'matches', withSelector);
  patch(Element.prototype, 'closest', withSelector);
  for (const proto of [
    Element.prototype,
    Document.prototype,
    DocumentFragment.prototype,
  ]) {
    patch(proto, 'querySelector', withSelector);
    patch(proto, 'querySelectorAll', withSelector);
  }
  const hostAttribute = 'polyfill-shadowrootcustomelementregistry';
  const markHosts = (html) => {
    html = String(html);
    if (!html.includes('shadowrootcustomelementregistry')) {
      return html;
    }
    // Note, a template's innerHTML keeps declarative templates as templates.
    const container = window.document.createElement('template');
    container.innerHTML = html;
    const visit = (root) => {
      for (const template of root.querySelectorAll(
        'template[shadowrootcustomelementregistry]'
      )) {
        template.parentElement?.setAttribute(hostAttribute, '');
      }
      for (const template of root.querySelectorAll('template')) {
        visit(template.content);
      }
    };
    visit(container.content);
    return container.innerHTML;
  };
  const withMarkedHosts = (native) =>
    function (html, ...args) {
      return native.call(this, markHosts(html), ...args);
    };
  patch(Element.prototype, 'setHTMLUnsafe', withMarkedHosts);
  patch(ShadowRoot.prototype, 'setHTMLUnsafe', withMarkedHosts);
  patch(Document, 'parseHTMLUnsafe', withMarkedHosts);
  // Note, an iframe's window is a separate realm, which needs its own copy.
  let source;
  const installInto = (childWindow) => {
    try {
      if (!childWindow || childWindow.CustomElementRegistryPolyfill) {
        return;
      }
      if (source === undefined) {
        const request = new window.XMLHttpRequest();
        request.open('GET', polyfillPath, false);
        request.send();
        source = request.responseText;
      }
      childWindow.CustomElementRegistryPolyfill = {force};
      childWindow.eval(source);
      childWindow.eval(
        `(${installTestShims})(window, '${polyfillPath}', ${force});`
      );
    } catch (error) {
      // Note, a cross-origin iframe can't be reached.
      window.console.warn('test shims: iframe not shimmed', error);
    }
  };
  const childWindowOf = Object.getOwnPropertyDescriptor(
    HTMLIFrameElement.prototype,
    'contentWindow'
  ).get;
  for (const name of ['contentWindow', 'contentDocument']) {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      name
    );
    Object.defineProperty(HTMLIFrameElement.prototype, name, {
      ...descriptor,
      get() {
        installInto(childWindowOf.call(this));
        return descriptor.get.call(this);
      },
    });
  }
}

const hasAttribute = (node, name) =>
  node.attrs?.some((attr) => attr.name === name);
export const markNullRegistryHosts = (html) => {
  const hostAttribute = 'polyfill-shadowrootcustomelementregistry';
  const document = parse5.parse(html);
  let changed = false;
  const visit = (node) => {
    if (
      node.tagName === 'template' &&
      hasAttribute(node, 'shadowrootcustomelementregistry') &&
      node.parentNode?.attrs &&
      !hasAttribute(node.parentNode, hostAttribute)
    ) {
      node.parentNode.attrs.push({name: hostAttribute, value: ''});
      changed = true;
    }
    node.childNodes?.forEach(visit);
    if (node.content) {
      visit(node.content);
    }
  };
  visit(document);
  // Note, only reserialized when needed, since serializing normalizes markup.
  return changed ? parse5.serialize(document) : html;
};

// The scripts that load the polyfill (forced or not) and, optionally, the
// shims, from `polyfillPath`.
export const polyfillScripts = (polyfillPath, force, testShims) =>
  `<script>window.CustomElementRegistryPolyfill = {force: ${force}};</script>` +
  `<script src="${polyfillPath}"></script>` +
  (testShims
    ? `<script>(${installTestShims})(window, '${polyfillPath}', ${force});</script>`
    : '');

// Note, after any doctype, so the page stays in standards mode.
export const injectAtStart = (html, scripts) => {
  const match =
    html.match(/<head[^>]*>/i) ?? html.match(/^\s*<!doctype[^>]*>/i);
  const at = match ? match.index + match[0].length : 0;
  return html.slice(0, at) + scripts + html.slice(at);
};
