import { useEffect, useState } from "react";
import "./GoalsPage.css";
import AddGoal from "../components/AddGoal.jsx";
import EditGoal from "../components/EditGoal.jsx";
import AlertBanner from "../components/AlertBanner";
import { auth } from "../config/firebase.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function GoalCard({ goal, onDelete, onEdit }) {
  const taskEntries = Object.entries(goal.tasks || {});

  return (
    <div
      className="goal-card"
      style={{ borderColor: goal.color, cursor: "pointer" }}
      onClick={() => onEdit(goal)}
    >
      <button
        type="button"
        className="goal-delete-btn"
        onClick={(e) => {
          e.stopPropagation(); // prevent opening edit modal when deleting
          onDelete(goal.goalId);
        }}
        aria-label={`Delete ${goal.title}`}
      >
        ×
      </button>

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
                  <span
                    className="goal-task-bullet"
                    style={{ color: goal.color }}
                  >
                    •
                  </span>
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
  const [banner, setBanner] = useState(null);
  const [earnedBadges] = useState([]);
  const [goals, setGoals] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [stats] = useState({
    streak: null,
    longestStreak: null,
    level: null,
    totalXP: null,
  });

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/quotes`);

        if (!res.ok) {
          setBanner({
            message: `Request failed with status ${res.status}`,
            type: "error",
          });
          return;
        }

        const data = await res.json();
        setQuote(data);
      } catch (err) {
        console.error("Error fetching quote:", err);
        setBanner({ message: "Error fetching quote", type: "error" });
      }
    };

    fetchQuote();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      try {
        const token = await user.getIdToken();

        const res = await fetch(`${API_BASE_URL}/api/goals`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || data.message || "Failed to fetch goals");
        }

        setGoals(data);
      } catch (err) {
        console.error("Fetch goals error:", err);
        setBanner({ message: "Error loading goals", type: "error" });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoalCreated = (newGoal) => {
    setGoals((prev) => [...prev, newGoal]);
    setBanner({ message: "New Goal Created!" });
    setShowAddGoal(false);
  };

  const handleGoalUpdated = (updatedGoal) => {
    setGoals((prev) =>
      prev.map((g) => (g.goalId === updatedGoal.goalId ? updatedGoal : g))
    );
    setBanner({ message: "Goal updated successfully!" });
    setEditingGoal(null);
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      const token = await auth.currentUser.getIdToken();

      const res = await fetch(`${API_BASE_URL}/api/goals/${goalId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to delete goal");
      }

      setGoals((prev) => prev.filter((g) => g.goalId !== goalId));
      setBanner({ message: "Goal deleted successfully!" });
    } catch (err) {
      console.error("Delete goal error:", err);
      setBanner({ message: err.message || "Error deleting goal", type: "error" });
    }
  };

  return (
    <>
      <div className="goals">
        <div className="goals-title">
          <h1>Goals</h1>
          {quote && (
            <p className="goals-quote">
              {quote.text} — {quote.author}
            </p>
          )}
        </div>

        <div className="goals-primary">
          <div className="goals-left">
            <AddGoalCard onClick={() => setShowAddGoal(true)} />
            {goals.map((goal) => (
              <GoalCard
                key={goal.goalId}
                goal={goal}
                onDelete={handleDeleteGoal}
                onEdit={setEditingGoal}
              />
            ))}
          </div>

          <div className="goals-right">
            <h2 className="achievements-title">Your Achievements</h2>

            <div className="stat-badges-grid">
              <StatBadge
                icon="🔥"
                label="Current Streak"
                value={`${stats.streak} days`}
              />
              <StatBadge
                icon="🏆"
                label="Longest Streak"
                value={`${stats.longestStreak} days`}
              />
              <StatBadge icon="⭐" label="Level" value={stats.level} />
              <StatBadge icon="✨" label="Total XP" value={stats.totalXP} />
            </div>

            <div className="earned-badges-section">
              <h3 className="earned-badges-heading">Badges Earned</h3>
              <div className="earned-badges-grid">
                {earnedBadges.map((badge) => (
                  <EarnedBadge key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddGoal && (
        <AddGoal
          onClose={() => setShowAddGoal(false)}
          onGoalCreated={handleGoalCreated}
        />
      )}

      {editingGoal && (
        <EditGoal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onGoalUpdated={handleGoalUpdated}
        />
      )}

      {banner && (
        <AlertBanner
          message={banner.message}
          type={banner.type}
          onClose={() => setBanner(null)}
        />
      )}
    </>
  );
}
