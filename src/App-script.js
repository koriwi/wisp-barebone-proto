import React, { Component } from 'react';
import micStream from 'microphone-stream'
import websocket from 'websocket-stream'
import './App.css';

class App extends Component {
  constructor(props) {
    super(props)
    this.volume = 100
    this.state = {
      constraints: { audio: true, video: false },
      audio: false,
      volume: 100,
      mute: false,
    }
    this.audioCtx = new AudioContext();
    this.stream = new micStream()
    this.chunks = {}
    this.stream.on('format', (format) => {
      console.log(format);
      this.rate = format.sampleRate
      // this.startAudio(this.chunks)
    });
    this.ws = websocket('ws://localhost:8080')
    this.ws.pipe(this.workMessages())
    this.counter = 0
    this.rate = 48000
  }

  startAudio(chunks) {
    this.gain = this.audioCtx.createGain()
    const destination = this.audioCtx.destination
    // const source = this.audioCtx.createBufferSource();

    // Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
    const scriptNode = this.audioCtx.createScriptProcessor(1024, 1);
    console.log(scriptNode.bufferSize);
    scriptNode.onaudioprocess = function(audioProcessingEvent) {

      // The output buffer contains the samples that will be modified and played
      var outputBuffer = audioProcessingEvent.outputBuffer;
      if(chunks && chunks.length > 1) {
        // Loop through the output channels (in this case there is only one)
        const chunk = chunks.shift()
        const parsed = JSON.parse(chunk)
        const audio = Buffer.from(parsed.mic.data)
        const input = new Float32Array(audio.buffer)
        for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
          var outputData = outputBuffer.getChannelData(channel);
          // Loop through the x number of samples
          for (var sample = 0; sample < input.length; sample++) {
            outputData[sample] = input[sample]      
          }
        }
      }
    }
    // source.connect(scriptNode)
    scriptNode.connect(this.gain).connect(destination)
    // source.start()
  }

  // componentDidUpdate() {
  //   this.volume = Math.max(Math.min(this.volume += change, 100), 0)
  //   this.gain.gain.setValueAtTime(this.volume / 100, this.audioCtx.currentTime)
  // }

  setVolume(change) {
    const volume = Math.max(Math.min(this.state.volume + change, 100), 0)
    this.setState({ volume })
  }

  toggleMute() {

  }

  registerAudioWorker(id) {
    const audioCtx = new AudioContext()
    const gain = audioCtx.createGain()
    const destination = audioCtx.destination

    // Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
    const scriptNode = audioCtx.createScriptProcessor(1024, 1, 2);
    console.log(scriptNode.bufferSize);
    scriptNode.onaudioprocess = (audioProcessingEvent) => {

      // The output buffer contains the samples that will be modified and played
      var outputBuffer = audioProcessingEvent.outputBuffer;
      if(this.chunks[id] && this.chunks[id].length > 1) {
        // Loop through the output channels (in this case there is only one)
        const chunk = this.chunks[id].shift()
        // console.log(chunk)
        // return
        // const parsed = JSON.parse(chunk)
        // const audio = Buffer.from(parsed.mic.data)
        // const input = new Float32Array(chunk.buffer)
        const input = chunk
        for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
          var outputData = outputBuffer.getChannelData(channel);
          // Loop through the x number of samples
          for (var sample = 0; sample < input.length; sample++) {
            outputData[sample] = input[sample]      
          }
        }
      }
    }
    scriptNode.connect(gain).connect(destination)
  }

  workMessages() {
    return {
      on: (b) => console.log(b),
      once: (b) => console.log(b),
      emit: (b) => console.log(b),
      write: (message) => {
        const parsed = JSON.parse(message)
        switch (parsed.type) {
          case 'newClient':
            this.chunks[parsed.payload] = []
            console.log('asdasd', this.chunks)
            this.registerAudioWorker(parsed.payload)
            break;
          case 'audio':
            const audio = Buffer.from(JSON.parse(parsed.payload).mic.data)
            const output = new Float32Array(audio.buffer)
            this.chunks[parsed.id].push(output)
            break;
          default: break;
        }
        // this.chunks.push(message)
      }
    }
  }

  outputAudio() {
    return {
      on: (b) => console.log(b),
      once: (b) => console.log(b),
      emit: (b) => console.log(b),
      write: (audio) => {
        this.chunks.push(audio)
      }
    }
  }

  debugStream() {
    return {
      on: (b) => console.log(b),
      once: (b) => console.log(b),
      emit: (b) => console.log(b),
      write: (b) => {
        this.ws.socket.send(JSON.stringify({ bitrate: this.rate, mic: b }))
      }
    }
  }

  setupAudio() {   
    if (!this.state.audio) navigator.mediaDevices.getUserMedia(this.state.constraints).then(stream => {
      this.stream.setStream(stream)
      this.setState({ audio: true })
      this.stream.pipe(this.debugStream())
    })
  }
  
  render() {
    this.setupAudio()
    return (
      <div className="App">
      <button onClick={() => this.setVolume(-10)}>leiser</button>
      <button onClick={() => this.setVolume(10)}>lauter</button>
      <div>{this.state.volume}%</div>
        {
           this.state.audio && false && <audio
            autoPlay
          ></audio>
        }
      </div>
    );
  }
}

export default App;


/* 
{
  on: (b) => console.log(b),
  once: (b) => console.log(b),
  emit: (b) => console.log(b),
  write: (b) => console.log(b),
}
*/