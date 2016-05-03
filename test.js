var test = require('tst');
var context = require('audio-context');
var WAAStream = require('./');
var AudioBuffer = require('audio-buffer');
var util = require('audio-buffer-utils');
var Generator = require('audio-generator');


test('Write chunk', function () {
	test('AudioBuffer', function (done) {
		var stream = WAAStream();
		stream.connect(context.destination);

		var buf = new AudioBuffer(1024*8);
		util.noise(buf);

		stream.write(buf);

		setTimeout(function () {
			stream.end();
			done();
		}, 300);
	});

	test('Float32Array', function (done) {
		var stream = WAAStream();
		stream.connect(context.destination);

		var buf = new AudioBuffer(1024*8);
		util.noise(buf);

		stream.write(buf.getChannelData(0));

		setTimeout(function () {
			stream.end();
			done();
		}, 300);
	});

	test('Array', function (done) {
		var stream = WAAStream();
		stream.connect(context.destination);

		var a = Array(1024).fill(0).map(function () {return Math.random()});

		stream.write(a);

		setTimeout(function () {
			stream.end();
			done();
		}, 300);
	});

	test('ArrayBuffer', function (done) {
		var stream = WAAStream();
		stream.connect(context.destination);

		var buf = new AudioBuffer(1024*8);
		util.noise(buf);

		stream.write(buf.getChannelData(0).buffer);

		setTimeout(function () {
			stream.end();
			done();
		}, 300);
	});


	test('Buffer', function (done) {
		var stream = WAAStream();
		stream.connect(context.destination);

		var buf = new AudioBuffer(1024*8);
		util.noise(buf);

		buf = new Buffer(buf.getChannelData(0).buffer);

		stream.write(buf);

		setTimeout(function () {
			stream.end();
			done();
		}, 300);
	});

});


test('Stream chunk', function () {
	Generator(function (time) {
		return Math.sin(Math.PI * 2 * 440 * time);
	}, {duration: 0.5})
	.pipe(WAAStream()).connect(context.destination);
});


test.only('Chain of sound processing', function () {
	var panner = context.createStereoPanner();
	panner.pan.value = -1;

	var stream = WAAStream({
		autoend: false
	});

	Generator(function (time) {
		return Math.sin(Math.PI * 2 * 440 * time);
	}, {duration: 0.9})
	.pipe(stream);

	stream.connect(panner);

	panner.connect(context.destination);
});