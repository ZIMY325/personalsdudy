import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { BookOpen, CalendarDays, Check, Clock, ExternalLink, FileText, HelpCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import { useLearningPath } from '@/hooks/use-learning-path';
import { NodeViewer } from '@/components/node-viewer';
import { CatalogDialog } from '@/components/catalog-dialog';
import { CalendarGrid, ScheduleForm } from '@/components/schedule-view';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { signature, type PathNode } from '@/lib/engine';

export interface LearningPathState {
  targetRole: string;
  skillGaps: string[];
  completedSkillGaps: string[];
  scheduledLessons: Array<{ skill: string; day: number; hour: number }>;
  completedCourseIds: string[];
  completedHours: number;
  totalHours: number;
  scheduledSessions: Array<{ id: string; nodeId: string; skill: string; week: number; day: number; startMinutes: number; durationMinutes: number; completed: boolean }>;
}

export interface LearningPathWidgetProps {
  targetRole: string;
  skillGaps: string[];
  onStateChange?: (state: LearningPathState) => void;
  devPanel?: ReactNode;
}

type Tab = 'overview' | 'path' | 'calendar' | 'dev';
const fmt = (v: number) => String(Number(v.toFixed(2)));

export function LearningPathWidget({ targetRole, skillGaps, onStateChange, devPanel }: LearningPathWidgetProps) {
  const learning = useLearningPath(targetRole, skillGaps);
  const inputSignature = signature({ targetRole, skillGaps });
  const tabId = useId();
  const [tab, setTab] = useState<Tab>('overview');
  const [viewerNode, setViewerNode] = useState<PathNode | null>(null);
  const [catalogNode, setCatalogNode] = useState<PathNode | null>(null);
  const [scheduleNodeId, setScheduleNodeId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState('');
  const completed = new Set(learning.completedIds);
  const changeHandler = useRef(onStateChange);
  const last = useRef('');
  changeHandler.current = onStateChange;
  useEffect(() => {
    setViewerNode(null);
    setCatalogNode(null);
    setScheduleNodeId(null);
    setScheduleOpen(false);
    setScheduleNotice('');
  }, [inputSignature]);

  useEffect(() => {
    if (!changeHandler.current) return;
    const byId = new Map(learning.nodes.map(n => [n.id, n]));
    const next: LearningPathState = {
      targetRole, skillGaps: [...skillGaps],
      completedSkillGaps: [...new Set(learning.nodes.map(node => node.skill))].filter(skill =>
        learning.nodes.filter(node => node.skill === skill).every(node => learning.completedIds.includes(node.id))),
      scheduledLessons: learning.schedule.map(entry => ({
        skill: byId.get(entry.nodeId)?.skill ?? '', day: entry.day, hour: entry.startMinutes / 60,
      })),
      completedCourseIds: [...learning.completedIds],
      completedHours: learning.summary.completedHours, totalHours: learning.summary.totalHours,
      scheduledSessions: learning.schedule.map(e => ({ ...e, skill: byId.get(e.nodeId)?.skill ?? '' })),
    };
    const s = JSON.stringify(next);
    if (s === last.current) return;
    last.current = s;
    changeHandler.current(next);
  }, [learning.completedIds, learning.nodes, learning.schedule, learning.summary.completedHours, learning.summary.totalHours, skillGaps, targetRole]);

  const tabs: Array<[Tab, string]> = [['overview', 'Overview'], ['path', 'Learning Path'], ['calendar', 'Calendar'], ...(devPanel ? [['dev', 'Dev Test'] as [Tab, string]] : [])];
  const openSchedule = (id: string | null) => {
    setScheduleNodeId(id); setTab('calendar');
    if (id) setScheduleOpen(true);
  };
  const errorList = Object.values(learning.errors ?? {}).filter(Boolean) as string[];

  return (
    <div className="min-h-[100dvh]">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <span className="font-display text-lg font-bold tracking-wide">Learning Path Engine</span>
        <CatalogDialog onPreview={setCatalogNode} />
      </header>
      <nav className="mx-auto mt-5 max-w-6xl px-5 sm:px-8" aria-label="Sections">
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map(([id, label]) => (
            <button key={id} id={`${tabId}-${id}`} role="tab" type="button" aria-controls={`${tabId}-panel`} tabIndex={tab === id ? 0 : -1}
              aria-selected={tab === id} data-testid={`tab-${id}`} onClick={() => setTab(id)}
              onKeyDown={event => {
                const index = tabs.findIndex(([key]) => key === id);
                const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft'
                  ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                if (next >= 0) { event.preventDefault(); setTab(tabs[next]![0]); document.getElementById(`${tabId}-${tabs[next]![0]}`)?.focus(); }
              }}
              className={`-mb-px whitespace-nowrap border-b-2 px-2.5 py-2.5 text-xs transition-colors sm:px-4 sm:text-sm ${tab === id ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8">
        {!learning.storageAvailable && (
          <div role="status" className="mb-6 flex gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            Browser storage is unavailable. Progress and schedule changes will not survive a refresh.
          </div>
        )}

        <div role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${tab}`}>
        {tab === 'dev' ? (
          <section className="rise">{devPanel ?? <p className="text-sm text-muted-foreground">No developer panel was provided by the host.</p>}</section>
        ) : !learning.valid ? (
          <div className="rise rounded-lg border border-dashed border-input px-6 py-14 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 font-display text-xl font-bold">Learning path unavailable</h2>
            <ul className="mt-2 space-y-1 text-sm text-destructive" role="alert" data-testid="text-input-errors">
              {(errorList.length ? errorList : ['A target role and at least one skill gap are required.']).map(e => <li key={e}>{e}</li>)}
            </ul>
            {devPanel && <button type="button" onClick={() => setTab('dev')} className="mt-5 rounded-md border border-input px-3 py-2 text-sm hover:border-primary hover:text-primary">Open Dev Test</button>}
          </div>
        ) : tab === 'overview' ? (
          <section className="rise">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Target role</p>
            <h1 data-testid="text-target-role" className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">{targetRole}</h1>
            <div className="mt-5 flex flex-wrap items-end gap-6">
              <Stat label="Complete" value={`${fmt(learning.summary.percentage)}%`} prominent />
              <Stat label="Hours done" value={`${fmt(learning.summary.completedHours)} / ${fmt(learning.summary.totalHours)} h`} />
              <Stat label="Courses" value={`${learning.summary.completedCount}/${learning.nodes.length}`} />
              <button data-testid="button-schedule-path" type="button" onClick={() => openSchedule(null)}
                className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                <CalendarDays className="h-4 w-4" aria-hidden /> Schedule my path
              </button>
            </div>
            <ProgressBar value={learning.summary.percentage} />
            <p className="mt-6 text-xs text-muted-foreground">{learning.nodes.length} learning resources across {new Set(learning.nodes.map(node => node.skill)).size} skill gaps. Career examples include two courses per skill; unknown skills receive search guidance. Public materials are reused where relevant.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {learning.nodes.map(node => {
                const p = learning.courseProgress[node.id];
                return (
                  <article key={node.id} data-testid={`card-course-${node.id}`} className={`flex flex-col rounded-lg border bg-card p-4 ${completed.has(node.id) ? 'border-primary/40' : 'border-card-border'}`}>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">{node.skill}</span>
                    <span className="mt-1 text-[10px] text-muted-foreground">{node.isGuidance ? 'Free · Search guidance' : 'Free resource'}</span>
                    <button type="button" onClick={() => setViewerNode(node)} className="mt-1 text-left font-display font-bold leading-snug hover:text-primary">{node.resourceName}</button>
                    <span className="mt-1 text-xs text-muted-foreground">{node.provider} · {fmt(node.estimatedHours)} h</span>
                    <ProgressBar value={p?.percentage ?? 0} small />
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{fmt(p?.completedHours ?? 0)} / {fmt(p?.totalHours ?? node.estimatedHours)} h</span>
                      <button data-testid={`button-schedule-${node.id}`} type="button" onClick={() => openSchedule(node.id)} className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground">Schedule</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : tab === 'path' ? (
          <section className="rise">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-2xl font-bold">{targetRole} learning path</h2>
              <button type="button" onClick={learning.resetProgress} className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground hover:text-destructive">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset progress
              </button>
            </div>
            <ol className="mt-5 space-y-3">
              {learning.nodes.map((node, index) => {
                const done = completed.has(node.id);
                const p = learning.courseProgress[node.id];
                return (
                  <li key={node.id} className={`flex gap-3 rounded-lg border bg-card p-4 sm:gap-4 ${done ? 'border-primary/40' : 'border-card-border'}`}>
                    <button data-testid={`button-toggle-${node.id}`} type="button" onClick={() => learning.toggle(node.id)} aria-pressed={done} aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${node.resourceName}`}
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs ${done ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-muted-foreground hover:border-primary'}`}>
                      {done ? <Check className="h-4 w-4" aria-hidden /> : String(index + 1).padStart(2, '0')}
                    </button>
                    <button type="button" onClick={() => setViewerNode(node)} className="min-w-0 flex-1 text-left">
                      <span className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-mono uppercase tracking-[0.12em] text-primary">{node.skill}</span>
                        <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-secondary-foreground">Free</span>
                        {node.isGuidance && <span className="inline-flex items-center gap-1 text-accent"><HelpCircle className="h-3 w-3" aria-hidden />Search guidance</span>}
                      </span>
                      <span className={`mt-1 block font-display text-lg font-bold leading-snug ${done ? 'line-through decoration-primary/50' : ''}`}>{node.resourceName}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" aria-hidden />{node.provider}</span>
                        <span className="inline-flex items-center gap-1 font-mono"><Clock className="h-3.5 w-3.5" aria-hidden />{fmt(p?.completedHours ?? 0)} / {fmt(node.estimatedHours)} h · {fmt(p?.percentage ?? 0)}%</span>
                      </span>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button type="button" onClick={() => openSchedule(node.id)} className="rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground">Schedule</button>
                      <a href={node.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary">Open <ExternalLink className="h-3 w-3" aria-hidden /></a>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : (
          <section className="rise grid min-w-0 gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold">Weekly Schedule</h2>
                <p className="mt-1 text-sm text-muted-foreground">Split a course into real study blocks, then mark each session finished to update your path.</p>
              </div>
              <button type="button" data-testid="button-plan-course" onClick={() => { setScheduleNodeId(null); setScheduleOpen(true); }}
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Schedule a course</button>
            </div>
            {scheduleNotice && <p role="status" className="text-sm text-primary">{scheduleNotice}</p>}
            <CalendarGrid key={`calendar:${inputSignature}`} nodes={learning.nodes} entries={learning.schedule} onToggle={learning.toggleSession} onRemove={learning.removeSchedule} />
          </section>
        )}
        </div>
        <footer className="mt-16 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          Study times are estimates, not credentials. Resources are free public materials; account requirements vary by provider. Progress and schedule are stored in this browser.
        </footer>
      </main>

      <NodeViewer node={viewerNode} open={!!viewerNode} onOpenChange={o => !o && setViewerNode(null)}
        completed={!!viewerNode && completed.has(viewerNode.id)} onToggle={() => viewerNode && learning.toggle(viewerNode.id)} />
      <NodeViewer node={catalogNode} open={!!catalogNode} onOpenChange={o => !o && setCatalogNode(null)} completed={false} />
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Plan study sessions</DialogTitle>
            <DialogDescription>Choose a day and time, then set your study hours per session. The whole remaining course will be split automatically.</DialogDescription>
          </DialogHeader>
          <ScheduleForm key={`form:${inputSignature}`} nodes={learning.nodes} progress={learning.courseProgress}
            initialNodeId={scheduleNodeId} onAssign={(nodeId, day, startMinutes, sessionHours) => {
              const result = learning.assign(nodeId, day, startMinutes, sessionHours);
              if (result.ok) { setScheduleNotice('Study sessions saved. Mark a block finished to update course progress.'); setScheduleOpen(false); }
              return result;
            }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgressBar({ value, small = false }: { value: number; small?: boolean }) {
  return (
    <div className={`${small ? 'mt-3 h-1' : 'mt-4 h-1.5'} overflow-hidden rounded-full bg-muted`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="h-full origin-left rounded-full bg-primary transition-transform duration-500" style={{ transform: `scaleX(${Math.min(100, value) / 100})` }} />
    </div>
  );
}

function Stat({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return <div><p className="text-[11px] text-muted-foreground">{label}</p><p className={`font-mono font-semibold tabular-nums ${prominent ? 'text-3xl text-primary' : 'text-lg'}`}>{value}</p></div>;
}
