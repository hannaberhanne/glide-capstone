const admin = require('firebase-admin');
require('dotenv').config();

try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
    });
} catch (err) {
    console.error("Firebase initialization error: ", err.message);
    throw err
}

const db = admin.firestore();

module.exports = { admin, db };