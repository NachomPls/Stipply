"use strict";

// Port where we'll run the websocket server
let webSocketsServerPort = 1337;

// websocket and http servers
let webSocketServer = require('websocket').server;
let http = require('http');

// Global letiables
let history = [];
let drawHistory = [];
let clients = [];
let freeIndex = [];
let indexCount = 0;


// Helper function for escaping input strings
function htmlEntities(str) {
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// HTTP server
let server = http.createServer(function(request, response) {});
server.listen(webSocketsServerPort, function() {
  console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

// WebSocket server
let wsServer = new webSocketServer({
  // WebSocket server is tied to a HTTP server. WebSocket
  // request is just an enhanced HTTP request. For more info
  // http://tools.ietf.org/html/rfc6455#page-6
  httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  let connection = request.accept(null, request.origin);

  // we need to know client index to remove them on 'close' event
  let userName = false;
  let score = false;
  let obj = {
    connection: connection,
    userName: userName,
    score: score,
  }

  let index;
  if(!(freeIndex > 0)) {
    clients.push(obj)
    index = indexCount;
    indexCount++;
  } else {
    index = freeIndex.pop();
    clients[index] = obj;
  }

  clients[index].index = index;

  console.log((new Date()) + ' Connection accepted.');
  console.log("Debug:");
  console.log("IndexCount: " + indexCount);
  console.log("FreeIndex: " + freeIndex);
  console.log("Index: " + index);

  // send back chat history
  if (history.length > 0) {
    connection.sendUTF(JSON.stringify({ type: 'history', data: history} ));
  }
  if (drawHistory.length > 0) {
    connection.sendUTF(JSON.stringify({ type: 'drawHistory', data: drawHistory}));
  }
  if (clients.length > 0) {
    console.log("Sending clients");
    let tempArray = [];
    for (let i = 0; i < clients.length; i++) {
      if(clients[i].userName) {
        let tempObj = {
          name: clients[i].userName,
          score: clients[i].score,
          index: clients[i].index
        }
        tempArray.push(tempObj);
      }
    }
    connection.sendUTF(JSON.stringify({ type: 'players', data: tempArray}));
  }

  // user sent some message
  connection.on('message', function(message) {
    console.log(message);
    if (message.type === 'utf8') { // accept only text
    // first message sent by user is their name
      let message_json = JSON.parse(message.utf8Data);
      if (message_json.type === "name") {
        clients[index].userName = htmlEntities(message_json.name);
        clients[index].score = 0;
        console.log((new Date()) + ' User is known as: ' + clients[index].userName);
        let obj = {
          name: clients[index].userName,
          score: clients[index].score,
          index: index
        }
        let json = JSON.stringify({ type:'playerJoined', data: obj });
        for (let i=0; i < clients.length; i++) {
          clients[i].connection.sendUTF(json);
        }
        console.log("This is the index no?: "+index);
        clients[index].connection.sendUTF(JSON.stringify({ type:'index', index: index }));
      } else if (message_json.type == "message"){
        // log and broadcast the message
        console.log((new Date()) + ' Received Message from ' + userName + ': ' + message_json.data);

        // we want to keep history of all sent messages
        let obj = {
          text: htmlEntities(message_json.data),
          author: clients[index].userName
        };
        history.push(obj);
        history = history.slice(-100);
        // broadcast message to all connected clients
        let json = JSON.stringify({ type:'message', data: obj });
        for (let i=0; i < clients.length; i++) {
          clients[i].connection.sendUTF(json);
        }
      } else if (message_json.type === "draw") {
        console.log(message_json.data);
        drawHistory.push(message_json.data);
		if(message_json.data.type === "clear") {
		  drawHistory = [];
		}
        for (let i=0; i < clients.length; i++) {
          if(i !== index) clients[i].connection.sendUTF(message.utf8Data);
        }
      }
    }
  });

  // user disconnected
  connection.on('close', function(connection) {
    if (clients[index].userName !== false) {
      console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
      let json = JSON.stringify({ type:'playerLeft', data: {name: clients[index].userName, score: clients[index].score, index: index}});
      for (let i=0; i < clients.length; i++) {
        clients[i].connection.sendUTF(json);
      }
      freeIndex.push(index);
      clients[index].userName = false;
      clients[index].score = false;
    }
  });
});
