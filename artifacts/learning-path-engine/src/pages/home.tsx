import { useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  ExternalLink,
  HelpCircle,
  PlayCircle,
  FileText,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { useLearningPath } from '@/hooks/use-learning-path';
import { NodeViewer } from '@/components/node-viewer';
import type { PathNode } from '@/lib/engine';
import { CatalogDialog } from '@/components/catalog-dialog';

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function Home() {
  const lp = useLearningPath();
  const [openNode, setOpenNode] = useState<PathNode | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [catalogNode, setCatalogNode] = useState<PathNode | null>(null);
  const pathRef = useRef<HTMLElement>(null);

  const roleErr = lp.errors.targetRole;
  const skillErr = lp.errors.skillGaps;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lp.generate()) pathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const { totalHours, completedHours, completedCount, percentage } = lp.summary;
  const done = new Set(lp.completedIds);
  const viewerNode = openNode ? lp.nodes.find((n) => n.id === openNode.id) ?? null : null;

  return (
    <div className="min-h-[100dvh]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-6 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="seal flex h-9 w-9 items-center justify-center rounded-sm text-sm font-black">径</span>
          <span className="font-display text-lg font-bold tracking-wide">学习路径引擎</span>
        </div>
        <div className="flex items-center gap-4">
        <CatalogDialog onPreview={(n) => { setCatalogNode(n); }} />
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
          free · no account · self-paced
        </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <section className="rise grid gap-8 pt-10 md:grid-cols-[1.05fr_1fr] md:gap-12 md:pt-14">
          <div>
            <h1 className="font-display text-4xl font-black leading-[1.15] sm:text-5xl">
              缺什么，<br />
              就<span className="text-primary">一站一站</span>补上。
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              写下你想转去的岗位，列出还不会的技能。我们为每个技能挑一份免费、尽量无需注册的入门资源，排成一条可以勾选的路线。
            </p>
            <ul className="mt-6 space-y-2 text-sm text-foreground/75">
              <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />学时是粗略估计，用来排期，不代表证书或能力认证。</li>
              <li className="flex gap-2"><ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />资源全部免费，可在应用内预览，也随时可在新窗口打开。</li>
              <li className="flex gap-2"><HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />未收录的技能会给出搜索指引，并清楚标注。</li>
            </ul>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="relative rounded-lg border border-card-border bg-card p-5 shadow-[0_18px_40px_-24px_hsl(186_62%_20%/0.45)] sm:p-7"
            data-testid="form-path-input"
          >
            {lp.isSample && (
              <span
                data-testid="badge-sample"
                className="seal stamp-in absolute -right-2 -top-3 rounded-sm bg-card px-2 py-0.5 text-xs font-bold"
              >
                示例
              </span>
            )}
            <label htmlFor="target-role" className="block font-mono text-xs font-semibold uppercase tracking-[0.14em]">
              Target Role
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">目标岗位</p>
            <input
              id="target-role"
              data-testid="input-target-role"
              value={lp.role}
              onChange={(e) => lp.setRole(e.target.value)}
              aria-invalid={!!roleErr}
              aria-describedby={roleErr ? 'role-err' : undefined}
              placeholder="例如 Cloud Security Engineer"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 text-[15px] outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive"
            />
            {roleErr && <p id="role-err" role="alert" data-testid="error-target-role" className="mt-1.5 text-sm text-destructive">{roleErr}</p>}

            <label htmlFor="skill-gaps" className="mt-5 block font-mono text-xs font-semibold uppercase tracking-[0.14em]">
              Skill Gaps
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">缺失技能，用逗号或换行分隔</p>
            <textarea
              id="skill-gaps"
              data-testid="input-skill-gaps"
              value={lp.skillsText}
              onChange={(e) => lp.setSkillsText(e.target.value)}
              rows={4}
              aria-invalid={!!skillErr}
              aria-describedby={skillErr ? 'skill-err' : undefined}
              placeholder={'Python, Networking\nCloud'}
              className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-[15px] outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive"
            />
            {skillErr && <p id="skill-err" role="alert" data-testid="error-skill-gaps" className="mt-1.5 text-sm text-destructive">{skillErr}</p>}
            {lp.parsedSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="已识别技能">
                {lp.parsedSkills.map((s) => (
                  <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{s}</span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                data-testid="button-generate-path"
                className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                Generate Path
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </button>
              {!lp.isSample && (
                <button type="button" onClick={lp.loadSample} data-testid="button-load-sample" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> 载入示例
                </button>
              )}
            </div>
            {lp.isSample && (
              <p className="mt-4 text-xs text-muted-foreground" data-testid="text-sample-note">
                当前为演示示例：Cloud Security Engineer。直接修改任一字段即可生成你自己的路线。
              </p>
            )}
          </form>
        </section>

        {!lp.storageAvailable && (
          <div role="status" data-testid="notice-storage" className="mt-8 flex gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            浏览器本地存储不可用（可能处于隐私模式或被禁用），进度仍可使用，但刷新后不会保留。
          </div>
        )}

        <section ref={pathRef} aria-labelledby="path-heading" className="mt-14 scroll-mt-6">
          {lp.valid ? (
            <>
              <div className="flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">your route</p>
                  <h2 id="path-heading" className="mt-1 font-display text-2xl font-bold sm:text-3xl" data-testid="text-path-role">
                    {lp.role.trim()} 学习路线
                  </h2>
                </div>
                <div className="flex items-end gap-6 sm:gap-8">
                  <Stat label="完成度" value={`${fmt(percentage)}%`} testid="text-percentage" big />
                  <Stat label="总学时" value={`${fmt(totalHours)} h`} testid="text-total-hours" />
                  <Stat label="已完成学时" value={`${fmt(completedHours)} h`} testid="text-completed-hours" />
                  <Stat label="节点" value={`${completedCount}/${lp.nodes.length}`} testid="text-completed-count" />
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)} aria-label="学习进度">
                <div className="h-full origin-left rounded-full bg-primary transition-transform duration-700 ease-out" style={{ transform: `scaleX(${percentage / 100})` }} />
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" onClick={lp.resetProgress} disabled={completedCount === 0} data-testid="button-reset-progress" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:hover:text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> 重置进度
                </button>
              </div>

              <ol className="relative mt-6 space-y-4 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-border">
                {lp.nodes.map((node, i) => (
                  <NodeRow
                    key={node.id}
                    node={node}
                    index={i}
                    completed={done.has(node.id)}
                    onToggle={() => lp.toggle(node.id)}
                    onOpen={() => {
                      setOpenNode(node);
                      setViewerOpen(true);
                    }}
                  />
                ))}
              </ol>
            </>
          ) : (
            <div data-testid="empty-path" className="flex flex-col items-center rounded-lg border border-dashed border-input px-6 py-14 text-center">
              <span className="seal mb-4 flex h-12 w-12 items-center justify-center rounded-sm text-lg font-black opacity-60">缺</span>
              <h2 id="path-heading" className="font-display text-xl font-bold">路线暂未生成</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                请填写 Target Role，并在 Skill Gaps 中至少写一项技能。信息完整后路线会自动出现。
              </p>
            </div>
          )}
        </section>

        <footer className="mt-20 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          学时为基于公开课程长度的粗略预估，完成节点不等于获得证书或资质。资源均为免费内容，大多数无需注册即可观看或阅读；进度只保存在你的浏览器中。
        </footer>
      </main>

      <NodeViewer
        node={viewerNode}
        open={viewerOpen && !!viewerNode}
        onOpenChange={setViewerOpen}
        completed={viewerNode ? done.has(viewerNode.id) : false}
        onToggle={() => viewerNode && lp.toggle(viewerNode.id)}
      />
      <NodeViewer
        node={catalogNode}
        open={!!catalogNode}
        onOpenChange={(o) => { if (!o) setCatalogNode(null); }}
        completed={false}
      />
    </div>
  );
}

function Stat({ label, value, testid, big }: { label: string; value: string; testid: string; big?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p data-testid={testid} className={`font-mono font-semibold tabular-nums ${big ? 'text-3xl text-primary' : 'text-lg'}`}>{value}</p>
    </div>
  );
}

function NodeRow({
  node,
  index,
  completed,
  onToggle,
  onOpen,
}: {
  node: PathNode;
  index: number;
  completed: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const KindIcon = node.kind === 'video' ? PlayCircle : FileText;
  return (
    <li className="rise relative flex gap-4" style={{ animationDelay: `${index * 70}ms` }} data-testid={`card-node-${node.id}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={completed}
        aria-label={`${completed ? '标记为未完成' : '标记为已完成'}：${node.requestedSkill}`}
        data-testid={`button-toggle-${node.id}`}
        className={`relative z-10 mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-mono text-sm font-semibold transition-all duration-300 ${
          completed
            ? 'scale-105 border-primary bg-primary text-primary-foreground'
            : 'border-input bg-background text-muted-foreground hover:border-primary hover:text-primary'
        }`}
      >
        {completed ? <Check className="h-5 w-5" aria-hidden /> : String(index + 1).padStart(2, '0')}
      </button>
      <div
        onClick={(event) => {
          if (!(event.target as HTMLElement).closest('button, a')) onOpen();
        }}
        className={`flex-1 cursor-pointer rounded-lg border bg-card p-4 transition-all duration-300 sm:p-5 ${
          completed ? 'border-primary/40 opacity-75' : 'border-card-border hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-20px_hsl(186_62%_20%/0.5)]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-mono uppercase tracking-[0.14em] text-primary">{node.requestedSkill}</span>
          {node.isGuidance && (
            <span data-testid={`badge-guidance-${node.id}`} className="inline-flex items-center gap-1 rounded-sm border border-accent/50 px-1.5 py-0.5 font-medium text-accent">
              <HelpCircle className="h-3 w-3" aria-hidden /> 未收录 · 搜索指引
            </span>
          )}
          <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-secondary-foreground">免费</span>
        </div>
        <h3 className={`mt-1.5 font-display text-lg font-bold leading-snug ${completed ? 'line-through decoration-primary/50' : ''}`}>
          {node.resourceName}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1"><KindIcon className="h-3.5 w-3.5" aria-hidden />{node.provider}</span>
          <span className="inline-flex items-center gap-1 font-mono" data-testid={`text-hours-${node.id}`}><Clock className="h-3.5 w-3.5" aria-hidden />约 {fmt(node.estimatedHours)} h</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onOpen} data-testid={`button-open-${node.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
            打开学习 <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
          <a href={node.url} target="_blank" rel="noopener noreferrer" data-testid={`link-external-${node.id}`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-primary">
            Open in new window <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </li>
  );
}
