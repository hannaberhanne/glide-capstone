/**
 * Glide Badge System
 * All badge definitions and logic to compute earned vs locked.
 * Only uses data already fetched by GoalsPage: goals, tasks, xp, level.
 */

// ─── SVG shapes ───────────────────────────────────────────────────────────────
// Each badge renders a unique minimal geometric SVG.

export const BADGES = [
  // ── Streak ──────────────────────────────────────────────────────────────────
  {
    id: "streak_3",
    label: "First Flame",
    description: "3-day streak on any goal",
    category: "Streak",
    color: "#FF6B35",
    svg: `<svg width="48" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="32,8 58,52 6,52" fill="#FF6B35" opacity=".12" stroke="#FF6B35" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="32,20 48,48 16,48" fill="#FF6B35" opacity=".35"/>
      <polygon points="32,30 42,46 22,46" fill="#FF6B35"/>
    </svg>`,
    check: ({ goals }) => goals.some((g) => (g.streak || 0) >= 3),
  },
  {
    id: "streak_7",
    label: "Week Warrior",
    description: "7-day streak on any goal",
    category: "Streak",
    color: "#FF9500",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="32,6 52,15 60,36 50,54 14,54 4,36 12,15" fill="#FF9500" opacity=".12" stroke="#FF9500" stroke-width="2.5"/>
      <polygon points="32,16 46,22 51,36 44,48 20,48 13,36 18,22" fill="#FF9500" opacity=".45"/>
      <text x="32" y="37" text-anchor="middle" fill="#FF9500" font-size="16" font-weight="700" font-family="-apple-system,sans-serif">7</text>
    </svg>`,
    check: ({ goals }) => goals.some((g) => (g.streak || 0) >= 7),
  },
  {
    id: "streak_21",
    label: "Habit Forged",
    description: "21-day streak on any goal",
    category: "Streak",
    color: "#9CAF88",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="32,4 60,32 32,60 4,32" fill="#9CAF88" opacity=".12" stroke="#9CAF88" stroke-width="2.5"/>
      <polygon points="32,14 50,32 32,50 14,32" fill="#9CAF88" opacity=".4"/>
      <polygon points="32,22 42,32 32,42 22,32" fill="#9CAF88"/>
    </svg>`,
    check: ({ goals }) => goals.some((g) => (g.streak || 0) >= 21),
  },
  {
    id: "streak_30",
    label: "Iron Will",
    description: "30-day streak on any goal",
    category: "Streak",
    color: "#5A8FD4",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill="#5A8FD4" opacity=".12" stroke="#5A8FD4" stroke-width="2.5"/>
      <polygon points="32,14 50,24 50,44 32,54 14,44 14,24" fill="#5A8FD4" opacity=".4"/>
      <rect x="24" y="29" width="16" height="3" rx="1.5" fill="#5A8FD4"/>
      <rect x="27" y="23" width="10" height="3" rx="1.5" fill="#5A8FD4"/>
      <rect x="27" y="35" width="10" height="3" rx="1.5" fill="#5A8FD4"/>
    </svg>`,
    check: ({ goals }) => goals.some((g) => (g.streak || 0) >= 30),
  },

  // ── XP ───────────────────────────────────────────────────────────────────────
  {
    id: "xp_first",
    label: "Spark",
    description: "Earn your first XP",
    category: "XP",
    color: "#A58F1C",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="26" fill="#A58F1C" opacity=".1" stroke="#A58F1C" stroke-width="2"/>
      <polygon points="32,12 35,26 49,26 38,35 42,50 32,41 22,50 26,35 15,26 29,26" fill="#A58F1C" opacity=".5"/>
      <circle cx="32" cy="32" r="6" fill="#A58F1C"/>
    </svg>`,
    check: ({ xp }) => xp >= 1,
  },
  {
    id: "xp_500",
    label: "Grinder",
    description: "Reach 500 XP",
    category: "XP",
    color: "#A58F1C",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="48" height="48" rx="4" fill="#A58F1C" opacity=".1" stroke="#A58F1C" stroke-width="2"/>
      <rect x="16" y="16" width="32" height="32" rx="3" fill="#A58F1C" opacity=".3"/>
      <rect x="22" y="22" width="20" height="20" rx="2" fill="#A58F1C" opacity=".6"/>
      <rect x="28" y="28" width="8" height="8" rx="1" fill="#A58F1C"/>
    </svg>`,
    check: ({ xp }) => xp >= 500,
  },
  {
    id: "xp_1000",
    label: "Elite",
    description: "Reach 1,000 XP",
    category: "XP",
    color: "#A58F1C",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="20,6 44,6 58,20 58,44 44,58 20,58 6,44 6,20" fill="#A58F1C" opacity=".1" stroke="#A58F1C" stroke-width="2.5"/>
      <polygon points="23,14 41,14 50,23 50,41 41,50 23,50 14,41 14,23" fill="#A58F1C" opacity=".35"/>
      <polygon points="26,22 38,22 42,26 42,38 38,42 26,42 22,38 22,26" fill="#A58F1C"/>
    </svg>`,
    check: ({ xp }) => xp >= 1000,
  },
  {
    id: "xp_5000",
    label: "Legend",
    description: "Reach 5,000 XP",
    category: "XP",
    color: "#A58F1C",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="27" fill="none" stroke="#A58F1C" stroke-width="1.5" stroke-dasharray="4 3" opacity=".4"/>
      <circle cx="32" cy="32" r="18" fill="#A58F1C" opacity=".12"/>
      <polygon points="32,16 35.5,27 47,27 38,34 41,45 32,38 23,45 26,34 17,27 28.5,27" fill="#A58F1C"/>
    </svg>`,
    check: ({ xp }) => xp >= 5000,
  },

  // ── Goals ────────────────────────────────────────────────────────────────────
  {
    id: "goal_first",
    label: "Dream Big",
    description: "Create your first goal",
    category: "Goals",
    color: "#9CAF88",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="26" fill="none" stroke="#9CAF88" stroke-width="2.5" opacity=".3"/>
      <circle cx="32" cy="32" r="18" fill="none" stroke="#9CAF88" stroke-width="2.5" opacity=".55"/>
      <circle cx="32" cy="32" r="9" fill="none" stroke="#9CAF88" stroke-width="2.5" opacity=".8"/>
      <circle cx="32" cy="32" r="3.5" fill="#9CAF88"/>
    </svg>`,
    check: ({ goals }) => goals.length >= 1,
  },
  {
    id: "goal_3",
    label: "Focused",
    description: "Have 3 active goals",
    category: "Goals",
    color: "#9CAF88",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="26" fill="#9CAF88" opacity=".1" stroke="#9CAF88" stroke-width="2"/>
      <polygon points="32,12 40,28 24,28" fill="#9CAF88" opacity=".5"/>
      <polygon points="50,42 34,34 42,50" fill="#9CAF88" opacity=".5"/>
      <polygon points="14,42 30,34 22,50" fill="#9CAF88" opacity=".5"/>
      <circle cx="32" cy="35" r="5" fill="#9CAF88"/>
    </svg>`,
    check: ({ goals }) => goals.length >= 3,
  },
  {
    id: "goal_5",
    label: "Overachiever",
    description: "Have 5 active goals",
    category: "Goals",
    color: "#9CAF88",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="48" height="48" rx="5" fill="#9CAF88" opacity=".1" stroke="#9CAF88" stroke-width="2"/>
      <rect x="14" y="42" width="7" height="12" rx="2" fill="#9CAF88" opacity=".3"/>
      <rect x="24" y="32" width="7" height="22" rx="2" fill="#9CAF88" opacity=".5"/>
      <rect x="34" y="20" width="7" height="34" rx="2" fill="#9CAF88" opacity=".7"/>
      <rect x="44" y="10" width="7" height="44" rx="2" fill="#9CAF88"/>
    </svg>`,
    check: ({ goals }) => goals.length >= 5,
  },

  // ── Level ────────────────────────────────────────────────────────────────────
  {
    id: "level_5",
    label: "Rising",
    description: "Reach Level 5",
    category: "Level",
    color: "#8B6B5A",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="26" fill="#8B6B5A" opacity=".1" stroke="#8B6B5A" stroke-width="2"/>
      <polyline points="18,44 32,30 46,44" stroke="#8B6B5A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".3"/>
      <polyline points="18,36 32,22 46,36" stroke="#8B6B5A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>
      <polyline points="18,28 32,14 46,28" stroke="#8B6B5A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    check: ({ level }) => level >= 5,
  },
  {
    id: "level_10",
    label: "Veteran",
    description: "Reach Level 10",
    category: "Level",
    color: "#8B6B5A",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 6 L54 16 L54 34 C54 46 32 58 32 58 C32 58 10 46 10 34 L10 16 Z" fill="#8B6B5A" opacity=".12" stroke="#8B6B5A" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M32 14 L46 21 L46 34 C46 42 32 50 32 50 C32 50 18 42 18 34 L18 21 Z" fill="#8B6B5A" opacity=".4"/>
      <path d="M32 22 L38 25 L38 34 C38 38 32 42 32 42 C32 42 26 38 26 34 L26 25 Z" fill="#8B6B5A"/>
    </svg>`,
    check: ({ level }) => level >= 10,
  },

  // ── Tasks ────────────────────────────────────────────────────────────────────
  {
    id: "tasks_first",
    label: "Kickoff",
    description: "Complete your first task",
    category: "Tasks",
    color: "#4CAF50",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="26" fill="#4CAF50" opacity=".1" stroke="#4CAF50" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="16" fill="#4CAF50" opacity=".18"/>
      <polyline points="21,33 29,41 43,24" stroke="#4CAF50" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    check: ({ tasks }) => tasks.some((t) => t.isComplete === true),
  },
  {
    id: "tasks_10",
    label: "On a Roll",
    description: "Complete 10 tasks",
    category: "Tasks",
    color: "#4CAF50",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="52" height="52" rx="10" fill="#4CAF50" opacity=".1" stroke="#4CAF50" stroke-width="2"/>
      <polyline points="14,22 19,27 26,18" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>
      <line x1="30" y1="22" x2="50" y2="22" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>
      <polyline points="14,33 19,38 26,29" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".65"/>
      <line x1="30" y1="33" x2="50" y2="33" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round" opacity=".65"/>
      <polyline points="14,44 19,49 26,40" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="30" y1="44" x2="50" y2="44" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
    check: ({ tasks }) => tasks.filter((t) => t.isComplete === true).length >= 10,
  },
  {
    id: "tasks_100",
    label: "Century",
    description: "Complete 100 tasks",
    category: "Tasks",
    color: "#4CAF50",
    svg: `<svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="56" height="44" rx="10" fill="#4CAF50" opacity=".1" stroke="#4CAF50" stroke-width="2.5"/>
      <rect x="12" y="18" width="40" height="28" rx="6" fill="#4CAF50" opacity=".22"/>
      <text x="32" y="37" text-anchor="middle" fill="#4CAF50" font-size="15" font-weight="700" font-family="-apple-system,sans-serif">100</text>
    </svg>`,
    check: ({ tasks }) => tasks.filter((t) => t.isComplete === true).length >= 100,
  },
];

/**
 * Given live user data, returns earned and locked badge arrays.
 * @param {number} xp - user's totalXP
 * @param {number} level - user's current level
 * @param {Array}  goals - array of goal objects (each has .streak, .longestStreak)
 * @param {Array}  tasks - array of task objects (each has .isComplete)
 */
export function computeBadges({ xp = 0, level = 0, goals = [], tasks = [] }) {
  const earned = [];
  const locked = [];
  for (const badge of BADGES) {
    if (badge.check({ xp, level, goals, tasks })) {
      earned.push(badge);
    } else {
      locked.push(badge);
    }
  }
  return { earned, locked };
}