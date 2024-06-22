const express = require('express');
const app = express();
const WebSocket = require('ws');

const { proxy, scriptUrl } = require('rtsp-relay')(app);

const handler = proxy({
  url: `rtsp://mtx:8554/mystream`,
  verbose: false,
});

app.ws('/api/stream', handler);

let gameSocket = null;

function connectWebSocket() {
  if (gameSocket === null || gameSocket.readyState === WebSocket.CLOSED) {
    gameSocket = new WebSocket('ws://game:8080/mouse');

    gameSocket.onopen = () => {
      console.log('WebSocket 연결이 열렸습니다.');
    };

    gameSocket.onclose = () => {
      console.log('WebSocket 연결이 닫혔습니다.');
    };

    gameSocket.onerror = (error) => {
      console.error('WebSocket 오류:', error);
    };
  }
}

app.get('/', (req, res) =>
  res.send(`
  <button id="playButton">Play</button>
  <div id="controls" style="display: none;">
    <div>
      <label for="xSlider">X: </label>
      <input type="range" id="xSlider" min="0" max="400" value="200">
      <span id="xValue">200</span>
    </div>
    <div>
      <label for="ySlider">Y: </label>
      <input type="range" id="ySlider" min="0" max="400" value="200">
      <span id="yValue">200</span>
    </div>
  </div>
  <canvas id='canvas' style="display: none;"></canvas>

  <script src='${scriptUrl}'></script>
  <script>
    const playButton = document.getElementById('playButton');
    const controls = document.getElementById('controls');
    const canvas = document.getElementById('canvas');
    const xSlider = document.getElementById('xSlider');
    const ySlider = document.getElementById('ySlider');
    const xValue = document.getElementById('xValue');
    const yValue = document.getElementById('yValue');
    let player;

    playButton.addEventListener('click', () => {
      playButton.style.display = 'none';
      controls.style.display = 'block';
      canvas.style.display = 'block';
      
      player = loadPlayer({
        url: 'ws://' + location.host + '/api/stream',
        canvas: canvas
      });

      fetch('/connect', { method: 'POST' });
    });

    function sendCoordinates(x, y) {
      console.log('Coordinates:', x, y);
      fetch('/mouse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y }),
      });
    }

    xSlider.addEventListener('input', () => {
      const x = parseInt(xSlider.value);
      xValue.textContent = x;
      sendCoordinates(x, parseInt(ySlider.value));
    });

    ySlider.addEventListener('input', () => {
      const y = parseInt(ySlider.value);
      yValue.textContent = y;
      sendCoordinates(parseInt(xSlider.value), y);
    });

    canvas.addEventListener('mousedown', startDragging);
    canvas.addEventListener('mousemove', drag);
    canvas.addEventListener('mouseup', stopDragging);
    canvas.addEventListener('mouseleave', stopDragging);

    let isDragging = false;

    function startDragging(e) {
      isDragging = true;
    }

    function stopDragging(e) {
      isDragging = false;
    }

    function drag(e) {
      if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / 2;
        const y = (e.clientY - rect.top) / 2;
        sendCoordinates(Math.round(x), Math.round(y));
      }
    }
  </script>
`)
);

app.post('/connect', (req, res) => {
  connectWebSocket();
  res.sendStatus(200);
});

app.post('/mouse', express.json(), (req, res) => {
  const { x, y } = req.body;
  if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
    gameSocket.send(JSON.stringify({ x, y }));
    res.sendStatus(200);
  } else {
    res.status(503).send('Game WebSocket not connected');
  }
});

app.listen(2000, () => {
  console.log('Server listening on port 2000');
});