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
  const scored = (tasks || []).map(t => {
    const pri = { high: 3, medium: 2, low: 1 }[t.priority || 'medium'];
    const due = t.dueAt ? Math.max(0, 7 - Math.ceil((new Date(t.dueAt) - today) / 86400000)) : 0;
    const effort = t.estimatedTime ? Math.min(2, Math.ceil(t.estimatedTime / 60)) : 1;
    return { ...t, _score: pri + due + effort };
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
