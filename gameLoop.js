let serv = require("./server");



module.exports = class Game {
    constructor(players) {
        this.players = players;
        this.solved = false;
        this.currentDrawer = 0;
        console.log("the constructor has been called!");
        this.round = 0;
        this.currentWord = "";
        this.nextRound();
    }

     obscureWord() {
         serv.generateWord(serv.randomCategory)
             .then(word => {
                 this.currentWord = word;
                 const placeholder = word.split("").map(() => "_").join(" ");

                 this.players.forEach((client, index) => {
                     if (index === this.currentDrawer) {
                         client.connection.sendUTF(JSON.stringify({ type: 'setWord', data: word }))
                     } else {
                         client.connection.sendUTF(JSON.stringify({ type: 'setWord', data: placeholder }))
                     }
                 });
             });
     }

    timer(initial) { // done
        this.players.forEach((client) => {
            client.connection.sendUTF(JSON.stringify({
                type: "timer",
                data: initial // remaining seconds
            }))
        });
        console.log(initial); //<-- do not remove this!!!
        if (initial === 0) {
            console.log("Round over");
            this.endRound();
        } else {
            setTimeout(() => { this.timer(initial - 1) }, 1000);
        }
    }


    nextRound() {
        this.solved = false;
        this.obscureWord(); // will execute asynchronously but thats ok
        console.log("this is round: " + this.round);
        this.round++;
        this.players.forEach((client) => {
            client.connection.sendUTF(JSON.stringify({
                type: "startRound"
            }));
        });
        for(let i = 0; i < this.players.length; i++) {
          if(i !== this.currentDrawer)
              this.players[i].connection.sendUTF(JSON.stringify({type: "chatRights", data: {isSet: true}}));
          if(i === this.currentDrawer)
              this.players[i].connection.sendUTF(JSON.stringify({type: "chatRights", data: {isSet: false}}));
        }
        this.timer(60);//TODO CHANGE
    }

    endRound() {
        console.log("End Round fired!");
        // show word, do scoreboard
        this.players.forEach((client) => {
            client.connection.sendUTF(JSON.stringify({
                type: "setWord",
                data: this.currentWord
            }));
            client.connection.sendUTF(JSON.stringify({
                type: "endRound",
            }));
        });
        setTimeout(() => {
            if (this.round < 5) {
                this.changeDrawer();
                this.nextRound();
            } else {
                //declare winner
                console.log("THE GAME IS OVER PLEASE GET A LIFE NOW");
            }
        }, 1000)
    }

    changeDrawer() {
      const oldIndex = this.currentDrawer;
      this.currentDrawer = (oldIndex + 1 )%this.players.length;
      console.log("new drawer index: "+this.currentDrawer);
      this.players[oldIndex].isDrawer = false;
      this.players[this.currentDrawer].isDrawer = true;
      let json = JSON.stringify({type: "drawerChanged", data: { oldIndex: oldIndex, newIndex: this.currentDrawer}});
      for(let i of this.players) {
        i.connection.sendUTF(json);
      }
    }

    messageFromPlayer(obj) {
      console.log(obj.index + " " + obj.word);
      if(obj.word === this.currentWord && !this.solved) {
        this.solved = true;
        this.players[obj.index].score += 15;
        let json = JSON.stringify({type: "chatRights", data: { isSet: false}});
        this.players[obj.index].connection.sendUTF(json);
      }
      else if(obj.word === this.currentWord && this.solved) {
        this.players[obj.index].score += 10;
        let json = JSON.stringify({type: "chatRights", data: { isSet: false}});
        this.players[obj.index].connection.sendUTF(json);
    }
    console.log(this.players[obj.index].score);
  }
};
