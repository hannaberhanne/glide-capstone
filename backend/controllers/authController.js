const { db } = require('../config/firebase');

const signUp = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { email, firstName, lastName } = req.body;

        // error messages if fields aren't full
        if (!firstName && firstName.trim() === '') {
            return res.status(400).json({ error: 'First name is required' });
        }
        if (!lastName && lastName.trim() === '') {
            return res.status(400).json({ error: 'Last name is required' });
        }
        if (!email && email.trim() === '') {
            return res.status(400).json({ error: 'Email is required' });
        }

        // check db for the uid if it alr exists
        const userDoc = await db.collection('users').doc(uid).get();

        // make sure user isn't alr in db
        if (userDoc.exists) {
            return res.status(400).json({
                error: 'User profile already exists'
            });
        }

        const user = {
            createdAt: new Date(),
            email: email.trim(),
            firstName: firstName.trim(),
            gradYear: '',
            lastName: lastName.trim(),
            major: '',
            photo: '',
            updatedAt: new Date(),
            university: ''
        };

        await db.collection('users').doc(uid).set(user);

        // return new user created to the frontend
        res.status(201).json({
            message: 'User profile created successfully',
            userId: uid,
            user: user
        });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({
            error: 'Failed to create user profile',
            message: err.message
        });
    }
};

module.exports = { signUp };