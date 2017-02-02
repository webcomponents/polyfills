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
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');
const rename = require('gulp-rename');
const rollup = require('rollup-stream');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const closure = require('google-closure-compiler').gulp();
const size = require('gulp-size');
const runseq = require('run-sequence');

gulp.task('debug-shady-css', () => {
  return rollup({
    entry: 'src/shady-css.js',
    format: 'iife',
    moduleName: 'shadycss',
    sourceMap: true
  })
  .pipe(source('shady-css.js', 'src'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(rename('shadycss.min.js'))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
});

const modules = [
  'css-parse',
  'custom-style-element',
  'make-element',
  'svg-in-shadow'
];

const moduleTasks = modules.map((m) => {
  gulp.task(`test-module-${m}`, () => {
    return rollup({
      entry: `tests/module/${m}.js`,
      format: 'iife',
      moduleName: m
    })
    .pipe(source(`${m}.js`, 'tests/module'))
    .pipe(gulp.dest('./tests/module/generated'))
  });
  return `test-module-${m}`;
});

gulp.task('clean-test-modules', () => del(['tests/module/generated']));

gulp.task('test-modules', (cb) => {
  runseq('clean-test-modules', moduleTasks, cb);
});

gulp.task('default', ['closure', 'test-modules']);

gulp.task('closure', ['closure-shady-css', 'closure-apply-shim']);

gulp.task('debug', ['debug-shady-css', 'debug-apply-shim']);

gulp.task('closure-shady-css', () => {
  return gulp.src('src/*.js')
  .pipe(sourcemaps.init())
  .pipe(closure({
    new_type_inf: true,
    compilation_level: 'ADVANCED',
    language_in: 'ES6_STRICT',
    language_out: 'ES5_STRICT',
    output_wrapper: '(function(){\n%output%\n}).call(self)',
    js_output_file: 'shadycss.min.js',
    entry_point: '/src/shady-css.js',
    dependency_mode: 'STRICT',
    warning_level: 'VERBOSE',
    rewrite_polyfills: false,
    // externs: ['externs/shadycss-externs.js']
    // formatting: 'PRETTY_PRINT'
  }))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('.'))
});

gulp.task('closure-apply-shim', () => {
  return gulp.src('src/*.js')
  .pipe(sourcemaps.init())
  .pipe(closure({
    new_type_inf: true,
    compilation_level: 'ADVANCED',
    language_in: 'ES6_STRICT',
    language_out: 'ES5_STRICT',
    output_wrapper: '(function(){\n%output%\n}).call(self)',
    js_output_file: 'apply-shim.min.js',
    entry_point: '/src/apply-shim.js',
    dependency_mode: 'STRICT',
    warning_level: 'VERBOSE',
    rewrite_polyfills: false,
    // externs: ['externs/shadycss-externs.js']
    // formatting: 'PRETTY_PRINT'
  }))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('.'))
});

gulp.task('debug-apply-shim', () => {
  return rollup({
    entry: 'src/apply-shim.js',
    format: 'iife',
    moduleName: 'applyshim',
    sourceMap: true
  })
  .pipe(source('apply-shim.js', 'src'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(rename('apply-shim.min.js'))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
});