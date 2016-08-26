/**
 * @module  web-audio-stram/readable
 *
 * Pipe web-audio to stream
 */

'use strict';


const inherits = require('inherits');
const Readable = require('stream').Readable;
const context = require('audio-context');
const extend = require('xtend/mutable');
var pcm = require('pcm-util');
var util = require('audio-buffer-utils');
var isAudioBuffer = require('is-audio-buffer');

module.exports = WAAStream;


inherits(WAAStream, Readable);

//@constructor
function WAAStream (options) {
	if (!(this instanceof WAAStream)) return new WAAStream(options);

	extend(this, options);

	this.sampleRate = this.context.sampleRate;

	Writable.call(this, {
		//because input might be AudioBuffer, ArrayBuffer etc.
		objectMode: true,

		//to keep processing delays very short, in case of RT binding.
		//otherwise each stream will hoard data and release only when it’s full.
		highWaterMark: 0
	});
}


extend(WAAStream.prototype, pcm.defaults);


/** Default audio context */
WAAStream.prototype.context = context;
