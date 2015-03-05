/**
 * Dependencies.
 */
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var filelog = require('gulp-filelog');
var mocha = require('gulp-mocha');


gulp.task('lint', function() {
	var src = ['gulpfile.js', 'lib/**/*.js', 'test/**/*.js'];
	return gulp.src(src)
		.pipe(filelog('lint'))
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish', {verbose: true}))
		.pipe(jshint.reporter('fail'));
});


gulp.task('test', function() {
	return gulp.src('test/test_*.js', {read: false})
		.pipe(mocha({
			reporter: 'spec',
			timeout: 2000,
			bail: true
		}));
});


gulp.task('watch', function() {
	gulp.watch(['lib/**/*.js'], ['lint']);
});


gulp.task('default', gulp.series('lint', 'test'));
