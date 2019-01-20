let connection;
let playerCount = 0;
let chatRights = true;
let amIDrawer = false;
let canIDraw = false;
let myIndex = false;

//returns a random avatar picture to use in the scoreboard
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
            console.log('Invalid JSON: ', message);
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
        } else if(json.type === "draw") {
            //console.log("received draw");
            //console.log(json.data);
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
        } else if(json.type === "drawHistory") {
            console.log("received drawHistory");
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
        } else if(json.type === "players"){
          console.log("players:");
            let playerListElement = $("#players");
            for (let i = 0; i < json.data.length; i++) {
                console.log("players in for");
                playerCount++;
                console.log(json.data[i]);
                playerListElement.append("<div id='player_"+json.data[i].index+"'>"+json.data[i].name+"</div>");

                let img = document.createElement("img");
                img.src = "./img/avatar"+(json.data[i].index+1)+".png";
                // img.src = randomAvatar();
                let src = document.getElementById("player_"+json.data[i].index);
                src.appendChild(img);
            }
        } else if(json.type === "playerJoined"){
          console.log("playerJoined: ");
            playerCount++;
            //updating current player Count on button for HTML
            //TODO TODO

            if(myIndex === 0) document.getElementById("startGame").innerHTML = "Press me to start! Players: " + playerCount;

            console.log(json.data);
            let playerListElement = $("#players");
            playerListElement.append("<div id='player_"+json.data.index+"'>"+json.data.name+"</div>");
            let img = document.createElement("img");
            img.src = "./img/avatar"+(json.data.index+1)+".png";
            // img.src = randomAvatar();
            let src = document.getElementById("player_"+json.data.index);
            src.appendChild(img);
        } else if(json.type === "playerLeft"){
            console.log("playerleft: ");
            playerCount--;
            //updating current player Count on button for HTML
            document.getElementById("startGame").innerHTML = "Press me to start! Players: " + playerCount;
            console.log(json.data);
            $("#player_"+json.data.index).remove();
        } else if(json.type === "index"){
            myIndex = json.index;
            console.log(json);
            $("#player_"+json.index).css("color","red");
        } else if (json.type === "setWord") {
            $("#word-to-draw").text(json.data)
        } else if (json.type === "endRound") {
            canIDraw = false;
            clear();
            background(255);
            let obj = {
              type: 'clear'
            };
            addMessage("Server", "Round "+json.round+" Ended!");
        } else if (json.type === "startRound") {
            if(amIDrawer) canIDraw = true;
            addMessage("Server", "Round "+json.round+" Started!");
        } else if (json.type === "solved") {
            addMessage("Server", "You guessed the word!");
        } else if (json.type === "chatRights") {
            console.log("my chat rights: " + json.data.isSet);
            chatRights = json.data.isSet;
        } else if (json.type === "scoreUpdate") {
            console.log(json.index, json.score);
        } else if (json.type === "firstPlayer") {
            if(json.isTrue) {
                  console.log("i am first player");
                  let elem = document.createElement("div");
                  elem.setAttribute("id", "startGame");
                  document.getElementById("inputField").appendChild(elem);
                  document.getElementById("startGame").innerHTML = "Wait for another Player to join!";
                  amIDrawer = true;

                    document.getElementById("startGame").addEventListener("click", () => {
                        if(playerCount >= 2) {
                            connection.send(JSON.stringify({type: 'startGame', isTrue: 'true'}));
                            //TODO make it disappear for all clients
                            //TODO probably needs to be on server but that doesnt work yet
                            console.log("this button has been pressed");
                            let elem = document.getElementById("startGame");
                            elem.parentNode.removeChild(elem);
                        }
                    });
            }
        } else if (json.type === "drawerChanged") {
          console.log(json.data);
          amIDrawer = json.data.newIndex === myIndex;
          console.log("am i drawer?: "+amIDrawer);
        } else if (json.type === "timer") {
            $("#counter").text(json.data.toString() + "s remaining")
        } else {
            //this should never happen += 1;
            console.log('Excuse me what the fuck?: ', json);
        }
    };

    input.keydown(function(e) {
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
