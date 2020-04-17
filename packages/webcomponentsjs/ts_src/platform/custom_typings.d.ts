declare module 'promise-polyfill/src/index.js' {
  type PromiseConstructor = typeof Promise;
  interface PromisePolyfill extends PromiseConstructor {
    _immediateFn(callback: () => void): void;
  }
  const PromisePolyfill: PromisePolyfill;
  export default PromisePolyfill;
}
