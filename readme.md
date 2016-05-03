Web Audio API writable stream. Provides interface between Web Audio API and node streams. Send any PCM data to web-audio by via write/pipe.

## Usage

[![npm install web-audio-stream](https://nodei.co/npm/web-audio-stream.png?mini=true)](https://npmjs.org/package/web-audio-stream/)

```js
var WAAStream = require('web-audio-stream');
var context = require('audio-context');

//create stream instance
var stream = WAAStream({
	//audio-context, will be created if omitted
	context: context,

	//method of connection: BUFFER_MODE, SCRIPT_MODE, WORKER_MODE (pending)
	mode: WAAStream.BUFFER_MODE,

	//end stream, disconnect node if piped input stream ends
	autoend: true,

	//pcm options, used if raw buffers are streamed into
	channels: 2,
	sampleRate: 44100,
	interleaved: false
});


//connect to audio destination (can be any AudioNode)
stream.connect(context.destination);


//place chunk of data (send to WAA)
var chunk = new Float32Array(1024);
for (var i = 0; i < 1024; i++) {
	chunk[i] = Math.random();
}
stream.write(chunk);


//stream to WAA
var Generator = require('audio-generator');
var src = Generator(function (time) {
	return Math.sin(Math.PI * 2 * time * 440);
});
src.pipe(stream);


//end stream and disconnect node
stream.end();
```

Stream is smart enough to recognize any type of data placed into it: audioBuffer, arrayBuffer, float32Array, buffer, array. Make sure only that passed buffer format complies with the one indicated in options.


## Related

* [audio-speaker](https://github.com/audio-lab/audio-speaker) — node/browser speaker stream.
* [audio-through](https://github.com/audio-lab/audio-speaker) — universal audio stream class.