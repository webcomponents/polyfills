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
let rename = require('gulp-rename');
let closureCompiler = compilerPackage.gulp();
let rollup = require('gulp-rollup');
let babel = require('gulp-babel');

let hasLicense = false;
let shouldPrintComment = (c) => {
    if (!hasLicense) {
      return hasLicense = /@license/.test(c);
    }
    return false;
  }
let babiliConfig = {
  presets: ['babili'],
  shouldPrintComment
}

let es5Config = {
  presets: ['babili', 'es2015'],
  shouldPrintComment
}

gulp.task('closure', function() {
  return gulp.src(['./src/*.js'], {base: './'})
    .pipe(sourcemaps.init())
    .pipe(closureCompiler({
      new_type_inf: true,
      debug: true,
      compilation_level: 'SIMPLE',
      language_in: 'ES6_STRICT',
      language_out: 'ES5_STRICT',
      output_wrapper: '(function(){\n%output%\n}).call(this)',
      js_output_file: 'shadydom.min.js'
    }))
    .on('error', (e) => console.error(e))
    .pipe(sourcemaps.write('/'))
    .pipe(gulp.dest('./'))
});

gulp.task('default', () => {
  return gulp.src('src/*.js')
  .pipe(sourcemaps.init())
  .pipe(rollup({
    entry: 'src/env.js',
    format: 'iife',
    moduleName: 'shadydom',
    sourceMap: true
  }))
  .pipe(babel(babiliConfig))
  .pipe(rename('shadydom.min.js'))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
})

gulp.task('debug', () => {
  return gulp.src('src/*.js')
  .pipe(rollup({
    entry: 'src/env.js',
    format: 'iife',
    moduleName: 'shadydom'
  }))
  .pipe(rename('shadydom.min.js'))
  .pipe(gulp.dest('./'))
})

gulp.task('es5', () => {
  return gulp.src('src/*.js')
  .pipe(sourcemaps.init())
  .pipe(rollup({
    entry: 'src/env.js',
    format: 'iife',
    moduleName: 'shadydom',
    sourceMap: true
  }))
  .pipe(babel(es5Config))
  .pipe(rename('shadydom.min.js'))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
})