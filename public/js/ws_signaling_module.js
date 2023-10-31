'use strict';

export function isSignalingOpen() {
  if (ws && ws.readyState === ws.OPEN) {
    return true;
  }
  return false;
}

// シグナリングサーバへ接続する
export function disconnectSignaling() {
  if (ws) {
    ws.close();
    ws = null;
  }
}

export async function connectSignalingAsync(url) {
  let wsUrl = 'ws://localhost:3001/';
  if (url) {
    wsUrl = url;
  }
  if (ws && ws.readyState === ws.OPEN) {
    console.warn('signaling ALREADY open');
    return;
  }

  ws = new WebSocket(wsUrl);
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', (event) => {
      console.log('ws open()');
      resolve();
    });

    ws.addEventListener('error', (err) => {
      console.error('ws onerror() ERR:', err);
      reject(err);
    });

    ws.addEventListener('close', () => {
      console.log('ws close()');
    });

    ws.addEventListener('message', (evt) => {
      console.log('ws onmessage() data.type:', evt.data.type);
      const message = JSON.parse(evt.data);
      console.log('ws onmessage() message.type:', message.type);
      switch (message.type) {
        case 'whip_offer': {
          console.log('Received WHIP offer ...');
          receiveWhipOfferFunc(message, message.type);
          break;
        }
        case 'whep_offer': {
          console.log('Received WHEP offer ...');
          receiveWhepOfferFunc(message, message.type);
          break;
        }
        // case 'candidate': {
        //   console.log('Received ICE candidate ...');
        //   const candidate = new RTCIceCandidate(message.ice);
        //   console.log(candidate);
        //   receiveIceCandidate(candidate);
        //   break;
        // }
        case 'whip_close': {
          console.log('whip peer is closed ...');
          whipClosedFunc();
          break;
        }

        case 'whep_close': {
          console.log('whep peer is closed ...');
          whepClosedFunc(message.id);
          break;
        }

        default: {
          console.log("Invalid message");
          break;
        }
      }
    });
  });
}

export function sendSdp(sessionDescription) {
  const message = JSON.stringify(sessionDescription);
  console.log('---sending SDP type=' + sessionDescription.type);
  ws.send(message);
}

// export function sendIceCandidate(candidate) {
//   console.log('---sending ICE candidate ---');
//   const message = JSON.stringify({ type: 'candidate', ice: candidate });
//   console.log('sending candidate=' + message);
//   ws.send(message);
// }

export function sendClose() {
  const message = JSON.stringify({ type: 'close' });
  console.log('---sending close message---');
  ws.send(message);
}

export function setReceiveWhipOfferHandler(handler) {
  receiveWhipOfferFunc = handler;
}
let receiveWhipOfferFunc = null;

export function setReceiveWhepOfferHandler(handler) {
  receiveWhepOfferFunc = handler;
}
let receiveWhepOfferFunc = null;

// export function setReceiveIceCandidateHandeler(handler) {
//   receiveIceCandidate = handler;
// }
// let receiveIceCandidate = null;

export function setWhipCloseHandler(handler) {
  whipClosedFunc = handler;
}
let whipClosedFunc = null;

export function setWhepCloseHandler(handler) {
  whepClosedFunc = handler;
}
let whepClosedFunc = null;

export function sendCustomMessage(message) {
  console.log('---sending custom message---');
  ws.send(message);
}

// ---- inner variable, function ----
let ws = null;


