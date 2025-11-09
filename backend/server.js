/*
The server file to run the Express backend, be the central backend file for the http server, handle routes, etc.
*/

// express creates the http server
// cors connects frontend requests to backend for development
// app creates an instance of an express https serer
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT ||8080;
const { db } = require('./config/firebase');


// middleware code
app.use(cors());
app.use(express.json());

// delete response ************************************************************************************** delete this response
app.get('/', (req, res) => {
    res.json({
        message: 'Glide+ Backend Server is running',
        timestamp: new Date().toISOString()
    });
});


app.get('/test-firebase', async (req, res) => {
    try {
        // Try to read from users collection
        const usersSnapshot = await db.collection('users').limit(1).get();
        res.json({
            message: 'Firebase connected successfully!',
            userCount: usersSnapshot.size
        });
    } catch (error) {
        res.status(500).json({
            error: 'Firebase connection failed',
            details: error.message
        });
    }
});



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


