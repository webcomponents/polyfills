/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

import * as utils from './utils'

// render enqueuer/flusher
let customElements = window.customElements;
let flushList = [];
let scheduled;
let flushCount = 0;
let flushMax = 100;
export function enqueue(callback) {
  if (!scheduled) {
    scheduled = true;
    utils.promish.then(flush);
  }
  flushList.push(callback);
}

export function flush() {
  scheduled = false;
  flushCount++;
  while (flushList.length) {
    flushList.shift()();
  }
  if (customElements && customElements.flush) {
    customElements.flush();
  }
  // continue flushing after elements are upgraded...
  const isFlushedMaxed = (flushCount > flushMax);
  if (flushList.length && !isFlushedMaxed) {
      flush();
  }
  flushCount = 0;
  if (isFlushedMaxed) {
    throw new Error('Loop detected in ShadyDOM distribution, aborting.')
  }
}

flush.list = flushList;