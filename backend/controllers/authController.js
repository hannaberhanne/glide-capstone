import {admin, db} from '../config/firebase.js';

const signUp = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { email, firstName, lastName } = req.body;

        // error messages if fields aren't full
        if (!firstName || firstName.trim() === '') {
            return res.status(400).json({ error: 'First name is required' });
        }
        if (!lastName || lastName.trim() === '') {
            return res.status(400).json({ error: 'Last name is required' });
        }
        if (!email || email.trim() === '') {
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
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            darkMode: false,
            email: email.trim(),
            firstName: firstName.trim(),
            gradYear: '',
            lastName: lastName.trim(),
            longestStreak: 0,
            major: '',
            notifications: false,
            photo: '',
            timezone: '',
            totalXP: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            university: '',
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

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await admin.auth().getUserByEmail(email);

        res.json({
            message: 'Login successful',
            userId: user.uid
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: 'Invalid credentials' });
    }
};

export default { signUp, login };