import { useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PathNode } from '@/lib/engine';
import type { ScheduleEntry } from '@/hooks/use-learning-path';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:00 ${suffix}`;
}

export function ScheduleDialog({
  node, onClose, onAssign,
}: {
  node: PathNode | null;
  onClose: () => void;
  onAssign: (nodeId: string, day: number, hour: number) => boolean;
}) {
  const [day, setDay] = useState('0');
  const [hour, setHour] = useState('14');
  const [conflict, setConflict] = useState(false);
  return (
    <Dialog open={!!node} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Schedule a study session</DialogTitle>
          <DialogDescription>{node?.resourceName} · {node?.estimatedHours} estimated hours</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={event => {
          event.preventDefault();
          if (node && onAssign(node.id, Number(day), Number(hour))) onClose();
          else setConflict(true);
        }}>
          <label className="grid gap-1.5 text-sm font-medium">
            Day
            <select value={day} onChange={event => setDay(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2">
              {WEEKDAYS.map((weekday, index) => <option key={weekday} value={index}>{weekday}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Start time
            <select value={hour} onChange={event => setHour(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2">
              {HOURS.map(time => <option key={time} value={time}>{formatHour(time)}</option>)}
            </select>
          </label>
          {conflict && <p role="alert" className="text-sm text-destructive">This time slot is already occupied. Choose another time.</p>}
          <button className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" type="submit">
            Add to weekly schedule
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WeeklySchedule({
  nodes, entries, onRemove,
}: {
  nodes: PathNode[];
  entries: ScheduleEntry[];
  onRemove: (nodeId: string) => void;
}) {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  return (
    <section aria-labelledby="weekly-schedule-heading" className="mt-14">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Make time to learn</p>
          <h2 id="weekly-schedule-heading" className="mt-1 font-display text-2xl font-bold sm:text-3xl">Weekly Schedule</h2>
        </div>
        <span className="text-xs text-muted-foreground">{entries.length} scheduled {entries.length === 1 ? 'session' : 'sessions'}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-card-border bg-card">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[84px_repeat(7,minmax(100px,1fr))] border-b border-border bg-muted/60">
            <div className="px-3 py-3 text-xs font-medium text-muted-foreground">Time</div>
            {WEEKDAYS.map(day => <div key={day} className="border-l border-border px-2 py-3 text-center text-xs font-semibold">{day}</div>)}
          </div>
          {HOURS.map(hour => (
            <div key={hour} className="grid min-h-[72px] grid-cols-[84px_repeat(7,minmax(100px,1fr))] border-b border-border last:border-b-0">
              <div className="px-3 py-3 font-mono text-[11px] text-muted-foreground">{formatHour(hour)}</div>
              {WEEKDAYS.map((day, dayIndex) => {
                const entry = entries.find(item => item.day === dayIndex && item.hour === hour);
                const node = entry ? nodeMap.get(entry.nodeId) : null;
                return (
                  <div key={day} className="border-l border-border p-1.5">
                    {node ? (
                      <div className="group relative h-full min-h-[52px] rounded-md border border-primary/20 bg-primary/10 p-2">
                        <p className="line-clamp-2 pr-4 text-[11px] font-semibold leading-snug text-primary">{node.skill}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{node.estimatedHours} h · {node.provider}</p>
                        <button type="button" onClick={() => onRemove(node.id)} aria-label={`Remove ${node.skill} from ${day} at ${formatHour(hour)}`}
                          className="absolute right-1 top-1 rounded p-0.5 text-muted-foreground opacity-60 hover:bg-background hover:text-destructive group-hover:opacity-100">
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </div>
                    ) : <div className="h-full min-h-[52px] rounded-md border border-dashed border-border/70" aria-label={`Available ${day} at ${formatHour(hour)}`} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {entries.length === 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" aria-hidden /> Choose “Schedule” on any learning card to reserve a time.
        </p>
      )}
    </section>
  );
}
