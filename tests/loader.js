ShadyDOM = {force: true, noPatch: window.location.search.match('noPatch')};

// TODO(sorvell): noPatching does not work with the custom elements polyfill.
// IF the polyfill used `ShadyDOM.wrap` throughout, it could be made to work.
if (window.customElements) {
  customElements.forcePolyfill = window.location.search.match('forceCustomElements');
}

const loadScript = (src) => {
  document.write(`<script src="${src}">${'<'}/script>`);
}

const loadCE = () => loadScript('../node_modules/@webcomponents/custom-elements/custom-elements.min.js');
const loadSD = () => loadScript('../shadydom.min.js');

// script ordering must change based on patching.
if (ShadyDOM.noPatch) {
  loadCE();
  loadSD();
} else {
  loadSD();
  loadCE();
}

// Ensure customElements are updated when document is ready.
if (customElements.polyfillWrapFlushCallback) {
  customElements.polyfillWrapFlushCallback(function(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else {
      cb();
    }
  });
}