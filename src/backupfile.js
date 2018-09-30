import React, { Component } from 'react';
import micStream from 'microphone-stream'
import websocket from 'websocket-stream'
// import websocket from 'ws'
import './App.css';

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      constraints: { audio: true, video: false },
      audio: false,
    }
    this.context = new AudioContext()
    this.stream = new micStream()
    this.stream.on('format', (format) => {
      console.log(format);
      this.rate = format.sampleRate
    });
    // this.ws = websocket('wss://800c7997.ngrok.io')
    this.ws = websocket('ws://localhost:8080')
    this.pinger = new WebSocket('ws://localhost:8081')
    this.ping = []
    this.ws.pipe(this.outputAudio(this.context))
    // this.ws.onmessage = this.outputAudio2(this.context)
    this.chunks = []
    this.counter = 0
    this.rate = 48000
    this.pps = 43
    this.pinger.onopen = () => {
      setInterval(() => {
        this.before = new Date()
        this.pinger.send('ping')
      }, 200) 
    }
    this.pinger.onmessage = (message) => {
      this.after = new Date()
      if (this.ping.length > 5) this.ping.shift()
      this.ping.push(this.after - this.before)
    }

  }

  getPing() {
    return this.ping.reduce((a, b) => a + b, 0) / this.ping.length
  }

  outputAudio(context) {
    return {
      on: (b) => console.log(b),
      once: (b) => console.log(b),
      emit: (b) => console.log(b),
      write: (audio) => {
        const f32 = new Float32Array(audio.length >= 12 ? audio.buffer : new Buffer(8))
        this.chunks.push(f32)
        const ms = 1000 / (this.rate / 1000)
        console.log(ms)
        // if(this.chunks.length > Math.ceil(this.rate / 1000)) {
        if(this.chunks.length > Math.ceil((this.getPing() / ms) * 10)) {
        const length = ms * this.rate
          const aBuffer = context.createBuffer(1, length, this.rate)      
          aBuffer.copyToChannel(this.chunks.shift(), 0)          
          let source = context.createBufferSource()
          source.buffer = aBuffer
          source.connect(context.destination)
          source.start()
          // source.on('end', () => {
          //   console.log('adsaldad')
          // })
          setTimeout(() => {
            source.stop()
            // source.disconnect()
            // source = null
          }, this.getPing())
          source.onended = (e) => {
            console.log('end')
            source.stop()
            source.disconnect()
          }
        }
      }
    }
  }

  outputAudio2(context) {
    return (audio) => {
      console.log(audio)
      return
      const f32 = new Float32Array(audio.length >= 12 ? audio.buffer : new Buffer(8))
      // this.chunks.push(f32)
      // console.log(this.chunks.length)
      // if(this.chunks.length > Math.ceil(this.rate / 10000)) {
        const ms = 1000 / (this.rate / 1000)
        const length = ms * this.rate
        const aBuffer = context.createBuffer(1, length, this.rate)      
        aBuffer.copyToChannel(f32, 0)          
        const source = context.createBufferSource()
        source.buffer = aBuffer
        source.connect(context.destination)
        source.start()
      // }
    }
  }
  Float32Concat(first, second){
    var firstLength = first.length,
        result = new Float32Array(firstLength + second.length);

    result.set(first);
    result.set(second, firstLength);

    return result;
  }

  debugStream() {
    return {
      on: (b) => console.log(b),
      once: (b) => console.log(b),
      emit: (b) => console.log(b),
      write: (b) => {
        this.counter += 1
        console.log(this.counter)
      }
    }
  }

  setupAudio() {   
    if (!this.state.audio) navigator.mediaDevices.getUserMedia(this.state.constraints).then(stream => {
      this.stream.setStream(stream)
      this.setState({ audio: true })
      this.stream.pipe(this.ws)
    })
  }
  
  render() {
    this.setupAudio()
    return (
      <div className="App">
        <input type="checkbox" onChange={(e => this.setState({ constraints: { ...this.state.constraints, noiseSuppression: e.target.checked }}))} />
        <input type="checkbox" onChange={(e => this.setState({ constraints: { ...this.state.constraints, echoCancellation: e.target.checked }}))} />
        {
           this.state.audio && false && <audio
            autoPlay
            ref={node => node.srcObject = new MediaStream(this.ws)}
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