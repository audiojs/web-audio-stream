/**
 * @module  web-audio-stream/writable
 *
 * Write stream data to web-audio.
 */
'use strict';


var inherits = require('inherits');
var Writable = require('stream').Writable;
var createWriter = require('./writer');

module.exports = WAAStream;


/**
 * @constructor
 */
function WAAStream (node, options) {
	if (!(this instanceof WAAStream)) return new WAAStream(node, options);

	let write = createWriter(node, options);

	Writable.call(this, {
		//we need object mode to recognize any type of input
		objectMode: true,

		//to keep processing delays very short, in case of RT binding.
		//otherwise each stream will hoard data and release only when it’s full.
		highWaterMark: 0,

		write: (chunk, enc, cb) => {
			return write(chunk, cb);
		}
	});


	//manage input pipes number
	let that = this;
	this.inputsCount = 0;
	this.on('pipe', (source) => {
		this.inputsCount++;

		//do autoend
		source.once('end', function () {
			that.end();
		});

	}).on('unpipe', (source) => {
		this.inputsCount--;
	});
}


inherits(WAAStream, Writable);


/**
 * Rendering modes
 */
WAAStream.WORKER_MODE = 2;
WAAStream.SCRIPT_MODE = 1;
WAAStream.BUFFER_MODE = 0;


/**
 * There is an opinion that script mode is better.
 * https://github.com/brion/audio-feeder/issues/13
 *
 * But for me there are moments of glitch when it infinitely cycles sound. Very disappointing and makes feel desperate.
 *
 * But buffer mode also tend to create noisy clicks. Not sure why, cannot remove that.
 * With script mode I at least defer my responsibility.
 */
WAAStream.prototype.mode = WAAStream.SCRIPT_MODE;


/** Count of inputs */
WAAStream.prototype.inputsCount = 0;


/**
 * Overrides stream’s end to ensure event.
 */
//FIXME: not sure why `end` is triggered here like 10 times.
WAAStream.prototype.end = function () {
	if (this.isEnded) return;

	this.isEnded = true;

	var triggered = false;
	this.once('end', function () {
		triggered = true;
	});
	Writable.prototype.end.call(this);

	//timeout cb, because native end emits after a tick
	var that = this;
	setTimeout(function () {
		if (!triggered) {
			that.emit('end');
		}
	});

	return that;
};
