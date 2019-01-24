let connection;
let playerCount = 0;
let chatRights = true;
let amIDrawer = false;
let canIDraw = false;
let myIndex = false;

//returns an avatar picture to use in the scoreboard
let images = ['avatar1.png', 'avatar2.png', 'avatar3.png',
    'avatar4.png', 'avatar5.png', 'avatar6.png'];

$(function () {
    "use strict";
    // for better performance - to avoid searching in DOM
    let content = $('#content');
    let input = $('#input');

    // if browser doesn't support WebSocket, just show
    // some notification and exit
    if (!window.WebSocket) {
        alert('Sorry, but your browser doesn\'t support WebSocket.');
        return;
    }

    // open connection
    connection = new WebSocket('ws://127.0.0.1:1337'); // Localhost

    connection.onopen = function () {
        // first we want users to enter their names
        getName();
    };

    connection.onerror = function () {
        // just in there were some problems with connection...
        alert('Sorry, but there\'s some problem with your connection or the server is down.');
    };

    connection.onmessage = function (message) {
        let json;
        try {
            json = JSON.parse(message.data);
        } catch (e) {
            return;
        }

        if (json.type === 'history') { // entire message history
            // insert every single message to the chat window
            for (let i=0; i < json.data.length; i++) {
                addMessage(json.data[i].author, json.data[i].text);
            }
        } else if (json.type === 'message') { // it's a single message
            // let the user write another message
            addMessage(json.data.author, json.data.text);
        } else if(json.type === "draw") { //let use draw tools
            if (json.data.type === "brush") {
                strokeWeight(json.data.strokeWeight);
                stroke(json.data.color);
                line(json.data.mouseX, json.data.mouseY, json.data.pmouseX, json.data.pmouseY);
            } else if (json.data.type === "bucket") {
                brushColour = json.data.color;
                floodFill(json.data.mouseX, json.data.mouseY);
            } else if (json.data.type === "clear") {
                clear();
                background(255);
            }
        } else if(json.type === "drawHistory") { //everything drawn in a round
            for (let i = 0; i < json.data.length; i++) {
                if (json.data[i].type === "brush") {
                    strokeWeight(json.data[i].strokeWeight);
                    stroke(json.data[i].color);
                    line(json.data[i].mouseX, json.data[i].mouseY, json.data[i].pmouseX, json.data[i].pmouseY);
                } else if (json.data[i].type === "bucket") {
                    brushColour = json.data[i].color;
                    floodFill(json.data[i].mouseX, json.data[i].mouseY);
                }
            }
        } else if(json.type === "players"){ //updates relevant info from every player
            let playerListElement = $("#players");
            for (let i = 0; i < json.data.length; i++) {
                playerCount++;
                playerListElement.append("<div id='player_"+json.data[i].index+"'>"+json.data[i].name+"</div>");

                let insideNewDiv = document.getElementById("player_"+json.data[i].index);

                //breaks for aesthetics
                let br = document.createElement("br");
                insideNewDiv.appendChild(br);

                //append cute cats
                let img = document.createElement("img");
                img.src = "./img/avatar"+(json.data[i].index+1)+".png";
                insideNewDiv.appendChild(img);

                //score on scoreboard
                let score = document.createElement("div");
                score.setAttribute("id","score" + json.data[i].index);
                insideNewDiv.append(score);
                document.getElementById("score" + json.data[i].index).append("Score: 0");

            }
        } else if(json.type === "playerJoined"){ //fires whenever a player joins
            //updating current player Count on button for HTML
            playerCount++;
            if(myIndex === 0) document.getElementById("startGame").innerHTML = "Press me to start! Players: " + playerCount;

            //add new div element for every new player joining
            let playerListElement = $("#players");
            playerListElement.append("<div id='player_"+json.data.index+"'>"+json.data.name+"</div>");
            //create shorthand for newly created div
            let insideNewDiv = document.getElementById("player_"+json.data.index);

            //breaks to make it pretty
            let br = document.createElement("br");
            insideNewDiv.appendChild(br);

            //append avatar pictures of cute cats
            let img = document.createElement("img");
            img.src = "./img/avatar"+(json.data.index+1)+".png";
            insideNewDiv.appendChild(img);

            //make score divs and append base Score
            let score = document.createElement("div");
            score.setAttribute("id","score" + json.data.index);
            insideNewDiv.append(score);
            document.getElementById("score" + json.data.index).append("Score: 0");

        } else if(json.type === "playerLeft"){ //same as playerJoined but with leaving...
            playerCount--;
            //updating current player Count on button for HTML
            document.getElementById("startGame").innerHTML = "Press me to start! Players: " + playerCount;
            $("#player_"+json.data.index).remove();
        } else if(json.type === "index"){ //gives index for current player
            myIndex = json.index;
            $("#player_"+json.index).css("color","purple");
        } else if (json.type === "setWord") { //sets the word to be drawn or guessed
            $("#word-to-draw").text(json.data)
        } else if (json.type === "endRound") { //shoots after round ended
            canIDraw = false;
            clear();
            background(255);
            addMessage("Server", "Round "+json.round+" Ended!");
        } else if (json.type === "startRound") { //same as endRound but for startRound
            if(amIDrawer) canIDraw = true;
            addMessage("Server", "Round "+json.round+" Started!");
        } else if (json.type === "solved") { //in case somebody manages to actually guess a word
            addMessage("Server", "You guessed the word!");
        } else if (json.type === "chatRights") {
            chatRights = json.data.isSet;
        } else if (json.type === "scoreUpdate") { //updates score per player
            json.index.forEach((index) => {
                document.getElementById("score" + index).innerHTML = "Score: " + json.score[index];
            });

        } else if (json.type === "firstPlayer") { //special case for first player joining aka lobby leader
            if(json.isTrue) {

                  let elem = document.createElement("div");
                  elem.setAttribute("id", "startGame");
                  document.getElementById("inputField").appendChild(elem);
                  document.getElementById("startGame").innerHTML = "Wait for another Player to join!";
                  amIDrawer = true;

                    document.getElementById("startGame").addEventListener("click", () => {
                        if(playerCount >= 2) {
                            connection.send(JSON.stringify({type: 'startGame', isTrue: 'true'}));
                            let elem = document.getElementById("startGame");
                            elem.parentNode.removeChild(elem);
                        }
                    });
            }
        } else if (json.type === "drawerChanged") {
          amIDrawer = json.data.newIndex === myIndex;
        } else if (json.type === "timer") {
            $("#counter").text(json.data.toString() + "s remaining")
        } else {
            //this should never happen += 1;
        }
    };

    input.keydown(function(e) { //chat function
        if(chatRights && !amIDrawer) {
          if (e.keyCode === 13) {
            let msg = $(this).val();
            if (!msg) {
              return;
            }
            let json = JSON.stringify({ type:'message', data: msg });
            // send the message as an ordinary text
            connection.send(json);
            $(this).val('');
          }
        }
    });


// Add message to the chat window
    function addMessage(author, message) {
        content.append('<p><span>' + author + '</span>: ' + message + '</p>');

        let messageBody = document.querySelector('#content');
        messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
    }
});
