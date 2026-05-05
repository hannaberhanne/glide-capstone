import { db } from '../config/firebase.js';
import { generateDailySchedule, replanSchedule } from '../services/schedulerService.js';
import { admin } from '../config/firebase.js';
import {
  queueDailyPlanReadyNotification,
  queueMajorReplanNotification,
} from '../services/notificationService.js';
import {
  buildRoutineGoalCompletionOutcome,
  buildTaskCompletionOutcome,
  dateKey,
  normalizeXpValue,
} from '../domain/completion.js';
import { getXpFromAI } from '../domain/taskXp.js';

const toDateKey = (d) => dateKey(d);

const generateSchedule = async (req, res) => {
  try {
    const targetDate = req.body?.date ? new Date(req.body.date) : new Date();
    const result = await generateDailySchedule(req.user.uid, targetDate);
    try {
      await queueDailyPlanReadyNotification({
        userId: req.user.uid,
        date: result.date,
        blocksCreated: result.blocksCreated,
        actionableBlocksCreated: result.actionableBlocksCreated,
        rationale: result.rationale,
      });
    } catch (notificationError) {
      console.error('Daily plan ready notification error:', notificationError);
    }
    return res.json(result);
  } catch (err) {
    console.error('Generate schedule error:', err);
    return res.status(500).json({ error: 'Failed to generate schedule' });
  }
};

