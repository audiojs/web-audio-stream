[![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

Interface between Web Audio API and streams. Send PCM data to Web Audio API (writable mode) or connect any AudioNode to stream (readable mode).

## Usage

[![npm install web-audio-stream](https://nodei.co/npm/web-audio-stream.png?mini=true)](https://npmjs.org/package/web-audio-stream/)

```js
const context = require('audio-context');
const Generator = require('audio-generator');
const {Readable, Writable} = require('web-audio-stream');

let oscillator = context.createOscillator();
oscillator.type = 'sawtooth';
oscillator.frequency.value = 440;
oscillator.start();

//pipe oscillator audio data to stream
Readable(oscillator).on('data', (audioBuffer) => {
	console.log(audioBuffer.getChannelData(0));
});

//pipe generator stream to audio destination
Generator(time => Math.sin(Math.PI * 2 * time * 440))
.pipe(Writable(context.destination));
```


## API

<details><summary>**`const {Readable, Writable} = require('web-audio-stream');`**</summary>

Require stream instance, by default writable. Or require separate streams:

```js
//web-audio → stream
const Readable = require('web-audio-stream/readable');

//stream → web-audio
const Writable = require('web-audio-stream/writable');
```
</details>

<details><summary>**`let writable = Writable(audioNode?, options?)`**</summary>

Create writer to web-audio, possibly based on options, and later connect it to audio node. Or maybe pass target audio node directly, maybe with options.

```js
var Writable = require('web-audio-stream/writable');
var context = require('audio-context');

//options or single properties are optional
var writable = Writable(context.destination, {
	//context: context,
	//channels: 2,
	//sampleRate: 44100,

	//BUFFER_MODE, SCRIPT_MODE, WORKER_MODE (pending web-audio-workers)
	mode: Writable.BUFFER_MODE,

	//disconnect node if input stream ends
	autoend: true
});
```
</details>
<details><summary>**`writable.connect(audioNode);`**</summary>

Connect stream to audio node.

```js
//connect/disconnect to AudioNode
writable.connect(context.destination);
```
</details>
<details><summary>**`writable.disconnect();`**</summary>

Disconnect from target audionode, end writing, dispose stream.

</details>
<details><summary>**`stream.pipe(writable);`**</summary>

Pipe stream to writable, or write data directly to it etc, basically it implements _Writable_ stream class.

```js
//as a stream
var Generator = require('audio-generator');
var src = Generator(function (time) {
	return Math.sin(Math.PI * 2 * time * 440);
});
src.pipe(writable);


//or simply send data to web-audio
var chunk = new Float32Array(1024);
for (var i = 0; i < 1024; i++) {
	chunk[i] = Math.random();
}
writable.write(chunk);

setTimeout(writable.end, 1000);
```

Stream is smart enough to recognize any type of data placed into it: audioBuffer, arrayBuffer, float32Array, buffer, array. Make sure only that passed buffer format complies with passed options.

</details>

<details><summary>**`let readable = Readable(audioNode?, options?)`**</summary>

Create reading stream of web-audio-data, possibly with options, and maybe with audioNode to read from.

```js
const Readable = require('web-audio-stream/readable');

let readable = Readable(myNode, {
	//audio context, if node is not passed
	context: context,
	channels: 2,
	sampleRate: 44100,

	//ANALYZER_NODE or SCRIPT_NODE
	mode: Readable.SCRIPT_MODE
});
readable.on('data', buffer => {
	console.log('Got audio buffer');
});
```

</details>
<details><summary>**`readable.connect(node)`**</summary>

Read from audio node. Note that it is reversing order - basically node gets connected to readable stream.

</details>
<details><summary>**`readable.disconnect()`**</summary>

End reading.

</details>

## In the wild

* [wavearea](https://github.com/audio-lab/wavearea) — edit audio in textarea.


## Related

* [audio-speaker](https://github.com/audiojs/audio-speaker) — node/browser speaker stream.
* [audio-through](https://github.com/audiojs/audio-speaker) — universal audio stream class.
