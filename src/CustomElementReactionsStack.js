export default class CustomElementReactionsStack {
  constructor() {
    this._stack = [];
    this._length = 0;
    this._frames = 0;
    this._backupElementQueue = [];
    this._processingTheBackupElementQueue = false;
  }

  /**
   * @template T
   * @param {!function():T} fn
   * @return {T}
   */
  runInFrame(fn) {
    const frameStart = this._length;
    this._frames++;
    const result = fn();
    this._frames--;
    const frameEnd = this._length;

    for (let i = frameStart; i < frameEnd; i++) {
      const element = this._stack[i];
      this._stack[i] = undefined;

      // Drain the element's reaction queue.
      while (element.__CE_queueFront) {
        const reaction = element.__CE_queueFront;
        element.__CE_queueFront = reaction.__CE_next;
        reaction();
      }
    }

    this._length = frameStart;

    return result;
  }

  /**
   * @param {!Element} element
   * @param {!Function} reaction
   */
  enqueueReaction(element, reaction) {
    if (element.__CE_queueFront) {
      let last = element.__CE_queueFront;
      while (last.__CE_next) {
        last = last.__CE_next;
      }
      last.__CE_next = reaction;
    } else {
      element.__CE_queueFront = reaction;
    }

    if (this._frames === 0) {
      this._backupElementQueue.push(element);

      if (this._processingTheBackupElementQueue) return;
      this._processingTheBackupElementQueue = true;

      Promise.resolve().then(() => {
        while (this._backupElementQueue.length) {
          const element = this._backupElementQueue.shift();

          // Drain the element's reaction queue.
          while (element.__CE_queueFront) {
            const reaction = element.__CE_queueFront;
            element.__CE_queueFront = reaction.__CE_next;
            reaction();
          }
        }
        this._processingTheBackupElementQueue = false;
      });
    } else {
      this._stack[this._length++] = element;
    }
  }
};
