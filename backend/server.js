/*
The server file to run the Express backend, be the central backend file for the http server, handle routes, etc.
*/

// express creates the http server
// cors connects frontend requests to backend for development
// app creates an instance of an express https serer
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 8080;
const { db } = require('./config/firebase');


// middleware code
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


