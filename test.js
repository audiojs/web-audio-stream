var test = require('tst');
var context = require('audio-context');
var WAAStream = require('./');
var AudioBuffer = require('audio-buffer');
var util = require('audio-buffer-utils');


test.only('Send chunk', function () {
	var stream = WAAStream();

	stream.connect(context.destination);

	test.only('AudioBuffer', function (done) {
		var buf = new AudioBuffer(1024*8);
		util.noise(buf);

		stream.write(buf);

		setTimeout(function () {
			stream.end();
			done();
		}, 500);
	});

	test('ArrayBuffer', function () {

	});


	test('Buffer', function () {

	});

	test('Float32Array', function () {

	});

	test('Array', function () {

	});
});


test.skip('Stream chunk', function () {
	var stream = WAAStream();

	stream.connect(context.destination);
});


test.skip('Chain of sound processing', function () {

});