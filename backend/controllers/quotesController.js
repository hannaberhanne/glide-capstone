import { admin, db } from '../config/firebase.js';

// get requests to retrieve all goals
const getQuote = async (req, res) => {
    try {
        const uid = req.user.uid;


        const snapshot = await db.collection('quotes').get();

        const quotes = snapshot.docs.map(doc => doc.data());  // grab all quotes in DB into a map

        const quote = quotes[Math.floor(Math.random() * quotes.length)];  // send one random one back
        res.json(quote);


    } catch (err) {
        console.error('Get quote error:', err.message);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
};