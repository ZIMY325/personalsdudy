# Learning Path Engine

Standalone, English-language, client-only learning plugin at `/`. No FuturePath,
backend, API, authentication, or database dependency.

## Embed in a parent page

```tsx
import { LearningPathWidget } from './components/learning-path-widget';

<LearningPathWidget
  targetRole="Cybersecurity"
  skillGaps={['Network Security', 'Linux Basics', 'Cryptography']}
  onStateChange={(state) => {
    // Optional: receive completedCourseIds, completedHours, totalHours,
    // and scheduledSessions with actual start/duration/finished fields.
  }}
/>
```

The widget obtains inputs exclusively from props. Import the app's `index.css`
when using it in another frontend. Local component imports use the existing `@/`
alias. Home owns the Target Job Selection inputs and passes their UI through an optional
`devPanel` ReactNode; embedded widgets need not provide it. There is no API call.
The legacy `completedSkillGaps` and `scheduledLessons` callback fields remain
available; use `scheduledSessions` for week and duration information.
`scheduledLessons` also exposes each appointment's `sessionId`, `week` and
`durationHours`, alongside its existing skill/day/hour fields.

## Demo and behavior

- **Overview** is the initial view: role overview and course cards only.
- **Learning Path** provides course completion controls and partial hour progress.
- **Schedule my path** opens **Calendar**, where the user selects a course.
  A card's **Schedule** button preselects that course and opens the scheduling
  dialog. Calendar's **Schedule a course** opens the same single dialog.
- **Target Job Selection** contains job and comma/newline skill inputs, a searchable
  career list, Select this job, and Find matching job.
- Eight career-family seeds generate 80 distinct career titles. Every career
  has at least 10 detailed skills, each mapped to two public learning resources.
- Skill matching is case-insensitive (`toLowerCase`) and supports aliases.
- All resources carry a typed `level`: Beginner, Intermediate or Advanced.
  Generated paths sort in that order, preserving original order within each
  difficulty. Green, blue and purple badges identify the levels on course cards.
  Difficulty is editorial mock metadata, not a provider-issued rating.
- Missing inputs produce no path. Unknown skills produce clearly labeled
  search guidance, never fabricated courses.
- Click a course title to preview it. In Learning Path, the separate circle
  marks the whole course complete/incomplete and synchronizes its sessions.
- Scheduling defaults to **Add one independent session**, with a week, weekday,
  15-minute start time and duration. Each addition has a unique ID and preserves
  all earlier sessions, including those for the same course. Full-duration
  overlaps are rejected, while adjacent sessions are allowed. Adding sessions
  does not change course completion.
- **Split / replan the remaining course** retains the automatic planner.
  Scheduling accepts a start weekday, 15-minute start time, and 0.25–8 hours per
  session in quarter-hour steps. A 4-hour course at 1 hour/session becomes four
  18:00–19:00 sessions on successive days. A non-divisible remainder becomes a
  shorter final block. The sum always equals the remaining course time.
- The planner preserves completed sessions, replaces that course's unfinished
  sessions, and skips days whose proposed time overlaps other sessions.
  Plans ending after 22:00 fail with an explanation; failures are atomic.
- Calendar uses real-duration blocks, Monday–Sunday, 08:00–22:00, with week
  navigation for long courses (up to 52 weeks). Weeks are relative planning
  weeks, not dated events or timezone-aware calendar invitations.
- Marking a session finished immediately updates its course's partial progress
  and the overall completed hours. Overall percentage is hour-weighted.
- **Reset progress** clears completion flags but retains scheduled sessions.
  Removing a session deletes only that appointment. A fully completed course
  stays complete; removing a finished block from an incomplete course adjusts
  its partial hours.

## Persistence

Completion and schedule share the `learning-path-engine:v1` localStorage key
and a normalized role/skill signature. Equivalent casing, spacing, aliases,
duplicate skills and skill order preserve progress. A different role or skill
set clears prior progress and appointments; changing back does not revive them.
Stale node IDs and invalid calendar entries are filtered.
Legacy `{nodeId, day, hour}` reminders migrate to one-hour sessions in week 1,
capped at the course's actual hours and synchronized with saved completion.
New sessions persist IDs, week, day, startMinutes, durationMinutes and completed.
Appointments stored as `{sessionId, nodeId, day, hour, durationHours}` are also
migrated, preserving their IDs and explicit durations. Explicit appointments
are never truncated to course estimates. Duplicate IDs and conflicting stored
sessions are filtered, keeping the first valid entry.

Standalone debug inputs use a separate localStorage key so choosing a non-default
career also survives refresh. Embedded usage never overrides upstream props
with locally stored inputs. Unavailable storage does not prevent in-memory use.

## Resource catalog

The compact career/skill seeds and reusable course supplements cover frontend,
backend, analytics, AI, operations, design, security and mobile development.
They generate career-to-skill-to-course associations without hundreds of
handwritten course objects. Sources are reused across related careers; 1,600+
associations do not mean 1,600 unique courses. Generated entries are demo study
modules backed by public documentation/tutorials, not invented credentials.
Some providers require a free account. Hours are suggested study/practice
estimates, not verified video runtimes or promises of professional competence.

Known frame-blocking providers are labeled **Embedding blocked**. Providers
whose embedding is not enabled in this demo are separately labeled **Open
externally**. Videos use real YouTube embed URLs. Viewers retain sandbox,
referrer-policy, loading/error/timeout handling, and safe external links.
Cross-origin `load` cannot prove successful rendering.

## Checks

- `pnpm --filter @workspace/learning-path-engine run typecheck`
- `PORT=18619 BASE_PATH=/ pnpm --filter @workspace/learning-path-engine run build`
- `pnpm --filter @workspace/scripts exec tsx --tsconfig ../artifacts/learning-path-engine/tsconfig.json --test ../artifacts/learning-path-engine/src/lib/*.test.ts`

The focused checks cover validation, aliases, guidance, totals, profiles,
signature changes, legacy migration, exact splitting, partial progress,
overlaps, overnight rejection, multi-week allocation and persistence.
