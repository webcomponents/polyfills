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

let gulp = require('gulp');
let compilerPackage = require('google-closure-compiler');
let sourcemaps = require('gulp-sourcemaps');
let closureCompiler = compilerPackage.gulp();
const size = require('gulp-size');
const rename = require('gulp-rename');
const rollup = require('gulp-rollup');

gulp.task('default', () => {
  return gulp.src('./src/**/*.js', {base: '.'})
    .pipe(sourcemaps.init())
    .pipe(closureCompiler({
      compilation_level: 'ADVANCED',
      language_in: 'ES6_STRICT',
      language_out: 'ES5_STRICT',
      isolation_mode: 'IIFE',
      assume_function_wrapper: true,
      js_output_file: 'shadydom.min.js',
      warning_level: 'VERBOSE',
      rewrite_polyfills: false,
      externs: 'externs/shadydom.js'
    }))
    .pipe(size({showFiles: true, showTotal: false, gzip: true}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./'))
});

gulp.task('debug', () => {

  const entry = `./src/shadydom.js`;
  const fileName = 'shadydom.min';

  const options = {
    input: entry,
    output: {
      format: 'iife',
      name: 'shadydom'
    },
    allowRealFiles: true,
    rollup: require('rollup')
  };

  return gulp.src(entry)
  .pipe(rollup(options))
  .pipe(rename(`${fileName}.js`))
  .pipe(gulp.dest('.'))
});
