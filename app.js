'use strict';

const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');


// --- get PORT from env --
let port = process.env.PORT;
if ((!port) || (port === '')) {
  port = '8080';
}

// ---- event emitter ---
const { EventEmitter, once } = require('events');
let whipEventEmitter = null;
const whepEventEmitters = {};

let whepId = 0;
function generateWhepId() {
  return 'whep_' + String(whepId++);
}

function getWhepEventEmitter(id) {
  return whepEventEmitters[id];
}

function deleteWhepEventEmitter(id) {
  const emitter = whepEventEmitters[id];
  if (emitter) {
    emitter.removeAllListeners();
    delete whepEventEmitters[id];
  }
}

function prepareWhepEventEmitter() {
  const id = generateWhepId();
  if (!whepEventEmitters[id]) {
    whepEventEmitters[id] = new EventEmitter();
  }
  return id;
}

function deleteAllWhepEventEmitters() {
  for (const id in whepEventEmitters) {
    console.log('deleteAllWhepEventEmitters() delete id:', id);
    const emitter = whepEventEmitters[id];
    if (emitter) {
      emitter.removeAllListeners();
      delete whepEventEmitters[id];
    }
  }
}

// --- prepare server ---
const http = require("http");
//const WebSocketServer = require('ws').Server;
const WebSocket = require('ws');
const e = require('express');
const WebSocketServer = WebSocket.Server;

const app = express();
app.use(bodyParser.text({ type: "*/*" }));
app.use(express.static('public'));
app.use(cors());

let webServer = null;
const hostName = 'localhost';

// --- Start http server ---
webServer = http.Server(app).listen(port, function () {
  const address = webServer.address();
  if (address) {
    console.log('Web server start. http://' + hostName + ':' + address.port + '/');
  }
  else {
    console.error('WebServer Start ERROR');
  }
});


// --- root --
app.get('/', (req, res) => {
  res.send('pseudo  WHIP/WHEP server with Browser as middle-box');
});


// --- whip server with browser handler
app.post('/whipsvr', async (req, res) => {
  console.log('---- headers ----');
  console.log(req.headers);
  console.log('---- headers end ----');

  // console.log('---- body ----');
  // console.log(req.body);
  // console.log('---- end ----');

  const contentType = req.headers['content-type'];
  const data = { type: 'whip_offer', sdp: req.body };
  sendJson(data);

  //res.send('Hello from whipsvr');

  // -- whip 応答待ち --
  if (!whipEventEmitter) {
    whipEventEmitter = new EventEmitter();
  }

 
   // イベントの発生を一回だけ待機
   const eventPromise = once(whipEventEmitter, 'answer');
   const sdp = await eventPromise;
   //console.log('whip answer received. sdp:', sdp[0]);
   console.log('whip answer received.');

   // --- answer を返す ---
   const location = 'http://' + hostName + ':' + address.port + '/whipresouce';
   res.setHeader('Content-Type', contentType);
   res.setHeader('Location', location);
   res.status(201).send(sdp[0]); // 201 Created
});

// --- delete whip resource ---
app.delete('/whipresouce', async (req, res) => {
  console.log('---- delete whip resource ----');
  //console.log('resource:', resource);
  
  // リソースを削除する処理をここに書く
  // await requestDeleteResource(resource, authorization).catch(err => {
  //   console.log(err);
  //   res.status(500).send('Server Error');
  // });

  // --- whepEventEmitter を削除 ---
  deleteAllWhepEventEmitters();

  // --- request close peer ---
  const data = { type: 'whip_close' };
  sendJson(data);

  res.status(204).send(); // 204 No Content - リソースが削除されたことを示す
});

// --- whep server with browser handler
// 暫定 1 WHEP のみ
// 複数 WHEP対応
app.post('/whepsvr', async (req, res) => {
  console.log('---- whep headers ----');
  console.log(req.headers);
  console.log('---- headers end ----');

  // console.log('---- whep body ----');
  // console.log(req.body);
  // console.log('---- end ----');

  // --- prepare id and emitter ---
  const whepId = prepareWhepEventEmitter();
  const whepEventEmitter = getWhepEventEmitter(whepId);

  const contentType = req.headers['content-type'];
  const data = { type: 'whep_offer', id: whepId, sdp: req.body };
  sendJson(data);

  //res.send('Hello from whipsvr');

  // // -- whep 応答待ち --
  // if (!whepEventEmitter) {
  //   whepEventEmitter = new EventEmitter();
  // }

   // イベントの発生を一回だけ待機
   const eventPromise = once(whepEventEmitter, 'answer');
   const result = await eventPromise;
   const sdp = result[0];
   //console.log('whep answer received. sdp:', sdp);
   console.log('whep answer received. id:', whepId);
   if (sdp === 'NOT_READY') {
    res.status(404).send('NOT_READY'); // 404 Not found
    return
   }

   // --- answer を返す ---
   console.log('--- sending WHEP answer ---');
   const location = 'http://' + hostName + ':' + address.port + '/whepresoure/' + whepId;
   res.setHeader('Content-Type', contentType);
   res.setHeader('Location', location);
   res.status(201).send(sdp); // 201 Created
});

