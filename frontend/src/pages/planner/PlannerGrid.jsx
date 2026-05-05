import DayCell from "./DayCell.jsx";
import SelectedDayPanel from "./SelectedDayPanel.jsx";

export default function PlannerGrid({
  weekdays,
  days,
  selectedDay,
  dragHoverDayKey,
  assistActive,
  draggingDisabled,
  overflowBusy,
  scheduleBlocks,
  scheduleLoading,
  generating,
  completingBlockId,
  removingBlockId,
  onSelectDay,
  onDragStartTask,
  onDragEnd,
  onDragOverDay,
  onDropOnDay,
  onEditTask,
  onCompleteTask,
  onReturnOverflow,
  onAddTask,
  onGenerateSchedule,
  onCompleteBlock,
  onRemoveBlock,
}) {
  return (
    <section className="planner-grid-surface" aria-label="Planning grid">
      <div className="planner-weekdays" aria-hidden>
        {weekdays.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="planner-grid-matrix">
        {days.map((day) => (
          <DayCell
            key={day.key}
            day={day}
            selected={day.key === selectedDay.key}
            dragHover={dragHoverDayKey === day.key}
            assistActive={assistActive}
            draggingDisabled={draggingDisabled}
            onSelect={onSelectDay}
            onDragStartTask={onDragStartTask}
            onDragEnd={onDragEnd}
            onDragOver={(event) => onDragOverDay(event, day)}
            onDrop={(event) => onDropOnDay(event, day)}
            onEditTask={onEditTask}
            onCompleteTask={onCompleteTask}
          />
        ))}
      </div>

      <SelectedDayPanel
        day={selectedDay}
        overflowBusy={overflowBusy}
        scheduleBlocks={scheduleBlocks}
        scheduleLoading={scheduleLoading}
        generating={generating}
        completingBlockId={completingBlockId}
        removingBlockId={removingBlockId}
        draggingDisabled={draggingDisabled}
        onReturnOverflow={onReturnOverflow}
        onAddTask={onAddTask}
        onGenerateSchedule={onGenerateSchedule}
        onCompleteBlock={onCompleteBlock}
        onRemoveBlock={onRemoveBlock}
        onEditTask={onEditTask}
        onCompleteTask={onCompleteTask}
        onDragStartTask={onDragStartTask}
        onDragEnd={onDragEnd}
      />
    </section>
  );
}
