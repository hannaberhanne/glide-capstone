export default function DashboardRail({
  level,
  nextLevel,
  currentLevelXP,
  xpProgressPct,
  streakCalendar,
  railNote,
  onRailNoteChange,
  xpAnchorRef,
}) {
  const rulerMajorTicks = [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const rulerMinorTicks = [6.25, 18.75, 31.25, 43.75, 56.25, 68.75, 81.25, 93.75];

  return (
    <aside className="today-rail" aria-label="Today details">
      <section className="rail-block rail-level-block" aria-label="Level progress">
        <div className="rail-level-meta">
          <span className="rail-level-chip">Lv. {level}</span>
          <span className="rail-level-xp">{currentLevelXP} XP</span>
          <span className="rail-level-chip rail-level-chip-next">Lv. {nextLevel}</span>
        </div>

        <div
          className="rail-level-ruler"
          style={{ "--ruler-progress": `${xpProgressPct}%` }}
          aria-label={`${currentLevelXP} XP progress to next level`}
        >
          <div className="rail-level-ruler-track" aria-hidden ref={xpAnchorRef}>
            <span className="rail-level-ruler-line" />
            <span className="rail-level-ruler-progress" />
            {rulerMinorTicks.map((tick) => (
              <span
                key={`minor-${tick}`}
                className="rail-level-ruler-tick rail-level-ruler-tick-minor"
                style={{ left: `${tick}%` }}
              />
            ))}
            {rulerMajorTicks.map((tick) => (
              <span
                key={`major-${tick}`}
                className="rail-level-ruler-tick rail-level-ruler-tick-major"
                style={{ left: `${tick}%` }}
              />
            ))}
            <span className="rail-level-ruler-marker" />
          </div>
        </div>

        <div className="rail-calendar" aria-label={`${streakCalendar.previewDays} day streak this month`}>
          <div className="rail-calendar-head">
            <span className="rail-calendar-month">{streakCalendar.monthLabel}</span>
          </div>
          <div className="rail-calendar-weekdays" aria-hidden>
            {streakCalendar.weekdays.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <div className="rail-calendar-grid">
            {streakCalendar.weeks.map((week) => (
              <div
                key={week.key}
                className={`rail-calendar-week ${week.highlighted ? "is-current" : ""}`.trim()}
              >
                {week.days.map((entry) => (
                  <div
                    key={entry.key}
                    className={
                      `rail-calendar-day ${entry.inMonth ? "is-month" : ""} ${entry.previousMonth ? "is-previous-month" : ""} ${entry.nextMonth ? "is-next-month" : ""} ${entry.isToday ? "is-today" : ""} ${entry.isPast ? "is-past" : ""} ${entry.done ? "is-done" : ""} ${entry.streaked ? "is-streak" : ""} ${entry.missed ? "is-missed" : ""} ${entry.banded ? "is-banded" : ""} ${entry.bandStart ? "is-band-start" : ""} ${entry.bandEnd ? "is-band-end" : ""} ${entry.bandSolo ? "is-band-solo" : ""}`.trim()
                    }
                  >
                    <span className="rail-calendar-date">{entry.dateNumber}</span>
                    {(entry.done || entry.streaked) ? (
                      <span
                        className={`rail-calendar-mark rail-calendar-check ${entry.streaked ? "is-streak-check" : ""}`.trim()}
                      >
                        ✓
                      </span>
                    ) : null}
                    {!entry.done && !entry.streaked && (entry.missed || entry.crossedOut) ? (
                      <span className="rail-calendar-mark rail-calendar-miss">×</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rail-note-block" aria-label="Quick notes">
        <div className="rail-note">
          <textarea
            className="rail-note-input"
            value={railNote}
            onChange={(event) => onRailNoteChange(event.target.value)}
            placeholder="Ideas, reminders, loose ends."
            aria-label="Quick notes"
          />
        </div>
      </section>
    </aside>
  );
}
