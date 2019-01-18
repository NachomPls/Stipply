 //make it so this ACTUALLY works lol
 module.exports = class Game {
    constructor(players) {
        this.players = players;
        console.log("the constructor has been called!");
        this.currentWord = "";
        this.round = 0;

        this.changeDrawer();
        // this.timer();
        //this.timer = null;
    }

    start() {
        this.nextRound()
    }


    timer() {
        //TODO actually implement the timer with all the things neccessay
        setTimeout(function (){alert("round over!");}, 60000);
    }


    nextRound() {
        this.round++;
        this.timer = setTimeout(this.endRound, 60000)
    }

    endRound() {

        setTimeout(this.endRound, 10000);
        // show word, do scoreboard

        if (this.round < 5) {
            this.nextRound()
        }
    }

    changeDrawer() {
      let drawerIndex = 0;
      for(let i of this.players) {
        console.log(i.isDrawer);
        if(i.isDrawer == true) {
          drawerIndex = i.index;
          console.log("drawer index: "+drawerIndex);
        }
      }
      console.log("player size: "+this.players.length);
      let newDrawerIndex = (drawerIndex%this.players.length) + 1;
      console.log("new drawer index: "+newDrawerIndex);
      this.players[drawerIndex].isDrawer = false;
      this.players[newDrawerIndex].isDrawer = true;
      let json = JSON.stringify({type: "drawerChanged", data: { oldIndex: drawerIndex, newIndex: newDrawerIndex}});
      for(let i of this.players) {
        i.connection.sendUTF(json);
      }
    }
}
