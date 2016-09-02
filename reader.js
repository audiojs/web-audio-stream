/**
 * @module  web-audio-stream/reader
 *
 * Read data from web-audio
 */

'use strict';

const extend = require('xtend/mutable');

module.exports = WAAReader;



//@constructor
function WAAReader (sourceNode, options) {
	if (!sourceNode || !sourceNode.context) throw Error('Pass AudioNode instance first argument');

	if (!options) {
		options = {};
	}

	let context = sourceNode.context;

	options = extend({
		//the only available option for now
		mode: WAAReader.SCRIPT_MODE,

		samplesPerFrame: 1024
	}, options);


	let release;

	//TODO: gate by SCRIPT_MODE
	let node = context.createScriptProcessor(options.samplesPerFrame, options.channels, options.channels);

	node.addEventListener('audioprocess', e => {
		let cb = release;
		release = null;
		cb && cb(null, e.inputBuffer);
	});

	//scriptProcessor is active only being connected to output
	sourceNode.connect(node);
	node.connect(context.destination);


	return function read (cb) {
		//end source
		if (cb === null) {
			node.disconnect();
			return;
		}
		release = cb;
	}

}

// WAAReader.WORKER_MODE = 2;
// WAAReader.ANALYZER_MODE = 0;
WAAReader.SCRIPT_MODE = 1;
