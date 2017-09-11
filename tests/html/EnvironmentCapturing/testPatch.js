window.PATCHES = (function() {
  const targets = [
    'Document',
    'DocumentFragment',
    'Element',
    'HTMLElement',
    'Node',
  ];

  const PATCHES = new Map();
  PATCHES.__allow = true;
  PATCHES.disallowWithin = function(fn) {
    PATCHES.__allow = false;
    fn();
    PATCHES.__allow = true;
  };

  for (const targetName of targets) {
    const targetInfo = new Map();
    PATCHES.set(targetName, targetInfo);

    const target = window[targetName];

    const properties = Object.getOwnPropertyDescriptors(target.prototype);
    for (const propertyName of Object.keys(properties)) {
      const propertyInfo = {
        allowCount: 0,
      };
      targetInfo.set(propertyName, propertyInfo);

      const descriptor = Object.getOwnPropertyDescriptor(target.prototype, propertyName);
      const newDescriptor = {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
      };

      function attemptAccess() {
        if (!PATCHES.__allow && propertyInfo.allowCount <= 0) {
          throw new Error(`Unexpected access of ${targetName}#${propertyName}.`);
        }
        propertyInfo.allowCount--;
      }

      if (descriptor.value) {
        if (descriptor.value instanceof Function) {
          const original = descriptor.value;
          newDescriptor.value = function() {
            attemptAccess();
            return original.apply(this, arguments);
          };

          propertyInfo.value = original;
        }
      }

      if (descriptor.get) {
        const original = descriptor.get;
        newDescriptor.get = function() {
          attemptAccess();
          return original.apply(this, arguments);
        };

        propertyInfo.get = original;
      }

      if (descriptor.set) {
        const original = descriptor.set;
        newDescriptor.set = function() {
          attemptAccess();
          return original.apply(this, arguments);
        };

        propertyInfo.set = original;
      }

      Object.defineProperty(target.prototype, propertyName, newDescriptor);
    }
  }

  return PATCHES;
})();
