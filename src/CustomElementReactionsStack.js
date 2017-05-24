/**
 * https://html.spec.whatwg.org/#custom-element-reactions-stack
 *
 * Implements the custom element reactions stack. Thanks to @dominiccooney for
 * the single array and auto-generated backup queue ideas.
 */
export default class CustomElementReactionsStack {
  constructor() {
    /**
     * @private
     * @type {!Array<!Element|undefined>}
     */
    this._stack = [];

    /**
     * The total size of all element queues on the stack and the end index of
     * the last queue.
     * @private
     * @type {number}
     */
    this._length = 0;

    /**
     * `_queueStart[i]` is the start index of queue `i` and the (exclusive) end
     * index of queue `i - 1`.
     * @private
     * @type {!Array<number>}
     */
    this._queueStart = [];

    /**
     * The number of element queues currently on the stack.
     * @private
     * @type {number}
     */
    this._queueCount = 0;

    /**
     * True if a microtask to flush the backup element queue is scheduled but
     * has not yet run.
     * @private
     * @type {boolean}
     */
    this._processingTheBackupElementQueue = false;
  }

  /**
   * Pushes a new element queue onto the reactions stack. Must be called when
   * entering any API marked with `CEReactions`.
   *
   * https://html.spec.whatwg.org/#cereactions
   */
  pushQueue() {
    this._queueStart[this._queueCount++] = this._length;
  }

  /**
   * Pops and flushes the top-most queue of the reactions stack. Must be called
   * when exiting any API marked with `CEReactions`.
   */
  popQueue() {
    const stack = this._stack;
    const queueStart = this._queueStart[--this._queueCount];
    const queueEnd = this._length;

    for (let i = queueStart; i < queueEnd; i++) {
      const element = stack[i];
      stack[i] = undefined;

      // Drain the element's reaction queue.
      while (element.__CE_queueFront) {
        // This *must* be implemented by removing the first item of the reaction
        // queue from the element rather than using `__CE_next` of the last
        // reaction. A reaction may cause more reactions to be enqueued and the
        // element's reaction queue to be flushed, so `__CE_next` of the last
        // reaction may not actually point to the next reaction in the queue.
        const reaction = element.__CE_queueFront;
        element.__CE_queueFront = reaction.__CE_next;
        reaction();
      }
    }

    this._length = queueStart;
  }

  /**
   * Enqueues a reaction for a given element and enqueue the element in the
   * top-most element queue or the backup queue, if there are no element queues
   * on the stack.
   *
   * Elements' reaction queues are stored a linked list of functions with the
   * first stored on the element as `__CE_queueFront` and each following
   * function on the previous one as `__CE_next`.
   * @param {!Element} element
   * @param {!Function} reaction
   */
  enqueueReaction(element, reaction) {
    // Insert the reaction into the element's reaction queue.
    if (element.__CE_queueFront) {
      // The reaction queue doesn't seem to grow larger than one reaction very
      // often. Maintaining a separate reference to the last reaction - which
      // has to be checked at every enqueue / dequeue - ends up being more
      // expensive than walking to the end in the uncommon case.
      let last = element.__CE_queueFront;
      while (last.__CE_next) {
        last = last.__CE_next;
      }
      last.__CE_next = reaction;
    } else {
      element.__CE_queueFront = reaction;
    }

    // Insert the element into the top-most element queue or the backup queue,
    // if there are none.
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
