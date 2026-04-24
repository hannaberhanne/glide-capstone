export function computeLevel(totalXP) {
  let level = 0;
  let accumulated = 0;
  while (totalXP >= accumulated + 100 * (level + 1)) {
    accumulated += 100 * (level + 1);
    level++;
  }
  return level;
}
