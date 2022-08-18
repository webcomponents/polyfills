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

const PARENS = {
  '(': ')',
  '[': ']',
};

const STRINGS = {
  '"': '"',
  "'": "'",
};

const findNext = (str, queryChars, withGroupings = true) => {
  let before = '';
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\\' && i < str.length - 1 && str[i + 1] !== '\n') {
      // Skip escaped character.
      i++;
    } else if (queryChars.includes(str[i])) {
      return i;
    } else if (withGroupings && PARENS[str[i]]) {
      i += findNext(str.substring(i + 1), [PARENS[str[i]]], withGroupings);
      continue;
    } else if (withGroupings && STRINGS[str[i]]) {
      i += findNext(str.substring(i + 1), [STRINGS[str[i]]], false);
      continue;
    }

    // Do nothing, let `i++` happen.
  }

  // Reached the end of the string without finding a final char.
  return str.length;
};

const COMBINATORS = [' ', '>', '~', '+'];

/**
 * @param {string} str
 * @return {!ComplexSelectorParts}
 */
const parseComplexSelector = (str) => {
  /**
   * @type {!Array<string>}
   */
  let chunks = [];

  while (str.length) {
    const index = findNext(str, COMBINATORS);
    if (index === 0) {
      chunks.push(str[0]);
      str = str.substring(1);
    } else {
      chunks.push(str.substring(0, index));
      str = str.substring(index);
    }
  }

  // Remove leading whitespace.
  while (chunks[0] === ' ') {
    chunks.shift();
  }

  // Remove trailing whitespace.
  while (chunks[chunks.length - 1] === ' ') {
    chunks.pop();
  }

  // Remove whitespace next to combinators.
  chunks = chunks.filter((x, i) => {
    return !(
      x === ' ' &&
      (COMBINATORS.includes(chunks[i - 1]) ||
        COMBINATORS.includes(chunks[i + 1]))
    );
  });

  /**
   * @type {!Array<string>}
   */
  const compoundSelectors = [];

  /**
   * @type {!Array<string>}
   */
  const combinators = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i % 2 === 0) {
      compoundSelectors.push(chunks[i]);
    } else {
      combinators.push(chunks[i]);
    }
  }

  return {
    compoundSelectors,
    combinators,
  };
};

/**
 * @param {string} str
 * @return {!Array<!ComplexSelectorParts>}
 */
export const parseSelectorList = (str) => {
  const results = [];

  while (str.length) {
    const index = findNext(str, [',']);
    results.push(parseComplexSelector(str.substring(0, index)));
    str = str.substring(index + 1);
  }

  return results;
};
