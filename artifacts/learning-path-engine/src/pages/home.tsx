import { useMemo, useState } from 'react';
import { ChevronUp, Code2, RotateCcw } from 'lucide-react';
import { LearningPathWidget } from '@/components/learning-path-widget';
import { careerProfiles } from '@/lib/resources';

const demo = careerProfiles[0];

export default function Home() {
  const [targetRole, setTargetRole] = useState(demo.targetRole);
  const [skillsText, setSkillsText] = useState(demo.skillGaps.join(', '));
  const [expanded, setExpanded] = useState(false);
  const skillGaps = useMemo(() => skillsText.split(/[,，\n\r]+/).map(skill => skill.trim()).filter(Boolean), [skillsText]);

  function loadProfile(profileId: string) {
    const profile = careerProfiles.find(item => item.id === profileId);
    if (!profile) return;
    setTargetRole(profile.targetRole);
    setSkillsText(profile.skillGaps.join(', '));
  }

  return (
    <>
      <LearningPathWidget targetRole={targetRole} skillGaps={skillGaps} />
      <details open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}
        className="fixed bottom-3 right-3 z-40 w-[min(25rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-foreground px-4 py-3 text-sm font-semibold text-background [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><Code2 className="h-4 w-4" aria-hidden />Developer Debug Panel</span>
          <ChevronUp className={`h-4 w-4 transition-transform ${expanded ? '' : 'rotate-180'}`} aria-hidden />
        </summary>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Simulate upstream props. The widget receives <code>targetRole</code> and <code>skillGaps</code> directly.
          </p>
          <label className="grid gap-1.5 text-xs font-semibold">
            Sample career
            <select defaultValue={demo.id} onChange={event => loadProfile(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal">
              {careerProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.targetRole}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Target Role
            <input value={targetRole} onChange={event => setTargetRole(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Skill Gaps <span className="font-normal text-muted-foreground">separate with commas or new lines</span>
            <textarea value={skillsText} onChange={event => setSkillsText(event.target.value)} rows={4} className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" />
          </label>
          <button type="button" onClick={() => loadProfile(demo.id)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset demo input
          </button>
          <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
            Embedding: <code>{'<LearningPathWidget targetRole="…" skillGaps={[]} />'}</code>
          </p>
        </div>
      </details>
    </>
  );
}
