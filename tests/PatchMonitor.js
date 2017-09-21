window.PatchMonitor = (function() {
  let enableGuard = false;
  let insideGuard = false;

  function createGuard({original, target, propertyName}) {
    return function() {
      if (!enableGuard) {
        return original.apply(this, arguments);
      }

      try {
        if (insideGuard) {
          throw new Error(`Unexpected access of '${propertyName}'.`);
        }
        insideGuard = true;
        return original.apply(this, arguments);
      } finally {
        insideGuard = false;
      }
    };
  }

  const PatchMonitor = {
    runGuarded(fn) {
      let oldState = enableGuard;
      enableGuard = true;
      try {
        fn();
      } finally {
        enableGuard = oldState;
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
          newDescriptor.value = createGuard({
            original, target, propertyName
          });
        }

        if (descriptor.get) {
          const original = descriptor.get;
          newDescriptor.get = createGuard({
            original, target, propertyName
          });
        }

        if (descriptor.set) {
          const original = descriptor.set;
          newDescriptor.set = createGuard({
            original, target, propertyName
          });
        }

        if (descriptor.configurable) {
          Object.defineProperty(target, propertyName, newDescriptor);
        }
      }
    },
  };

  return PatchMonitor;
})();
