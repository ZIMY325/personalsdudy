import { useState } from 'react';
import { BookOpen, ExternalLink, FileText, PlayCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { resources, type Resource } from '@/lib/resources';
import type { PathNode } from '@/lib/engine';

const CATS = ['All', 'Python', 'Networking', 'Cloud', 'Web Security', 'Cybersecurity', 'Front-end', 'Data Analytics', 'Back-end', 'UI/UX'] as const;
const EMBED_LABEL: Record<Resource['embedding'], string> = {
  allowed: 'Embeddable preview',
  blocked: 'Embedding blocked',
  external: 'Open externally',
};

export function CatalogDialog({ onPreview }: { onPreview: (n: PathNode) => void }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const list = cat === 'All' ? resources : resources.filter((r) => r.category === cat);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" data-testid="button-open-catalog" className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
          <BookOpen className="h-4 w-4" aria-hidden /> Resource Library
        </button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-catalog" className="flex max-h-[88dvh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-4 overflow-hidden border-card-border bg-card">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-2xl">Free Resource Library</DialogTitle>
          <DialogDescription>{resources.length} free learning resources. Browse by subject and preview a resource here.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {CATS.map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} data-testid={`filter-${c}`}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${cat === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-primary/15'}`}>
              {c}
            </button>
          ))}
        </div>
        <ul className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1 pb-1">
          {list.map((r) => {
            const Icon = r.kind === 'video' ? PlayCircle : FileText;
            return (
              <li key={r.id} data-testid={`catalog-item-${r.id}`} className="rounded-md border border-border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-mono uppercase tracking-[0.12em] text-primary">{r.category}</span>
                  <span className={`rounded-sm px-1.5 py-0.5 ${r.embedding === 'allowed' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{EMBED_LABEL[r.embedding]}</span>
                </div>
                <p className="mt-1 font-medium leading-snug">{r.resourceName}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                   <Icon className="h-3.5 w-3.5" aria-hidden />{r.provider} · {r.estimatedHours} h · Free
                </p>
                <div className="mt-2 flex gap-2">
                  <button type="button" data-testid={`button-preview-${r.id}`}
                    onClick={() => { setOpen(false); onPreview({ ...r, requestedSkill: r.skill, isGuidance: false }); }}
                     className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground">Preview</button>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-primary">
                    Open in new window <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
