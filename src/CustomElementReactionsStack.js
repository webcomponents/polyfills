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
    this._queueStart = [];

    /**
     * @private
     * @type {number}
     */
    this._queueCount = 0;

    /**
     * @private
     * @type {boolean}
     */
    this._processingTheBackupElementQueue = false;
  }

  pushQueue() {
    this._queueStart[this._queueCount++] = this._length;
  }

  popQueue() {
    const stack = this._stack;
    const queueStart = this._queueStart[--this._queueCount];
    const queueEnd = this._length;

    for (let i = queueStart; i < queueEnd; i++) {
      const element = stack[i];
      stack[i] = undefined;

      // Drain the element's reaction queue.
      while (element.__CE_queueFront) {
        const reaction = element.__CE_queueFront;
        element.__CE_queueFront = reaction.__CE_next;
        reaction();
      }
    }

    this._length = queueStart;
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

    if (this._queueCount === 0) {
      this.pushQueue();
      this._stack[this._length++] = element;

      if (this._processingTheBackupElementQueue) return;
      this._processingTheBackupElementQueue = true;

      Promise.resolve().then(() => {
        this.popQueue();
        this._processingTheBackupElementQueue = false;
      });
    } else {
      this._stack[this._length++] = element;
    }
  }
};
