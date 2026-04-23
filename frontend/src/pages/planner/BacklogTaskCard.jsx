import { estimateLabel, isTaskCompleteForToday, taskSourceLabel } from "./plannerViewModel.js";

export default function BacklogTaskCard({ task, dragging, onDragStart, onDragEnd, onEdit }) {
  const estimate = estimateLabel(task);
  const source = taskSourceLabel(task);
  const done = isTaskCompleteForToday(task);

  return (
    <li
      className={`planner-backlog-card ${dragging ? "is-dragging" : ""} ${done ? "is-done" : ""}`.trim()}
      draggable={!done}
      onDragStart={(event) => onDragStart(event, task, "backlog")}
      onDragEnd={onDragEnd}
    >
      <button type="button" className="planner-backlog-grip" aria-label={`Drag ${task.title || "task"}`}>
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </button>

      <button type="button" className="planner-backlog-main" onClick={() => onEdit(task)}>
        <span className="planner-backlog-title">{task.title || task.text || "Untitled task"}</span>
        <span className="planner-backlog-meta">
          {estimate ? <span>{estimate}</span> : null}
          {estimate && source ? <span className="planner-backlog-meta-dot" aria-hidden /> : null}
          {source ? <span>{source}</span> : null}
          {!estimate && !source ? <span>Ready to schedule</span> : null}
        </span>
      </button>
    </li>
  );
}
