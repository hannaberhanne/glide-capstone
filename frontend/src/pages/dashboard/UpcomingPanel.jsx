import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TaskListGroup from "./TaskListGroup.jsx";

function EmptyPlannerRows({
  note,
  onCreate,
  onQuickAdd,
  bucket = "today",
  rowCount = 2,
}) {
  const [drafts, setDrafts] = useState(() => Array.from({ length: rowCount }, () => ""));
  const [savingIndex, setSavingIndex] = useState(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0] && note) {
      inputRefs.current[0].setAttribute("placeholder", note);
    }
  }, [note]);

  useEffect(() => {
    setDrafts((prev) => {
      if (prev.length === rowCount) return prev;
      return Array.from({ length: rowCount }, (_, index) => prev[index] || "");
    });
  }, [rowCount]);

  const submitDraft = async (index) => {
    const value = (drafts[index] || "").trim();
    if (!value || !onQuickAdd) {
      setDrafts((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    setSavingIndex(index);
    try {
      await onQuickAdd(value, bucket);
      setDrafts((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
    } finally {
      setSavingIndex(null);
    }
  };

  const handleKeyDown = async (event, index) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await submitDraft(index);
    }
    if (event.key === "Escape") {
      setDrafts((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
    }
  };

  return (
    <div className="today-empty today-empty-lines" role="status">
      <ul className="today-task-list today-task-list-empty">
        {Array.from({ length: rowCount }).map((_, index) => (
          <li key={index} className="today-task-row is-empty">
            <span className="today-task-check today-task-check-empty" />

            <div className="today-task-main">
              <input
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                type="text"
                className="today-inline-input"
                value={drafts[index]}
                onChange={(event) =>
                  setDrafts((prev) => {
                    const next = [...prev];
                    next[index] = event.target.value;
                    return next;
                  })
                }
                onKeyDown={(event) => handleKeyDown(event, index)}
                onBlur={() => {
                  if (savingIndex === index) return;
                  if ((drafts[index] || "").trim()) {
                    submitDraft(index);
                  }
                }}
                placeholder={index === 0 ? note || "" : ""}
                aria-label={index === 0 && note ? note : `Planner line ${index + 1}`}
                disabled={savingIndex === index}
              />
            </div>

            <div className="today-task-side">
              <span className="today-task-time today-task-time-empty" />
              <button
                type="button"
                className="today-task-edit today-task-edit-empty"
                onClick={onCreate}
                aria-label="Open task editor"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M12.7 2.3a1.4 1.4 0 1 1 2 2L7.2 11.8 4 12.5l.7-3.2 8-7Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11.8 3.2 14.8 6.2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UpcomingEmptyState() {
  return (
    <ul className="today-task-list today-upcoming-empty-lines">
      <li className="today-task-row today-upcoming-message-row">
        <span className="today-task-check today-task-check-empty" aria-hidden />
        <div className="today-task-main today-upcoming-empty-copy">
          <p>Later work and Canvas imports will land here when they have dates.</p>
        </div>
        <div className="today-task-side">
          <span className="today-task-time today-task-time-empty" />
          <Link to="/planner" className="today-task-edit today-task-planner-link" aria-label="Open Planner">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <rect x="3.2" y="3.8" width="11.6" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.55" />
              <path d="M5.5 2.8v2.2M12.5 2.8v2.2M3.6 7.1h10.8M6 9.6h5.8M6 12.1h4.2" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      </li>
      {Array.from({ length: 4 }).map((_, index) => (
          <li key={index} className="today-task-row is-empty">
            <span className="today-task-check today-task-check-empty" />
            <div className="today-task-main" />
          </li>
      ))}
    </ul>
  );
}

function SectionHead({ label, count, action }) {
  return (
    <div className="today-section-head">
      <span className="today-section-label">{label}</span>
      <span className="today-section-head-right">
        {typeof count === "number" ? <span className="today-section-count">{count}</span> : null}
        {action}
      </span>
    </div>
  );
}

export default function UpcomingPanel({
  todayTasks,
  upcomingTasks,
  hasAnyTasks,
  onComplete,
  onEdit,
  onDelete,
  onDismiss,
  formatDue,
  formatEstimate,
  parseDueDate,
  openCreateModal,
  onQuickAdd,
}) {
  const plannerHandoff = todayTasks.length > 8;

  return (
    <div className="today-sheet-body">
      <section className="today-section today-section-primary" aria-labelledby="today-today-heading">
        <SectionHead
          label="Today"
          count={todayTasks.length || undefined}
          action={
            <button type="button" className="today-add-task-button" onClick={openCreateModal}>
              Add task
            </button>
          }
        />
        <h2 className="sr-only" id="today-today-heading">
          Today
        </h2>
        {todayTasks.length > 0 ? (
          <>
            <TaskListGroup
              tasks={todayTasks}
              variant="lead"
              onComplete={onComplete}
              onEdit={onEdit}
              onDelete={onDelete}
              onDismiss={onDismiss}
              formatDue={formatDue}
              formatEstimate={formatEstimate}
              parseDueDate={parseDueDate}
            />
            <EmptyPlannerRows
              note=""
              onCreate={openCreateModal}
              onQuickAdd={onQuickAdd}
              bucket="today"
              rowCount={Math.max(2, 5 - todayTasks.length)}
            />
          </>
        ) : (
          <EmptyPlannerRows
            note={hasAnyTasks ? "Add a task" : "Add your first task"}
            onCreate={openCreateModal}
            onQuickAdd={onQuickAdd}
            bucket="today"
            rowCount={5}
          />
        )}
        {plannerHandoff ? (
          <div className="today-planner-handoff">
            <Link to="/planner" className="today-planner-handoff-link">
              View full day in Planner
            </Link>
          </div>
        ) : null}
      </section>

      <section className="today-section today-section-upcoming" aria-labelledby="today-upcoming-heading">
        <SectionHead label="Upcoming" count={upcomingTasks.length || undefined} />
        <h2 className="sr-only" id="today-upcoming-heading">
          Upcoming
        </h2>
        {upcomingTasks.length > 0 ? (
          <TaskListGroup
            tasks={upcomingTasks}
            onComplete={onComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            onDismiss={onDismiss}
            formatDue={formatDue}
            formatEstimate={formatEstimate}
            parseDueDate={parseDueDate}
          />
        ) : (
          <UpcomingEmptyState />
        )}
      </section>
    </div>
  );
}
