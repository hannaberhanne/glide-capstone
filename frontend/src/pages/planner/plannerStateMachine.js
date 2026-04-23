export const PLANNER_MODES = {
  IDLE: "idle",
  DAY_SELECTED: "day_selected",
  DRAGGING_TASK: "dragging_task",
  OVERFLOW_PRESENT: "overflow_present",
  REDISTRIBUTING_OVERFLOW: "redistributing_overflow",
  ASSIST_PREVIEW: "assist_preview",
  ASSIST_APPLYING: "assist_applying",
  MONTH_TRANSITION: "month_transition",
};

export const PLANNER_EVENT_TYPES = {
  HYDRATE_MONTH: "HYDRATE_MONTH",
  SELECT_DAY: "SELECT_DAY",
  START_DRAG: "START_DRAG",
  HOVER_DROP_TARGET: "HOVER_DROP_TARGET",
  DROP_ON_DAY: "DROP_ON_DAY",
  DROP_TO_BACKLOG: "DROP_TO_BACKLOG",
  CANCEL_DRAG: "CANCEL_DRAG",
  TOGGLE_ASSIST: "TOGGLE_ASSIST",
  LOAD_ASSIST_SUGGESTIONS: "LOAD_ASSIST_SUGGESTIONS",
  ACCEPT_ASSIST_SUGGESTION: "ACCEPT_ASSIST_SUGGESTION",
  REJECT_ASSIST_SUGGESTION: "REJECT_ASSIST_SUGGESTION",
  REDISTRIBUTE_OVERFLOW_REQUEST: "REDISTRIBUTE_OVERFLOW_REQUEST",
  REDISTRIBUTE_OVERFLOW_COMPLETE: "REDISTRIBUTE_OVERFLOW_COMPLETE",
  NAVIGATE_MONTH: "NAVIGATE_MONTH",
  MONTH_TRANSITION_COMPLETE: "MONTH_TRANSITION_COMPLETE",
};

export const createPlannerMachineState = ({
  monthKey,
  selectedDayKey = null,
  selectedDayOverflowCount = 0,
} = {}) => ({
  mode: selectedDayKey ? deriveSelectionMode(selectedDayOverflowCount) : PLANNER_MODES.IDLE,
  monthKey: monthKey || null,
  selectedDayKey,
  selectedDayOverflowCount,
  drag: {
    taskId: null,
    from: null,
    hoverDayKey: null,
  },
  assist: {
    active: false,
    suggestions: [],
    dismissedTaskIds: [],
    acceptedTaskIds: [],
    scope: "selected_day",
  },
  overflow: {
    sourceDayKey: null,
    taskIds: [],
    didConfirm: false,
  },
  locks: {
    pointerLocked: false,
    keyboardLocked: false,
  },
});

