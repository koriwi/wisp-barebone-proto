import React, { Component } from 'react';
import Wisp from './audio'
import './App.css';

const constraints = {
  audio: true,
  video: false,
}

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  setupAudio() {
    if (!this.state.audio) navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      this.wisp = new Wisp('wss://f785be67.ngrok.io', new AudioContext(), stream, (clients) => this.setState({ clients }))
      this.setState({ audio: true })
    })
  }
  
  render() {
    this.setupAudio()
    return (
      <div className="App">
      {/* <button onClick={() => this.setVolume(-10)}>leiser</button>
      <button onClick={() => this.setVolume(10)}>lauter</button> */}
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