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
 * @type {!Map<string, {end: string, matchNestedParens: boolean}>}
 */
const PARENS = new Map([
  ['(', {end: ')', matchNestedParens: true}],
  ['[', {end: ']', matchNestedParens: true}],
  ['"', {end: '"', matchNestedParens: false}],
  ["'", {end: "'", matchNestedParens: false}],
]);

/**
 * @param {string} str
 * @param {!Array<string>} queryChars
 * @param {boolean} matchNestedParens
 * @return {number}
 */
const findNext = (str, queryChars, matchNestedParens = true) => {
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\\' && i < str.length - 1 && str[i + 1] !== '\n') {
      // Skip escaped character.
      i++;
    } else if (queryChars.includes(str[i])) {
      return i;
    } else if (matchNestedParens && PARENS.has(str[i])) {
      const parenInfo = PARENS.get(str[i]);
      i += findNext(
        str.substring(i + 1),
        [parenInfo.end],
        parenInfo.matchNestedParens
      );
      continue;
    }

    // Do nothing, let `i++` happen.
  }

  // Reached the end of the string without finding a final char.
  return str.length;
};

/**
 * @type {!Array<string>}
 */
const COMBINATORS = [' ', '>', '~', '+'];

/**
 * @param {string} str
 * @return {!ComplexSelectorParts}
 */
const parseComplexSelector = (str) => {
  str = str.trim();

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

  // Remove whitespace next to combinators.
  chunks = chunks.filter((x, i) => {
    return !(
      x === ' ' &&
      (COMBINATORS.includes(chunks[i - 1]) ||
        COMBINATORS.includes(chunks[i + 1]))
    );
  });

  return {
    compoundSelectors: chunks.filter((x, i) => i % 2 === 0),
    combinators: chunks.filter((x, i) => i % 2 === 1),
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
