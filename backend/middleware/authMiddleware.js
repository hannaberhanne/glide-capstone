// middleware to get rid of token verification for every single time we create a route
// verifies that the user is authorized to access a protected route
// add 'router.use(verifyToken);' to verify the route is authorized
const { admin } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = await admin.auth().verifyIdToken(token); // send

        req.user = {
            uid: decoded.uid,
        };
        next();
    } catch (err) {
        console.error('Token verification error:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = { verifyToken };