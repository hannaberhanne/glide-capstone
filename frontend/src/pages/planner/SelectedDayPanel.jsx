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
  removingBlockId,
  onReturnOverflow,
  onAddTask,
  onGenerateSchedule,
  onCompleteBlock,
  onRemoveBlock,
}) {
  const visibleBlocks = scheduleBlocks.filter((block) => block.type !== "break" || block.taskId || block.habitId);
  const pendingBlocks = visibleBlocks.filter((block) => block.status !== "completed");

  return (
    <section className="planner-selected-panel" aria-label="Selected day summary">
      <div className="planner-selected-copy">
        <div className="planner-selected-head">
          <div className="planner-selected-identity">
            <strong className="planner-selected-date-num">{day.dateNumber}</strong>
            <div className="planner-selected-labels">
              <span className="planner-day-authority-name">{day.dayName}</span>
              <h2 className="planner-selected-title">{formatSelectedDayTitle(day.date)}</h2>
              <p className="planner-selected-subtitle">
                {day.tasks.length === 0
                  ? "Nothing scheduled."
                  : `${day.tasks.length} task${day.tasks.length === 1 ? "" : "s"} on this day.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="planner-selected-add planner-selected-plan"
            onClick={onGenerateSchedule}
            disabled={generating}
          >
            <svg width="15" height="15" viewBox="0 0 17 17" fill="none" aria-hidden>
              <path d="M8.5 1.8 9.7 5.7l3.9 1.2-3.9 1.2-1.2 3.9-1.2-3.9-3.9-1.2 3.9-1.2 1.2-3.9Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
            </svg>
            <span>{generating ? "Planning" : "Plan"}</span>
          </button>
        </div>

        <div className="planner-schedule-card" aria-label="Plan for selected day">
          <div className="planner-schedule-head">
            <div>
              <p className="planner-selected-kicker">Plan</p>
              <p className="planner-schedule-subtitle">
                {pendingBlocks.length
                  ? `${pendingBlocks.length} block${pendingBlocks.length === 1 ? "" : "s"} still open.`
                  : "No active blocks yet for this day."}
              </p>
            </div>
          </div>

          {scheduleLoading ? (
            <div className="planner-schedule-empty">Loading the day plan…</div>
          ) : visibleBlocks.length ? (
            <div className="planner-schedule-list">
              {visibleBlocks.map((block) => {
                const isCompleted = block.status === "completed";
                const canComplete = !isCompleted && block.type !== "break";
                return (
                  <article
                    key={block.blockId}
                    className={`planner-schedule-block ${block.type === "break" ? "is-break" : ""} ${isCompleted ? "is-completed" : ""}`.trim()}
                  >
                    <div className="planner-schedule-time">
                      <span>{block.startTime || block.startLabel || "--"}</span>
                      <span>{block.endTime || block.endLabel || "--"}</span>
                    </div>

                    <div className="planner-schedule-main">
                      <div className="planner-schedule-line">
                        <strong>{block.itemTitle || (block.type === "break" ? "Break" : "Scheduled work")}</strong>
                        <span className="planner-schedule-chip">{formatBlockType(block.type)}</span>
                      </div>
                    </div>

                    {!isCompleted && block.type !== "break" ? (
                      <div className="planner-block-actions">
                        <button
                          type="button"
                          className="planner-block-accept"
                          onClick={() => onCompleteBlock(block.blockId)}
                          disabled={completingBlockId === block.blockId}
                          aria-label="Accept block"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                            <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="planner-block-remove"
                          onClick={() => onRemoveBlock(block.blockId)}
                          disabled={removingBlockId === block.blockId}
                          aria-label="Remove block"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    ) : isCompleted ? (
                      <span className="planner-schedule-state">Accepted</span>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="planner-schedule-empty">
              Hit Plan to generate a schedule for this day.
            </div>
          )}
        </div>

        <div className="planner-selected-footer">
          <button type="button" className="planner-selected-add planner-selected-add-late" onClick={onAddTask}>
            New task
          </button>
        </div>
      </div>

      <OverflowSpillway tasks={day.overflowTasks} busy={overflowBusy} onReturnToBacklog={onReturnOverflow} />
    </section>
  );
}
