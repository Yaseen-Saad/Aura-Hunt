// firebase.js
const admin = require('firebase-admin');
const serviceAccount ={};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'aura-hunt.appspot.com' // Replace with your Firebase Storage bucket
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { db, bucket };