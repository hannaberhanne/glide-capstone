import { db } from '../config/firebase.js';
import { generateDailySchedule, replanSchedule } from '../services/schedulerService.js';
import { admin } from '../config/firebase.js';

const toDateKey = (d) => d.toISOString().split('T')[0];

const generateSchedule = async (req, res) => {
  try {
    const targetDate = req.body?.date ? new Date(req.body.date) : new Date();
    const result = await generateDailySchedule(req.user.uid, targetDate);
    return res.json(result);
  } catch (err) {
    console.error('Generate schedule error:', err);
    return res.status(500).json({ error: 'Failed to generate schedule' });
  }
};

const getTodaySchedule = async (req, res) => {
  const uid = req.user.uid;
  const today = toDateKey(new Date());
  try {
    const snap = await db.collection('schedule_blocks')
      .where('userId', '==', uid)
      .where('date', '==', today)
      .orderBy('startISO')
      .get();

    const blocks = await Promise.all(
      snap.docs.map(async (doc) => {
        const block = { blockId: doc.id, ...doc.data() };
        if (block.taskId) {
          const taskSnap = await db.collection('tasks').doc(block.taskId).get();
          if (taskSnap.exists) {
            const task = taskSnap.data();
            block.itemTitle = task.title;
            block.xpValue = task.xpValue || 10;
          }
        }
        if (block.habitId) {
          const habitSnap = await db.collection('habits').doc(block.habitId).get();
          if (habitSnap.exists) {
            const habit = habitSnap.data();
            block.itemTitle = habit.title;
            block.xpValue = habit.xpValue || 10;
          }
        }
        return block;
      })
    );

    return res.json({ success: true, date: today, blocks });
  } catch (err) {
    console.error('Get schedule error:', err);
    return res.status(500).json({ error: 'Failed to fetch schedule' });
  }
};

const triggerReplan = async (req, res) => {
  try {
    const result = await replanSchedule(req.user.uid);
    return res.json(result);
  } catch (err) {
    console.error('Replan error:', err);
    return res.status(500).json({ error: 'Failed to replan' });
  }
};

// Complete a scheduled block and award XP
const completeBlock = async (req, res) => {
  const { blockId } = req.params;
  const uid = req.user.uid;
  const todayKey = toDateKey(new Date());

  try {
    const result = await db.runTransaction(async (t) => {
      const blockRef = db.collection('schedule_blocks').doc(blockId);
      const userRef = db.collection('users').doc(uid);

      const blockSnap = await t.get(blockRef);
      if (!blockSnap.exists || blockSnap.data().userId !== uid) {
        throw new Error('NOT_FOUND');
      }
      const block = blockSnap.data();
      if (block.status === 'completed') {
        return { already: true, xpGained: 0, newTotalXP: null };
      }

      const userSnap = await t.get(userRef);
      if (!userSnap.exists) throw new Error('USER_NOT_FOUND');
      const userData = userSnap.data();
      let xpGained = 0;
      let newTotalXP = userData.totalXP || 0;

      // Complete task if present
      if (block.taskId) {
        const taskRef = db.collection('tasks').doc(block.taskId);
        const taskSnap = await t.get(taskRef);
        if (taskSnap.exists) {
          const task = taskSnap.data();
          if (!task.isComplete) {
            xpGained = task.xpValue || 10;
            newTotalXP += xpGained;
            t.update(taskRef, {
              isComplete: true,
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
              xpValue: xpGained,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      }

      // Complete habit if present
      if (block.habitId) {
        const habitRef = db.collection('habits').doc(block.habitId);
        const habitSnap = await t.get(habitRef);
        if (habitSnap.exists) {
          const habit = habitSnap.data();
          const history = Array.isArray(habit.completionHistory) ? habit.completionHistory : [];
          if (!history.includes(todayKey)) {
            const yesterday = (() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              return toDateKey(d);
            })();
            const currentStreak = history.includes(yesterday) ? (habit.currentStreak || 0) + 1 : 1;
            const longestStreak = Math.max(habit.longestStreak || 0, currentStreak);
            const totalCompletions = (habit.totalCompletions || 0) + 1;
            const habitXP = habit.xpValue || 10;
            xpGained += habitXP;
            newTotalXP += habitXP;

            t.update(habitRef, {
              completionHistory: admin.firestore.FieldValue.arrayUnion(todayKey),
              totalCompletions,
              currentStreak,
              longestStreak,
              isComplete: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      }

      // Update user XP if changed
      if (xpGained > 0) {
        t.update(userRef, {
          totalXP: newTotalXP,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Mark block complete
      t.update(blockRef, {
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { already: false, xpGained, newTotalXP };
    });

    if (result.already) {
      return res.json({ success: true, xpGained: 0, message: 'Already completed' });
    }

    return res.json({ success: true, xpGained: result.xpGained || 0, newTotalXP: result.newTotalXP || null });
  } catch (err) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Block not found' });
    if (err.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    console.error('Complete block error:', err);
    return res.status(500).json({ error: 'Failed to complete block' });
  }
};

export { generateSchedule, getTodaySchedule, triggerReplan, completeBlock };
