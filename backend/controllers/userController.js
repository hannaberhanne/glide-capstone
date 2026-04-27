import { admin, db } from '../config/firebase.js';


// grab the user profile.
const getUser = async (req, res) => {
    try {
        const uid = req.user.uid;

        // try the direct uid doc first.
        const docRef = db.collection('users').doc(uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            return res.json([{
                userId: docSnap.id,
                ...docSnap.data()
            }]);
        }

        // if this is older data, fall back to userId.
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
        console.error('Get user error:', err);
        res.status(500).json({ error: err.message, code: err.code });
    }
};


// update an existing user.
const updateUser = async (req, res) => {
    // keep email validation here so the controller stays honest.
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // same deal for grad year.
    const isValidGradYear = (year) => Number.isInteger(year) && year > 1900 && year <= new Date().getFullYear() + 10;
    
    try {
        const {userId} = req.params;
        const uid = req.user.uid;
        const {
            canvasToken, darkMode, email, firstName, fontScale, gradYear, lastName, longestStreak, major, notifications, photo,
            timezone, totalXP, university, homeTown, year, onboardingAnswers, preferences, dashboardNote
        } = req.body;

        // load the user doc once and work from that.
        const docRef = db.collection('users').doc(userId);
        const doc = await docRef.get();

        // only let people patch their own user doc.
        const docOwnerId = doc.exists ? (doc.data()?.userId || doc.id) : userId;
        if (docOwnerId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this user'
            });
        }

        // only write what actually came in.
        const updateData = {};
        const authUpdateData = {};  // firebase auth fields live separately.
        const existingData = doc.exists ? doc.data() : {};

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

        if (fontScale !== undefined) {
            updateData.fontScale = fontScale;
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

        if (homeTown !== undefined) {
            updateData.homeTown = homeTown;
        }

        if (onboardingAnswers !== undefined) {
            updateData.onboardingAnswers = onboardingAnswers;
        }

        if (dashboardNote !== undefined) {
            updateData.dashboardNote = dashboardNote === null ? '' : String(dashboardNote);
        }

        if (year !== undefined) {
            updateData.year = year;
        }

        if (preferences !== undefined && preferences && typeof preferences === 'object' && !Array.isArray(preferences)) {
            const existingPreferences =
                existingData.preferences && typeof existingData.preferences === 'object' && !Array.isArray(existingData.preferences)
                    ? existingData.preferences
                    : {};
            const mergedPreferences = {
                ...existingPreferences,
                ...preferences,
            };

            updateData.preferences = mergedPreferences;

            if (mergedPreferences.notifications !== undefined) {
                updateData.notifications = Boolean(mergedPreferences.notifications);
            }
            if (mergedPreferences.weeklySummary !== undefined) {
                updateData.weeklySummary = Boolean(mergedPreferences.weeklySummary);
            }
            if (mergedPreferences.taskColor !== undefined) {
                updateData.taskColor = mergedPreferences.taskColor;
            }
            if (mergedPreferences.goalColor !== undefined) {
                updateData.goalColor = mergedPreferences.goalColor;
            }
            if (mergedPreferences.defaultPriority !== undefined) {
                updateData.defaultPriority = mergedPreferences.defaultPriority;
            }
            if (mergedPreferences.theme !== undefined) {
                updateData.darkMode = mergedPreferences.theme === 'dark';
            }
            if (mergedPreferences.fontScale !== undefined) {
                updateData.fontScale = mergedPreferences.fontScale;
            }
            if (mergedPreferences.highContrast !== undefined) {
                updateData.highContrast = Boolean(mergedPreferences.highContrast);
            }
            if (mergedPreferences.highlightLinks !== undefined) {
                updateData.highlightLinks = Boolean(mergedPreferences.highlightLinks);
            }
            if (mergedPreferences.reduceMotion !== undefined) {
                updateData.reduceMotion = Boolean(mergedPreferences.reduceMotion);
            }
        }

        // if the email changed, auth needs the same update too.
        if (authUpdateData.email) {
            await admin.auth().updateUser(userId, authUpdateData);
        }

        // merge into firestore and create the doc if we need to.
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        updateData.updatedAt = timestamp;
        if (!doc.exists) {
            updateData.createdAt = timestamp;
            updateData.userId = userId;
        }

        if (Object.keys(updateData).length === 1 && updateData.updatedAt) {
            // don't do a fake update with no real fields.
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

        // surface auth errors cleanly.
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


// remove a user.
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const uid = req.user.uid;

        const docRef = db.collection('users').doc(userId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        // same rule here: only the owner can delete it.
        if (doc.data().userId !== uid) {
            return res.status(403).json({ error: 'Not authorized to delete this user' });
        }

        // kill the firestore doc first.
        await docRef.delete();

        // then remove auth.
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
