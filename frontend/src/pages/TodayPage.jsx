import { useEffect, useMemo, useState } from "react";
import { auth } from "../config/firebase";
import useUser from "../hooks/useUser";
import "./TodayPage.css";

const parseISOToLocal = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d;
};

export default function TodayPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const { refreshUser } = useUser(API_URL);

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);

  const fetchSchedule = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/schedule/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBlocks(data.blocks || []);
    } catch (err) {
      console.error("Fetch schedule error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/schedule/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        alert(`✨ Schedule generated! ${data.blocksCreated} blocks created.\n\n${data.rationale || ""}`);
        fetchSchedule();
      } else {
        alert("Failed to generate schedule");
      }
    } catch (err) {
      console.error("Generate error:", err);
      alert("Failed to generate schedule");
    } finally {
      setGenerating(false);
    }
  };

  const handleReplan = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${API_URL}/api/schedule/replan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      fetchSchedule();
    } catch (err) {
      console.error("Replan error:", err);
    }
  };

  const handleComplete = async (blockId) => {
    if (!auth.currentUser) return;
    setCompleting(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/schedule/blocks/${blockId}/complete`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchSchedule();
        refreshUser();
      } else {
        alert(data?.error || "Failed to complete block");
      }
    } catch (err) {
      console.error("Complete block error:", err);
      alert("Failed to complete block");
    } finally {
      setCompleting(false);
    }
  };

  const now = new Date();

  const blocksWithParsed = useMemo(
    () =>
      blocks
        .map((b) => ({
          ...b,
          start: parseISOToLocal(b.startISO),
          end: parseISOToLocal(b.endISO),
        }))
        .sort((a, b) => {
          if (a.start && b.start) return a.start - b.start;
          return 0;
        }),
    [blocks]
  );

  const currentBlock = blocksWithParsed.find((b) => b.start && b.end && b.start <= now && now < b.end);
  const upcoming = blocksWithParsed.filter((b) => b.start && b.start > now).slice(0, 3);

  const completed = blocksWithParsed.filter((b) => b.status === "completed").length;
  const total = blocksWithParsed.filter((b) => b.type !== "break").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) return <div className="today-loading">Loading today's schedule...</div>;

  if (blocksWithParsed.length === 0) {
    return (
      <div className="today-empty">
        <h1>No schedule for today</h1>
        <p>Let AI build your daily plan based on your tasks, habits, and energy levels.</p>
        <button className="generate-btn" onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating..." : "✨ Generate Today's Schedule"}
        </button>
      </div>
    );
  }

  return (
    <div className="today-page">
      <header className="today-header">
        <h1>Today</h1>
        <p>{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      </header>

      <section className="current-block">
        <h2>Right Now</h2>
        {currentBlock ? (
          <div className="block-card highlighted">
            <span className="block-time">
              {currentBlock.startTime || currentBlock.start?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} -{" "}
              {currentBlock.endTime || currentBlock.end?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            <h3>{currentBlock.itemTitle || currentBlock.type}</h3>
            {currentBlock.reasoning && <p className="block-reasoning">{currentBlock.reasoning}</p>}
            {currentBlock.xpValue && <span className="block-xp">+{currentBlock.xpValue} XP</span>}
            <button
              className="replan-btn"
              onClick={() => handleComplete(currentBlock.blockId)}
              disabled={completing}
            >
              {completing ? "Completing..." : "Mark Complete"}
            </button>
          </div>
        ) : (
          <div className="block-card free-time">
            <h3>Free Time</h3>
            <p>You're between blocks. Take a break or get ahead!</p>
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="upcoming-blocks">
          <h2>Coming Up</h2>
          {upcoming.map((block) => (
            <div key={block.blockId} className="block-card">
              <span className="block-time">
                {block.startTime || block.start?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} -{" "}
                {block.endTime || block.end?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
              <h3>{block.itemTitle || block.type}</h3>
              {block.xpValue && <span className="block-xp">+{block.xpValue} XP</span>}
            </div>
          ))}
        </section>
      )}

      <section className="today-stats">
        <h2>Progress</h2>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <p>
          {completed} of {total} completed ({progress}%)
        </p>
      </section>

      <div className="today-actions">
        <button className="generate-btn" onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating..." : "✨ Generate schedule"}
        </button>
        <button className="replan-btn" onClick={handleReplan}>
          🔄 Replan Schedule
        </button>
      </div>
    </div>
  );
}
