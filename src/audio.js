import ws from 'websocket-stream';
import micStream from 'microphone-stream';
export const bufferSize = 1024;
export default class WispAudio {
    constructor(url, context, stream, clientsChanged) {
        this.rate = 48000;
        this.chunks = {};
        this.gainers = {};
        this.scriptNodes = {};
        this.setVolume = (id, value) => {
            const gain = this.gainers[id];
            if (!gain)
                return false;
            gain.gain.setValueAtTime(value, this.audioContext.currentTime);
            return true;
        };
        this.audioContext = context;
        this.setupWebsocket(url);
        this.setupStream(stream);
        this.setupAudio();
        this.clientsChanged = clientsChanged;
    }
    setupWebsocket(url) {
        this.ws = ws(url);
        this.ws.pipe(this.workMessages());
    }
    setupStream(stream) {
        this.stream = new micStream({ bufferSize });
        this.stream.setStream(stream);
        this.stream.on('format', (format) => {
            this.rate = format.sampleRate;
        });
        this.stream.pipe(this.debugStream());
    }
    setupAudio() {
        const clients = Object.keys(this.chunks);
        clients.forEach(client => this.scriptNodes[client] && this.scriptNodes[client].disconnect());
        this.scriptNodes = {};
        if (!clients.length)
            return;
        if (this.merger)
            this.merger.disconnect();
        this.merger = this.audioContext.createChannelMerger(clients.length);
        clients.forEach((client, index) => {
            if (this.scriptNodes[client])
                this.scriptNodes[client].disconnect();
            this.scriptNodes[client] = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
            this.scriptNodes[client].connect(this.merger, index, 0);
            // this.scriptNodes[client].connect(this.audioContext.destination)
            this.scriptNodes[client].onaudioprocess = (aPE) => {
                const outputBuffer = aPE.outputBuffer;
                for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
                    var outputData = outputBuffer.getChannelData(channel);
                    // Loop through the x number of samples
                    if (this.chunks[client].data.length > 3) {
                        const chunk = this.chunks[client].data.shift();
                        for (var sample = 0; sample < chunk.length; sample++) {
                            outputData[sample] = chunk[sample];
                        }
                    }
                    else {
                        for (var sample = 0; sample < 1024; sample++) {
                            outputData[sample] = 0;
                        }
                    }
                }
            };
        });
        this.merger.connect(this.audioContext.destination);
    }
    newClient(id, bitrate = 48000) {
        this.chunks[id] = {
            bitrate,
            data: [],
        };
        this.setupAudio();
        this.clientsChanged(Object.keys(this.chunks));
    }
    clientDisconnected(id) {
        delete this.chunks[id];
        this.setupAudio();
        this.clientsChanged(Object.keys(this.chunks));
    }
    debugStream() {
        return {
            on: (b) => console.log(b),
            once: (b) => console.log(b),
            emit: (b) => console.log(b),
            write: (b) => {
                if (this.ws.socket.readyState != 1)
                    return;
                this.ws.socket.send(JSON.stringify({ bitrate: this.rate, mic: b }));
            }
        };
    }
    workMessages() {
        return {
            on: (b) => console.log(b),
            once: (b) => console.log(b),
            emit: (b) => console.log(b),
            write: (message) => {
                const parsed = JSON.parse(message);
                switch (parsed.type) {
                    case 'newClient':
                        this.newClient(parsed.payload);
                        break;
                    case 'clientDisconnected':
                        this.clientDisconnected(parsed.payload);
                        break;
                    case 'audio':
                        const audio = JSON.parse(parsed.payload);
                        const f32array = new Float32Array(Buffer.from(audio.mic.data).buffer);
                        while (this.chunks[parsed.id].data.length > 15)
                            this.chunks[parsed.id].data.shift();
                        this.chunks[parsed.id].data.push(f32array);
                        break;
                    default: break;
                }
                // this.chunks.push(message)
            }
        };
    }
}
//# sourceMappingURL=audio.js.map