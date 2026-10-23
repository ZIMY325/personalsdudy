import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { LearningPathWidget } from '@/components/learning-path-widget';
import { careerProfiles } from '@/lib/resources';

const demo = careerProfiles[0];
const DEMO_INPUT_KEY = 'learning-path-engine:demo-input';

function readDemoInput() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(DEMO_INPUT_KEY) ?? 'null');
    if (saved && typeof saved.targetRole === 'string' && typeof saved.skillsText === 'string') return saved as { targetRole: string; skillsText: string };
  } catch { /* storage optional */ }
  return { targetRole: demo.targetRole, skillsText: demo.skillGaps.join(', ') };
}

export default function Home() {
  const [initial] = useState(readDemoInput);
  const [targetRole, setTargetRole] = useState(initial.targetRole);
  const [skillsText, setSkillsText] = useState(initial.skillsText);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [matchMessage, setMatchMessage] = useState('');
  const skillGaps = useMemo(() => skillsText.split(/[,，\n\r]+/).map(s => s.trim()).filter(Boolean), [skillsText]);
  useEffect(() => {
    try { window.localStorage.setItem(DEMO_INPUT_KEY, JSON.stringify({ targetRole, skillsText })); } catch { /* optional */ }
  }, [targetRole, skillsText]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? careerProfiles.filter(p => p.targetRole.toLowerCase().includes(q) || p.skillGaps.some(s => s.toLowerCase().includes(q))) : careerProfiles;
  }, [query]);

  function apply(id: string) {
    const p = careerProfiles.find(item => item.id === id);
    if (!p) return;
    setTargetRole(p.targetRole);
    setSkillsText(p.skillGaps.join(', '));
  }
  function matchRole() {
    const q = targetRole.trim().toLowerCase();
    const p = careerProfiles.find(item => item.targetRole.toLowerCase() === q) ?? careerProfiles.find(item => item.targetRole.toLowerCase().includes(q) && q);
    if (p) { setSelectedId(p.id); apply(p.id); setMatchMessage(`Matched ${p.targetRole}: ${p.skillGaps.length} skill gaps loaded.`); }
    else setMatchMessage(q ? 'No matching career example. You can still supply custom skill gaps.' : 'Enter a target role to match.');
  }
  const roleError = !targetRole.trim() ? 'Target role is required.' : '';
  const skillError = skillGaps.length === 0 ? 'Enter at least one skill gap.' : '';
  const selected = careerProfiles.find(p => p.id === selectedId);

  const devPanel = (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid content-start gap-4 rounded-lg border border-card-border bg-card p-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Simulated upstream props</p>
          <h2 className="mt-1 font-display text-xl font-bold">Inputs</h2>
        </div>
        <label className="grid gap-1.5 text-sm font-semibold">Target role
          <input data-testid="input-target-role" value={targetRole} onChange={e => setTargetRole(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" />
          {roleError && <span role="alert" className="text-xs font-normal text-destructive">{roleError}</span>}
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">Skill gaps <span className="text-xs font-normal text-muted-foreground">separate with commas or new lines · {skillGaps.length} parsed</span>
          <textarea data-testid="input-skill-gaps" value={skillsText} onChange={e => setSkillsText(e.target.value)} rows={6} className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" />
          {skillError && <span role="alert" className="text-xs font-normal text-destructive">{skillError}</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          <button data-testid="button-match-role" type="button" onClick={matchRole} className="rounded-md border border-input px-3 py-2 text-sm hover:border-primary hover:text-primary">Match role to example</button>
          <button type="button" onClick={() => apply(demo.id)} className="inline-flex items-center gap-1.5 px-2 text-sm text-muted-foreground hover:text-primary"><RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset</button>
        </div>
        {matchMessage && <p role="status" className="text-xs text-muted-foreground">{matchMessage}</p>}
        <p className="border-t border-border pt-3 text-[11px] text-muted-foreground"><code>{'<LearningPathWidget targetRole="..." skillGaps={[...]} />'}</code></p>
      </div>
      <div className="grid content-start gap-3 rounded-lg border border-card-border bg-card p-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{careerProfiles.length} career examples</p>
          <h2 className="mt-1 font-display text-xl font-bold">Examples</h2>
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <input data-testid="input-search-careers" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search roles or skills" className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm" />
        </label>
        <ul className="max-h-72 space-y-1 overflow-y-auto" role="listbox" aria-label="Career examples">
          {filtered.map(p => (
            <li key={p.id}>
              <button type="button" role="option" aria-selected={selectedId === p.id} data-testid={`option-career-${p.id}`} onClick={() => setSelectedId(p.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${selectedId === p.id ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-secondary'}`}>{p.targetRole}</button>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No matching examples.</li>}
        </ul>
        {selected && <p className="text-xs text-muted-foreground">{selected.skillGaps.join(', ')}</p>}
        <button data-testid="button-apply-career" type="button" disabled={!selected} onClick={() => selected && apply(selected.id)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">Apply example</button>
      </div>
    </div>
  );

  return <LearningPathWidget targetRole={targetRole} skillGaps={skillGaps} devPanel={devPanel} />;
}
