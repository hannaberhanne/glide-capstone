import BacklogTaskCard from "./BacklogTaskCard.jsx";

export default function PlannerSidebar({
  tasks,
  draggingTaskId,
  onDragStart,
  onDragEnd,
  onDropToBacklog,
  onDragOverBacklog,
  onEdit,
  onAddTask,
}) {
  return (
    <aside className="planner-sidebar" aria-label="Unscheduled tasks">
      <div className="planner-sidebar-head">
        <div>
          <p className="planner-sidebar-kicker">Unscheduled Tasks</p>
          <span className="planner-sidebar-count">{tasks.length}</span>
        </div>
        <button type="button" className="planner-sidebar-add" onClick={onAddTask}>
          Add Task
        </button>
      </div>

      <div className="planner-sidebar-body" onDragOver={onDragOverBacklog} onDrop={onDropToBacklog}>
        {tasks.length === 0 ? (
          <div className="planner-backlog-empty">
            <p>Backlog clear.</p>
            <span>New work lands here until it is placed.</span>
          </div>
        ) : (
          <ul className="planner-backlog-list">
            {tasks.map((task) => (
              <BacklogTaskCard
                key={task.taskId}
                task={task}
                dragging={draggingTaskId === task.taskId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onEdit={onEdit}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
