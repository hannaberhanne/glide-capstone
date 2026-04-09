import { admin, db } from '../config/firebase.js';

function computeLevel(totalXP) {
  let level = 0;
  let accumulated = 0;
  while (totalXP >= accumulated + 100 * (level + 1)) {
    accumulated += 100 * (level + 1);
    level++;
  }
  return level;
}

const XP_MAP = {
    easy: 5,
    medium: 10,
    hard: 15,
    expert: 20,
};

const suggestTasks = async (req, res) => {
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ error: "Goal title is required." });
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                temperature: 0.7,
                messages: [
                    {
                        role: "system",
                        content: `You are a student productivity assistant. When given a goal title, suggest 2-3 concrete tasks to help achieve it. Respond ONLY with a valid JSON array. No explanation, no markdown, no code fences. Each object must have: "title" (string), "difficulty" (one of: easy, medium, hard, expert).`,
                    },
                    {
                        role: "user",
                        content: `Goal: "${title.trim()}"`,
                    },
                ],
            }),
        });

        const data = await response.json();
        const raw = data.choices[0].message.content.trim();
        const parsed = JSON.parse(raw);

        const tasks = parsed.map((task) => ({
            title: task.title,
            difficulty: task.difficulty,
            xp: XP_MAP[task.difficulty] ?? 5,
        }));

        return res.status(200).json({ tasks });
    } catch (err) {
        console.error("suggestTasks error:", err);
        return res.status(500).json({ error: "Failed to generate task suggestions." });
    }
};


// get requests to retrieve all goals
const getGoals = async (req, res) => {
    try {
        const uid = req.user.uid;

        // this here it looks at the uid making that request and checks db makes sure they match (userId field in db for this goal)
        const snapshot = await db.collection('goals')
            .where('userId', '==', uid)
            .get();

        // cleanup goals and put them in a map
        const goals = snapshot.docs.map(doc => ({
            goalId: doc.id,
            ...doc.data()
        }));

        res.json(goals);

    } catch (err) {
        console.error('Get goals error:', err.message);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
};


// post request to create a new goals
const createGoal = async (req, res) => {
    try {
        const { color, title } = req.body;
        const uid = req.user.uid;

        if (!title || title.trim() === '') {  // at least needs a title for a goal
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const docRef = await db.collection('goals').add({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            color: color || '#A58F1C',
            longestStreak: 0,
            streak: 0,
            title: title.trim(),
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // if successful send back the new goal created so it updates in real time
        res.status(201).json({
            createdAt: new Date().toISOString(),
            color: color,
            completedToday: false,
            goalId: docRef.id,
            longestStreak: 0,
            streak: 0,
            title: title.trim(),
            userId: uid,
            updatedAt: new Date().toISOString()
        });


    } catch (err) {
        console.error('Create goal error:', err);
        res.status(500).json({
            error: 'Failed to create goal',
            message: err.message
        });
    }
};



// patch to update an existing goal
const updateGoal = async (req, res) => {
    try {
        const { goalId } = req.params;
        const uid = req.user.uid;
        const { color, completedToday, longestStreak, streak, tasks, title } = req.body;

        // Get the goal document
        const docRef = db.collection('goals').doc(goalId);
        const doc = await docRef.get();

        // Check if goal exists
        if (!doc.exists) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        // Check if user owns this goal
        if (doc.data().userId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this goal'
            });
        }

        // Build update object with only provided fields
        const updateData = {};

        if (color !== undefined) {
            updateData.color = color;
        }

        if (longestStreak !== undefined) {  // if the longestStreak is not undefined then add 1 to longest streak
            if (streak > longestStreak) {
                updateData.longestStreak = admin.firestore.FieldValue.increment(1);
            }
        }

        if (streak !== undefined) {  // add 1 to the streak if updated
            if (completedToday === false) {
                updateData.streak = admin.firestore.FieldValue.increment(1);
                updateData.completedtoday = true;
            }
        }

        if (title !== undefined) {
            updateData.title = title;
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Update the goal in Firestore
        await docRef.update(updateData);

        // Get the updated events to return
        const updatedDoc = await docRef.get();

        const data = updatedDoc.data();
        res.json({
            goalId: updatedDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString() || null,
            updatedAt: data.updatedAt?.toDate().toISOString() || null,
            message: 'Goal updated successfully'
        });

    } catch (err) {
        console.error('Update goal error:', err);
        res.status(500).json({
            error: 'Failed to update goal',
            message: err.message
        });
    }
};


// remove a goal from db
const deleteGoal = async (req, res) => {
    try {
        const { goalId } = req.params;
        const uid = req.user.uid;

        const docRef = db.collection('goals').doc(goalId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        // Check if user owns this goal
        if (doc.data().userId !== uid) {
            return res.status(403).json({ error: 'Not authorized to delete this goal' });
        }

        // Delete the event
        await docRef.delete();

        res.json({
            goalId: goalId,
            deleted: true,
            message: 'Goal deleted successfully'
        });
    } catch (err) {
        console.error('Delete goal error:', err);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
};

// Mark goal complete and award bigger XP
const completeGoal = async (req, res) => {
  const { goalId } = req.params;
  const uid = req.user.uid;

  try {
    const result = await db.runTransaction(async (t) => {
      const goalRef = db.collection('goals').doc(goalId);
      const userRef = db.collection('users').doc(uid);

      const goalSnap = await t.get(goalRef);
      const userSnap = await t.get(userRef);

      if (!goalSnap.exists || goalSnap.data().userId !== uid) {
        throw new Error('NOT_FOUND');
      }
      if (!userSnap.exists) {
        throw new Error('USER_NOT_FOUND');
      }

      const goal = goalSnap.data();
      const userData = userSnap.data();

      // don't award XP twice
      if (goal.completedToday) {
        return { already: true, xpGained: 0, newTotalXP: userData.totalXP || 0 };
      }

      const xpGained = 0;
      const newTotalXP = (userData.totalXP || 0) + xpGained;
      const newLevel = computeLevel(newTotalXP);
      const newStreak = (goal.streak || 0) + 1;
      const newLongest = Math.max(newStreak, goal.longestStreak || 0);

      t.update(goalRef, {
        completedToday: true,
        streak: newStreak,
        longestStreak: newLongest,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      t.update(userRef, {
        totalXP: newTotalXP,
        level: newLevel,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { already: false, xpGained, newTotalXP, newLevel, newStreak };
    });

    if (result.already) {
      return res.json({ success: true, xpGained: 0, newTotalXP: result.newTotalXP, message: 'Goal already completed today' });
    }

    return res.json({
      success: true,
      xpGained: result.xpGained,
      newTotalXP: result.newTotalXP,
      newLevel: result.newLevel,
      newStreak: result.newStreak,
      message: 'Goal completed'
    });

  } catch (err) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Goal not found' });
    if (err.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    console.error('Complete goal error:', err);
    return res.status(500).json({ error: 'Failed to complete goal' });
  }
};

export {
    createGoal,
    getGoals,
    updateGoal,
    deleteGoal,
    completeGoal,
    suggestTasks
};