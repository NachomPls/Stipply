let serv = require("./server");



module.exports = class Game {
    constructor(players) {
        this.players = players;
        this.solved = false;
        this.currentDrawer = 0;
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

    timer(initial) {
        this.players.forEach((client) => {
            client.connection.sendUTF(JSON.stringify({
                type: "timer",
                data: initial // remaining seconds
            }))
        });
        if (initial === 0) {

            this.endRound();
        } else {
            setTimeout(() => { this.timer(initial - 1) }, 1000);
        }
    }


    nextRound() {
        this.solved = false;
        this.obscureWord(); // will execute asynchronously but thats ok
        this.round++;
        this.players.forEach((client) => {
            client.connection.sendUTF(JSON.stringify({
                type: "startRound",
                round: this.round
            }));
        });
        //sets chatRights
        for(let i = 0; i < this.players.length; i++) {
          if(i !== this.currentDrawer)
              this.players[i].connection.sendUTF(JSON.stringify({type: "chatRights", data: {isSet: true}}));
          if(i === this.currentDrawer)
              this.players[i].connection.sendUTF(JSON.stringify({type: "chatRights", data: {isSet: false}}));
        }
        this.timer(60);
    }

    endRound() {
        let indexArray = [];
        let scoreArray = [];
        this.players.forEach((client) => {
          indexArray.push(client.index);
          scoreArray.push(client.score);
        });

        // shows Word to every player
        this.players.forEach((client) => {
            client.connection.sendUTF(JSON.stringify({
                type: "setWord",
                data: this.currentWord
            }));
            client.connection.sendUTF(JSON.stringify({
                type: "endRound",
                round: this.round
            }));
            client.connection.sendUTF(JSON.stringify({
                type: "scoreUpdate",
                index: indexArray,
                score: scoreArray
            }));
        });
        setTimeout(() => {
            if (this.round < 5) {
                this.changeDrawer();
                this.nextRound();
            }
        }, 1000)
    }

    changeDrawer() {
      const oldIndex = this.currentDrawer;
      this.currentDrawer = (oldIndex + 1 )%this.players.length;
      this.players[oldIndex].isDrawer = false;
      this.players[this.currentDrawer].isDrawer = true;
      let json = JSON.stringify({type: "drawerChanged", data: { oldIndex: oldIndex, newIndex: this.currentDrawer}});
      for(let i of this.players) {
        i.connection.sendUTF(json);
      }
    }

    messageFromPlayer(obj) {
      if(obj.word.toLowerCase() === this.currentWord.toLowerCase() && !this.solved) {
        this.solved = true;
        this.players[obj.index].score += 15;
        let json = JSON.stringify({type: "chatRights", data: { isSet: false}});
        this.players[obj.index].connection.sendUTF(json);
        let json2 = JSON.stringify({type: "solved"});
        this.players[obj.index].connection.sendUTF(json2);
      }
      else if(obj.word.toLowerCase() === this.currentWord.toLowerCase() && this.solved) {
          console.log(obj.word.toLowerCase());
          console.log(this.currentWord.toLowerCase());
        this.players[obj.index].score += 10;
        let json = JSON.stringify({type: "chatRights", data: { isSet: false}});
        this.players[obj.index].connection.sendUTF(json);
        let json2 = JSON.stringify({type: "solved"});
        this.players[obj.index].connection.sendUTF(json2);
    }
  }
};
