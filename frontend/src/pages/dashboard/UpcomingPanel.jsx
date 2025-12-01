import { useMemo, useState } from "react";
import TaskListGroup from "./TaskListGroup.jsx";

export default function UpcomingPanel({
  tasks,
  activeFilter,
  setActiveFilter,
  onQuickAdd,
  onComplete,
  onEdit,
  onDelete,
  formatDue,
  openCreateModal,
}) {
  const [newTask, setNewTask] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("academic");

  const groupedTasks = useMemo(() => {
    const groupsMap = new Map();
    const filtered = tasks.filter((t) => {
      const cat = (t.category || "academic").toLowerCase();
      if (activeFilter === "all") return true;
      return cat === activeFilter;
    });

    const parseDueDate = (t) => {
      if (!t.dueAt) return null;
      if (typeof t.dueAt === "object" && t.dueAt.seconds) {
        return new Date(t.dueAt.seconds * 1000);
      }
      const d = new Date(t.dueAt);
      return isNaN(d.getTime()) ? null : d;
    };

    const sorted = filtered.slice().sort((a, b) => {
      const da = parseDueDate(a);
      const db = parseDueDate(b);
      if (da && db) return da - db;
      if (da && !db) return -1;
      if (!da && db) return 1;
      return 0;
    });

    sorted.forEach((task) => {
      const d = parseDueDate(task);
      let label = "No due date";
      let key = "no-date";
      if (d) {
        const today = new Date();
        const sameDay = d.toDateString() === today.toDateString();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const isTomorrow = d.toDateString() === tomorrow.toDateString();
        if (sameDay) {
          label = "Today";
          key = "today";
        } else if (isTomorrow) {
          label = "Tomorrow";
          key = "tomorrow";
        } else {
          label = d.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          key = d.toISOString().slice(0, 10);
        }
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { label, items: [] });
      }
      groupsMap.get(key).items.push(task);
    });

    return Array.from(groupsMap.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      items: value.items,
    }));
  }, [tasks, activeFilter]);

  const handleQuickAdd = async () => {
    if (!newTask.trim()) return;
    await onQuickAdd({
      title: newTask.trim(),
      isComplete: false,
      dueAt: new Date().toISOString(),
      category: newTaskCategory,
    });
    setNewTask("");
  };

  return (
    <section className="dash-main">
      <div className="panel">
        <div className="panel-head">
          <h2>Upcoming</h2>
          <button className="add-task-btn" onClick={openCreateModal}>+ Add Task</button>
        </div>

        <div className="task-input-row">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
            placeholder="Add a new task..."
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "2px solid #e5e7eb",
              borderRadius: "10px",
              fontSize: "15px",
              outline: "none",
            }}
          />
          <select
            value={newTaskCategory}
            onChange={(e) => setNewTaskCategory(e.target.value)}
            style={{ padding: "10px", borderRadius: "10px", border: "2px solid #e5e7eb" }}
          >
            <option value="academic">Academic</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
        </div>

        <div className="task-filters">
          {["all", "academic", "work", "personal"].map((f) => (
            <button
              key={f}
              className={`filter-pill ${activeFilter === f ? "active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {tasks.length === 0 ? (
          <ul className="task-list">
            <li className="task-item">
              <div className="task-body">
                <div className="task-empty">
                  <span aria-hidden>📝</span>
                  <div>
                    <div className="task-text">Ready to add your first task?</div>
                    <div className="task-meta">Stay sharp—add one quick win.</div>
                  </div>
                  <button className="add-task-btn" onClick={openCreateModal} style={{ marginLeft: "auto" }}>
                    Add task
                  </button>
                </div>
              </div>
            </li>
          </ul>
        ) : (
          <TaskListGroup
            groups={groupedTasks}
            onComplete={onComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            formatDue={formatDue}
          />
        )}
      </div>
    </section>
  );
}
