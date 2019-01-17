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

// fs.collection("Words").doc("Category 1").get()
//     .then((x) => {
//         console.log(x.data())
//         for (let key of Object.keys(x.data())) {
//             console.log(key)
//             console.log(x.get(key))
//         }
//         console.log(Object.keys(x.data()).length)
//     })


