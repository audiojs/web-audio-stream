/**
 * @module  web-audio-stram/readable
 *
 * Pipe web-audio to stream
 */

'use strict';


const inherits = require('inherits');
const context = require('audio-context');
const extend = require('xtend/mutable');
const Readable = require('stream').Readable;
const util = require('audio-buffer-utils');
const pcm = require('pcm-util');
const isPlainObject = require('is-plain-obj');

module.exports = WAAStream;


inherits(WAAStream, Readable);


//@constructor
function WAAStream (node, options) {
	if (arguments.length === 1 && isPlainObject(node)) {
		options = node;
		node = null;
	}

	if (!options) {
		options = {};
		if (node && node.context) options.context = node.context;
	}

	if (!(this instanceof WAAStream)) return new WAAStream(node, options);

	extend(this, options);

	//ignore no context
	if (!this.context || !this.context.sampleRate) {
		console.warn('No proper audio context passed');
		return;
	}

	this.sampleRate = this.context.sampleRate;

	Readable.call(this, {
		//we need object mode to recognize any type of input
		objectMode: true,

		//to keep processing delays very short, in case of RT binding.
		//otherwise each stream will hoard data and release only when it’s full.
		highWaterMark: 0
	});

	//TODO: gate by SCRIPT_MODE
	this.node = this.context.createScriptProcessor(this.samplesPerFrame, this.channels, this.channels);

	this.node.addEventListener('audioprocess', e => {
		//send to stream
		this.push(e.inputBuffer);

		//FIXME: should we sink web-audio instantly? Mb just fade it, avoid processor wasting?
		//seems that fading is the proper option
		//forward web audio (inputBuffer might be processed by stream)
		// util.copy(e.inputBuffer, e.outputBuffer);
	});

	//scriptProcessor is active only being connected to output
	this.node.connect(this.context.destination);

	if (node) {
		node.connect(this.node);
	}
}

extend(WAAStream.prototype, pcm.defaults);

WAAStream.WORKER_MODE = 2;
WAAStream.ANALYZER_MODE = 0;
WAAStream.SCRIPT_MODE = 1;


/** Default audio context */
WAAStream.prototype.context = context;


WAAStream.prototype.mode = WAAStream.prototype.SCRIPT_MODE;

WAAStream.prototype._read = function (size) {
	this._hungry = true;
};


WAAStream.prototype.disconnect = function () {
	this.node.disconnect();
}
