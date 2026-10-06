const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.static('public'));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// World: Map of "x,y,z" -> block type (1..5). Starts as a 32x32 grass platform.
const SIZE = 32;
const world = new Map();
for (let x = 0; x < SIZE; x++) for (let z = 0; z < SIZE; z++) world.set(`${x},0,${z}`, 1);

const players = new Map();
let nextId = 1;

function broadcast(msg, except) {
  const data = JSON.stringify(msg);
  for (const c of wss.clients) if (c !== except && c.readyState === 1) c.send(data);
}

wss.on('connection', (ws) => {
  const id = nextId++;
  players.set(id, { x: SIZE / 2, y: 2, z: SIZE / 2, ry: 0 });

  ws.send(JSON.stringify({
    t: 'init', id,
    blocks: [...world].map(([k, b]) => [...k.split(',').map(Number), b]),
    players: Object.fromEntries(players),
  }));
  broadcast({ t: 'join', id }, ws);

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'pos' && [m.x, m.y, m.z, m.ry].every(Number.isFinite)) {
      players.set(id, { x: m.x, y: m.y, z: m.z, ry: m.ry });
    } else if (m.t === 'set') {
      const { x, y, z, b } = m;
      if (![x, y, z, b].every(Number.isInteger)) return;
      if (y < 0 || y > 63 || x < -100 || x > 200 || z < -100 || z > 200 || b < 0 || b > 5) return;
      const key = `${x},${y},${z}`;
      if (b === 0) { if (!world.has(key)) return; world.delete(key); }
      else { if (world.has(key)) return; world.set(key, b); }
      broadcast({ t: 'set', x, y, z, b });
    }
  });

  ws.on('close', () => { players.delete(id); broadcast({ t: 'leave', id }); });
});

setInterval(() => broadcast({ t: 'pos', players: Object.fromEntries(players) }), 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Listening on ' + PORT));
