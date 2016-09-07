/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

// jshint node: true

'use strict';

var gulp = require('gulp');
var compilerPackage = require('google-closure-compiler');
var sourcemaps = require('gulp-sourcemaps');
var closureCompiler = compilerPackage.gulp();


gulp.task('default', function() {
  return gulp.src(['./src/ShadyDOM/*.js', './src/ShadyCSS/*.js'], {base: './'})
    .pipe(sourcemaps.init())
    .pipe(closureCompiler({
      new_type_inf: true,
      compilation_level: 'SIMPLE',
      language_in: 'ECMASCRIPT6_STRICT',
      language_out: 'ECMASCRIPT5_STRICT',
      output_wrapper: '(function(){\n%output%\n}).call(this)',
      js_output_file: 'ShadyDOM.min.js'
    }))
    .on('error', function(e){ console.error(e); })
    .pipe(sourcemaps.write('/'))
    .pipe(gulp.dest('./'))
});