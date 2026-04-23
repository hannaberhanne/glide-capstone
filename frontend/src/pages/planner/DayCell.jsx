import { estimateLabel, isTaskCompleteForToday, taskDueTimeLabel } from "./plannerViewModel.js";
import AssistGhostCard from "./AssistGhostCard.jsx";

export default function DayCell({
  day,
  selected,
  dragHover,
  assistActive,
  draggingDisabled,
  onSelect,
  onDragStartTask,
  onDragEnd,
  onDragOver,
  onDrop,
  onEditTask,
  onCompleteTask,
  onAcceptSuggestion,
  onRejectSuggestion,
}) {
  const classes = [
    "planner-day-cell",
    day.inMonth ? "is-month" : "is-outside",
    day.isToday ? "is-today" : "",
    selected ? "is-selected" : "",
    dragHover ? "is-drag-hover" : "",
    day.tasks.length > 0 || day.ghosts.length > 0 ? "has-data" : "is-empty",
    `load-${day.loadState}`,
  ]
    .filter(Boolean)
    .join(" ");

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(day);
    }
  };

  return (
    <div
      className={classes}
      onClick={() => onSelect(day)}
      onKeyDown={handleKeyDown}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-label={`${day.dayName} ${day.dateNumber}, ${day.tasks.length} task${day.tasks.length === 1 ? "" : "s"}`}
      role="button"
      tabIndex={0}
    >
      <span className="planner-day-number">{day.dateNumber}</span>

      {!selected ? (
        <div className="planner-day-preview" aria-hidden>
          {day.chipTasks.map((task) => (
            <span key={task.taskId} className={`planner-day-chip ${isTaskCompleteForToday(task) ? "is-done" : ""}`.trim()}>
              {task.title}
            </span>
          ))}
          {day.extraChipCount > 0 ? <span className="planner-day-chip planner-day-chip-more">+{day.extraChipCount}</span> : null}
          {assistActive && day.ghosts.length > 0 ? <span className="planner-day-chip planner-day-chip-ghost">{day.ghosts.length} assist</span> : null}
        </div>
      ) : (
        <div className="planner-day-authority" onClick={(event) => event.stopPropagation()}>
          <div className="planner-day-authority-head">
            <div>
              <strong className="planner-day-authority-date">{day.dateNumber}</strong>
              <span className="planner-day-authority-name">{day.dayName}</span>
            </div>
            <span className="planner-day-authority-count">{day.tasks.length} scheduled</span>
          </div>

          <div className="planner-day-authority-list">
            {day.visibleTasks.length === 0 && !assistActive ? (
              <div className="planner-day-empty">Drag work here when you are ready.</div>
            ) : null}

            {day.visibleTasks.map((task) => {
              const done = isTaskCompleteForToday(task);
              return (
              <div
                key={task.taskId}
                className={`planner-day-task ${done ? "is-done" : ""}`.trim()}
                draggable={!draggingDisabled && !done}
                onDragStart={(event) => onDragStartTask(event, task, "grid")}
                onDragEnd={onDragEnd}
              >
                <button
                  type="button"
                  className={`planner-day-check ${done ? "checked" : ""}`.trim()}
                  onClick={() => onCompleteTask(task.taskId)}
                  disabled={done}
                  aria-label={done ? "Completed" : `Mark ${task.title} complete`}
                >
                  {done ? "✓" : ""}
                </button>

                <button type="button" className="planner-day-task-main" onClick={() => onEditTask(task)}>
                  <span className="planner-day-task-title">{task.title}</span>
                  <span className="planner-day-task-meta">
                    {estimateLabel(task) || taskDueTimeLabel(task) || (task.priority || "medium")}
                  </span>
                </button>
              </div>
              );
            })}

            {assistActive && day.ghosts.length > 0 ? (
              <div className="planner-day-ghost-stack">
                {day.ghosts.map((suggestion, index) => (
                  <AssistGhostCard
                    key={`${suggestion.taskId || suggestion.title || index}-${index}`}
                    suggestion={suggestion}
                    onAccept={onAcceptSuggestion}
                    onReject={onRejectSuggestion}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="planner-day-density" aria-hidden>
        {day.loadState === "light" ? <span /> : null}
        {day.loadState === "steady" ? (
          <>
            <span />
            <span />
            <span />
          </>
        ) : null}
        {day.loadState === "overloaded" ? <span className="planner-day-density-halo" /> : null}
      </div>
    </div>
  );
}
