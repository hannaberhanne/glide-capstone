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
    <aside className="planner-sidebar" aria-label="Planning workbench">
      <div className="planner-sidebar-head">
        <div>
          <p className="planner-sidebar-kicker">Workbench</p>
          <h2 className="planner-sidebar-title">Ready to plan</h2>
          <span className="planner-sidebar-count">{tasks.length}</span>
        </div>
        <button type="button" className="planner-sidebar-add" onClick={onAddTask}>
          Add Task
        </button>
      </div>

      <div className="planner-sidebar-body" onDragOver={onDragOverBacklog} onDrop={onDropToBacklog}>
        {tasks.length === 0 ? (
          <div className="planner-backlog-empty">
            <p>Workbench clear.</p>
            <span>New tasks and Canvas work land here before Glide+ places them.</span>
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
