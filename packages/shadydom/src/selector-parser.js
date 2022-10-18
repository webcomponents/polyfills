/**
 * @license
 * Copyright (c) 2022 The Polymer Project Authors
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * A map describing parentheses-like grouping characters and their behavior. The
 * keys are the group's start character and the value's `end` property contains
 * the end character. The `matchNestedParens` property indicates whether or not
 * other grouping characters nested in the group retain their grouping behavior
 * within that group - i.e. if nested grouping characters need to be matched.
 *
 * @type {!Map<string, {end: string, matchNestedParens: boolean}>}
 */
const PARENS = new Map();
// IE 11 doesn't support `Map`'s constructor parameter.
[
  ['(', {end: ')', matchNestedParens: true}],
  ['[', {end: ']', matchNestedParens: true}],
  ['"', {end: '"', matchNestedParens: false}],
  ["'", {end: "'", matchNestedParens: false}],
].forEach(([k, v]) => {
  PARENS.set(k, v);
});

/**
 * Finds the first character of `queryChars` within `str` from index `start`
 * onwards that is _not_ nested within any parentheses, brackets, or
 * single/double-quoted strings or part of an escape sequence.
 *
 * If the end of the string is reached without finding a character in
 * `queryChars`, the length of the string is returned.
 *
 * @param {string} str
 * @param {number} start
 * @param {!Array<string>} queryChars
 * @param {boolean} matchNestedParens
 * @return {number}
 */
const findNext = (str, start, queryChars, matchNestedParens = true) => {
  for (let i = start; i < str.length; i++) {
    if (str[i] === '\\' && i < str.length - 1 && str[i + 1] !== '\n') {
      // Skip escape sequences.
      i++;
    } else if (queryChars.indexOf(str[i]) !== -1) {
      // One of `queryChars` was found.
      return i;
    } else if (matchNestedParens && PARENS.has(str[i])) {
      // Handle any grouping characters by skipping over the group.
      const parenInfo = PARENS.get(str[i]);
      i = findNext(str, i + 1, [parenInfo.end], parenInfo.matchNestedParens);
      continue;
    }

    // Do nothing, let `i++` happen.
  }

  // Reached the end of the string without finding a final char.
  return str.length;
};

/**
 * Arrays of compound selectors and combinators that form a complex selector
 * when interleaved.
 *
 * @typedef {{
 *   compoundSelectors: !Array<string>,
 *   combinators: !Array<string>,
 * }}
 */
export let ComplexSelectorParts;

/**
 * Splits a selector list into individual complex selectors and creates a
 * `ComplexSelectorParts` for each.
 *
 * @param {string} str
 * @return {!Array<!ComplexSelectorParts>}
 */
export const parseSelectorList = (str) => {
  /**
   * @type {!Array<!ComplexSelectorParts>}
   */
  const results = [];

  /**
   * Compound selectors and combinators parsed from the current complex
   * selector.
   *
   * @type {!Array<string>}
   */
  const chunks = [];

  /**
   * Creates a new `ComplexSelectorParts` from the current `chunks`, pushes it
   * into `results` and resets `chunks`.
   */
  const endComplexSelector = () => {
    if (chunks.length > 0) {
      while (chunks[chunks.length - 1] === ' ') {
        chunks.pop();
      }
      results.push({
        compoundSelectors: chunks.filter((x, i) => i % 2 === 0),
        combinators: chunks.filter((x, i) => i % 2 === 1),
      });
      chunks.length = 0;
    }
  };

  for (let i = 0; i < str.length; ) {
    const prevChunk = chunks[chunks.length - 1];
    // `nextIndex` is the next complex selector boundary, combinator, or
    // whitespace that isn't inside other grouping characters.
    const nextIndex = findNext(str, i, [',', ' ', '>', '+', '~']);
    // If `nextIndex` is `i`, then the chunk we're considering is only the next
    // single character.
    const nextChunk = nextIndex === i ? str[i] : str.substring(i, nextIndex);

    if (nextChunk === ',') {
      endComplexSelector();
    } else if (
      [undefined, ' ', '>', '+', '~'].indexOf(prevChunk) !== -1 &&
      nextChunk === ' '
    ) {
      // Ignore leading whitespace and whitespace directly after combinators.
    } else if (prevChunk === ' ' && ['>', '+', '~'].indexOf(nextChunk) !== -1) {
      // If the last chunk was whitespace and this chunk is a non-whitespace
      // combinator, replace the whitespace with this combinator.
      chunks[chunks.length - 1] = nextChunk;
    } else {
      chunks.push(nextChunk);
    }

    i = nextIndex + (nextIndex === i ? 1 : 0);
  }

  endComplexSelector();

  return results;
};
