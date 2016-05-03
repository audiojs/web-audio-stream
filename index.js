/**
 * @module  web-audio-stream
 */

var inherits = require('inherits');
var Writable = require('stream').Writable;
var context = require('audio-context');
var extend = require('xtend/mutable');
var pcm = require('pcm-util');
var util = require('audio-buffer-utils');
var isAudioBuffer = require('is-audio-buffer');


module.exports = WAAStream;


/**
 * @constructor
 */
function WAAStream (options) {
	if (!(this instanceof WAAStream)) return new WAAStream(options);

	extend(this, options);

	this.sampleRate = this.context.sampleRate;

	Writable.call(this, {
		//we need object mode to recognize any type of input
		objectMode: true,

		//to keep processing delays very short, in case of RT binding.
		//otherwise each stream will hoard data and release only when it’s full.
		highWaterMark: 0
	});


	//init proper mode
	if (this.mode === WAAStream.SCRIPT_MODE) {
		this.initScriptMode();
	}
	else if (this.mode === WAAStream.BUFFER_MODE) {
		this.initBufferMode();
	}
	else {
		throw Error('Unknown mode. Please, write an issue to github.com/audio-lab/web-audio-stream if you have ideas for other modes.')
	}

	//queued data to send to output
	this.data = util.create(this.channels, this.samplesPerFrame);

	//manage input pipes number
	this.on('pipe', function (source) {
		var self = this;

		self.inputsCount++;

		//do autoend
		if (self.autoend) {
			source.once('end', function () {
				self.end();
			});
		}

	}).on('unpipe', function (source) {
		this.inputsCount--;
	});
}


inherits(WAAStream, Writable);

extend(WAAStream.prototype, pcm.defaults);


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
 * But for me there are moments of glitch when it infinitely cycles sound. Very desperate.
 *
 * But buffer mode also tend to create noisy clicks. Not sure why, cannot remove that.
 * With script mode I at least release responsibility.
 *
 */
WAAStream.prototype.mode = WAAStream.SCRIPT_MODE;


/** Default audio context */
WAAStream.prototype.context = context;


/** Count of inputs */
WAAStream.prototype.inputsCount = 0;


/**
 * Perform autoend if last input has ended
 */
WAAStream.prototype.autoend = false;


/**
 * Init scriptProcessor-based rendering.
 * Each audioprocess event triggers tick, which releases pipe
 */
WAAStream.prototype.initScriptMode = function () {
	var self = this;

	//buffer source node
	var bufferNode = self.context.createBufferSource();
	bufferNode.loop = true;
	bufferNode.buffer = util.create(self.channels, self.samplesPerFrame);
	var buffer = bufferNode.buffer;

	self.node = self.context.createScriptProcessor(self.samplesPerFrame);
	self.node.addEventListener('audioprocess', function (e) {
		// util.copy(e.inputBuffer, e.outputBuffer);

		//FIXME: if GC (I guess) is clicked, this guy may just stop generating event
		//possibly there should be a promise-like thing, resetting scriptProcessor, or something... Like, reserving N scriptProcessors
		//if it hangs - no more audioprocess events available
		util.copy(self.shift(), e.outputBuffer);

		//if there is a holding pressure control - release it
		if (self._release) {
			var release = self._release;
			self._release = null;
			release();
		}
	});


	//once source self is finished - disconnect modules
	self.once('end', function () {
		bufferNode.stop();
		self.node.disconnect();
	});

	//start should be done after the connection, or there is a chance it won’t
	bufferNode.connect(self.node);
	bufferNode.start();

	return self;
};


/**
 * Buffer-based rendering.
 * The schedule is triggered by setTimeout.
 */
WAAStream.prototype.initBufferMode = function () {
	var self = this;

	//how many times output buffer contains input one
	var FOLD = 2;

	//buffer source node
	self.node = self.context.createBufferSource();
	self.node.loop = true;
	self.node.buffer = util.create(self.channels, self.samplesPerFrame * FOLD);

	//output buffer
	var buffer = self.node.buffer;

	//audio buffer realtime ticked cycle
	//FIXME: find a way to receive target starving callback here instead of unguaranteed timeouts
	var tickTimeout = setTimeout(tick);

	//once source self is finished - disconnect modules
	self.once('end', function () {
		clearTimeout(tickTimeout);
		self.node.stop();
		self.node.disconnect();
	});

	self.node.start();

	//last played count, position from which there is no data filled up
	var lastCount = 0;

	//time of start
	//FIXME: find out why and how this magic coefficient affects buffer scheduling
	var initTime = 0;

	//tick function - if the half-buffer is passed - emit the tick event, which will fill the buffer
	function tick (a) {
		if (!initTime) initTime = self.context.currentTime;

		var playedTime = self.context.currentTime - initTime;
		var playedCount = playedTime * self.sampleRate;

		//if offset has changed - notify processor to provide a new piece of data
		if (lastCount - playedCount < self.samplesPerFrame) {
			//send queued data chunk to buffer
			util.copy(self.shift(), buffer, lastCount % buffer.length);

			//increase rendered count
			lastCount += self.samplesPerFrame;

			//if there is a holding pressure control - release it
			if (self._release) {
				var release = self._release;
				self._release = null;
				release();
			}

			//call tick extra-time in case if there is a room for buffer
			//it will plan timeout, if none
			tick();
		}
		//else plan tick for the expected time of starving
		else {
			//time of starving is when played time reaches (last count time) - half-duration
			var starvingTime = (lastCount - self.samplesPerFrame) / self.sampleRate;
			var remainingTime = starvingTime - playedTime;
			tickTimeout = setTimeout(tick, remainingTime * 1000);
		}

	}

	return self;
}


/**
 * Writable interface
 */
WAAStream.prototype._write = function (chunk, enc, cb) {
	this.push(chunk);
	this._release = cb;
};


/**
 * Data control - plan a new chunk
 */
WAAStream.prototype.push = function (chunk) {
	if (!isAudioBuffer(chunk)) chunk = util.create(chunk);

	this.data = util.concat(this.data, chunk);

	this.isEmpty = false;
}

/**
 * Shift planned chunk. If there is not enough data - release zeros
 */
WAAStream.prototype.shift = function (size) {
	size = size || this.samplesPerFrame;

	//if still empty - return existing buffer
	if (this.isEmpty) return this.data;

	var output = this.data;

	if (this.data.length <= size) {
		this.data = util.create(size);
		this.isEmpty = true;
	}
	else {
		output = util.slice(output, 0, size);

		//shorten known data
		this.data = util.slice(this.data, size);
	}

	//if size is too small, fill with silence
	util.pad(output, size);

	return output;
}



/**
 * Overrides stream’s end to ensure event.
 */

WAAStream.prototype.end = function () {
	var self = this;

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

	return self;
};



/**
 * WAA connect interface
 */
WAAStream.prototype.connect = function (target) {
	this.node.connect(target);
};
WAAStream.prototype.disconnect = function (target) {
	this.node.disconnect(target);
};