const getTodaySchedule = async (req, res) => {
  const uid = req.user.uid;
  const today = req.query.date || toDateKey(new Date());
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
        if (block.goalId) {
          const goalSnap = await db.collection('goals').doc(block.goalId).get();
          if (goalSnap.exists) {
            const goal = goalSnap.data();
            block.itemTitle = goal.title;
            block.xpValue = goal.xpValue || 10;
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
    try {
      await queueMajorReplanNotification({
        userId: req.user.uid,
        date: result.date,
        plannedWindowStart: result.date,
        plannedWindowEnd: result.date,
        blocksCreated: result.blocksCreated,
        actionableBlocksCreated: result.actionableBlocksCreated,
        source: 'schedule-replan',
        metadata: {
          rationale: result.rationale,
        },
      });
    } catch (notificationError) {
      console.error('Schedule replan notification error:', notificationError);
    }
    return res.json(result);
  } catch (err) {
    console.error('Replan error:', err);
    return res.status(500).json({ error: 'Failed to replan' });
  }
};

// complete a schedule block and pay out xp.
const completeBlock = async (req, res) => {
  const { blockId } = req.params;
  const uid = req.user.uid;
  const todayKey = toDateKey(new Date());
  const yesterdayKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toDateKey(d);
  })();

  try {
    const blockRef = db.collection('schedule_blocks').doc(blockId);
    const blockPreview = await blockRef.get();

    if (!blockPreview.exists || blockPreview.data().userId !== uid) {
      return res.status(404).json({ error: 'Block not found' });
    }

    let generatedTaskXp = null;
    const blockData = blockPreview.data();

    if (blockData.taskId) {
      const taskPreview = await db.collection('tasks').doc(blockData.taskId).get();
      if (taskPreview.exists && taskPreview.data().userId === uid) {
        const taskData = taskPreview.data();
        if (normalizeXpValue(taskData.xpValue) === null) {
          generatedTaskXp = await getXpFromAI(taskData);
        }
      }
    }

    const result = await db.runTransaction(async (t) => {
      const userRef = db.collection('users').doc(uid);

      const blockSnap = await t.get(blockRef);
      if (!blockSnap.exists || blockSnap.data().userId !== uid) {
        throw new Error('NOT_FOUND');
      }
      const block = blockSnap.data();
      if (block.status === 'completed') {
        return { already: true, xpSource: 'none', xpGained: 0, newTotalXP: null };
      }

      const userSnap = await t.get(userRef);
      if (!userSnap.exists) throw new Error('USER_NOT_FOUND');
      const userData = userSnap.data();
      let delegate = {
        already: true,
        xpSource: 'none',
        xpGained: 0,
        newTotalXP: userData.totalXP || 0,
        newLevel: userData.level ?? null,
      };

      if (block.taskId) {
        const taskRef = db.collection('tasks').doc(block.taskId);
        const taskSnap = await t.get(taskRef);
        if (!taskSnap.exists || taskSnap.data().userId !== uid) {
          throw new Error('TASK_NOT_FOUND');
        }

        const task = taskSnap.data();
        delegate = buildTaskCompletionOutcome({
          task,
          userData,
          todayKey,
          generatedXp: generatedTaskXp,
        });

        if (!delegate.already) {
          const taskUpdate = {
            isComplete: true,
            lastCompleted: todayKey,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (normalizeXpValue(task.xpValue) === null) {
            taskUpdate.xpValue = delegate.taskXpValue;
          }

          t.update(taskRef, taskUpdate);
          t.update(userRef, {
            totalXP: delegate.newTotalXP,
            level: delegate.newLevel,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      if (block.goalId) {
        const goalRef = db.collection('goals').doc(block.goalId);
        const goalSnap = await t.get(goalRef);

        if (!goalSnap.exists || goalSnap.data().userId !== uid) {
          throw new Error('GOAL_NOT_FOUND');
        }

        const goal = goalSnap.data();
        if (goal.type !== 'routine') {
          throw new Error('GOAL_NOT_ROUTINE');
        }

        delegate = buildRoutineGoalCompletionOutcome({
          goal,
          userData,
          todayKey,
          yesterdayKey,
          userBadges: Array.isArray(userData.badges) ? userData.badges : [],
        });

        if (!delegate.already) {
          t.update(goalRef, {
            completedToday: true,
            completionHistory: admin.firestore.FieldValue.arrayUnion(todayKey),
            totalCompletions: delegate.totalCompletions,
            streak: delegate.newStreak,
            longestStreak: delegate.newLongestStreak,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const userUpdate = {
            totalXP: delegate.newTotalXP,
            level: delegate.newLevel,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (delegate.badgesAwarded?.length) {
            userUpdate.badges = admin.firestore.FieldValue.arrayUnion(
              ...delegate.badgesAwarded.map((badge) => ({
                ...badge,
                earnedAt: admin.firestore.FieldValue.serverTimestamp(),
              }))
            );
          }

          t.update(userRef, userUpdate);
        }
      }

      // then mark the block itself done.
      t.update(blockRef, {
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        blockAlreadyCompleted: false,
        underlyingAlready: delegate.already,
        xpSource: delegate.already ? 'none' : delegate.xpSource,
        xpGained: delegate.xpGained || 0,
        newTotalXP: delegate.newTotalXP || userData.totalXP || 0,
      };
    });

    if (result.blockAlreadyCompleted) {
      return res.json({ success: true, xpSource: 'none', xpGained: 0, message: 'Already completed' });
    }

    return res.json({
      success: true,
      xpSource: result.xpSource,
      xpGained: result.xpGained || 0,
      newTotalXP: result.newTotalXP || null,
      underlyingAlready: Boolean(result.underlyingAlready),
    });
  } catch (err) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Block not found' });
    if (err.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    if (err.message === 'TASK_NOT_FOUND') return res.status(404).json({ error: 'Task not found for block' });
    if (err.message === 'GOAL_NOT_FOUND') return res.status(404).json({ error: 'Goal not found for block' });
    if (err.message === 'GOAL_NOT_ROUTINE') return res.status(400).json({ error: 'Only routine goals can back schedule blocks' });
    console.error('Complete block error:', err);
    return res.status(500).json({ error: 'Failed to complete block' });
  }
};

const deleteBlock = async (req, res) => {
  const { blockId } = req.params;
  const uid = req.user.uid;
  try {
    const blockRef = db.collection('schedule_blocks').doc(blockId);
    const blockSnap = await blockRef.get();
    if (!blockSnap.exists || blockSnap.data().userId !== uid) {
      return res.status(404).json({ error: 'Block not found' });
    }
    await blockRef.delete();
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete block error:', err);
    return res.status(500).json({ error: 'Failed to delete block' });
  }
};

export { generateSchedule, getTodaySchedule, triggerReplan, completeBlock, deleteBlock };
