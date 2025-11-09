const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const admin = require("firebase-admin");


admin.initializeApp({
    credential: admin.credential.cert(
        projectId: admin.credential.FIREBASE_PROJECT_ID
    )
});
