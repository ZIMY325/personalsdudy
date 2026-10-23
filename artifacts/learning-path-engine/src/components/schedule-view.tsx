import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { PathNode } from '@/lib/engine';
import type { ScheduleEntry } from '@/hooks/use-learning-path';
import { DAY_START, DAY_END, formatTime } from '@/lib/time-blocking';
import { useLanguage } from '@/components/language-provider';
import type { TranslationValues } from '@/lib/translations';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PX_PER_MIN = 1.5;
const fmtH = (v: number) => (Math.round(v * 100) / 100).toString();

export const hhmm = formatTime;

type Progress = Record<string, { completedHours: number; totalHours: number; percentage: number }>;

export function ScheduleForm({
  nodes, progress, initialNodeId, onAssign,
}: {
  nodes: PathNode[];
  progress: Progress;
  initialNodeId: string | null;
  onAssign: (nodeId: string, day: number, startMinutes: number, sessionHours: number, mode: 'single' | 'course', week: number) => { ok: boolean; error?: string };
}) {
  const { t } = useLanguage();
  const [nodeId, setNodeId] = useState(initialNodeId ?? '');
  const [day, setDay] = useState('0');
  const [time, setTime] = useState('18:00');
  const [hours, setHours] = useState('1');
  const [mode, setMode] = useState<'single' | 'course'>('single');
  const [week, setWeek] = useState('1');
  const [message, setMessage] = useState<{ ok: boolean; text: string; values?: TranslationValues } | null>(null);
  useEffect(() => { if (initialNodeId) setNodeId(initialNodeId); }, [initialNodeId]);

  const node = nodes.find(n => n.id === nodeId);
  const sessionHours = Number(hours);
  const [h, m] = time.split(':').map(Number);
  const start = (h || 0) * 60 + (m || 0);
  const remaining = node ? Math.max(0, (progress[node.id]?.totalHours ?? node.estimatedHours) - (progress[node.id]?.completedHours ?? 0)) : 0;
  const split = useMemo(() => {
    if (!remaining || !(sessionHours >= 0.25 && sessionHours <= 8)) return [];
    const out: number[] = [];
    let left = Math.round(remaining * 100) / 100;
    while (left > 0.001 && out.length < 400) { const s = Math.min(sessionHours, left); out.push(s); left = Math.round((left - s) * 100) / 100; }
    return out;
  }, [remaining, sessionHours]);

  let localError = '';
  if (!(sessionHours >= 0.25 && sessionHours <= 8)) localError = 'Hours per session must be between 0.25 and 8.';
  else if (Math.round(sessionHours * 60) % 15 !== 0) localError = 'Use 0.25-hour steps.';
  else if (start < DAY_START || start + Math.round((mode === 'single' ? sessionHours : Math.min(sessionHours, remaining || sessionHours)) * 60) > DAY_END) localError = 'Sessions must fit between 08:00 and 22:00.';

  return (
    <form data-testid="form-schedule" className="grid min-w-0 content-start gap-4 rounded-lg border border-card-border bg-card p-4 sm:p-5" onSubmit={e => {
      e.preventDefault();
      if (!node) { setMessage({ ok: false, text: 'Select a course to schedule.' }); return; }
      if (localError) { setMessage({ ok: false, text: localError }); return; }
      const res = onAssign(node.id, Number(day), start, sessionHours, mode, Number(week) - 1);
      const count = mode === 'single' ? 1 : split.length;
      setMessage(res.ok ? { ok: true, text: 'Scheduled {count} sessions for {course}.', values: { count, course: node.resourceName } } : { ok: false, text: res.error ?? 'Could not schedule this course.' });
    }}>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('Plan sessions')}</p>
        <h3 className="mt-1 font-display text-lg font-bold">{t('Schedule a course')}</h3>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">{t('Course')}
        <select data-testid="select-course" value={nodeId} onChange={e => { setNodeId(e.target.value); setMessage(null); }} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="" disabled>{t('Select a course')}</option>
          {nodes.map(n => <option key={n.id} value={n.id}>{n.skill} · {n.resourceName}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">{t('Planning mode')}
        <select value={mode} onChange={e => { setMode(e.target.value as 'single' | 'course'); setMessage(null); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="single">{t('Add one independent session')}</option>
          <option value="course">{t('Split / replan the remaining course')}</option>
        </select>
      </label>
      {mode === 'single' && <label className="grid gap-1.5 text-sm font-medium">{t('Week')}
        <input type="number" min={1} max={52} step={1} required value={week}
          onChange={e => { setWeek(e.target.value); setMessage(null); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <label className="grid gap-1.5 text-sm font-medium">{t('Start day')}
          <select data-testid="select-day" value={day} onChange={e => { setDay(e.target.value); setMessage(null); }} className="rounded-md border border-input bg-background px-2 py-2 text-sm">
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{t(d)}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">{t('Start time')}
          <input data-testid="input-time" type="time" required step={900} min="08:00" max="21:45" value={time} onChange={e => { setTime(e.target.value); setMessage(null); }} className="rounded-md border border-input bg-background px-2 py-2 text-sm" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">{t('Hours / session')}
          <input data-testid="input-hours" type="number" required min={0.25} max={8} step={0.25} value={hours} onChange={e => { setHours(e.target.value); setMessage(null); }} className="rounded-md border border-input bg-background px-2 py-2 text-sm" />
        </label>
      </div>
      {node && (
        <div data-testid="text-split-preview" className="rounded-md bg-secondary/70 px-3 py-2.5 text-xs">
          {mode === 'single' ? <p>{t('Add a {hours} h session without moving existing sessions. Overlapping sessions are rejected. Scheduling does not mark a course complete.', { hours: fmtH(sessionHours) })}</p> : remaining <= 0 ? <p>{t('This course is already complete.')}</p> : (
            <>
              <p className="font-semibold">{t('{hours} h remaining · {count} sessions on successive days', { hours: fmtH(remaining), count: split.length })}</p>
              {split.length > 0 && <p className="mt-1 font-mono text-muted-foreground">
                {split.slice(0, 12).map(s => `${fmtH(s)} ${t('h')}`).join(' + ')}{split.length > 12 ? ` + … (${split.length - 12})` : ''} = {fmtH(split.reduce((a, b) => a + b, 0))} {t('h')}
              </p>}
              <p className="mt-1 text-muted-foreground">{t('Finished sessions are kept; unfinished ones are replaced. Occupied days are skipped.')}</p>
            </>
          )}
        </div>
      )}
      {localError && <p role="alert" className="text-sm text-destructive">{t(localError)}</p>}
      {message && <p role={message.ok ? 'status' : 'alert'} data-testid="text-schedule-result" className={`text-sm ${message.ok ? 'text-primary' : 'text-destructive'}`}>{t(message.text, message.values)}</p>}
      <button data-testid="button-assign" type="submit" disabled={!node || (mode === 'course' && remaining <= 0) || !!localError} className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
        {t(mode === 'single' ? 'Add session to calendar' : 'Split remaining course')}
      </button>
    </form>
  );
}

export function CalendarGrid({
  nodes, entries, onToggle, onRemove,
}: {
  nodes: PathNode[];
  entries: ScheduleEntry[];
  onToggle: (sessionId: string) => void;
  onRemove: (sessionId: string) => void;
}) {
  const { t } = useLanguage();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const weeks = Math.max(1, ...entries.map(e => e.week + 1));
  const [week, setWeek] = useState(0);
  useEffect(() => { if (week > weeks - 1) setWeek(weeks - 1); }, [week, weeks]);
  const inWeek = entries.filter(e => e.week === week);
  const scrollRef = useRef<HTMLDivElement>(null);
  const earliest = inWeek.length ? Math.min(...inWeek.map(entry => entry.startMinutes)) : DAY_START;
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (earliest - DAY_START) * PX_PER_MIN - 60);
  }, [week, earliest]);
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START / 60 + i);
  const height = (DAY_END - DAY_START) * PX_PER_MIN;

  return (
    <section aria-labelledby="calendar-heading" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">08:00 – 22:00</p>
          <h3 id="calendar-heading" className="mt-1 font-display text-lg font-bold">{t('Week {week} of {weeks}', { week: week + 1, weeks })}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('{count} sessions total', { count: entries.length })}</span>
          <button data-testid="button-prev-week" type="button" disabled={week === 0} onClick={() => setWeek(w => w - 1)} aria-label={t('Previous week')} className="rounded-md border border-input p-1.5 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <button data-testid="button-next-week" type="button" disabled={week >= weeks - 1} onClick={() => setWeek(w => w + 1)} aria-label={t('Next week')} className="rounded-md border border-input p-1.5 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={scrollRef} className="max-h-[75vh] overflow-auto rounded-lg border border-card-border bg-card">
        <div className="min-w-[820px]">
          <div className="sticky top-0 z-20 grid grid-cols-[56px_repeat(7,1fr)] border-b border-border bg-card">
            <div />
            {WEEKDAYS.map(d => <div key={d} className="border-l border-border px-2 py-2.5 text-center text-xs font-semibold">{t(d.slice(0, 3))}</div>)}
          </div>
          <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height }}>
            <div className="relative">
              {hours.map(h => <span key={h} className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground" style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}>{h > 8 ? hhmm(h * 60) : ''}</span>)}
            </div>
            {WEEKDAYS.map((d, di) => (
              <div key={d} className="relative border-l border-border">
                {hours.map(h => <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }} />)}
                {inWeek.filter(e => e.day === di).map(e => {
                  const n = nodeMap.get(e.nodeId);
                  const top = (e.startMinutes - DAY_START) * PX_PER_MIN;
                  const h = e.durationMinutes * PX_PER_MIN - 1;
                  const label = `${hhmm(e.startMinutes)}–${hhmm(e.startMinutes + e.durationMinutes)}`;
                  return (
                    <div key={e.id} title={`${n?.resourceName ?? t('Course')} · ${label} · ${fmtH(e.durationMinutes / 60)} ${t('h')}${e.completed ? ` · ${t('Finished')}` : ''}`} data-testid={`block-session-${e.id}`} className={`group absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 text-[10px] leading-tight ${e.completed ? 'border-primary/30 bg-primary/25' : 'border-primary/30 bg-primary/10'}`} style={{ top, height: h }}>
                      <p className="font-mono font-semibold text-primary">{label} · {fmtH(e.durationMinutes / 60)} {t('h')}</p>
                      <p className={`mt-0.5 line-clamp-2 pr-8 font-medium ${e.completed ? 'line-through opacity-70' : ''}`}>{n ? n.resourceName : t('Unknown course')}</p>
                      <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                        <button data-testid={`button-toggle-session-${e.id}`} type="button" onClick={() => onToggle(e.id)} aria-pressed={e.completed} aria-label={`${t(e.completed ? 'Mark unfinished' : 'Mark finished')}: ${t(WEEKDAYS[e.day]!)}, ${t('Week')} ${e.week + 1}, ${label}, ${n?.resourceName ?? t('Course')}`}
                          className={`rounded p-0.5 ${e.completed ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-primary'}`}><Check className="h-3 w-3" /></button>
                        <button data-testid={`button-remove-session-${e.id}`} type="button" onClick={() => onRemove(e.id)} aria-label={`${t('Remove session')} ${label}`}
                          className="rounded bg-card p-0.5 text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {entries.length === 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="h-4 w-4" aria-hidden /> {t('No sessions yet. Choose a course in the form to split it across days.')}</p>
      )}
    </section>
  );
}
