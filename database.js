//setup for client side database functions
let config = {
    apiKey: "AIzaSyCEyGDfMrVb7akI5XCgVQcYUG-sAtZlRTc",
    authDomain: "stipply-c1375.firebaseapp.com",
    databaseURL: "https://stipply-c1375.firebaseio.com",
    storageBucket: "stipply-c1375.appspot.com",
    projectId: "stipply-c1375"
};

firebase.initializeApp(config);

let fs = firebase.firestore();
fs.settings({ timestampsInSnapshots: true });


