import { formatSelectedDayTitle } from "./plannerViewModel.js";
import OverflowSpillway from "./OverflowSpillway.jsx";

function formatBlockType(type) {
  if (type === "routine") return "Routine";
  if (type === "break") return "Break";
  return "Task";
}

export default function SelectedDayPanel({
  day,
  overflowBusy,
  scheduleBlocks,
  scheduleLoading,
  generating,
  completingBlockId,
  onReturnOverflow,
  onAddTask,
  onGenerateSchedule,
  onReplanSchedule,
  onCompleteBlock,
}) {
  const pendingBlocks = scheduleBlocks.filter((block) => block.status !== "completed");

  return (
    <section className="planner-selected-panel" aria-label="Selected day summary">
      <div className="planner-selected-copy">
        <div className="planner-selected-head">
          <div>
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
        </div>

        <div className="planner-schedule-card" aria-label="AI schedule for selected day">
          <div className="planner-schedule-head">
            <div>
              <p className="planner-selected-kicker">AI Plan</p>
              <p className="planner-schedule-subtitle">
                {pendingBlocks.length
                  ? `${pendingBlocks.length} block${pendingBlocks.length === 1 ? "" : "s"} still open.`
                  : "No active blocks yet for this day."}
              </p>
            </div>
            <div className="planner-schedule-actions">
              <button
                type="button"
                className="planner-schedule-action"
                onClick={onGenerateSchedule}
                disabled={generating}
              >
                Generate
              </button>
              <button
                type="button"
                className="planner-schedule-action planner-schedule-action-secondary"
                onClick={onReplanSchedule}
                disabled={generating}
              >
                Replan
              </button>
            </div>
          </div>

          {scheduleLoading ? (
            <div className="planner-schedule-empty">Loading the day plan…</div>
          ) : scheduleBlocks.length ? (
            <div className="planner-schedule-list">
              {scheduleBlocks.map((block) => {
                const isCompleted = block.status === "completed";
                const canComplete = !isCompleted && block.type !== "break";
                return (
                  <article
                    key={block.blockId}
                    className={`planner-schedule-block ${isCompleted ? "is-completed" : ""}`.trim()}
                  >
                    <div className="planner-schedule-time">
                      <span>{block.startTime || block.startLabel || "--"}</span>
                      <span>{block.endTime || block.endLabel || "--"}</span>
                    </div>

                    <div className="planner-schedule-main">
                      <div className="planner-schedule-line">
                        <strong>{block.itemTitle || "Untitled block"}</strong>
                        <span className="planner-schedule-chip">{formatBlockType(block.type)}</span>
                      </div>
                      {block.reasoning ? (
                        <p className="planner-schedule-reason">{block.reasoning}</p>
                      ) : null}
                    </div>

                    {canComplete ? (
                      <button
                        type="button"
                        className="planner-schedule-complete"
                        onClick={() => onCompleteBlock(block.blockId)}
                        disabled={completingBlockId === block.blockId}
                      >
                        {completingBlockId === block.blockId ? "..." : "Done"}
                      </button>
                    ) : (
                      <span className="planner-schedule-state">
                        {isCompleted ? "Done" : "Break"}
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="planner-schedule-empty">
              Generate a plan to see how Glide wants to shape this day.
            </div>
          )}
        </div>
      </div>

      <OverflowSpillway tasks={day.overflowTasks} busy={overflowBusy} onReturnToBacklog={onReturnOverflow} />
    </section>
  );
}
