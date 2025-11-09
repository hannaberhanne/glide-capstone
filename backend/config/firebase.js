const admin = require("firebase-admin");

const serviceAccount = require("./glide-a52df-firebase-adminsdk-fbsvc-52ec769993.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
