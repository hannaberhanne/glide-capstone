import { formatSelectedDayTitle } from "./plannerViewModel.js";
import OverflowSpillway from "./OverflowSpillway.jsx";

export default function SelectedDayPanel({ day, overflowBusy, onReturnOverflow, onAddTask }) {
  return (
    <section className="planner-selected-panel" aria-label="Selected day summary">
      <div className="planner-selected-copy">
        <p className="planner-selected-kicker">Selected Day</p>
        <h2 className="planner-selected-title">{formatSelectedDayTitle(day.date)}</h2>
        <p className="planner-selected-subtitle">
          {day.tasks.length === 0
            ? "Nothing committed yet. Pull work from the backlog into this day."
            : `${day.tasks.length} task${day.tasks.length === 1 ? "" : "s"} scheduled here.`}
        </p>
      </div>

      <button type="button" className="planner-selected-add" onClick={onAddTask}>
        Add To {day.dayName}
      </button>

      <OverflowSpillway tasks={day.overflowTasks} busy={overflowBusy} onReturnToBacklog={onReturnOverflow} />
    </section>
  );
}
