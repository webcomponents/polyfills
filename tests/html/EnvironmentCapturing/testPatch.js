window.PATCHES = (function() {
  const targets = [
    'Document',
    'DocumentFragment',
    'Element',
    'HTMLElement',
    'Node',
  ];

  const PATCHES = new Map();
  PATCHES.__currentDepth = -Infinity;
  PATCHES.__maxDepth = 0;
  PATCHES.allowDepth = function(maxDepth, fn) {
    PATCHES.__currentDepth = 0;
    PATCHES.__maxDepth = maxDepth;
    fn();
    PATCHES.__currentDepth = -Infinity;
    PATCHES.__maxDepth = 0;
  };

  for (const targetName of targets) {
    const targetInfo = new Map();
    PATCHES.set(targetName, targetInfo);

    const target = window[targetName];

    const properties = Object.getOwnPropertyDescriptors(target.prototype);
    for (const propertyName of Object.keys(properties)) {
      const propertyInfo = {};
      targetInfo.set(propertyName, propertyInfo);

      const descriptor = Object.getOwnPropertyDescriptor(target.prototype, propertyName);
      const newDescriptor = {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
      };

      function depthGuard(original) {
        return function() {
          PATCHES.__currentDepth++;
          try {
            if (PATCHES.__currentDepth > PATCHES.__maxDepth) {
              throw new Error(`Unexpected access of ${targetName}#${propertyName}.`);
            }
            return original.apply(this, arguments);
          } finally {
            PATCHES.__currentDepth--;
          }
        };
      }

      if (descriptor.value) {
        if (descriptor.value instanceof Function) {
          const original = descriptor.value;
          newDescriptor.value = depthGuard(original);
          propertyInfo.value = original;
        }
      }

      if (descriptor.get) {
        const original = descriptor.get;
        newDescriptor.get = depthGuard(original);
        propertyInfo.get = original;
      }

      if (descriptor.set) {
        const original = descriptor.set;
        newDescriptor.set = depthGuard(original);
        propertyInfo.set = original;
      }

      Object.defineProperty(target.prototype, propertyName, newDescriptor);
    }
  }

  return PATCHES;
})();
