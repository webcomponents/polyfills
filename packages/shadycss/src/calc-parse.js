/**
 @license
 Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
 This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 Code distributed by Google as part of the polymer project is also
 subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

'use strict';

/** @enum {string} */
const CssExpressionKind = {
	CssCalcExpression: 'CssCalcExpression',
	CssOtherExpression: 'CssOtherExpression'
};

/** @typedef {{pos: number, end: number}} */
let TextSpan; // eslint-disable-line no-unused-vars

/** @typedef {{kind: CssExpressionKind, text: string, span: Text}} */
let CssOtherExpression; // eslint-disable-line no-unused-vars

/** @typedef {{kind: CssExpressionKind, text: string, span: Text, children: Array<CssExpression>}} */
let CssCalcExpression; // eslint-disable-line no-unused-vars

/** @typedef {CssOtherExpression|CssCalcExpression} */
let CssExpression; // eslint-disable-line no-unused-vars

/**
 * A Regular Expression that matches the string 'calc('
 * @const
 * @type {RegExp}
 */
const CALC_REGEXP = /calc\(/g;

/**
 * Visits and stringifies the given CssCalcExpression
 * @param {CssCalcExpression} expression
 * @param {number} depth
 * @returns {string}
 */
function visitCssCalcExpression (expression, depth) {
	return depth === 0
		? `calc(${visitCssExpressions(expression.children, depth + 1)})`
		: `(${visitCssExpressions(expression.children, depth + 1)})`;
}

/**
 * Visits and stringifies the given CSSOtherExpression
 * @param {CssOtherExpression} expression
 * @returns {string}
 */
function visitCssOtherExpression (expression) {
	return expression.text;
}

/**
 * Visits and stringifies the given CSSExpression
 * @param {CssExpression} expression
 * @param {number} depth
 * @returns {string}
 */
function visitCssExpression (expression, depth) {
	switch (expression.kind) {
		case CssExpressionKind.CssCalcExpression:
			return visitCssCalcExpression( /** @type {CssCalcExpression} */ (expression), depth);
		case CssExpressionKind.CssOtherExpression:
			return visitCssOtherExpression(/** @type {CssOtherExpression} */ (expression));
		default:
			return '';
	}
}

/**
 * Visits the given CSSExpressions and stringifies them
 * @param {Array<CssExpression>} expressions
 * @param {number} [depth=0]
 * @returns {string}
 */
function visitCssExpressions (expressions, depth = 0) {
	return expressions.map(exp => visitCssExpression(exp, /** @type {number} */ (depth))).join('');
}

/**
 * A minimal parser that checks CSS declaration values for 'calc' expressions and generates a syntax tree
 * @param {string} input
 * @param {TextSpan} offset
 * @returns {Array<CssExpression>}
 */
function parseCalc (input, offset = {pos: 0, end: input.length}) {
	let cursor = offset.pos + -1;
	const syntax = [];

	const isEOF = () => cursor >= input.length || cursor >= offset.end;
	const nextToken = () => input[++cursor];
	const peek = positions => input[cursor + positions];

	/** @type {Array<string>} */
	let readBuffer = [];
	let readingStartCursor = cursor;
	let reading = false;
	let ignore = false;

	const startReading = () => {
		readingStartCursor = cursor;
		reading = true;
	};

	const flushReadBuffer = () => {
		reading = false;
		if (readBuffer.length > 0) {
			syntax.push({
				kind: CssExpressionKind.CssOtherExpression,
				span: {
					pos: readingStartCursor,
					end: cursor
				},
				text: input.slice(readingStartCursor, cursor)
			});
		}
		readBuffer = [];
		readingStartCursor = cursor;
	};

	while (!isEOF()) {
		const next = nextToken();

		let peekIndex = 0;

		// Check if the next token leads to a 'calc' expression
		if (
			!ignore &&
			next === 'c' &&
			peek(++peekIndex) === 'a' &&
			peek(++peekIndex) === 'l' &&
			peek(++peekIndex) === 'c' &&
			peek(++peekIndex) === '('
		) {
			flushReadBuffer();

			let leftParensCount = 0;
			while (peekIndex < input.length) {
				const nextPeek = peek(peekIndex++);
				if (nextPeek === '(') {
					leftParensCount++;
				} else if (nextPeek === ')') {
					leftParensCount--;

					if (leftParensCount === 0) {
						break;
					}
				}
			}

			const span = {
				pos: cursor,
				end: cursor + peekIndex
			};

			const innerSpan = {
				pos: span.pos + 'calc('.length,
				end: span.end - 1
			};

			syntax.push({
				kind: CssExpressionKind.CssCalcExpression,
				span,
				text: input.slice(span.pos, span.end),
				children: parseCalc(input, innerSpan)
			});

			cursor = span.end;
			readingStartCursor = span.end;
			reading = true;
		} else {
			// The next char may be the beginning of a comment
			if (
				next === '/' &&
				peek(1) === '*'
			) {
				ignore = true;
			}

			// The next char may be the beginning of the end of a comment
			else if (
				next === '*' &&
				peek(1) === '/'
			) {
				ignore = false;
			}

			// Read the input and add to the read buffer
			if (!reading) {
				startReading();
			}

			if (next != null) {
				readBuffer.push(next);
			}
		}
	}

	// Stop reading
	flushReadBuffer();
	return syntax;
}

/**
 * Reduces 'calc(...)'s inside the given expression which can cssText, a CSS declaration, or a ruleset
 * @param {string} expression
 * @return {string}
 */
export function reduceCalc (expression) {
	// This heuristic takes a fast path if possible
	const calcMatch = expression.match(CALC_REGEXP);

	// If the expression doesn't include 'calc' or if it only includes one, there's nothing to reduce here.
	if (calcMatch == null || calcMatch.length < 2) {
		return expression;
	}

	// Otherwise, parse the expression into a syntax tree before reducing it
	const parseResults = parseCalc(expression);
	return visitCssExpressions(parseResults);
}