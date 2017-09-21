window.PATCHES = (function() {
  let enableReentrancyGuard = false;
  let insideReentrancyGuard = false;

  function createReentrancyGuard({original, target, propertyName}) {
    return function() {
      if (!enableReentrancyGuard) {
        return original.apply(this, arguments);
      }

      try {
        if (insideReentrancyGuard) {
          throw new Error(`Unexpected access of '${propertyName}'.`);
        }
        insideReentrancyGuard = true;
        return original.apply(this, arguments);
      } finally {
        insideReentrancyGuard = false;
      }
    };
  }

  const PATCHES = {
    runWithReentrancyGuard(fn) {
      let oldState = enableReentrancyGuard;
      enableReentrancyGuard = true;
      try {
        fn();
      } finally {
        enableReentrancyGuard = oldState;
      }
    },

    collect(targets) {
      const patchRecords = [];

      for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
        const target = targets[targetIndex];

        const propertyNames = Object.getOwnPropertyNames(target);
        for (let propertyNameIndex = 0; propertyNameIndex < propertyNames.length; propertyNameIndex++) {
          const propertyName = propertyNames[propertyNameIndex];

          patchRecords.push({
            target: target,
            propertyName: propertyName,
          });
        }
      }

      return patchRecords;
    },

    wrap(records) {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const target = record.target;
        const propertyName = record.propertyName;

        const descriptor = Object.getOwnPropertyDescriptor(target, propertyName);
        const newDescriptor = {
          configurable: descriptor.configurable,
          enumerable: descriptor.enumerable,
        };

        if (descriptor.value && descriptor.value instanceof Function) {
          const original = descriptor.value;
          newDescriptor.value = createReentrancyGuard({
            original, target, propertyName
          });
        }

        if (descriptor.get) {
          const original = descriptor.get;
          newDescriptor.get = createReentrancyGuard({
            original, target, propertyName
          });
        }

        if (descriptor.set) {
          const original = descriptor.set;
          newDescriptor.set = createReentrancyGuard({
            original, target, propertyName
          });
        }

        if (descriptor.configurable) {
          Object.defineProperty(target, propertyName, newDescriptor);
        }
      }
    },
  };

  return PATCHES;
})();
