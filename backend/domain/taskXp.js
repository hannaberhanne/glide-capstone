import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function getXpFromAI(task) {
  try {
    if (!openai) return 50;
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Assign an XP reward for this student productivity task.
Task: "${task.title}"
Category: ${task.category || 'general'}
Estimated minutes: ${task.estimatedMinutes || 0}

Return only one number from 10 to 150.`,
      }],
      max_tokens: 5,
    });
    const xp = parseInt(resp.choices[0]?.message?.content?.trim(), 10);
    return Number.isNaN(xp) ? 50 : Math.min(Math.max(xp, 10), 150);
  } catch (err) {
    console.error('AI XP error, fallback to 50:', err.message);
    return 50;
  }
}
