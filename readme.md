[![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

Interface between Web Audio API and streams. Send any buffer PCM data to Web Audio API (writable mode) or connect any AudioNode to stream (readable mode).

## Usage

[![npm install web-audio-stream](https://nodei.co/npm/web-audio-stream.png?mini=true)](https://npmjs.org/package/web-audio-stream/)

```js
const {Readable, Writable} = require('web-audio-stream');

//connect audio node to
Readable(myNode).on('data', (chunk) => {

})
```


## API

<details><summary>**`const {Readable, Writable} = require('web-audio-stream');`**</summary>

Require writable stream instance. Also require separate streams:

```js
//web-audio → stream
const Readable = require('web-audio-stream/readable');

//stream → web-audio
const Writable = require('web-audio-stream/writable');
```
</details>
<details><summary>**`let writable = Writable(audioNode?, options?)`**</summary>

Create writer to web-audio, maybe pass options. Or maybe pass target audio node directly, maybe with options.

```js
var WAWritable = require('web-audio-stream/writable');
var context = require('audio-context');

//options or single properties are optional
var stream = WAWritable({
	//audio context
	context: context,
	channels: 2,
	sampleRate: 44100,

	//BUFFER_MODE, SCRIPT_MODE, WORKER_MODE (pending web-audio-workers)
	mode: WAWritable.BUFFER_MODE,

	//disconnect node if input stream ends
	autoend: true
});
```
</details>
<details><summary>**`writable.connect(audioNode);`**</summary>

AudioNode interface:

```js
//connect/disconnect to AudioNode
stream.connect(context.destination);
stream.disconnect();
```
</details>
<details><summary>**`audioStream.pipe(writable);`**</summary>

Stream interface.

```js
//as a stream
var Generator = require('audio-generator');
var src = Generator(function (time) {
	return Math.sin(Math.PI * 2 * time * 440);
});
src.pipe(stream);


//or simply send data to web-audio
var chunk = new Float32Array(1024);
for (var i = 0; i < 1024; i++) {
	chunk[i] = Math.random();
}
stream.write(chunk);

setTimeout(stream.end, 1000);
```

Stream is smart enough to recognize any type of data placed into it: audioBuffer, arrayBuffer, float32Array, buffer, array. Make sure only that passed buffer format complies with passed options.

</details>

<details><summary>**`let readable = Readable(node?, options?)`**</summary>

Read web-audio to stream.

```js
const Readable = require('web-audio-stream/readable');

let readable = Readable(myNode);
readable.on('data', buffer => {
	console.log('Got audio buffer');
});
```

</details>

## In the wild

* [wavearea](https://github.com/audio-lab/wavearea) — edit audio in textarea.


## Related

* [audio-speaker](https://github.com/audio-lab/audio-speaker) — node/browser speaker stream.
* [audio-through](https://github.com/audio-lab/audio-speaker) — universal audio stream class.
