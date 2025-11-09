const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const admin = require("firebase-admin");

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    })
} catch (err) {
    console.error("Firebase initialization error: ", err.message);
    throw err
}


const db = admin.firestore();
const auth = admin.auth();

module.exports = {
    admin, db, auth
};