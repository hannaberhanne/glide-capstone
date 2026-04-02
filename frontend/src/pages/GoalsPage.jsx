import { useEffect, useState } from "react";
import "./GoalsPage.css";
import AddGoal from "../components/AddGoal.jsx";
import { auth } from "../config/firebase.js";

// Mock badge data — swap out for real Firestore fetch later
const MOCK_EARNED_BADGES = [
  { id: "first_goal", icon: "🎯", label: "First Goal", description: "Created your first goal" },
  { id: "week_warrior", icon: "⚡", label: "Week Warrior", description: "7-day streak achieved" },
  { id: "task_master", icon: "✅", label: "Task Master", description: "Completed 10 tasks" },
  { id: "early_bird", icon: "🌅", label: "Early Bird", description: "Completed a task before 8am" },
];

// Mock goal data — swap out for real API fetch
const MOCK_GOALS = [
  {
    goalId: "1",
    title: "Study for Finals",
    color: "#6B8E9F",
    streak: 5,
    longestStreak: 8,
    completedToday: false,
    tasks: {
      "Review Chapter 7": 50,
      "Practice problems set 3": 75,
      "Flashcards — vocab": 25,
    },
  },
  {
    goalId: "2",
    title: "Exercise Daily",
    color: "#9CAF88",
    streak: 3,
    longestStreak: 3,
    completedToday: true,
    tasks: {
      "30 min cardio": 60,
      "Core workout": 40,
    },
  },
  {
    goalId: "3",
    title: "Read More",
    color: "#D65745",
    streak: 1,
    longestStreak: 5,
    completedToday: false,
    tasks: {
      "Read 20 pages": 30,
      "Take notes": 20,
    },
  },
];

// Mock user stats
const MOCK_USER_STATS = {
  streak: 5,
  longestStreak: 8,
  level: 4,
  totalXP: 1340,
};

function GoalCard({ goal }) {
  const taskEntries = Object.entries(goal.tasks || {});

  return (
    <div className="goal-card" style={{ borderColor: goal.color }}>
      <div className="goal-card-header" style={{ backgroundColor: goal.color }}>
        <span className="goal-card-title">{goal.title}</span>
        <span className="goal-card-streak">🔥 {goal.streak}</span>
      </div>
      <div className="goal-card-body">
        {taskEntries.length === 0 ? (
          <p className="goal-no-tasks">No tasks yet.</p>
        ) : (
          <ul className="goal-task-list">
            {taskEntries.map(([taskName, xp]) => (
              <li key={taskName} className="goal-task-item">
                <label className="goal-task-label">
                  <span className="goal-task-bullet" style={{ color: goal.color }}>•</span>
                  <span className="goal-task-name">{taskName}</span>
                </label>
                <span className="goal-task-xp">+{xp} XP</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddGoalCard({ onClick }) {
  return (
    <button
      type="button"
      className="goal-card goal-card-add"
      onClick={onClick}
    >
      <div className="goal-card-add-inner">
        <div className="goal-card-add-badge">+</div>
        <h3 className="goal-card-add-title">Add New Goal</h3>
        <p className="goal-card-add-text">
        Create a goal and start earning XP
        </p>
      </div>
    </button>
  );
}

function StatBadge({ icon, label, value }) {
  return (
    <div className="stat-badge">
      <span className="stat-badge-icon">{icon}</span>
      <div className="stat-badge-info">
        <span className="stat-badge-value">{value}</span>
        <span className="stat-badge-label">{label}</span>
      </div>
    </div>
  );
}

function EarnedBadge({ badge }) {
  return (
    <div className="earned-badge" title={badge.description}>
      <span className="earned-badge-icon">{badge.icon}</span>
      <span className="earned-badge-label">{badge.label}</span>
    </div>
  );
}

export default function GoalsPage() {
  const [quote, setQuote] = useState(null);
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem("createdGoals");
    const created = saved ? JSON.parse(saved) : [];
    return [...MOCK_GOALS, ...created];
  });
  const [showAddGoal, setShowAddGoal] = useState(false);
  const stats = MOCK_USER_STATS;

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/quotes`
        );
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const data = await res.json();
        setQuote(data);
      } catch (err) {
        console.error("Error fetching quote:", err);
      }
    };
    fetchQuote();
  }, []);

  const handleGoalCreated = (newGoal) => {
    setGoals((prev) => {
      const updated = [...prev, newGoal];
      const createdOnly = updated.filter(
        (g) => !MOCK_GOALS.find((m) => m.goalId === g.goalId)
      );
      localStorage.setItem("createdGoals", JSON.stringify(createdOnly));
      return updated;
    });
    setShowAddGoal(false);
  };

  return (
    <>
      <div className="goals">
        {/* ── Title section — untouched ── */}
        <div className="goals-title">
          <h1>Goals</h1>
          {quote && (
            <p className="goals-quote">
              {quote.text} — {quote.author}
            </p>
          )}
        </div>

        {/* ── Main two-column layout ── */}
        <div className="goals-primary">

          {/* LEFT — goal cards, add card always first */}
          <div className="goals-left">
            <AddGoalCard onClick={() => setShowAddGoal(true)} />
            {goals.map((goal) => (
              <GoalCard key={goal.goalId} goal={goal} />
            ))}
          </div>

          {/* RIGHT — achievements */}
          <div className="goals-right">
            <h2 className="achievements-title">Your Achievements</h2>

            <div className="stat-badges-grid">
              <StatBadge icon="🔥" label="Current Streak" value={`${stats.streak} days`} />
              <StatBadge icon="🏆" label="Longest Streak" value={`${stats.longestStreak} days`} />
              <StatBadge icon="⭐" label="Level" value={stats.level} />
              <StatBadge icon="✨" label="Total XP" value={stats.totalXP} />
            </div>

            <div className="earned-badges-section">
              <h3 className="earned-badges-heading">Badges Earned</h3>
              <div className="earned-badges-grid">
                {MOCK_EARNED_BADGES.map((badge) => (
                  <EarnedBadge key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Add Goal popup — rendered outside layout so it overlays everything ── */}
      {showAddGoal && (
        <AddGoal
          onClose={() => setShowAddGoal(false)}
          onGoalCreated={handleGoalCreated}
        />
      )}
    </>
  );
}
