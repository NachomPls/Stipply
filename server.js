"use strict";

//get firebase functions and functionality
const admin = require('firebase-admin');
const serviceAccount = require('./stipply-firebase-key.json');

//initialize firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://stipply-c1375.firebaseio.com'
});
//change snapshots so it doesnt collide with system time
const firestore = admin.firestore();
const settings = { timestampsInSnapshots: true };
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
let docRefProgramming = wordData.collection('Words').doc('Category 1');
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
}

////TODO DATABASE STOPS HERE

// Port where we'll run the websocket server
let webSocketsServerPort = 1337;

// websocket and http servers
let webSocketServer = require('websocket').server;
let http = require('http');

// Global letiables
let history = []; //Alle aktionen vom chat her
let drawHistory = []; //Alle aktionen vom zeichnen her.
let clients = []; // Da sind Daten von allen spielern drin
let freeIndex = []; // Unbenutze Id's die mindestens schon 1 mal verwendet werden. Die werden also wiederverwendet
let indexCount = 0; // Zum vergeben von neuen indexen. Das passiert aber nur wenn freeIndex leer is.

//var for game instance
let Game = require('./gameLoop.js');
let gameInstance;

// Helper function for escaping input strings
function htmlEntities(str) {
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// HTTP server
let server = http.createServer(function (request, response) { });
server.listen(webSocketsServerPort, function () {
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
wsServer.on('request', function (request) {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  let connection = request.accept(null, request.origin);

  // we need to know client index to remove them on 'close' event
  let userName = false;
  let score = false;
  let obj = {
    connection: connection, //in connection sind die sende funktion von jedem client. Like clients[i].connection.sendUTF("lol") => i kriegt jetzt lol.
    userName: userName,
    score: score,
  };

  //hier kriegt er jetzt nen index. Dunno ob er wirklich nötig is, es is aber leichter für mich zu hantieren.. like hier und im js dann.
  let index;
  if (!(freeIndex > 0)) { //gibts keine freie Id aka es gibt clients von 0...n dann bekommt der nächste n+1.
    clients.push(obj); //neuen client dranhängen.
    index = indexCount;
    indexCount++;
  } else { //sind freie Id's da wird eine raus gepoped (benutzt und entfernt von freeIndex).
    index = freeIndex.pop();
    clients[index] = obj; //Der platz wird eingenohmen anstelle dazu gepushed zu werden.
  }
  clients[index].index = index;
  // TODO

  console.log("DEBUG:");
  console.log("clients: "+clients.length);
  console.log("freIndex: "+freeIndex.length);
  if(clients.length === (freeIndex.length+1)) connection.sendUTF(JSON.stringify({ type: 'firstPlayer', isTrue: 'true'}));

  generateWord(randomWord)
      .then(word => {
        const placeholder = word.split("").map(() => "_").join(" ");

        clients.forEach((client, index) => {
          if (index < 1) {
            client.connection.sendUTF(JSON.stringify({ type: 'setWord', data: word }))
          } else {
            client.connection.sendUTF(JSON.stringify({ type: 'setWord', data: placeholder }))
          }
        });
      });

  // //

  //Log log log lol
  console.log((new Date()) + ' Connection accepted.');
  console.log("Debug:");
  console.log("IndexCount: " + indexCount);
  console.log("FreeIndex: " + freeIndex);
  console.log("Index: " + index);

  // send back chat history
  //Wenn jemand neu connected kriegt er die chat history, draw history und die anderen clients von der lobby, falls da was drin steht.
  if (history.length > 0) {
    connection.sendUTF(JSON.stringify({ type: 'history', data: history }));
  }
  if (drawHistory.length > 0) {
    connection.sendUTF(JSON.stringify({ type: 'drawHistory', data: drawHistory }));
  }
  if (clients.length > 0) {
    console.log("Sending clients");
    let tempArray = [];
    for (let i = 0; i < clients.length; i++) { //etwas umständlich hier, aber nötig weil ich nicht client.connection verteilen möchte
      if (clients[i].userName) {
        let tempPlayer = {
          name: clients[i].userName,
          score: clients[i].score,
          index: clients[i].index
        };
        tempArray.push(tempPlayer);
      }
    }
    connection.sendUTF(JSON.stringify({ type: 'players', data: tempArray }));
  }

  // user sent some message
  //der server kriegt ne nachricht, dann fired das hier
  connection.on('message', function (message) {
    console.log(message);
    if (message.type === 'utf8') { // accept only text, like no .mp3, no .pdf, no .rofl just texxxxt
      let message_json = JSON.parse(message.utf8Data); //wir senden eigentlich nur in json format
      if (message_json.type === "name") { //name wurde zwar schon bei clients gepushed, is aber noch empty. Sollte sich der dau dan ändlich entscheiden den alert zu beachten fired das hier.
        clients[index].userName = htmlEntities(message_json.name);
        clients[index].score = 0; //ab dem namen gibts auch nen score
        console.log((new Date()) + ' User is known as: ' + clients[index].userName);
        let client = {
          name: clients[index].userName,
          score: clients[index].score,
          index: index
        };
        let json = JSON.stringify({ type: 'playerJoined', data: client });
        for (let i = 0; i < clients.length; i++) {
          clients[i].connection.sendUTF(json);
        }
        console.log("This is the index Nr: " + index);
        clients[index].connection.sendUTF(JSON.stringify({ type: 'index', index: index }));
      } else if (message_json.type === "message") { // chat nachricht
        // log and broadcast the message
        console.log((new Date()) + ' Received Message from ' + userName + ': ' + message_json.data);

        // we want to keep history of all sent messages
        let obj = {
          text: htmlEntities(message_json.data),
          author: clients[index].userName
        };
        history.push(obj); //dranhängen
        history = history.slice(-100); //<- no ideam, was copied
        // broadcast message to all connected clients
        let json = JSON.stringify({ type: 'message', data: obj }); //an alle anderen verteilen
        for (let i = 0; i < clients.length; i++) {
          clients[i].connection.sendUTF(json);
        }
      } else if (message_json.type === "draw") { //es wurde gezeichnet
        console.log(message_json.data);
        drawHistory.push(message_json.data); //wird einfach wies is drangehängt
        if (message_json.data.type === "clear") { //bzw mus er schaun obs ein clear war, wenn ja mus die history gecleared werden
          drawHistory = [];
        }
        for (let i = 0; i < clients.length; i++) { //Unnnnned wieder verteilen, like maybe i should write a function that does this for how often we use it :thiking:
          if (i !== index) clients[i].connection.sendUTF(message.utf8Data); // wird an alle auser sich geschickt, weil das zeichnen local passiert (aus performance gründen), vergleichweise geht der chat zum server und zum sendenden client zurück
        }
      } else if (message_json.type === 'startGame') {
        console.log("DEBUG START GAME");
        //TODO only show this to first person
        gameInstance = new Game(clients)
      }
    }
  });

  // user disconnected
  connection.on('close', function (connection) { //Wenn sich ein spieler schleicht
    if (clients[index].userName !== false) { //nur wenn der schon den alert beantwortet hat. (mir fällt auch das hier noch eine condition hin muss falls er noch keinen hat :thinking:)
      console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
      for (let i = 0; i < clients.length; i++) {
        let json = JSON.stringify({ type: 'playerLeft', data: { name: clients[index].userName, score: clients[index].score, index: index } });
        clients[i].connection.sendUTF(json);
        freeIndex.push(index); //die benutze Id freigeben
        clients[index].userName = false; //und die werte entfernen
        clients[index].score = false;
      }
    }
  })
});
