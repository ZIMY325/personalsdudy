---
name: Schedule compatibility
description: Rationale for legacy session duration and separation of scheduling from course completion.
---

Interpret legacy start-only appointments as one-hour study sessions, not reservations for the entire course estimate. Preserve the newer planner's legacy short-course cap when course estimates are available.

**Why:** The old planner reserved only the starting slot, with no duration information. Using the full course estimate would invent reservations and could invalidate neighboring appointments.

**How to apply:** Preserve the existing start time and course completion when interpreting legacy data. Explicit session durations must survive refresh unchanged; the short-course legacy cap must not truncate newer independently scheduled appointments.

Keep adding appointments independent of course completion. Deleting an appointment must not undo full course completion.

**Why:** The user explicitly requires completion to stay course-based when courses are split across sessions.

**How to apply:** Keep the newer main application's partial-session progress and course-level completion controls. Preserve full course completion when deleting a finished block; unfinished appointments are not completed study. Manual appointments append without moving existing sessions; automatic splitting/replanning remains a separate explicit action.
