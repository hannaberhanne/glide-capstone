// middleware to get rid of token verification for every single time we create a route
// verifies the Firebase ID
const { admin } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = await admin.auth().verifyIdToken(token); // send

        req.user = {
            uid: decoded.uid,
            userId: decoded.u
        }
    }
}