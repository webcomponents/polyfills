export function safariGCBugWorkaround() {
  if (customElements.polyfillWrapFlushCallback === undefined) {
    window.__CE_installPolyfill();
  }
}
