class Game {

    constructor() {
        this.currentWord = "";
        this.round = 0;
        this.timer = null;
    }

    start() {
        this.nextRound()
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