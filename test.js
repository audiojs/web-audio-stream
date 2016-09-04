var test = require('tst');
var context = require('audio-context');
var Writable = require('./writable');
var Readable = require('./readable');
var Writer = require('./writer');
var Reader = require('./reader');
var AudioBuffer = require('audio-buffer');
var util = require('audio-buffer-utils');
var Generator = require('audio-generator');
var Generate = require('audio-generator/index.js')
var Speaker = require('audio-speaker');
var assert = require('assert');
var Sink = require('./sink');
var Source = require('./source');
var pull = require('pull-stream');


test('Plain function', function () {
	test('Writer', function () {
		let frame = 1024;
		let write = Writer(context.destination, {
			samplesPerFrame: 1024
		});
		let generate = Generate(t => Math.sin(440 * t * Math.PI * 2));

		let isStopped = 0;
		setTimeout(() => {
			isStopped = 1;
		}, 500);
		function gen (err) {
			if (err) throw err;
			if (isStopped) {
				write(null);
				return;
			}
			let buf = generate(util.create(frame));
			write(buf, gen);
		}
		gen();
	});

	test('Reader', function (done) {
		let oscNode = context.createOscillator();
		oscNode.type = 'sawtooth';
		oscNode.frequency.value = 440;
		oscNode.start();

		let read = Reader(oscNode);

		let count = 0;

		read(function getData(err, buff) {
			assert.notEqual(buff.getChannelData(0)[1], 0);
			if (++count >= 5) {
				read(null);
			}
			else {
				read(getData);
			}
		});

		setTimeout(() => {
			assert.equal(count, 5);
			done();
		}, 200);
	});
});


test('Write chunk', function () {
	test('AudioBuffer', function (done) {
		var stream = Writable(context.destination);
		// stream.connect(context.destination);

		var buf = new AudioBuffer(1024*8);
		util.noise(buf);
		stream.write(buf);

		setTimeout(function () {
			stream.end();
			done();
		}, 300);
	});

	test('Float32Array', function (done) {
		var stream = Writable(context.destination);

		var buf = new AudioBuffer(1024*8);
		util.noise(buf);

		stream.write(buf.getChannelData(0));

		setTimeout(function () {
			stream.end();
			done();
		}, 300);
	});

	test('Array', function (done) {
		var stream = Writable(context.destination);

		var a = Array(1024).fill(0).map(function () {return Math.random()});

		stream.write(a);

		setTimeout(function () {
			stream.end();
			done();
		}, 300);
	});

	test('ArrayBuffer', function (done) {
		var stream = Writable(context.destination);

		var buf = new AudioBuffer(1024*8);
		util.noise(buf);

		stream.write(buf.getChannelData(0).buffer);

		setTimeout(function () {
			stream.end();
			done();
		}, 300);
	});


	test('Buffer', function (done) {
		var stream = Writable(context.destination);

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


test('Writable stream', function () {
	test('Regular stream', function () {
		Generator(function (time) {
			return Math.sin(Math.PI * 2 * 440 * time);
		}, {duration: 0.5})
		.pipe(Writable(context.destination));
	});

	test('Chain of sound processing', function () {
		var panner = context.createStereoPanner();
		panner.pan.value = -1;

		var stream = Writable(panner);

		Generator(function (time) {
			return Math.sin(Math.PI * 2 * 80 * time);
		}, {duration: 1})
		.pipe(stream);

		// stream.connect();

		panner.connect(context.destination);
	});

	test('Delayed connection/start');
});


test('Readable stream', function (done) {
	let oscNode = context.createOscillator();
	oscNode.type = 'sawtooth';
	oscNode.frequency.value = 440;
	oscNode.start();

	let count = 0;
	let stream = Readable(oscNode).on('data', x => {
		assert.notEqual(x.getChannelData(0)[1], 0);
		if (++count >= 5) stream.end();
	});

	setTimeout(() => {
		assert.equal(count, 5);
		done();
	}, 200);
});


test('Pull stream sink', function (done) {
	let generate = Generate(Math.random);
	let source = pull.infinite(generate);
	let sink = Sink(context.destination);

	pull(
		source,
		// pull.take(10),
		sink
	);

	setTimeout(() => {
		sink.abort();
		done();
	}, 200);
});

test('Pull stream source', function (done) {
	let oscNode = context.createOscillator();
	oscNode.type = 'sawtooth';
	oscNode.frequency.value = 440;
	oscNode.start();

	let count = 0;
	let stream = Source(oscNode);

	pull(
		stream,
		pull.map(buf => {
			assert.notEqual(buf.getChannelData(0)[1], 0);
			if (++count >= 5) stream.abort();
			return buf;
		}),
		pull.drain()
	);

	setTimeout(() => {
		assert.equal(count, 5);
		done();
	}, 200);
});


// test('Readable stream processing', function () {
// 	let AppAudio = require('app-audio');
// 	let appAudio = AppAudio({
// 		source: 'sine',
// 	}).on('ready', () => {

// 	})
// });
