import { admin, db } from '../config/firebase.js';
import { computeLevel } from '../domain/xp.js';
import { sanitizeForPrompt } from '../domain/sanitize.js';

const dateKey = (d = new Date()) => d.toISOString().slice(0, 10);

const XP_MAP = {
  easy: 5,
  medium: 10,
  hard: 15,
  expert: 20,
};

function normalizeXpValue(value) {
  const xp = Number(value);
  return Number.isFinite(xp) ? Math.max(0, Math.round(xp)) : 0;
}

function getLegacyTaskMapXp(goal) {
  if (!goal?.tasks || typeof goal.tasks !== 'object' || Array.isArray(goal.tasks)) {
    return 0;
  }

  return Object.values(goal.tasks).reduce((sum, value) => {
    if (typeof value === 'number' || typeof value === 'string') {
      return sum + normalizeXpValue(value);
    }

    if (value && typeof value === 'object') {
      if (value.xpValue !== undefined) return sum + normalizeXpValue(value.xpValue);
      if (value.xp !== undefined) return sum + normalizeXpValue(value.xp);
      if (value.difficulty && XP_MAP[value.difficulty] !== undefined) {
        return sum + XP_MAP[value.difficulty];
      }
    }

    return sum;
  }, 0);
}

// just the streak bonus bumps. 7 gets a little extra, 21 gets more.
function streakBonus(streak) {
  if (streak === 21) return 15;
  if (streak === 7) return 5;
  return 0;
}