// --- delete whep resource ---
app.delete('/whepresoure/:id', async (req, res) => {
  const whepId = req.params.id;
  console.log('---- delete whep resource. id:', whepId);
  //console.log('resource:', resource);
  
  // リソースを削除する処理をここに書く
  // await requestDeleteResource(resource, authorization).catch(err => {
  //   console.log(err);
  //   res.status(500).send('Server Error');
  // });

  // --- request close peer ---
  const data = { type: 'whep_close', id: whepId };
  sendJson(data);

  // --- 削除待ち ---

  // --- whepEventEmitter を削除 ---
  deleteWhepEventEmitter(whepId);

  res.status(204).send(); // 204 No Content - リソースが削除されたことを示す
});


// ======== websocket signaling ======
const wsServer = new WebSocketServer({ server: webServer });
const address = webServer.address();
if (address) {
  console.log('websocket server start. port=' + address.port);
}
else {
  console.error('websocket Start ERROR with port=' + port);
}
//console.log('websocket server start. port=' + port);


wsServer.on('connection', function (ws) {
  console.log('-- websocket connected --');
  ws.on('message', function (message) {
    const data = JSON.parse(message);
    console.log('got message from client. type:', data.type)
    // wsServer.clients.forEach(function each(client) {
    //   if (isSame(ws, client)) {
    //     console.log('- skip sender -');
    //   }
    //   else {
    //     client.send('' + message);
    //   }
    // });
    if (data.type === 'whip_answer') {
      if (whipEventEmitter) {
        whipEventEmitter.emit('answer', data.sdp);
      }
      else {
        console.error('whipEventEmitter is null');
      }
    }
    else if (data.type === 'whep_answer') {
      const whepEventEmitter = getWhepEventEmitter(data.id);
      if (whepEventEmitter) {
        whepEventEmitter.emit('answer', data.sdp);
      }
      else {
        console.error('whepEventEmitter is null');
      }
    }
    else if (data.type === 'whep_notready') {
      const whepEventEmitter = getWhepEventEmitter(data.id);
      if (whepEventEmitter) {
        whepEventEmitter.emit('answer', 'NOT_READY');
      }
      else {
        console.error('whepEventEmitter is null');
      }
    }
    else if (data.type === 'whip_start') {
      notifyWhipStart();
    }
    else if (data.type === 'whip_end') {
      notifyWhipEnd();
    }
  });
  ws.on('close', function () {
    console.log('-- websocket closed --');
    //deleteAllWhepEventEmitters(); NOT NEED
  });
});

function isSame(ws1, ws2) {
  // -- compare object --
  return (ws1 === ws2);

  // -- compare undocumented id --
  //return (ws1._ultron.id === ws2._ultron.id);
}

function sendJson(data) {
  const str = JSON.stringify(data);
  wsServer.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str, { binary: false });
      console.log('sendJson() sent data to client');
    }
  });
}

// ==== SSE Server Sent Event ====

// TODO
//  - [x] SSE での定期的にメッセージを送る実験
//    - [x] サーバー側実装
//    - [x] クライアント側実装
//  - [ ] SSEで配信開始を知らせる実装
//   - [ ] サーバー側実装、クライアント1つ前提
//   - [ ] サーバー側実装、タイムアウト対応
//   - [ ] サーバー側実装、クライアント複数対応
//   - [ ] クライアント側実装
//  - [ ] SSEで配信終了を知らせる実装
//   - [ ] サーバー側実装、クライアント1つ前提
//   - [ ] サーバー側実装、タイムアウト対応
//   - [ ] サーバー側実装、クライアント複数対応
//   - [ ] クライアント側実装

let sseResponse = null
app.get('/sse', function (req, res) {
  console.log('--- sse connected -');
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  sseResponse = res;
  // --- keep alive --- (avoid timeout )
  const timerKeepLive = setInterval(() => {
    res.write('\n');
  }, 15000);

  /*--
  // --- event loop ---
  const eventEmitter = new EventEmitter();
  eventEmitter.on('message', (data) => {
    res.write('data: ' + data + '\n\n');
  });
  // --- websocket message ---
  wsServer.on('connection', function (ws) {
    ws.on('message', function (message) {
      console.log('wsServer.on(message):', message);
      eventEmitter.emit('message', message);
    });
  });
  --*/

  // --- send data ---
  let dataCount = 0;
  const timerData = setInterval(() => {
    res.write('data: ' + 'tick=' + (dataCount++) + '\n\n');
  }, 10*1000);

  // --- client disconnected ---
  req.on('close', () => {
    console.log('--- sse disconnected ---');
    clearInterval(timerKeepLive);
    clearInterval(timerData);
    sseResponse = null;
  });
});

function sendSseMessage(data) {
  if (sseResponse) {
    sseResponse.write('data: ' + data + '\n\n');
  }
}

function notifyWhipStart() {
  sendSseMessage('whip_start');
}

function notifyWhipEnd() {
  sendSseMessage('whip_end');
}
