export default class CustomElementReactionsStack {
  constructor() {
    /**
     * @private
     * @type {!Array<!Element|undefined>}
     */
    this._stack = [];

    /**
     * @private
     * @type {number}
     */
    this._length = 0;

    /**
     * @private
     * @type {!Array<number>}
     */
    this._frameStart = [];

    /**
     * @private
     * @type {number}
     */
    this._frames = 0;

    /**
     * @private
     * @type {!Array<!Element>}
     */
    this._backupElementQueue = [];

    /**
     * @private
     * @type {boolean}
     */
    this._processingTheBackupElementQueue = false;
  }

  pushFrame() {
    this._frameStart[this._frames++] = this._length;
  }

  popFrame() {
    const stack = this._stack;
    const frameStart = this._frameStart[--this._frames];
    const frameEnd = this._length;

    for (let i = frameStart; i < frameEnd; i++) {
      const element = stack[i];
      stack[i] = undefined;

      // Drain the element's reaction queue.
      while (element.__CE_queueFront) {
        const reaction = element.__CE_queueFront;
        element.__CE_queueFront = reaction.__CE_next;
        reaction();
      }
    }

    this._length = frameStart;
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
