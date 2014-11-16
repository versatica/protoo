/**
 * Dependencies.
 */
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var filelog = require('gulp-filelog');
var nodeunit = require('gulp-nodeunit-runner');


gulp.task('lint', function() {
	var src = ['gulpfile.js', 'lib/**/*.js', 'test/**/*.js'];
	return gulp.src(src)
		.pipe(filelog('js:lint'))
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish', {verbose: true}))
		.pipe(jshint.reporter('fail'));
});


gulp.task('test', function() {
	var src = 'test/*.js';
	return gulp.src(src)
		.pipe(filelog('test'))
		.pipe(nodeunit({reporter: 'default'}));
});


gulp.task('watch', function() {
	gulp.watch(['lib/**/*.js'], ['lint']);
});


// TODO: set the default taks properly.
gulp.task('default', gulp.series('lint', 'test'));
