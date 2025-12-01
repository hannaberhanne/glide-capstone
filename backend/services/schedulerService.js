import OpenAI from 'openai';
import { db, admin } from '../config/firebase.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const toDateKey = (d) => d.toISOString().split('T')[0]; // yyyy-mm-dd
const DAY_MAP = { 'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'R': 'Thu', 'F': 'Fri', 'S': 'Sat', 'U': 'Sun' };

function parseCanvasMeetingTimes(meetingTimesString) {
  if (!meetingTimesString) return [];
  const match = meetingTimesString.match(/([MTWRFSU]+)\s+(\d+:\d+\s+[AP]M)\s*-\s*(\d+:\d+\s+[AP]M)/);
  if (!match) return [];
  const [_, dayLetters, startTime, endTime] = match;
  const days = dayLetters.split('').map(d => DAY_MAP[d]).filter(Boolean);
  return [{ days, startTime, endTime }];
}

async function gatherContext(userId, targetDate) {
  const dateStr = toDateKey(targetDate);
  const now = new Date();

  // Fetch tasks (incomplete, capped, sorted in JS)
  const tasksSnap = await db.collection('tasks')
    .where('userId', '==', userId)
    .where('isComplete', '==', false)
    .get();

  const deferredOverdue = [];

  const tasks = tasksSnap.docs
    .map((doc) => {
      const t = doc.data();
      const due = t.dueAt ? new Date(t.dueAt) : null;
      const daysLeft = due ? Math.ceil((due - now) / 86400000) : null;
      // Normalize estimated minutes: prefer estimatedMinutes, else estimatedTime
      let estimatedMinutes = 30;
      if (t.estimatedMinutes !== undefined) {
        estimatedMinutes = Number(t.estimatedMinutes) || 30;
      } else if (t.estimatedTime !== undefined) {
        // legacy: if <=12 assume hours, otherwise assume minutes
        const val = Number(t.estimatedTime);
        if (!isNaN(val)) {
          estimatedMinutes = val <= 12 ? val * 60 : val;
        }
      }
      return {
        taskId: doc.id,
        title: (t.title || '').slice(0, 100),
        dueAt: due ? due.toISOString() : null,
        daysUntilDue: daysLeft,
        priority: t.priority || 'medium',
        estimatedMinutes,
        category: (t.category || 'academic').toLowerCase(),
        source: t.canvasAssignmentId ? 'canvas' : 'manual',
        timesSkipped: t.userSkipCount || 0,
      };
    })
    .filter((t) => {
      if (t.daysUntilDue !== null && t.daysUntilDue < -14) {
        deferredOverdue.push({ taskId: t.taskId, title: t.title, reason: 'Overdue > 14 days' });
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.dueAt && b.dueAt) return new Date(a.dueAt) - new Date(b.dueAt);
      if (a.dueAt && !b.dueAt) return -1;
      if (!a.dueAt && b.dueAt) return 1;
      return 0;
    })
    .slice(0, 20);

  // Fetch habits (active)
  const habitsSnap = await db.collection('habits')
    .where('userId', '==', userId)
    .get();
  const habits = habitsSnap.docs
    .map((doc) => {
      const h = doc.data();
      return {
        habitId: doc.id,
        title: (h.title || '').slice(0, 100),
        frequency: h.frequency || 'daily',
        targetDays: h.targetDays || [],
        durationMinutes: h.durationMinutes || 30,
        xpValue: h.xpValue || 10,
        currentStreak: h.currentStreak || 0,
        isActive: h.isActive !== false,
      };
    })
    .filter((h) => h.isActive);

  // Fetch classes/commitments from courses
  const commitments = [];
  const coursesSnap = await db.collection('courses')
    .where('userId', '==', userId)
    .get();

  const todayShort = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

  coursesSnap.docs.forEach((doc) => {
    const course = doc.data();
    const schedule = Array.isArray(course.meetingSchedule) && course.meetingSchedule.length
      ? course.meetingSchedule
      : parseCanvasMeetingTimes(course.meetingTimes);

    (schedule || []).forEach((meeting) => {
      if (meeting.days && meeting.days.includes(todayShort)) {
        commitments.push({
          type: 'class',
          title: course.title || 'Class',
          startTime: meeting.startTime,
          endTime: meeting.endTime,
        });
      }
    });
  });

  // User profile/preferences
  const userSnap = await db.collection('users').doc(userId).get();
  const user = userSnap.data() || {};

  return {
    date: dateStr,
    dayOfWeek: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
    currentTime: now.toISOString(),
    availableHours: user.workHours || '09:00-21:00',
    timezone: user.timezone || 'America/New_York',
    tasks,
    habits,
    commitments,
    deferredOverdue,
    userProfile: {
      energyPeak: user.energyPeak || '10:00-12:00',
      prefersQuickWins: user.prefersQuickWins ?? true,
      maxTasksPerDay: user.maxTasksPerDay || 7,
      maxWorkMinutes: user.maxWorkMinutes || 360,
    }
  };
}

function buildPrompt(context) {
  return `
You are Glide+, an AI scheduling assistant for college students with ADHD. Respond with valid JSON only (no markdown).

CONTEXT:
- Date: ${context.date} (${context.dayOfWeek})
- Current time (ISO): ${context.currentTime}
- Available hours: ${context.availableHours}
- Timezone: ${context.timezone}
- Max work: ${context.userProfile.maxWorkMinutes} minutes
- Energy peak: ${context.userProfile.energyPeak}

FIXED COMMITMENTS TODAY:
${context.commitments && context.commitments.length
    ? context.commitments.map(c => `- ${c.startTime}-${c.endTime}: ${c.title} (${c.type})`).join('\n')
    : '- None'}

DEFERRED/TO IGNORE (overdue > 14 days):
${context.deferredOverdue && context.deferredOverdue.length
    ? context.deferredOverdue.map(d => `- ${d.title} (${d.reason})`).join('\n')
    : '- None'}

TASKS (${context.tasks.length}):
${context.tasks.map((t) => `
- "${t.title}"
  id: ${t.taskId}
  Due: ${t.dueAt || 'none'} (${t.daysUntilDue ?? 'n/a'} days)
  Priority: ${t.priority} | Effort: ${t.estimatedMinutes}min | Category: ${t.category}
  Source: ${t.source} | Skipped: ${t.timesSkipped}`).join('\n')}

HABITS (${context.habits.length}):
${context.habits.map((h) => `
- "${h.title}" id:${h.habitId} ${h.durationMinutes}min ${h.frequency} ${h.targetDays.length ? '(' + h.targetDays.join(',') + ')' : ''} XP:${h.xpValue} Streak:${h.currentStreak}`).join('\n')}

INSTRUCTIONS:
1) Select 5-7 items (tasks + habits) for TODAY. Prioritize overdue/due-soon, include 1-2 habits (streaks matter), don't exceed max work minutes.
2) Order: start with a quick win (<30min), high-focus in morning, habits at natural times, end with something satisfying.
3) Time slots in ${context.timezone}: use 30-90 minute blocks, include 15min breaks between hard tasks, leave some flex. Keep within available hours.
   Do NOT schedule during fixed commitments.
   Ignore/defer tasks that are overdue by more than 14 days unless critical.
4) Reasoning: explain briefly why each block and order.

OUTPUT (JSON only):
{
  "rationale": "overall strategy",
  "schedule": [
    {
      "startISO": "2025-12-01T14:00:00-05:00",
      "endISO": "2025-12-01T14:45:00-05:00",
      "startLabel": "2:00 PM",
      "endLabel": "2:45 PM",
      "type": "task" | "habit" | "break",
      "taskId": "optional",
      "habitId": "optional",
      "reasoning": "why this block",
      "confidence": 0.0-1.0
    }
  ],
  "deferred": [
    { "taskId": "id", "reason": "why deferred" }
  ]
}
Only return JSON.
`;
}

export async function generateDailySchedule(userId, targetDate = new Date()) {
  const context = await gatherContext(userId, targetDate);
  const dateStr = context.date;

  let aiResult;
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: 'You are a scheduling AI. Respond with valid JSON only following the provided schema.' },
        { role: 'user', content: buildPrompt(context) }
      ]
    });
    aiResult = JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('Scheduler AI error, falling back to heuristic:', err);
    aiResult = generateHeuristicSchedule(context);
  }

  const batch = db.batch();

  // Delete old planned blocks for this date/user
  const oldSnap = await db.collection('schedule_blocks')
    .where('userId', '==', userId)
    .where('date', '==', dateStr)
    .where('status', '==', 'planned')
    .get();
  oldSnap.docs.forEach((doc) => batch.delete(doc.ref));

  // Create new blocks
  (aiResult.schedule || []).forEach((block) => {
    const ref = db.collection('schedule_blocks').doc();
    batch.set(ref, {
      blockId: ref.id,
      userId,
      date: dateStr,
      startISO: block.startISO,
      endISO: block.endISO,
      startTime: block.startLabel || block.startISO,
      endTime: block.endLabel || block.endISO,
      type: block.type || 'task',
      taskId: block.taskId || null,
      habitId: block.habitId || null,
      status: 'planned',
      confidence: block.confidence,
      reasoning: block.reasoning,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return {
    success: true,
    rationale: aiResult.rationale,
    blocksCreated: (aiResult.schedule || []).length,
    deferred: aiResult.deferred || []
  };
}

export async function replanSchedule(userId) {
  return generateDailySchedule(userId, new Date());
}

// Simple fallback if AI fails
function generateHeuristicSchedule(context) {
  const slots = [
    { start: "09:00", end: "10:30" },
    { start: "10:45", end: "12:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:15", end: "16:00" },
    { start: "19:00", end: "20:00" },
  ];
  const tasks = context.tasks.slice(0, slots.length);
  const schedule = tasks.map((t, idx) => {
    const s = slots[idx];
    const startISO = `${context.date}T${s.start}:00`;
    const endISO = `${context.date}T${s.end}:00`;
    return {
      startISO,
      endISO,
      startLabel: s.start,
      endLabel: s.end,
      type: "task",
      taskId: t.taskId,
      habitId: null,
      reasoning: "Heuristic fallback: top tasks placed in default slots",
      confidence: 0.4
    };
  });
  return {
    rationale: "Fallback heuristic schedule",
    schedule,
    deferred: []
  };
}
