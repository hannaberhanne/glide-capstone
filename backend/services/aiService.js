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

// Simple heuristic replan without OpenAI
export function replanTasks(tasks, opts = {}) {
  const perDay = opts.perDay || 3;
  const today = new Date();
  const categoryWeight = { academic: 2, work: 1, personal: 0.5 };

  const scored = (tasks || []).map(t => {
    const pri = { high: 3, medium: 2, low: 1 }[t.priority || 'medium'];
    const dueDays = t.dueAt ? Math.ceil((new Date(t.dueAt) - today) / 86400000) : null;
    const dueSoon = dueDays !== null ? Math.max(0, 7 - dueDays) : 0;
    const effort = t.estimatedTime ? Math.min(2, Math.ceil(t.estimatedTime / 60)) : 1;
    const cat = categoryWeight[(t.category || '').toLowerCase()] || 0;
    const score = pri + dueSoon + effort + cat;
    const missed = dueDays !== null && dueDays < 0 && !t.isComplete;
    const explanation = [
      `priority ${pri}`,
      `dueSoon ${dueSoon}`,
      `effort ${effort}`,
      `category ${cat}`
    ].join(' + ');
    return { ...t, _score: score, _explanation: explanation, _missed: missed };
  }).sort((a, b) => b._score - a._score);

  const scheduled = [];
  let dayOffset = 0;
  for (let i = 0; i < scored.length; i++) {
    const slot = Math.floor(i / perDay);
    const dt = new Date(today);
    dt.setDate(dt.getDate() + slot);
    scheduled.push({ ...scored[i], suggestedDate: dt.toISOString() });
  }
  return scheduled;
}
