[![Build Status](https://travis-ci.org/audiojs/web-audio-stream.svg?branch=master)](https://travis-ci.org/audiojs/web-audio-stream) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges) [![Greenkeeper badge](https://badges.greenkeeper.io/audiojs/web-audio-stream.svg)](https://greenkeeper.io/)

Interface between Web Audio API and streams. Send PCM data to Web Audio API (writable mode) or connect any AudioNode to stream (readable mode).

## Usage

[![npm install web-audio-stream](https://nodei.co/npm/web-audio-stream.png?mini=true)](https://npmjs.org/package/web-audio-stream/)

```js
const context = require('audio-context')
const Generator = require('audio-generator')
const {Readable, Writable} = require('web-audio-stream/stream')

let oscillator = context.createOscillator()
oscillator.type = 'sawtooth';
oscillator.frequency.value = 440;
oscillator.start()

//pipe oscillator audio data to stream
Readable(oscillator).on('data', (audioBuffer) => {
	console.log(audioBuffer.getChannelData(0))
})

//pipe generator stream to audio destination
Generator(time => Math.sin(Math.PI * 2 * time * 440))
.pipe(Writable(context.destination))
```

## API

### `const {Read, Write} = require('web-audio-stream')`

Get Web-Audio-API reader or writer constructors. They can be required separately:

```js
const Readable = require('web-audio-stream/read')
const Writable = require('web-audio-stream/write')
```

### `let write = Write(destNode, options?)`

Create function writing to web-audio-API AudioNode with the following signature: `write(audioBuffer, (err) => {})`. To end stream properly, call `write(null)`.

```js
const Writer = require('web-audio-stream/write')
const util = require('audio-buffer-utils')

let write = Writer(context.destination, {
	samplesPerFrame: 1024
})
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
```

### `let read = Read(sourceNode)`

Create reader from web _AudioNode_ with signature `read((err, audioBuffer) => {})`, returning audio frames data. To end reading, pass `read(null)`.

```js
const Reader = require('web-audio-stream/read')

let oscNode = context.createOscillator();
oscNode.type = 'sawtooth';
oscNode.frequency.value = 440;
oscNode.start();

let read = Reader(oscNode);

let count = 0;

read(function getData(err, audioBuffer) {
	//output audioBuffer here or whatever

	if (count++ >= 5) {
		//end after 5th frame
		read(null);
	}
	else {
		read(getData);
	}
});
```

## Stream API

### `const {Readable, Writable} = require('web-audio-stream/stream')`

Get readable or writable stream. Pipe in/out to send/receive audio data from Web-Audio-API.

```js
//web-audio → stream
const Readable = require('web-audio-stream/readable')

//stream → web-audio
const Writable = require('web-audio-stream/writable')
```

### `let writable = Writable(destNode, options?)`

Create writer to web audio node, possibly based on options. Pipe any stream to writable, or write data directly to it, basically it implements _Writable_ stream class.

```js
const Writable = require('web-audio-stream/writable')
const context = require('audio-context')

//options or single properties are optional
let writable = Writable(context.destination, {
	context: context,
	channels: 2,
	sampleRate: context.sampleRate,

	//BUFFER_MODE, SCRIPT_MODE, WORKER_MODE (pending web-audio-workers)
	mode: Writable.BUFFER_MODE,

	//disconnect node if input stream ends
	autoend: true
})


const Generator = require('audio-generator')
let src = Generator(function (time) {
	return Math.sin(Math.PI * 2 * time * 440)
})
src.pipe(writable)


//or simply send data to web-audio
let chunk = new Float32Array(1024)
for (let i = 0; i < 1024; i++) {
	chunk[i] = Math.random()
}
writable.write(chunk)

setTimeout(writable.end, 1000)
```

Stream is smart enough to recognize any type of data placed into it: [AudioBuffer](https://github.com/audiojs/audio-buffer), [AudioBufferList](https://github.com/audiojs/audio-buffer-list), ArrayBuffer, FloatArray, Buffer, Array. Make sure only that passed buffer format complies with passed options, ie. `samplerPerFrame`, `channels` etc.


### `let readable = Readable(audioNode, options?)`

Readable stream to read data from web-audio-API.

```js
const Readable = require('web-audio-stream/readable')

let readable = Readable(myNode)
readable.on('data', buffer => {
	console.log('Got audio buffer')
})
```

## Pull-stream API

## Related

* [audio-speaker](https://github.com/audiojs/audio-speaker) — node/browser speaker stream.
* [audio-through](https://github.com/audiojs/audio-speaker) — universal audio stream class.
