 //make it so this ACTUALLY works lol
 module.exports = class Game {
    constructor(players) {
        console.log("the constructor has been called!");
        this.currentWord = "";
        this.round = 0;
        this.timer();
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

}