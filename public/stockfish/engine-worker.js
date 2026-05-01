importScripts('/stockfish/stockfish.js')

let engine = null
const pending = []
const scriptUrl = new URL('/stockfish/stockfish.js', self.location.href).toString()

Stockfish({ mainScriptUrlOrBlob: scriptUrl }).then((sf) => {
  engine = sf
  sf.addMessageListener((line) => {
    postMessage(line)
  })

  while (pending.length > 0) {
    const command = pending.shift()
    if (command) {
      sf.postMessage(command)
    }
  }
})

onmessage = (event) => {
  const command = event.data
  if (engine) {
    engine.postMessage(command)
  } else {
    pending.push(command)
  }
}
