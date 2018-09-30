class AWorker extends window.AudioWorkletNode {
  constructor(context) {
    super(context, 'AWorker')
  }
}

console.log('1')
const context = new AudioContext()

context.audioWorklet.addModule('processor.mjs')
.then(() => {
  console.log('soweit sogut')
  const node = new AWorker(context)
})
.catch(e => console.error('error', e))