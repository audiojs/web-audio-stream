## Q: Should we make it a separate class or a part of audio-through?
+ Yes. Make writable stream implementation with input audio-buffer/ndsample/float32array/arraybuffer detector. No need for audio-through.

## Q: what is supposed API?
* Plain data wrapper, like `inst.feed(data);`
	- What is the difference with AudioBuffer then?
* Stream instance `pipe(inst).connect(dest)`
	- Optimized piping is able only with audio-through as it operates buffers
	+ stream makes more sense, as basically if something wants more data - it is stream API
	+ Writable stream has .write method, allowing for direct writing data to the stack.

## Q: how do we keep pipe and connect at the same time?
* We send data for both. We just need to bufferize data for web-audio-stream, because real stream can be faster.