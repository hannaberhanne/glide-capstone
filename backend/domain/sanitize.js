export function sanitizeForPrompt(str, maxLength = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[^\w\s\-.,!?']/g, '').slice(0, maxLength);
}
