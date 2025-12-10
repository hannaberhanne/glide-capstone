import test from "node:test";
import assert from "node:assert";
import { evaluateStreakBadge } from "../controllers/habitController.js";

test("awards badge when streak hits 7 and user doesn't already have it", () => {
  const badge = evaluateStreakBadge(7, []);
  assert.strictEqual(badge?.id, "habit-7-day-streak");
  assert.strictEqual(badge?.title, "7-Day Habit Mastery");
});

test("does not award badge if streak is below 7", () => {
  const badge = evaluateStreakBadge(5, []);
  assert.strictEqual(badge, null);
});

test("does not award badge if user already has it", () => {
  const badge = evaluateStreakBadge(10, [{ id: "habit-7-day-streak" }]);
  assert.strictEqual(badge, null);
});
