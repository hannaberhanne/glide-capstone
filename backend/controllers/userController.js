import { admin, db } from '../config/firebase.js';

// get requests to retrieve the User profile
const getUser = async (req, res) => {
    try {
        const uid = req.user.uid;

        // First try direct doc lookup by UID
        const docRef = db.collection('users').doc(uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            return res.json([{
                userId: docSnap.id,
                ...docSnap.data()
            }]);
        }

        // Fallback: legacy documents that might have userId field
        const snapshot = await db.collection('users')
            .where('userId', '==', uid)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = snapshot.docs.map(doc => ({
            userId: doc.id,
            ...doc.data()
        }));

        res.json(user);

    } catch (err) {
        console.error('Get user error:', err.message);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};


// patch to update an existing user
const updateUser = async (req, res) => {
    // Helper function to validate email format
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Helper function to validate graduation year
    const isValidGradYear = (year) => Number.isInteger(year) && year > 1900 && year <= new Date().getFullYear() + 10;
    
    try {
        const {userId} = req.params;
        const uid = req.user.uid;
        const {
            canvasToken, darkMode, email, firstName, gradYear, lastName, longestStreak, major, notifications, photo,
            timezone, totalXP, university
        } = req.body;

        // Get the user document
        const docRef = db.collection('users').doc(userId);
        const doc = await docRef.get();

        // Ensure the caller is updating their own user document
        const docOwnerId = doc.exists ? (doc.data()?.userId || doc.id) : userId;
        if (docOwnerId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this user'
            });
        }

        // Build update object with only provided fields
        const updateData = {};
        const authUpdateData = {};  // for Auth in Firebase

        if (canvasToken !== undefined) {
            updateData.canvasToken = canvasToken || '';
        }

        if (darkMode !== undefined) {
            updateData.darkMode = darkMode;
        }

        if (email !== undefined) {
            if (!isValidEmail(email)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }
            updateData.email = email;
            authUpdateData.email = email;
        }

        if (firstName !== undefined) {
            updateData.firstName = firstName;
        }

        if (gradYear !== undefined) {
            if (!isValidGradYear(gradYear)) {
                return res.status(400).json({ error: 'Invalid graduation year' });
            }
            updateData.gradYear = gradYear;
        }

        if (lastName !== undefined) {
            updateData.lastName = lastName;
        }

        if (longestStreak !== undefined) {
            updateData.longestStreak = longestStreak;
        }

        if (major !== undefined) {
            updateData.major = major;
        }

        if (notifications !== undefined) {
            updateData.notifications = notifications;
        }

        if (photo !== undefined) {
            updateData.photo = photo;
        }

        if (timezone !== undefined) {
            updateData.timezone = timezone;
        }

        if (totalXP !== undefined) {
            updateData.totalXP = totalXP;
        }

        if (university !== undefined) {
            updateData.university = university;
        }

        // Update Firebase Authentication email if provided
        if (authUpdateData.email) {
            await admin.auth().updateUser(userId, authUpdateData);
        }

        // Persist the data (create doc if it does not exist)
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        updateData.updatedAt = timestamp;
        if (!doc.exists) {
            updateData.createdAt = timestamp;
            updateData.userId = userId;
        }

        if (Object.keys(updateData).length === 1 && updateData.updatedAt) {
            // No useful fields provided
            return res.status(400).json({ error: 'No valid fields provided to update' });
        }

        await docRef.set(updateData, { merge: true });
        const updatedDoc = await docRef.get();

        res.json({
            success: true,
            message: 'User updated successfully',
            data: {
                userId: updatedDoc.id,
                ...updatedDoc.data()
            }
        });

    } catch (err) {
        console.error('Update user error:', err);

        // Handle specific Firebase Auth errors
        if (err.code === 'auth/email-already-exists') {
            return res.status(400).json({
                success: false,
                error: 'Email already in use by another account'
            });
        }

        if (err.code === 'auth/invalid-email') {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to update user',
            message: err.message
        });
    }
};


// remove a user from db
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const uid = req.user.uid;

        const docRef = db.collection('users').doc(userId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user owns this user
        if (doc.data().userId !== uid) {
            return res.status(403).json({ error: 'Not authorized to delete this user' });
        }

        // Delete the user from Firestore
        await docRef.delete();

        // Delete the user from Firebase Auth
        await admin.auth().deleteUser(userId);

        res.json({
            userId: userId,
            deleted: true,
            message: 'User deleted successfully'
        });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

export {
    getUser,
    updateUser,
    deleteUser
};
