/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

'use strict';

/* eslint-env node */
/* eslint-disable no-console */

const gulp = require('gulp');
const del = require('del');
const rollup = require('rollup-stream');
const source = require('vinyl-source-stream');

const modules = [
  'css-parse',
  'custom-style-element',
  'make-element',
  'svg-in-shadow',
  'style-util',
  'style-transformer',
  'style-settings'
];

const moduleTasks = modules.map((m) => {
  gulp.task(`test-module-${m}`, () => {
    return rollup({
      entry: `module/${m}.js`,
      format: 'iife',
      moduleName: m.replace(/-/g, '_')
    })
    .pipe(source(`${m}.js`, 'module'))
    .pipe(gulp.dest('./module/generated'))
  });
  return `test-module-${m}`;
});

gulp.task('clean', () => del(['module/generated']));

gulp.task('default', gulp.series(['clean', ...moduleTasks]));
