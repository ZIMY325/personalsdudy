import { useEffect, useState } from 'react';
import { ExternalLink, ShieldAlert, Loader2, Check, Circle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PathNode } from '@/lib/engine';

type Status = 'loading' | 'loaded' | 'error' | 'timeout';
const TIMEOUT_MS = 12000;

export function NodeViewer({
  node,
  open,
  onOpenChange,
  completed,
  onToggle,
}: {
  node: PathNode | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  completed: boolean;
  onToggle?: () => void;
}) {
  const embeddable = !!node && !node.isGuidance && node.embedding === 'allowed' && !!node.embedUrl;
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!open || !embeddable) return;
    setStatus('loading');
    const t = window.setTimeout(() => {
      setStatus((s) => (s === 'loading' ? 'timeout' : s));
    }, TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [open, embeddable, node?.id]);

  if (!node) return null;

  const fallbackReason = node.isGuidance
    ? '这是未收录技能的搜索指引，没有固定课程可嵌入。请在新窗口中查看搜索结果并自行挑选免费资源。'
    : node.embedding === 'blocked'
      ? `该资源提供方禁止在其他网站内嵌显示。${node.embeddingNote}`
      : node.embedding === 'external' || !node.embedUrl
        ? `该文档需在原站点阅读。${node.embeddingNote}`
        : status === 'error'
          ? '内嵌加载失败。'
          : '内嵌加载超时或未能确认显示成功。';

  const showFrame = embeddable && status !== 'error' && status !== 'timeout';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="dialog-node-viewer"
        className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-4 overflow-hidden border-card-border bg-card p-0 sm:rounded-lg"
      >
        <DialogHeader className="border-b border-border px-5 pb-4 pt-5 text-left">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {node.requestedSkill} · {node.provider} · {node.kind === 'video' ? '视频' : '文档'}
          </p>
          <DialogTitle className="font-display text-xl leading-snug sm:text-2xl">
            {node.resourceName}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            预估 {node.estimatedHours} 小时 · 免费{node.isGuidance ? ' · 搜索指引' : ''}。外站内容在沙箱中加载，无法确保每个页面都能正常显示，新窗口打开始终可用。
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-5 min-h-[260px] flex-1 overflow-hidden rounded-md border border-border bg-muted sm:min-h-[420px]">
          {showFrame ? (
            <>
              {status === 'loading' && (
                <div
                  data-testid="status-viewer-loading"
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted"
                  aria-live="polite"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
                  <p className="text-sm text-muted-foreground">正在加载学习内容…</p>
                </div>
              )}
              <iframe
                key={node.id}
                data-testid="iframe-node-viewer"
                title={node.resourceName}
                src={node.embedUrl ?? undefined}
                className="absolute inset-0 h-full w-full border-0 bg-card"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                loading="lazy"
                onLoad={() => setStatus('loaded')}
                onError={() => setStatus('error')}
              />
            </>
          ) : (
            <div
              data-testid="status-viewer-fallback"
              className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 p-8 text-center sm:min-h-[420px]"
            >
              <ShieldAlert className="h-8 w-8 text-accent" aria-hidden />
              <p className="max-w-md text-sm leading-relaxed text-foreground/80">{fallbackReason}</p>
              <a
                href={node.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
                data-testid="link-fallback-open"
              >
                Open in new window <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {onToggle ? (<button
            type="button"
            onClick={onToggle}
            aria-pressed={completed}
            data-testid="button-viewer-toggle"
            className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              completed
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-card hover:border-primary hover:text-primary'
            }`}
          >
            {completed ? <Check className="h-4 w-4" aria-hidden /> : <Circle className="h-4 w-4" aria-hidden />}
            {completed ? '已完成 · 点击撤销' : '标记为已完成'}
          </button>) : (<p className="text-xs text-muted-foreground">资源库预览：不计入当前路线进度。</p>)}
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-viewer-open"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
          >
            Open in new window <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
