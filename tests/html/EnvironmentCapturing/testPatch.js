window.PATCHES = (function() {
  const targets = [
    'CustomElementRegistry',
    'Document',
    'DocumentFragment',
    'Element',
    'HTMLElement',
    'Node',
  ];

  const PATCHES = new Map();
  let currentDepth = -Infinity;
  let maxDepth = 0;
  PATCHES.allowDepth = function(max, fn) {
    currentDepth = 0;
    maxDepth = max;
    try {
      fn();
    } finally {
      currentDepth = -Infinity;
      maxDepth = 0;
    }
  };

  for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
    const targetName = targets[targetIndex];

    const targetInfo = new Map();
    PATCHES.set(targetName, targetInfo);

    const target = window[targetName];

    const propertyNames = Object.getOwnPropertyNames(target.prototype);
    for (let propertyNameIndex = 0; propertyNameIndex < propertyNames.length; propertyNameIndex++) {
      const propertyName = propertyNames[propertyNameIndex];

      const propertyInfo = {};
      targetInfo.set(propertyName, propertyInfo);

      const descriptor = Object.getOwnPropertyDescriptor(target.prototype, propertyName);
      const newDescriptor = {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
      };

      function depthGuard(original) {
        return function() {
          currentDepth++;
          try {
            if (currentDepth > maxDepth) {
              throw new Error(`Unexpected access of ${targetName}#${propertyName}.`);
            }
            return original.apply(this, arguments);
          } finally {
            currentDepth--;
          }
        };
      }

      if (descriptor.value && descriptor.value instanceof Function) {
        const original = descriptor.value;
        newDescriptor.value = depthGuard(original);
        propertyInfo.value = original;
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

      if (descriptor.configurable) {
        Object.defineProperty(target.prototype, propertyName, newDescriptor);
      }
    }
  }

  return PATCHES;
})();
