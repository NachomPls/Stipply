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
module.exports.randomCategory = "Category " + initRandomInt();


//fetches random word from random document
module.exports.generateWord = function generateWord(category) {
    return admin.firestore().collection('Words').doc(category).get()
        .then((categorySnap) => {
            const max = Object.keys(categorySnap.data()).length;
            const rng = Math.floor(Math.random() * max) + 1;
            return categorySnap.get(rng.toString())
        })
};


// Port where we'll run the websocket server
let webSocketsServerPort = 1337;

// websocket and http servers
let webSocketServer = require('websocket').server;
let http = require('http');

// Global letiables... heh
let history = []; //All chat actions
let drawHistory = []; //All canvas actions
let clients = []; // all player data
let freeIndex = []; // id's that dont get used but have been used already. Keeping it green with recycling
let indexCount = 0; // this only gets used if freeIndex is empty
let isDrawerIndex = 0; //has current Drawer in it

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
    httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function (request) {
    let connection = request.accept(null, request.origin);

    // we need to know client index to remove them on 'close' event
    let userName = false;
    let score = false;
    let obj = {
        connection: connection, //send functions of every client
        userName: userName,
        score: score,
        isDrawing: false
    };

    //giving player an index for easier handling
    let index;
    if (!(freeIndex > 0)) { //if n clients already exist this one gets n+1
        clients.push(obj); //pushing new client to actual clients
        index = indexCount;
        indexCount++;
    } else { //case of free ID's; get one from freeIndex
        index = freeIndex.pop();
        clients[index] = obj; //new client takes place in clients at pos index
    }
    clients[index].index = index;

    //if only one person is in clients
    if(clients.length === (freeIndex.length+1)) {
        clients[index].isDrawer = true;
        isDrawerIndex = index;
        connection.sendUTF(JSON.stringify({ type: 'firstPlayer', isTrue: 'true'}));
    } else {
        clients[index].isDrawer = false;
    }

    // send back chat history
    if (history.length > 0) {
        connection.sendUTF(JSON.stringify({ type: 'history', data: history }));
    }
    if (drawHistory.length > 0) {
        connection.sendUTF(JSON.stringify({ type: 'drawHistory', data: drawHistory }));
    }
    if (clients.length > 0) {

        let tempArray = [];
        for (let i = 0; i < clients.length; i++) {
            if (clients[i].userName) {
                let tempPlayer = {
                    name: clients[i].userName,
                    score: clients[i].score,
                    index: clients[i].index,
                    isDrawer: clients[i].isDrawer
                };
                tempArray.push(tempPlayer);
            }
        }
        connection.sendUTF(JSON.stringify({ type: 'players', data: tempArray }));
    }

    // user sent some message
    connection.on('message', function (message) {

        if (message.type === 'utf8') { // accept only text, like no .mp3, no .pdf, no .rofl just texxxxt
            let message_json = JSON.parse(message.utf8Data);
            if (message_json.type === "name") { //fires after person uses alert
                clients[index].userName = htmlEntities(message_json.name);
                clients[index].score = 0; //score for player :>

                let client = {
                    name: clients[index].userName,
                    score: clients[index].score,
                    index: index,
                    isDrawer: clients[index].isDrawer
                };
                let json = JSON.stringify({ type: 'playerJoined', data: client });
                for (let i = 0; i < clients.length; i++) {
                    clients[i].connection.sendUTF(json);
                }
                clients[index].connection.sendUTF(JSON.stringify({ type: 'index', index: index }));
            } else if (message_json.type === "message") { // chat nachricht
                // log and broadcast the message
                gameInstance.messageFromPlayer({index: index, word: message_json.data});
                // we want to keep history of all sent messages
                let obj = {
                    text: htmlEntities(message_json.data),
                    author: clients[index].userName
                };
                history.push(obj);
                history = history.slice(-100); //<- no idea, was copied from a chat guide cuz it didnt work before
                // broadcast message to all connected clients
                let json = JSON.stringify({ type: 'message', data: obj });
                for (let i = 0; i < clients.length; i++) {
                    clients[i].connection.sendUTF(json);
                }
            } else if (message_json.type === "draw") { //something has been drawn

                drawHistory.push(message_json.data);
                if (message_json.data.type === "clear") { //if the message was clear
                    drawHistory = [];
                }
                for (let i = 0; i < clients.length; i++) {
                    //send to everyone but themselves
                    if (i !== index) clients[i].connection.sendUTF(message.utf8Data);
                }
            } else if (message_json.type === 'startGame') {
                gameInstance = new Game(clients);
            }
        }
    });

    // user disconnected
    connection.on('close', function () { //case for a player leaving
        if (clients[index].userName !== false) { //only if player is valid already

            for (let i = 0; i < clients.length; i++) {
                let json = JSON.stringify({ type: 'playerLeft', data: { name: clients[index].userName, score: clients[index].score, index: index } });
                clients[i].connection.sendUTF(json);
                freeIndex.push(index); //get used ID for later use
                clients[index].userName = false; //delete all the things
                clients[index].score = false;
                clients[index].isDrawer = false;
            }
        }
    })
});