const suggestTasks = async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Goal title is required.' });
  }

  try {
    const safe = sanitizeForPrompt(title);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are a student productivity assistant. When given a goal title, suggest 1-3 concrete tasks to help achieve it. Respond ONLY with a valid JSON array. No explanation, no markdown, no code fences. Each object must have: "title" (string), "difficulty" (one of: easy, medium, hard, expert).`,
          },
          {
            role: 'user',
            content: `Goal: "${safe}"`,
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
    console.error('suggestTasks error:', err);
    return res.status(500).json({ error: 'Failed to generate task suggestions.' });
  }
};

const getGoals = async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db.collection('goals').where('userId', '==', uid).get();

    const goals = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        goalId: doc.id,
        ...data,
        completedToday: Array.isArray(data.completionHistory)
          ? data.completionHistory.includes(dateKey())
          : false,
      };
    });

    // project goals still need their linked task map for the current UI.
    const goalsWithTasks = await Promise.all(
      goals.map(async (goal) => {
        if (goal.type === 'routine') return goal;

        const tasksSnapshot = await db
          .collection('tasks')
          .where('goalId', '==', goal.goalId)
          .get();

        const tasks = {};
        tasksSnapshot.docs.forEach((doc) => {
          const task = doc.data();
          tasks[task.title] = task.xpValue;
        });

        return { ...goal, tasks };
      })
    );

    res.json(goalsWithTasks);
  } catch (err) {
    console.error('Get goals error:', err.message);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
};

const createGoal = async (req, res) => {
  try {
    const { color, title, type, frequency, targetDays, durationMinutes, icon, xpValue } = req.body;
    const uid = req.user.uid;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required and cannot be empty' });
    }

    const goalType = type === 'routine' ? 'routine' : 'project';

    const newGoal = {
      title: title.trim(),
      color: color || '#A58F1C',
      type: goalType,
      streak: 0,
      longestStreak: 0,
      completedToday: false,
      completionHistory: [],
      totalCompletions: 0,
      badges: [],
      userId: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (xpValue !== undefined) {
      newGoal.xpValue = normalizeXpValue(xpValue);
    }

    // routine-only fields live here for now.
    if (goalType === 'routine') {
      newGoal.frequency = frequency || 'daily';
      newGoal.targetDays = Array.isArray(targetDays) ? targetDays : [1, 2, 3, 4, 5];
      newGoal.durationMinutes = durationMinutes || 0;
      newGoal.icon = icon || '';
      newGoal.xpValue = normalizeXpValue(newGoal.xpValue) || 10;
    }

    const docRef = await db.collection('goals').add(newGoal);

    res.status(201).json({
      goalId: docRef.id,
      ...newGoal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ error: 'Failed to create goal', message: err.message });
  }
};

const updateGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const uid = req.user.uid;
    const { color, title, frequency, targetDays, durationMinutes, icon, xpValue } = req.body;

    const docRef = db.collection('goals').doc(goalId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (doc.data().userId !== uid) {
      return res.status(403).json({ error: 'Not authorized to update this goal' });
    }

    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    if (color !== undefined) updateData.color = color;
    if (title !== undefined) updateData.title = title;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (targetDays !== undefined) updateData.targetDays = targetDays;
    if (durationMinutes !== undefined) updateData.durationMinutes = durationMinutes;
    if (icon !== undefined) updateData.icon = icon;
    if (xpValue !== undefined) updateData.xpValue = xpValue;

    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();

    res.json({
      goalId: updatedDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate().toISOString() || null,
      updatedAt: data.updatedAt?.toDate().toISOString() || null,
    });
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ error: 'Failed to update goal', message: err.message });
  }
};

const deleteGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const uid = req.user.uid;

    const docRef = db.collection('goals').doc(goalId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (doc.data().userId !== uid) {
      return res.status(403).json({ error: 'Not authorized to delete this goal' });
    }

    const tasksSnapshot = await db.collection('tasks').where('goalId', '==', goalId).get();
    const batch = db.batch();
    tasksSnapshot.docs.forEach((taskDoc) => batch.delete(taskDoc.ref));
    batch.delete(docRef);
    await batch.commit();

    res.json({ goalId, deleted: true, message: 'Goal and associated tasks deleted' });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
};

// same completion flow for project + routine goals.
const completeGoal = async (req, res) => {
  const { goalId } = req.params;
  const uid = req.user.uid;
  const todayKey = dateKey();
  const yesterdayKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dateKey(d);
  })();

  try {
    const result = await db.runTransaction(async (t) => {
      const goalRef = db.collection('goals').doc(goalId);
      const userRef = db.collection('users').doc(uid);

      const goalSnap = await t.get(goalRef);
      const userSnap = await t.get(userRef);

      if (!goalSnap.exists || goalSnap.data().userId !== uid) throw new Error('NOT_FOUND');
      if (!userSnap.exists) throw new Error('USER_NOT_FOUND');

      const goal = goalSnap.data();
      const userData = userSnap.data();
      const history = Array.isArray(goal.completionHistory) ? goal.completionHistory : [];

      if (history.includes(todayKey)) {
        return { already: true, xpGained: 0, newTotalXP: userData.totalXP || 0, currentStreak: goal.streak || 0 };
      }

      // if they hit it yesterday, keep the streak alive. otherwise start over.
      const hasYesterday = history.includes(yesterdayKey);
      const newStreak = hasYesterday ? (goal.streak || 0) + 1 : 1;
      const newLongest = Math.max(goal.longestStreak || 0, newStreak);
      const totalCompletions = (goal.totalCompletions || 0) + 1;

      // routine goals use their stored xp.
      // project goals pull from linked tasks / legacy task maps and bottom out at 25.
      let baseXP;
      if (goal.type === 'routine') {
        baseXP = normalizeXpValue(goal.xpValue) || 10;
      } else {
        const tasksSnap = await db.collection('tasks').where('goalId', '==', goalId).get();
        const linkedTaskXP = tasksSnap.docs.reduce((sum, d) => {
          const task = d.data();
          if (task.xpValue !== undefined) {
            return sum + normalizeXpValue(task.xpValue);
          }
          if (task.difficulty && XP_MAP[task.difficulty] !== undefined) {
            return sum + XP_MAP[task.difficulty];
          }
          return sum;
        }, 0);
        const legacyTaskXP = getLegacyTaskMapXp(goal);
        const explicitGoalXP = normalizeXpValue(goal.xpValue);
        const derivedProjectXP = linkedTaskXP || legacyTaskXP || explicitGoalXP;
        baseXP = Math.max(derivedProjectXP, 25);
      }

      const bonus = streakBonus(newStreak);
      const xpGained = baseXP + bonus;
      const newTotalXP = (userData.totalXP || 0) + xpGained;
      const newLevel = computeLevel(newTotalXP);

      t.update(goalRef, {
        completedToday: true,
        streak: newStreak,
        longestStreak: newLongest,
        totalCompletions,
        completionHistory: admin.firestore.FieldValue.arrayUnion(todayKey),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      t.update(userRef, {
        totalXP: newTotalXP,
        level: newLevel,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { already: false, xpGained, newTotalXP, newLevel, newStreak, bonus };
    });

    if (result.already) {
      return res.json({ success: true, xpGained: 0, newTotalXP: result.newTotalXP, currentStreak: result.currentStreak, message: 'Already completed today' });
    }

    return res.json({
      success: true,
      xpGained: result.xpGained,
      newTotalXP: result.newTotalXP,
      newLevel: result.newLevel,
      newStreak: result.newStreak,
      streakBonus: result.bonus,
    });
  } catch (err) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Goal not found' });
    if (err.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    console.error('Complete goal error:', err);
    return res.status(500).json({ error: 'Failed to complete goal' });
  }
};

export { createGoal, getGoals, updateGoal, deleteGoal, completeGoal, suggestTasks };
