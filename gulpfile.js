'use strict';

const gulp = require('gulp');
const jshint = require('gulp-jshint');
const jscs = require('gulp-jscs');
const stylish = require('gulp-jscs-stylish');
const gmocha = require('gulp-mocha');

gulp.task('lint', () =>
{
	let src = [ 'gulpfile.js', 'lib/**/*.js', 'test/**/*.js' ];

	return gulp.src(src)
		.pipe(jshint('.jshintrc'))
		.pipe(jscs('.jscsrc'))
		.pipe(stylish.combineWithHintResults())
		.pipe(jshint.reporter('jshint-stylish', { verbose: true }))
		.pipe(jshint.reporter('fail'));
});

gulp.task('test', () =>
{
	return gulp.src('test/test_*.js', { read: false })
		.pipe(gmocha(
			{
				reporter : 'spec',
				timeout  : 2000,
				bail     : true
			}));
});

gulp.task('default', gulp.series('lint', 'test'));
