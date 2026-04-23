import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractAssignmentsFromText(text) {
  if (!text?.trim()) return { assignments: [] };
  const prompt = `Extract assignments from this text. Return ONLY JSON:
  { "assignments": [ { "title": string, "description": string, "dueDate": ISO string or null, "courseCode": string or null, "estimatedTimeMinutes": number or null, "priority": "low"|"medium"|"high" } ] }`;
  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text.slice(0, 4000) }
    ],
    temperature: 0.2
  });
  const content = resp.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(content);
  } catch {
    return { assignments: [] };
  }
}

function parseInstruction(instruction = "") {
  const text = String(instruction || "").trim().toLowerCase();
  if (!text) {
    return {
      perDay: null,
      boosts: {},
      summary: "",
    };
  }

  const boosts = {};
  let perDay = null;
  const notes = [];

  if (/(light|lighter|less|ease|breath|breathing|gentle)/.test(text)) {
    perDay = 2;
    notes.push("kept each day lighter");
  } else if (/(packed|denser|dense|more|heavier|busy|cram)/.test(text)) {
    perDay = 4;
    notes.push("packed more into each day");
  }

  if (/(urgent|high priority|priority first|important first)/.test(text)) {
    boosts.priority = 1.5;
    notes.push("weighted high-priority work harder");
  }

  if (/(quick|short|small tasks|easy wins|easy win)/.test(text)) {
    boosts.short = 1.25;
    notes.push("pulled shorter tasks forward");
  }

  if (/(academic|study|school|class|assignment)/.test(text)) {
    boosts.academic = 1.75;
    notes.push("favored academic tasks");
  }

  if (/(work|job|office)/.test(text)) {
    boosts.work = 1.75;
    notes.push("favored work tasks");
  }

  if (/(personal|life|errand|home)/.test(text)) {
    boosts.personal = 1.75;
    notes.push("favored personal tasks");
  }

  if (/(tomorrow|next day)/.test(text)) {
    boosts.tomorrow = true;
    notes.push("shifted focus to tomorrow");
  }

  return {
    perDay,
    boosts,
    summary: notes.join(", "),
  };
}

// Simple heuristic replan without OpenAI
export function replanTasks(tasks, opts = {}) {
  const instructionModel = parseInstruction(opts.instruction);
  const perDay = instructionModel.perDay || opts.perDay || 3;
  const selectedDate = opts.selectedDate ? new Date(opts.selectedDate) : new Date();
  const baseDate = Number.isNaN(selectedDate.getTime()) ? new Date() : selectedDate;
  const categoryWeight = { academic: 2, work: 1, personal: 0.5 };
  const priorityBoost = instructionModel.boosts.priority || 1;
  const shortBoost = instructionModel.boosts.short || 1;
  const dayOffsetBias = instructionModel.boosts.tomorrow ? 1 : 0;

  const scored = (tasks || [])
    .filter((task) => !task.isComplete && !task.completedToday)
    .map(t => {
    const pri = ({ high: 3, medium: 2, low: 1 }[t.priority || 'medium']) * priorityBoost;
    const dueDays = t.dueAt ? Math.ceil((new Date(t.dueAt) - baseDate) / 86400000) : null;
    const dueSoon = dueDays !== null ? Math.max(0, 7 - dueDays) : 0;
    const estimatedMinutes = Number(t.estimatedMinutes ?? t.estimatedTime ?? 0) || 0;
    const effort = estimatedMinutes > 0 ? Math.min(2, Math.ceil(estimatedMinutes / 60)) : 1;
    const shortTaskBonus = estimatedMinutes > 0 && estimatedMinutes <= 45 ? shortBoost : 1;
    const categoryKey = (t.category || '').toLowerCase();
    const catBase = categoryWeight[categoryKey] || 0;
    const catBoost = instructionModel.boosts[categoryKey] || 1;
    const cat = catBase * catBoost;
    const score = pri + dueSoon + (effort * shortTaskBonus) + cat;
    const missed = dueDays !== null && dueDays < 0 && !t.isComplete && !t.completedToday;
    const explanation = [
      `priority ${pri}`,
      `dueSoon ${dueSoon}`,
      `effort ${effort * shortTaskBonus}`,
      `category ${cat}`
    ].join(' + ');
    return { ...t, _score: score, _explanation: explanation, _missed: missed };
  }).sort((a, b) => b._score - a._score);

  const scheduled = [];
  let dayOffset = 0;
  for (let i = 0; i < scored.length; i++) {
    const slot = Math.floor(i / perDay);
    const dt = new Date(baseDate);
    dt.setDate(dt.getDate() + slot + dayOffsetBias);
    scheduled.push({ ...scored[i], suggestedDate: dt.toISOString() });
  }
  return {
    items: scheduled,
    summary: instructionModel.summary,
  };
}
