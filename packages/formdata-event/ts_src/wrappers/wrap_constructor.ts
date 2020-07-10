export const wrapConstructor = (Wrapper: any, Constructor: any, prototype: any) => {
  for (const prop of Object.keys(Constructor)) {
    // `Event.prototype` is not writable or configurable in Safari 9. We
    // overwrite it immediately after, so we might as well not copy it.
    if (prop === 'prototype') {
      continue;
    }

    Object.defineProperty(Wrapper, prop,
        Object.getOwnPropertyDescriptor(Constructor, prop) as PropertyDescriptor);
  }
  Wrapper.prototype = prototype;
  // `Event.prototype.constructor` is not writable in Safari 9, so we have to
  // define it with `defineProperty`.
  Object.defineProperty(Wrapper.prototype, 'constructor', {
    writable: true,
    configurable: true,
    enumerable: false,
    value: Wrapper,
  });
};
