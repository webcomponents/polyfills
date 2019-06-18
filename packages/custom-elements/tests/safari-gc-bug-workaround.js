export function ensureCEPolyfill() {
  return new Promise((resolve, reject) => {
    if (customElements.polyfillWrapFlushCallback === undefined) {
      import('../custom-elements.min.js')
        .then(() => resolve())
        .catch(() => reject());
    } else {
      resolve();
    }
  });
}
