import { useEffect, useState } from 'react';
import { Check, Circle, ExternalLink, Loader2, ShieldAlert } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { PathNode } from '@/lib/engine';

type Status = 'loading' | 'loaded' | 'error' | 'timeout';
const TIMEOUT_MS = 12000;

export function NodeViewer({
  node, open, onOpenChange, completed, onToggle,
}: {
  node: PathNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completed: boolean;
  onToggle?: () => void;
}) {
  const embeddable = !!node && !node.isGuidance && node.embedding === 'allowed' && !!node.embedUrl;
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!open || !embeddable) return;
    setStatus('loading');
    const timer = window.setTimeout(() => setStatus(current => current === 'loading' ? 'timeout' : current), TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [open, embeddable, node?.id]);

  if (!node) return null;
  const fallback = node.isGuidance
    ? 'This skill is not in the curated catalog yet. Use the search results in a new window and verify that the resource you choose is free.'
    : node.embedding === 'blocked'
      ? `The provider blocks embedding on other websites. ${node.embeddingNote}`
      : node.embedding === 'external' || !node.embedUrl
        ? `This resource must be viewed on its original website. ${node.embeddingNote}`
        : status === 'error'
          ? 'The embedded resource failed to load.'
          : 'The embedded resource timed out or could not be confirmed.';
  const showFrame = embeddable && status !== 'error' && status !== 'timeout';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-node-viewer" className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-4 overflow-hidden border-card-border bg-card p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-border px-5 pb-4 pt-5 text-left">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{node.skill} · {node.provider} · {node.kind}</p>
          <DialogTitle className="font-display text-xl leading-snug sm:text-2xl">{node.resourceName}</DialogTitle>
          <DialogDescription>{node.estimatedHours} estimated hours · Free. Cross-origin embeds may not report whether content rendered; open externally if needed.</DialogDescription>
        </DialogHeader>
        <div className="relative mx-5 min-h-[260px] flex-1 overflow-hidden rounded-md border border-border bg-muted sm:min-h-[420px]">
          {showFrame ? (
            <>
              {status === 'loading' && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted" aria-live="polite">
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden /><p className="text-sm text-muted-foreground">Loading learning resource…</p>
              </div>}
              <iframe key={node.id} data-testid="iframe-node-viewer" title={node.resourceName} src={node.embedUrl ?? undefined}
                className="absolute inset-0 h-full w-full border-0 bg-card"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen loading="lazy" onLoad={() => setStatus('loaded')} onError={() => setStatus('error')} />
            </>
          ) : (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 p-8 text-center sm:min-h-[420px]">
              <ShieldAlert className="h-8 w-8 text-accent" aria-hidden /><p className="max-w-md text-sm leading-relaxed text-foreground/80">{fallback}</p>
              <a href={node.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Open in new window <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {onToggle
            ? <button type="button" onClick={onToggle} aria-pressed={completed} className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium">
                {completed ? <Check className="h-4 w-4" aria-hidden /> : <Circle className="h-4 w-4" aria-hidden />}
                {completed ? 'Completed · Mark incomplete' : 'Mark as complete'}
              </button>
            : <p className="text-xs text-muted-foreground">Resource library preview · Not counted toward the learning path.</p>}
          <a href={node.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium">
            Open in new window <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
