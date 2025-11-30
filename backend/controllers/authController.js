import {admin, db} from '../config/firebase.js';

const signUp = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { email, firstName, lastName } = req.body;

        // error messages if fields aren't full
        if (!firstName || firstName.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'First name is required'
            });
        }
        if (!lastName || lastName.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Last name is required'
            });
        }
        if (!email || email.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
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
            canvasToken: '',
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
            userId: uid,
            university: '',
        };

        await db.collection('users').doc(uid).set(user);

        // return new user created to the frontend
        res.status(201).json({
            message: 'User profile created successfully',
            userId: uid,
            data: {
                canvasToken: user.canvasToken,
                darkMode: user.darkMode,
                email: user.email,
                firstName: user.firstName,
                gradYear: user.gradYear,
                lastName: user.lastName,
                longestStreak: user.longestStreak,
                major: user.major,
                notifications: user.notifications,
                photo: user.photo,
                timezone: user.timezone,
                totalXP: user.totalXP,
                userId: uid,
                university: user.university,
            }
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
        const { email } = req.body;
        const uid = req.user.uid; // From verifyToken middleware

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userData = userDoc.data();

        res.json({
            success: true,
            message: 'Login successful',
            data: userData
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
            message: error.message
        });
    }
};

export { signUp, login };