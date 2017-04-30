/**
 * @module  web-audio-stream/write
 *
 * Write data to web-audio.
 */
'use strict';


const extend = require('object-assign')
const pcm = require('pcm-util')
const util = require('audio-buffer-utils')
const isAudioBuffer = require('is-audio-buffer')
const AudioBufferList = require('audio-buffer-list')

module.exports = WAAWriter;


/**
 * Rendering modes
 */
WAAWriter.WORKER_MODE = 2;
WAAWriter.SCRIPT_MODE = 1;
WAAWriter.BUFFER_MODE = 0;


/**
 * @constructor
 */
function WAAWriter (target, options) {
	if (!target || !target.context) throw Error('Pass AudioNode instance first argument')

	if (!options) {
		options = {};
	}

	options.context = target.context;

	options = extend({
		/**
		 * There is an opinion that script mode is better.
		 * https://github.com/brion/audio-feeder/issues/13
		 *
		 * But for me there are moments of glitch when it infinitely cycles sound. Very disappointing and makes feel desperate.
		 *
		 * But buffer mode also tend to create noisy clicks. Not sure why, cannot remove that.
		 * With script mode I at least defer my responsibility.
		 */
		mode: WAAWriter.SCRIPT_MODE,
		samplesPerFrame: pcm.defaults.samplesPerFrame,

		//FIXME: take this from input node
		channels: pcm.defaults.channels
	}, options)

	//ensure input format
	let format = pcm.format(options)
	pcm.normalize(format)

	let context = options.context;
	let channels = options.channels;
	let samplesPerFrame = options.samplesPerFrame;
	let sampleRate = context.sampleRate;
	let node, release, isStopped, isEmpty = false;

	//queued data to send to output
	let data = new AudioBufferList(0, channels)

	//init proper mode
	if (options.mode === WAAWriter.SCRIPT_MODE) {
		node = initScriptMode()
	}
	else if (options.mode === WAAWriter.BUFFER_MODE) {
		node = initBufferMode()
	}
	else {
		throw Error('Unknown mode. Choose from BUFFER_MODE or SCRIPT_MODE')
	}

	//connect node
	node.connect(target)

	write.end = () => {
		if (isStopped) return;
		node.disconnect()
		isStopped = true;
	}

	return write;

	//return writer function
	function write (buffer, cb) {
		if (isStopped) return;

		if (buffer == null) {
			return write.end()
		}
		else {
			push(buffer)
		}
		release = cb;
	}


	//push new data for the next WAA dinner
	function push (chunk) {
		if (!isAudioBuffer(chunk)) {
			chunk = util.create(chunk, channels)
		}

		data.append(chunk)

		isEmpty = false;
	}

	//get last ready data
	function shift (size) {
		size = size || samplesPerFrame;

		//if still empty - return existing buffer
		if (isEmpty) return data;

		let output = data.slice(0, size)

		data.consume(size)

		//if size is too small, fill with silence
		if (output.length < size) {
			output = util.pad(output, size)
		}

		return output;
	}

	/**
	 * Init scriptProcessor-based rendering.
	 * Each audioprocess event triggers tick, which releases pipe
	 */
	function initScriptMode () {
		//buffer source node
		let bufferNode = context.createBufferSource()
		bufferNode.loop = true;
		bufferNode.buffer = util.create(samplesPerFrame, channels, {context: context})

		node = context.createScriptProcessor(samplesPerFrame)
		node.addEventListener('audioprocess', function (e) {
			//release causes synchronous pulling the pipeline
			//so that we get a new data chunk
			let cb = release;
			release = null;
			cb && cb()

			if (isStopped) return;

			util.copy(shift(e.inputBuffer.length), e.outputBuffer)
		})

		//start should be done after the connection, or there is a chance it won’t
		bufferNode.connect(node)
		bufferNode.start()

		return node;
	}


	/**
	 * Buffer-based rendering.
	 * The schedule is triggered by setTimeout.
	 */
	function initBufferMode () {
		//how many times output buffer contains input one
		let FOLD = 2;

		//buffer source node
		node = context.createBufferSource()
		node.loop = true;
		node.buffer = util.create(samplesPerFrame * FOLD, channels, {context: node.context})

		//output buffer
		let buffer = node.buffer;

		//audio buffer realtime ticked cycle
		//FIXME: find a way to receive target starving callback here instead of unguaranteed timeouts
		setTimeout(tick)

		node.start()

		//last played count, position from which there is no data filled up
		let lastCount = 0;

		//time of start
		//FIXME: find out why and how this magic coefficient affects buffer scheduling
		let initTime = context.currentTime;

		return node;

		//tick function - if the half-buffer is passed - emit the tick event, which will fill the buffer
		function tick (a) {
			if (isStopped) return;

			let playedTime = context.currentTime - initTime;
			let playedCount = playedTime * sampleRate;

			//if offset has changed - notify processor to provide a new piece of data
			if (lastCount - playedCount < samplesPerFrame) {
				//send queued data chunk to buffer
				util.copy(shift(samplesPerFrame), buffer, lastCount % buffer.length)

				//increase rendered count
				lastCount += samplesPerFrame;

				//if there is a holding pressure control - release it
				if (release) {
					let cb = release;
					release = null;
					cb()
				}

				//call tick extra-time in case if there is a room for buffer
				//it will plan timeout, if none
				tick()
			}
			//else plan tick for the expected time of starving
			else {
				//time of starving is when played time reaches (last count time) - half-duration
				let starvingTime = (lastCount - samplesPerFrame) / sampleRate;
				let remainingTime = starvingTime - playedTime;
				setTimeout(tick, remainingTime * 1000)
			}
		}
	}
}
