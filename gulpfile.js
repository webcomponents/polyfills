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

gulp.task('closure', [
  'closure-scoping-shim',
  'closure-apply-shim',
  'closure-custom-style-interface',
  'closure-element-style-interface'
]);

gulp.task('debug', [
  'debug-scoping-shim',
  'debug-apply-shim',
  'debug-custom-style-interface',
  'debug-element-style-interface'
]);

gulp.task('closure-scoping-shim', () => {
  return gulp.src(['src/*.js', 'entrypoints/*.js'])
  .pipe(sourcemaps.init())
  .pipe(closure({
    new_type_inf: true,
    compilation_level: 'ADVANCED',
    language_in: 'ES6_STRICT',
    language_out: 'ES5_STRICT',
    output_wrapper: '(function(){\n%output%\n}).call(self)',
    assume_function_wrapper: true,
    js_output_file: 'scoping-shim.min.js',
    entry_point: '/entrypoints/scoping-shim.js',
    dependency_mode: 'STRICT',
    warning_level: 'VERBOSE',
    rewrite_polyfills: false,
    // formatting: 'PRETTY_PRINT'
  }))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('.'))
});

gulp.task('debug-scoping-shim', () => {
  return rollup({
    entry: 'entrypoints/scoping-shim.js',
    format: 'iife',
    moduleName: 'scopingshim',
    sourceMap: true
  })
  .pipe(source('scoping-shim.js', 'entrypoints'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(rename('scoping-shim.min.js'))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
});

gulp.task('closure-apply-shim', () => {
  return gulp.src(['src/*.js', 'entrypoints/*.js'])
  .pipe(sourcemaps.init())
  .pipe(closure({
    new_type_inf: true,
    compilation_level: 'ADVANCED',
    language_in: 'ES6_STRICT',
    language_out: 'ES5_STRICT',
    output_wrapper: '(function(){\n%output%\n}).call(self)',
    js_output_file: 'apply-shim.min.js',
    entry_point: '/entrypoints/apply-shim.js',
    dependency_mode: 'STRICT',
    warning_level: 'VERBOSE',
    rewrite_polyfills: false,
    // formatting: 'PRETTY_PRINT'
  }))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('.'))
});

gulp.task('debug-apply-shim', () => {
  return rollup({
    entry: 'entrypoints/apply-shim.js',
    format: 'iife',
    moduleName: 'applyshim',
    sourceMap: true
  })
  .pipe(source('apply-shim.js', 'entrypoints'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(rename('apply-shim.min.js'))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
});

gulp.task('closure-custom-style-interface', () => {
  return gulp.src(['src/*.js', 'entrypoints/*.js'])
  .pipe(sourcemaps.init())
  .pipe(closure({
    new_type_inf: true,
    compilation_level: 'ADVANCED',
    language_in: 'ES6_STRICT',
    language_out: 'ES5_STRICT',
    output_wrapper: '(function(){\n%output%\n}).call(self)',
    js_output_file: 'custom-style-interface.min.js',
    entry_point: '/entrypoints/custom-style-interface.js',
    dependency_mode: 'STRICT',
    warning_level: 'VERBOSE',
    rewrite_polyfills: false,
    // formatting: 'PRETTY_PRINT'
  }))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('.'))
});

gulp.task('debug-custom-style-interface', () => {
  return rollup({
    entry: 'entrypoints/custom-style-interface.js',
    format: 'iife',
    moduleName: 'customstyleinterface',
    sourceMap: true
  })
  .pipe(source('custom-style-interface.js', 'entrypoints'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(rename('custom-style-interface.min.js'))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
});

gulp.task('closure-element-style-interface', () => {
  return gulp.src(['src/*.js', 'entrypoints/*.js'])
  .pipe(sourcemaps.init())
  .pipe(closure({
    new_type_inf: true,
    compilation_level: 'ADVANCED',
    language_in: 'ES6_STRICT',
    language_out: 'ES5_STRICT',
    output_wrapper: '(function(){\n%output%\n}).call(self)',
    js_output_file: 'element-style-interface.min.js',
    entry_point: '/entrypoints/element-style-interface.js',
    dependency_mode: 'STRICT',
    warning_level: 'VERBOSE',
    rewrite_polyfills: false,
    // formatting: 'PRETTY_PRINT'
  }))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('.'))
});

gulp.task('debug-element-style-interface', () => {
  return rollup({
    entry: 'entrypoints/element-style-interface.js',
    format: 'iife',
    moduleName: 'elementstyleinterface',
    sourceMap: true
  })
  .pipe(source('element-style-interface.js', 'entrypoints'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(rename('element-style-interface.min.js'))
  .pipe(size({showFiles: true, showTotal: false, gzip: true}))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./'))
});