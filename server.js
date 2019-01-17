"use strict";

//get firebase functions and functionality
const admin = require('firebase-admin');
const firebase = require('firebase');
const serviceAccount = require('./stipply-firebase-key.json');

//initialize firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://stipply-c1375.firebaseio.com'
});
//change snapshots so it doesnt collide with system time
const firestore = admin.firestore();
const settings = {timestampsInSnapshots: true};
firestore.settings(settings);

//create shorthand for accessing collections and documents
let wordData = admin.firestore();

//set Sports category collection
let docRefSport = wordData.collection('Words').doc('Category 0');
let setSport = docRefSport.set({
  "1": 'Karate',
  "2": 'Fechten',
  "3": 'Schwimmen',
  "4": 'Tennis',
  "5": 'Fußball'
});

//set Programming category collection
let docRefProgramming= wordData.collection('Words').doc('Category 1');
let setProgramming = docRefProgramming.set({
  "1": 'Variable',
  "2": 'Konstante',
  "3": 'Entwicklungsumgebung',
  "4": 'Fehler',
  "5": 'Suizid'
});

//set Animals category collection
let docRefAnimals = wordData.collection('Words').doc('Category 2');
let setAnimals = docRefAnimals.set({
  "1": 'Elefant',
  "2": 'Katze',
  "3": 'Hund',
  "4": 'Ente',
  "5": 'Schnabeltier'
});

//set Misc category collection
let docRefMisc = wordData.collection('Words').doc('Category 3');
let setMisc = docRefMisc.set({
  '1': 'Ehefrau',
  '2': 'Schwimmbad',
  "3": 'Sonnenaufgang',
  "4": 'Schwangerschaft',
  "5": 'Homosexuell'
});

//function for getting random documents later
function initRandomInt() {
  let catAmount = 4;
  return Math.floor(Math.random() * Math.floor(catAmount));
}
let RandomInt = initRandomInt();
let randomWord = "Category " + initRandomInt();
console.log(RandomInt);

// wordData.collection('Words').doc("Category " + initRandomInt()).get().then(function(doc) {
//    console.log(doc.data());
// });

//fetches random word from random document 
function generateWord(category) {
  return admin.firestore().collection('Words').doc(category).get()
  .then((categorySnap) => {
    const max = Object.keys(categorySnap.data()).length;
    const rng = Math.floor(Math.random() * max) + 1;
    return categorySnap.get(rng.toString())
  }) // wait
} //auf bessere zeiten?

//TODO MAKE A RANDOM WORD CHOOSER OR SOMETHING

////TODO DATABASE STOPS HERE
// Port where we'll run the websocket server
let webSocketsServerPort = 1337;

// websocket and http servers
let webSocketServer = require('websocket').server;
let http = require('http');

// Global letiables... heh
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
  };

  let index;
  if(!(freeIndex > 0)) {
    clients.push(obj);
    index = indexCount;
    indexCount++;
  } else {
    index = freeIndex.pop();
    clients[index] = obj;
  }

  clients[index].index = index;

  // TODO
  
  generateWord(randomWord)
  .then(word => {
    const placeholder = word.split("").map(() => "_").join(" ");

    clients.forEach((client, index) => {
      if (index < 1) {
        client.connection.sendUTF(JSON.stringify({type: 'setWord', data: word}))
      } else {
        client.connection.sendUTF(JSON.stringify({type: 'setWord', data: placeholder}))
      }
    });
  });
  
  // //

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
        let tempPlayer = {
          name: clients[i].userName,
          score: clients[i].score,
          index: clients[i].index
        };
        tempArray.push(tempPlayer);
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
        let client = {
          name: clients[index].userName,
          score: clients[index].score,
          index: index
        };
        let json = JSON.stringify({ type:'playerJoined', data: client });
        for (let i=0; i < clients.length; i++) {
          clients[i].connection.sendUTF(json);
        }
        console.log("This is the index no?: "+index);
        clients[index].connection.sendUTF(JSON.stringify({ type:'index', index: index }));
      } else if (message_json.type === "message"){
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
      let json = JSON.stringify({ type:'playerLeft', data: {name: clients[index].userName,
                                                           score: clients[index].score,
                                                           index: index}});
      for (let i=0; i < clients.length; i++) {
        clients[i].connection.sendUTF(json);
      }
      freeIndex.push(index);
      clients[index].userName = false;
      clients[index].score = false;
    }
  });
});

