export default function OverflowSpillway({ tasks, busy, onReturnToBacklog }) {
  if (!tasks.length) return null;

  return (
    <div className="planner-spillway" aria-label="Overflow tasks">
      <div className="planner-spillway-head">
        <p>Overflow</p>
        <span>{tasks.length}</span>
      </div>

      <div className="planner-spillway-list">
        {tasks.map((task) => (
          <div key={task.taskId} className="planner-spillway-task">
            <span>{task.title}</span>
          </div>
        ))}
      </div>

      <button type="button" className="planner-spillway-action" onClick={onReturnToBacklog} disabled={busy}>
        {busy ? "Returning…" : "Return Overflow To Backlog"}
      </button>
    </div>
  );
}
