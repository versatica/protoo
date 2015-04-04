/**
 * Dependencies.
 */
var gulp = require('gulp'),
	jshint = require('gulp-jshint'),
	jscs = require('gulp-jscs'),
	stylish = require('gulp-jscs-stylish'),
	filelog = require('gulp-filelog'),
	mocha = require('gulp-mocha');


gulp.task('lint', function () {
	var src = ['gulpfile.js', 'lib/**/*.js', 'test/**/*.js'];
	return gulp.src(src)
		.pipe(filelog('lint'))
		.pipe(jshint('.jshintrc')) // enforce good practics
		.pipe(jscs('.jscsrc')) // enforce style guide
		.pipe(stylish.combineWithHintResults())
		.pipe(jshint.reporter('jshint-stylish', {verbose: true}))
		.pipe(jshint.reporter('fail'));
});


gulp.task('test', function () {
	return gulp.src('test/test_*.js', {read: false})
		.pipe(mocha({
			reporter: 'spec',
			timeout: 2000,
			bail: true
		}));
});


gulp.task('watch', function () {
	gulp.watch(['lib/**/*.js'], ['lint']);
});


gulp.task('default', gulp.series('lint', 'test'));
