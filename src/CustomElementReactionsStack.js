export default class CustomElementReactionsStack {
  constructor() {
    this._stack = new Array(16);
    this._length = 0;
    this._frames = 0;
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

      while (element.__CE_nextReaction) {
        const reaction = element.__CE_nextReaction;
        element.__CE_nextReaction = reaction.__CE_next;
        if (element.__CE_lastReaction === reaction) {
          element.__CE_lastReaction = undefined;
        }
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
    // If there are any pending reactions, insert this one at the end.
    if (element.__CE_lastReaction) {
      element.__CE_lastReaction.__CE_next = reaction;
      element.__CE_lastReaction = reaction;
    }

    // If there are no pending reactions, this reaction is next.
    if (!element.__CE_nextReaction) {
      element.__CE_nextReaction = reaction;
    }

    element.__CE_lastReaction = reaction;

    if (this._frames === 0) {
      throw new Error('Backup queue unimplemented.');
    } else {
      this._stack[this._length++] = element;
    }
  }
};
