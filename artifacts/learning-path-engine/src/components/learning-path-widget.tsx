import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, BookOpen, Check, Clock, ExternalLink, FileText, HelpCircle,
  PlayCircle, RotateCcw, ShieldCheck, TriangleAlert,
} from 'lucide-react';
import { useLearningPath } from '@/hooks/use-learning-path';
import { NodeViewer } from '@/components/node-viewer';
import { CatalogDialog } from '@/components/catalog-dialog';
import { ScheduleDialog, WeeklySchedule } from '@/components/schedule-view';
import type { PathNode } from '@/lib/engine';

export interface LearningPathState {
  targetRole: string;
  skillGaps: string[];
  completedSkillGaps: string[];
  scheduledLessons: Array<{ skill: string; day: number; hour: number }>;
}

export interface LearningPathWidgetProps {
  targetRole: string;
  skillGaps: string[];
  onStateChange?: (state: LearningPathState) => void;
}

const fmt = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);

export function LearningPathWidget({ targetRole, skillGaps, onStateChange }: LearningPathWidgetProps) {
  const learning = useLearningPath(targetRole, skillGaps);
  const [viewerNode, setViewerNode] = useState<PathNode | null>(null);
  const [catalogNode, setCatalogNode] = useState<PathNode | null>(null);
  const [scheduleNode, setScheduleNode] = useState<PathNode | null>(null);
  const pathRef = useRef<HTMLElement>(null);
  const completed = new Set(learning.completedIds);

  useEffect(() => {
    if (!onStateChange) return;
    const byId = new Map(learning.nodes.map(node => [node.id, node]));
    onStateChange({
      targetRole,
      skillGaps: [...skillGaps],
      completedSkillGaps: learning.completedIds.map(id => byId.get(id)?.skill).filter((skill): skill is string => !!skill),
      scheduledLessons: learning.schedule.flatMap(entry => {
        const node = byId.get(entry.nodeId);
        return node ? [{ skill: node.skill, day: entry.day, hour: entry.hour }] : [];
      }),
    });
  }, [learning.completedIds, learning.nodes, learning.schedule, onStateChange, skillGaps, targetRole]);

  function assign(nodeId: string, day: number, hour: number) {
    return learning.assign(nodeId, day, hour);
  }

  return (
    <div className="min-h-[100dvh]">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <a href={import.meta.env.BASE_URL} className="font-display text-lg font-bold tracking-wide text-foreground no-underline">
          Learning Path Engine
        </a>
        <div className="flex items-center gap-4">
          <CatalogDialog onPreview={setCatalogNode} />
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:block">Free · Self-paced</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <section className="rise grid gap-8 pt-10 md:grid-cols-[1fr_auto] md:items-end md:pt-14">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Your next career move, made actionable</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-black leading-tight sm:text-5xl">
              A clear path from <span className="text-primary">skill gaps</span> to progress.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Free public learning resources, a plan you can complete at your own pace, and a weekly schedule that stays saved in this browser.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span><span className="font-semibold">Upstream role:</span> {targetRole || 'Not provided'}</span>
          </div>
        </section>

        {!learning.storageAvailable && (
          <div role="status" className="mt-7 flex gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            Browser storage is unavailable. You can still use the planner, but progress and schedule changes will not survive a refresh.
          </div>
        )}

        <section ref={pathRef} aria-labelledby="path-heading" className="mt-12 scroll-mt-6">
          {learning.valid ? (
            <>
              <div className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Personal learning plan</p>
                  <h2 id="path-heading" className="mt-1 font-display text-2xl font-bold sm:text-3xl">{targetRole} learning path</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{learning.nodes.length} focused learning {learning.nodes.length === 1 ? 'step' : 'steps'}</p>
                </div>
                <div className="flex flex-wrap items-end gap-5 sm:gap-8">
                  <Stat label="Complete" value={`${fmt(learning.summary.percentage)}%`} prominent />
                  <Stat label="Total hours" value={`${fmt(learning.summary.totalHours)} h`} />
                  <Stat label="Completed hours" value={`${fmt(learning.summary.completedHours)} h`} />
                  <Stat label="Lessons" value={`${learning.summary.completedCount}/${learning.nodes.length}`} />
                  <button type="button" onClick={learning.resetProgress} disabled={!learning.completedIds.length && !learning.schedule.length}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground hover:text-destructive disabled:opacity-40">
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
                  </button>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100}
                aria-valuenow={learning.summary.percentage} aria-label="Learning progress">
                <div className="h-full origin-left rounded-full bg-primary transition-transform duration-700" style={{ transform: `scaleX(${learning.summary.percentage / 100})` }} />
              </div>

              <ol className="mt-6 space-y-3">
                {learning.nodes.map((node, index) => (
                  <li key={node.id} className={`rise flex gap-3 rounded-lg border bg-card p-4 transition-all sm:gap-4 sm:p-5 ${completed.has(node.id) ? 'border-primary/40 opacity-80' : 'border-card-border'}`}>
                    <button type="button" onClick={() => learning.toggle(node.id)} aria-pressed={completed.has(node.id)}
                      aria-label={`${completed.has(node.id) ? 'Mark incomplete' : 'Mark complete'}: ${node.skill}`}
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs transition-all ${completed.has(node.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-muted-foreground hover:border-primary'}`}>
                      {completed.has(node.id) ? <Check className="h-4 w-4" aria-hidden /> : String(index + 1).padStart(2, '0')}
                    </button>
                    <button type="button" onClick={() => setViewerNode(node)} className="min-w-0 flex-1 text-left">
                      <span className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-mono uppercase tracking-[0.12em] text-primary">{node.skill}</span>
                        <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-secondary-foreground">Free</span>
                        {node.isGuidance && <span className="inline-flex items-center gap-1 text-accent"><HelpCircle className="h-3 w-3" aria-hidden />Search guidance</span>}
                      </span>
                      <span className={`mt-1.5 block font-display text-lg font-bold leading-snug ${completed.has(node.id) ? 'line-through decoration-primary/50' : ''}`}>{node.resourceName}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" aria-hidden />{node.provider}</span>
                        <span className="inline-flex items-center gap-1 font-mono"><Clock className="h-3.5 w-3.5" aria-hidden />{fmt(node.estimatedHours)} h</span>
                      </span>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button type="button" onClick={() => setScheduleNode(node)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground">
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden /> Schedule
                      </button>
                      <a href={node.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-1 py-1 text-[11px] text-muted-foreground hover:text-primary">
                        Open resource <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </div>
                  </li>
                ))}
              </ol>
              <WeeklySchedule nodes={learning.nodes} entries={learning.schedule} onRemove={learning.removeSchedule} />
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-input px-6 py-14 text-center">
              <BookOpen className="mx-auto h-9 w-9 text-muted-foreground" aria-hidden />
              <h2 id="path-heading" className="mt-4 font-display text-xl font-bold">Learning path unavailable</h2>
              <p className="mt-2 text-sm text-muted-foreground">The upstream integration must provide a target role and at least one skill gap.</p>
            </div>
          )}
        </section>
        <footer className="mt-16 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          Study times are estimates, not credentials. Resources are free public materials; account requirements vary by provider. Completion and schedule data are stored in this browser.
        </footer>
      </main>

      <NodeViewer node={viewerNode} open={!!viewerNode} onOpenChange={open => !open && setViewerNode(null)}
        completed={!!viewerNode && completed.has(viewerNode.id)} onToggle={() => viewerNode && learning.toggle(viewerNode.id)} />
      <NodeViewer node={catalogNode} open={!!catalogNode} onOpenChange={open => !open && setCatalogNode(null)} completed={false} />
      <ScheduleDialog node={scheduleNode} onClose={() => setScheduleNode(null)} onAssign={assign} />
    </div>
  );
}

function Stat({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return <div><p className="text-[11px] text-muted-foreground">{label}</p><p className={`font-mono font-semibold tabular-nums ${prominent ? 'text-3xl text-primary' : 'text-lg'}`}>{value}</p></div>;
}
