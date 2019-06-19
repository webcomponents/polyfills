export function safariGCBugWorkaround() {
  if (customElements.polyfillWrapFlushCallback === undefined) {
    console.warn('The custom elements polyfill was reinstalled.');
    window.__CE_installPolyfill();
  }
}
