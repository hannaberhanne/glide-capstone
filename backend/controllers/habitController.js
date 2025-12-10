import { admin, db } from '../config/firebase.js';

const dateKey = (d = new Date()) => d.toISOString().slice(0, 10); // yyyy-mm-dd

const STREAK_BADGE = {
  id: 'habit-7-day-streak',
  title: '7-Day Habit Mastery',
  description: 'Maintain a week-long streak on this habit',
  icon: '🏅',
};

const evaluateStreakBadge = (currentStreak = 0, userBadges = []) => {
  const alreadyHas = Array.isArray(userBadges) && userBadges.some((b) => b?.id === STREAK_BADGE.id);
  if (currentStreak >= 7 && !alreadyHas) {
    return { ...STREAK_BADGE };
  }
  return null;
};

const createHabit = async (req, res) => {
  try {
    const uid = req.user.uid;
    const {
      title,
      description,
      frequency,
      targetDays,
      category,
      durationMinutes,
      xpValue,
      icon,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const habit = {
      title: title.trim(),
      description: description || '',
      frequency: frequency || 'daily',
      targetDays: Array.isArray(targetDays) ? targetDays : [],
      category: category || 'personal',
      durationMinutes: durationMinutes || 0,
      xpValue: xpValue || 10,
      icon: icon || '',
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
      completionHistory: [],
      isComplete: false,
      isActive: true,
      userId: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('habits').add(habit);
    const created = await docRef.get();

    return res.status(201).json({
      habitId: docRef.id,
      ...created.data(),
    });
  } catch (err) {
    console.error('Create habit error:', err);
    return res.status(500).json({ error: 'Failed to create habit' });
  }
};

const getHabits = async (req, res) => {
  try {
    const uid = req.user.uid;
    const snapshot = await db.collection('habits')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    const habits = snapshot.docs
      .map(doc => ({ habitId: doc.id, ...doc.data() }))
      .filter(h => h.isActive !== false);

    return res.json(habits);
  } catch (err) {
    console.error('Get habits error:', err);
    return res.status(500).json({ error: 'Failed to fetch habits' });
  }
};

const completeHabit = async (req, res) => {
  const { habitId } = req.params;
  const uid = req.user.uid;
  const todayKey = dateKey();
  const yesterdayKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dateKey(d);
  })();

  try {
    const result = await db.runTransaction(async (t) => {
      const habitRef = db.collection('habits').doc(habitId);
      const userRef = db.collection('users').doc(uid);

      // READS FIRST
      const habitSnap = await t.get(habitRef);
      const userSnap = await t.get(userRef);

      if (!habitSnap.exists || habitSnap.data().userId !== uid) {
        throw new Error('NOT_FOUND');
      }
      if (!userSnap.exists) {
        throw new Error('USER_NOT_FOUND');
      }

      const habit = habitSnap.data();
      const userData = userSnap.data();
      const history = Array.isArray(habit.completionHistory) ? habit.completionHistory : [];
      const userBadges = Array.isArray(userData.badges) ? userData.badges : [];

      if (history.includes(todayKey)) {
        return { already: true, xpGained: 0, newTotalXP: userData.totalXP || 0, currentStreak: habit.currentStreak || 1 };
      }

      const xpGained = habit.xpValue || 10;
      const hasYesterday = history.includes(yesterdayKey);
      const currentStreak = hasYesterday ? (habit.currentStreak || 0) + 1 : 1;
      const longestStreak = Math.max(habit.longestStreak || 0, currentStreak);
      const totalCompletions = (habit.totalCompletions || 0) + 1;
      const newTotalXP = (userData.totalXP || 0) + xpGained;
      let badgeAwarded = false;
      let badgeRecord = evaluateStreakBadge(currentStreak, userBadges);

      // WRITES AFTER READS
      t.update(habitRef, {
        completionHistory: admin.firestore.FieldValue.arrayUnion(todayKey),
        totalCompletions,
        currentStreak,
        longestStreak,
        isComplete: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const userUpdate = {
        totalXP: newTotalXP,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (badgeRecord) {
        badgeAwarded = true;
        userUpdate.badges = admin.firestore.FieldValue.arrayUnion({
          ...badgeRecord,
          earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      t.update(userRef, userUpdate);

      const responsePayload = { already: false, xpGained, newTotalXP, currentStreak };
      if (badgeAwarded && badgeRecord) {
        responsePayload.badgesAwarded = [badgeRecord];
      }
      return responsePayload;
    });

    if (result.already) {
      return res.json({
        success: true,
        xpGained: 0,
        newTotalXP: result.newTotalXP,
        currentStreak: result.currentStreak,
        badgesAwarded: [],
        message: 'Already completed today'
      });
    }

    return res.json({
      success: true,
      xpGained: result.xpGained,
      newTotalXP: result.newTotalXP,
      currentStreak: result.currentStreak,
      badgesAwarded: result.badgesAwarded || [],
    });
  } catch (err) {
    if (err.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Habit not found' });
    }
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Complete habit error:', err);
    return res.status(500).json({ error: 'Failed to complete habit' });
  }
};

export { createHabit, getHabits, completeHabit, evaluateStreakBadge };
