import { isTaskCompleteForToday } from "./plannerViewModel.js";

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
}) {
  const classes = [
    "planner-day-cell",
    day.inMonth ? "is-month" : "is-outside",
    day.isToday ? "is-today" : "",
    day.isPast ? "is-past" : "",
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

      <div className="planner-day-preview">
        {day.chipTasks.map((task) => {
          const done = isTaskCompleteForToday(task);
          return (
            <span
              key={task.taskId}
              className={`planner-day-chip ${done ? "is-done" : ""}`.trim()}
              draggable={!draggingDisabled && !done}
              onDragStart={(event) => {
                event.stopPropagation();
                onDragStartTask(event, task, "grid");
              }}
              onDragEnd={onDragEnd}
            >
              {task.title}
            </span>
          );
        })}
        {day.extraChipCount > 0 ? <span className="planner-day-chip planner-day-chip-more">+{day.extraChipCount}</span> : null}
        {assistActive && day.ghosts.length > 0 ? <span className="planner-day-chip planner-day-chip-ghost">{day.ghosts.length} assist</span> : null}
      </div>

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
