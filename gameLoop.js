module.exports.Game =
class Game {

    constructor(players) {

        this.currentWord = "";
        this.round = 0;
        this.timer();
        //this.timer = null;
    }

    start() {
        this.nextRound()
    }

    timer() {
        var count = 30;
        setInterval(function() {
            $("#counter").html(count--);
            if(count === 1) clearInterval(timer);
        }, 1000);
    }


    nextRound() {
        setTimeout(this.endRound, 10000);
        this.round++;
        this.timer = setTimeout(this.endRound, 60000)
    }

    endRound() {
        // show word, do scoreboard

        if (this.round < 5) {
            this.nextRound()
        }
    }

}