export function plannerReducer(state, event) {
  switch (event.type) {
    case PLANNER_EVENT_TYPES.HYDRATE_MONTH:
      return {
        ...state,
        monthKey: event.monthKey,
        selectedDayKey: event.selectedDayKey ?? state.selectedDayKey,
        selectedDayOverflowCount: event.selectedDayOverflowCount ?? state.selectedDayOverflowCount,
        mode: event.selectedDayKey
          ? deriveSelectionMode(event.selectedDayOverflowCount ?? state.selectedDayOverflowCount)
          : state.mode,
      };

    case PLANNER_EVENT_TYPES.SELECT_DAY:
      return {
        ...state,
        selectedDayKey: event.dayKey,
        selectedDayOverflowCount: event.overflowCount ?? 0,
        mode: deriveSelectionMode(event.overflowCount ?? 0),
        drag: resetDrag(),
        assist: state.assist.active ? { ...state.assist, scope: "selected_day" } : state.assist,
        locks: unlockedLocks(),
      };

    case PLANNER_EVENT_TYPES.START_DRAG:
      return {
        ...state,
        mode: PLANNER_MODES.DRAGGING_TASK,
        assist: resetAssist(),
        drag: {
          taskId: event.taskId,
          from: event.from,
          hoverDayKey: null,
        },
        locks: unlockedLocks(),
      };

    case PLANNER_EVENT_TYPES.HOVER_DROP_TARGET:
      if (state.mode !== PLANNER_MODES.DRAGGING_TASK) {
        return state;
      }
      return {
        ...state,
        drag: {
          ...state.drag,
          hoverDayKey: event.dayKey,
        },
      };

    case PLANNER_EVENT_TYPES.DROP_ON_DAY:
      if (state.mode !== PLANNER_MODES.DRAGGING_TASK) {
        return state;
      }
      return {
        ...state,
        selectedDayKey: event.dayKey,
        selectedDayOverflowCount: event.overflowCount ?? 0,
        mode: deriveSelectionMode(event.overflowCount ?? 0),
        drag: resetDrag(),
      };

    case PLANNER_EVENT_TYPES.DROP_TO_BACKLOG:
      if (state.mode !== PLANNER_MODES.DRAGGING_TASK) {
        return state;
      }
      return {
        ...state,
        mode: state.selectedDayKey ? deriveSelectionMode(state.selectedDayOverflowCount) : PLANNER_MODES.IDLE,
        drag: resetDrag(),
      };

    case PLANNER_EVENT_TYPES.CANCEL_DRAG:
      if (state.mode !== PLANNER_MODES.DRAGGING_TASK) {
        return state;
      }
      return {
        ...state,
        mode: state.selectedDayKey ? deriveSelectionMode(state.selectedDayOverflowCount) : PLANNER_MODES.IDLE,
        drag: resetDrag(),
      };

    case PLANNER_EVENT_TYPES.TOGGLE_ASSIST: {
      const nextActive = event.enabled ?? !state.assist.active;
      if (nextActive) {
        return {
          ...state,
          mode: PLANNER_MODES.ASSIST_PREVIEW,
          drag: resetDrag(),
          assist: {
            ...state.assist,
            active: true,
            scope: event.scope || "selected_day",
          },
          locks: {
            pointerLocked: false,
            keyboardLocked: false,
          },
        };
      }
      return {
        ...state,
        mode: state.selectedDayKey ? deriveSelectionMode(state.selectedDayOverflowCount) : PLANNER_MODES.IDLE,
        assist: resetAssist(),
        locks: unlockedLocks(),
      };
    }

    case PLANNER_EVENT_TYPES.LOAD_ASSIST_SUGGESTIONS:
      return {
        ...state,
        mode: PLANNER_MODES.ASSIST_PREVIEW,
        assist: {
          ...state.assist,
          active: true,
          suggestions: event.suggestions || [],
        },
      };

    case PLANNER_EVENT_TYPES.ACCEPT_ASSIST_SUGGESTION:
      return {
        ...state,
        mode: PLANNER_MODES.ASSIST_APPLYING,
        assist: {
          ...state.assist,
          acceptedTaskIds: [...new Set([...state.assist.acceptedTaskIds, event.taskId])],
        },
        locks: {
          pointerLocked: true,
          keyboardLocked: true,
        },
      };

    case PLANNER_EVENT_TYPES.REJECT_ASSIST_SUGGESTION:
      return {
        ...state,
        mode: PLANNER_MODES.ASSIST_PREVIEW,
        assist: {
          ...state.assist,
          dismissedTaskIds: [...new Set([...state.assist.dismissedTaskIds, event.taskId])],
          suggestions: state.assist.suggestions.filter((item) => item.taskId !== event.taskId),
        },
      };

    case PLANNER_EVENT_TYPES.REDISTRIBUTE_OVERFLOW_REQUEST:
      return {
        ...state,
        mode: PLANNER_MODES.REDISTRIBUTING_OVERFLOW,
        overflow: {
          sourceDayKey: event.dayKey,
          taskIds: event.taskIds || [],
          didConfirm: false,
        },
        locks: {
          pointerLocked: true,
          keyboardLocked: true,
        },
      };

    case PLANNER_EVENT_TYPES.REDISTRIBUTE_OVERFLOW_COMPLETE:
      return {
        ...state,
        selectedDayOverflowCount: 0,
        mode: state.selectedDayKey ? PLANNER_MODES.DAY_SELECTED : PLANNER_MODES.IDLE,
        overflow: {
          sourceDayKey: state.overflow.sourceDayKey,
          taskIds: state.overflow.taskIds,
          didConfirm: true,
        },
        locks: unlockedLocks(),
      };

    case PLANNER_EVENT_TYPES.NAVIGATE_MONTH:
      return {
        ...state,
        mode: PLANNER_MODES.MONTH_TRANSITION,
        monthKey: event.monthKey,
        drag: resetDrag(),
        assist: resetAssist(),
        locks: {
          pointerLocked: true,
          keyboardLocked: true,
        },
      };

    case PLANNER_EVENT_TYPES.MONTH_TRANSITION_COMPLETE:
      return {
        ...state,
        mode: state.selectedDayKey ? deriveSelectionMode(state.selectedDayOverflowCount) : PLANNER_MODES.IDLE,
        locks: unlockedLocks(),
      };

    default:
      return state;
  }
}

export function canStartDrag(state) {
  return ![
    PLANNER_MODES.REDISTRIBUTING_OVERFLOW,
    PLANNER_MODES.ASSIST_PREVIEW,
    PLANNER_MODES.ASSIST_APPLYING,
    PLANNER_MODES.MONTH_TRANSITION,
  ].includes(state.mode);
}

export function canEnterAssist(state) {
  return ![
    PLANNER_MODES.DRAGGING_TASK,
    PLANNER_MODES.REDISTRIBUTING_OVERFLOW,
    PLANNER_MODES.MONTH_TRANSITION,
  ].includes(state.mode);
}

export function shouldShowOverflowControls(state) {
  return [PLANNER_MODES.OVERFLOW_PRESENT, PLANNER_MODES.REDISTRIBUTING_OVERFLOW].includes(state.mode);
}

export function getInteractionLocks(state) {
  return {
    pointerLocked:
      state.locks.pointerLocked ||
      [PLANNER_MODES.REDISTRIBUTING_OVERFLOW, PLANNER_MODES.ASSIST_APPLYING, PLANNER_MODES.MONTH_TRANSITION].includes(state.mode),
    keyboardLocked:
      state.locks.keyboardLocked ||
      [PLANNER_MODES.REDISTRIBUTING_OVERFLOW, PLANNER_MODES.ASSIST_APPLYING, PLANNER_MODES.MONTH_TRANSITION].includes(state.mode),
    dragDisabled: !canStartDrag(state),
    assistDisabled: !canEnterAssist(state),
  };
}

export function createPlannerEvent(type, payload = {}) {
  return { type, ...payload };
}

function deriveSelectionMode(overflowCount = 0) {
  return overflowCount > 0 ? PLANNER_MODES.OVERFLOW_PRESENT : PLANNER_MODES.DAY_SELECTED;
}

function resetDrag() {
  return {
    taskId: null,
    from: null,
    hoverDayKey: null,
  };
}

function resetAssist() {
  return {
    active: false,
    suggestions: [],
    dismissedTaskIds: [],
    acceptedTaskIds: [],
    scope: "selected_day",
  };
}

function unlockedLocks() {
  return {
    pointerLocked: false,
    keyboardLocked: false,
  };
}
