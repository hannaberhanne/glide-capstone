import { admin, db } from '../config/firebase.js';

// get requests to retrieve the User profile
const getUser = async (req, res) => {
    try {
        const uid = req.user.uid;

        // this here it looks at the uid making that request and checks db makes sure they match (userId field in db for this user)
        const snapshot = await db.collection('users')
            .where('userId', '==', uid)
            .get();

        // cleanup user and put it in a map
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
    try {
        const {userId} = req.params;
        const uid = req.user.uid;
        const {
            darkMode, email, firstName, gradYear, lastName, longestStreak, major, notifications, photo,
            timezone, totalXP, university
        } = req.body;

        // Get the user document
        const docRef = db.collection('users').doc(userId);
        const doc = await docRef.get();

        // Check if user exists
        if (!doc.exists) {
            return res.status(404).json({error: 'User not found'});
        }

        // Check if user owns this user
        if (doc.data().userId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this user'
            });
        }

        // Build update object with only provided fields
        const updateData = {};
        const authUpdateData = {};  // for Auth in Firebase


        if (darkMode !== undefined) {
            updateData.darkMode = darkMode;
        }

        if (email !== undefined) {
            updateData.email = email;
            authUpdateData.email = email;
        }

        if (firstName !== undefined) {
            updateData.firstName = firstName;
        }

        if (gradYear !== undefined) {
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

        if (photo === undefined) {
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

        if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

            // Update the user in Firestore
            await docRef.update(updateData);
        }

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
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if this is the user itself
        if (doc.data().userId !== uid) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this user'
            });
        }

        // Delete from Firebase Authentication first
        await admin.auth().deleteUser(uid);

        // Then delete from Firestore
        await docRef.delete();

        res.json({
            success: true,
            message: 'User account deleted successfully',
            userId: userId
        });
    } catch (err) {
        console.error('Delete user error:', err);

        // Handle specific Firebase Auth errors
        if (err.code === 'auth/user-not-found') {
            // User doesn't exist in Auth, but might exist in Firestore
            // Continue to delete from Firestore
            try {
                await docRef.delete();
                return res.json({
                    success: true,
                    message: 'User deleted from database (already removed from authentication)',
                    userId: userId
                });
            } catch (firestoreErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to delete user from database'
                });
            }
        }

        res.status(500).json({
            success: false,
            error: 'Failed to delete user account',
            message: err.message
        });
    }
};




export {
    getUser,
    updateUser,
    deleteUser
};