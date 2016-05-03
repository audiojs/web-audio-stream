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

	//prerender silence buffer
	this._silence = util.create(this.channels, this.samplesPerFrame);

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
 * Whether to use scriptProcessorNode or other mode of rendering
 */
WAAStream.WORKER_MODE = 2;
WAAStream.SCRIPT_MODE = 1;
WAAStream.BUFFER_MODE = 0;
WAAStream.prototype.mode = WAAStream.BUFFER_MODE;


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
 *
 * FIXME: this is really unstable scheduler. setTimeout-based one is a way better
 */
WAAStream.prototype.initScriptMode = function () {
	var self = this;

	//buffer source node
	self.bufferNode = self.context.createBufferSource();
	self.bufferNode.loop = true;
	self.bufferNode.buffer = util.create(self.channels, self.format.samplesPerFrame);
	self.buffer = self.bufferNode.buffer;

	self.scriptNode = self.context.createScriptProcessor(self.format.samplesPerFrame);
	self.scriptNode.addEventListener('audioprocess', function (e) {
		util.copy(e.inputBuffer, e.outputBuffer);

		//FIXME: if GC (I guess) is clicked, this guy may just stop generating that evt
		//possibly there should be a promise-like thing, resetting scriptProcessor, or something... Like, N reserve scriptProcessors
		util.copy(self._readyData, self.buffer);
		var release = self._release;
		self._readyData = null;
		self._release = null;
		release();
	});


	//once source self is finished - disconnect modules
	self.once('end', function () {
		self.bufferNode.stop();
		self.scriptNode.disconnect();
	});

	//start should be done after the connection, or there is a chance it won’t
	self.bufferNode.connect(self.scriptNode);
	self.scriptNode.connect(self.context.destination);
	self.bufferNode.start();

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

	//save time of start
	var lastMoment = self.context.currentTime;
	var initMoment = lastMoment;

	//offset within the output buffer, in samples
	self.offset = 0;

	//audio buffer realtime ticked cycle
	//FIXME: find a way to receive target starving callback here instead of interval
	var tickInterval = setInterval(tick, Math.floor(buffer.duration * 1000 / 3));

	self.node.start();

	//current part of the buffer
	var activePart = 0;

	//tick function - if the half-buffer is passed - emit the tick event, which will fill the buffer
	function tick () {
		var playedTime = self.context.currentTime - initMoment;
		var playedCount = Math.round(playedTime * self.context.sampleRate);
		var offsetCount = playedCount % buffer.length;

		//displacement within the buffer
		var currentPart = Math.floor(offsetCount / self.samplesPerFrame);

		//if offset has changed - notify processor to provide a new piece of data
		if (currentPart != activePart) {
			activePart = currentPart;
			self.offset = ((currentPart + 1) % FOLD) * self.samplesPerFrame;

			//send queued data chunk to buffer
			util.copy(self.shift(), buffer, self.offset);

			//if there is a holding pressure control - release it
			if (self._release) {
				var release = self._release;
				self._release = null;
				release();
			}
		}
	}

	//once source self is finished - disconnect modules
	self.once('end', function () {
		clearInterval(tickInterval);
		self.node.stop();
		self.node.disconnect();
	});

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

	var output = util.slice(this.data, 0, size);
	util.pad(output, size);

	//shorten known data - if size is too small, fill with silence
	if (this.data.length <= size) {
		this.data = util.create(size);
		this.isEmpty = true;
	}
	else {
		this.data = util.slice(this.data, size);
	}

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