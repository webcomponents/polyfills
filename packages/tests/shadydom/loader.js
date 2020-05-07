ShadyDOM = {
  force: true,
  noPatch: window.location.search.match('noPatch=on-demand') ? 'on-demand' : !!window.location.search.match('noPatch'),
  preferPerformance: !!window.location.search.match('preferPerformance')
};

// TODO(sorvell): noPatching does not work with the custom elements polyfill.
// IF the polyfill used `ShadyDOM.wrap` throughout, it could be made to work.
if (window.customElements) {
  customElements.forcePolyfill = window.location.search.match('forceCustomElements');
}

const loadScript = (src) => {
  document.write(`<script src="${src}">${'<'}/script>`);
}

const loadCE = () => loadScript('../node_modules/@webcomponents/custom-elements/custom-elements.min.js');
const loadSD = () => loadScript('../node_modules/@webcomponents/shadydom/shadydom.min.js');

// NOTE: Would be better to install the polyfillFlushCallback here, but
// Chrome's debugger gets confused by writing an inline script and breaks
// on the wrong line, so avoid doing this.
// script ordering must change based on patching.
if (ShadyDOM.noPatch) {
  loadCE();
  loadSD();
} else {
  loadSD();
  loadCE();
}
