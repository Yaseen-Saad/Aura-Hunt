// firebase.js
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(process.env.FIREBASEACCOUNT),
    storageBucket: 'aura-hunt.appspot.com' // Replace with your Firebase Storage bucket
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { db, bucket };