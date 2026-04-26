import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

process.env.FIRESTORE_ENABLE_TRACING = 'false';

try {
    // On Firebase App Hosting, ADC is automatically available.
    // Fall back to explicit credentials for local dev.
    if (process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
        });
    } else {
        admin.initializeApp();  // for web hosting
    }
} catch (err) {
    console.error("Firebase initialization error:", err.message);
    throw err;
}

const db = admin.firestore();
db.settings({
    preferRest: true,
    ignoreUndefinedProperties: true,
});

export { admin, db };