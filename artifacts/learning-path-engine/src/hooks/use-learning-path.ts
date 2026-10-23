import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  generatePath,
  parseSkills,
  signature,
  summarize,
  validateInput,
  type PathInput,
} from '@/lib/engine';

export const STORAGE_KEY = 'learning-path-engine:v1';
export const SAMPLE_ROLE = 'Cloud Security Engineer';
export const SAMPLE_SKILLS = 'Python, Networking, Cloud, Web Security, Kubernetes';

type Saved = {
  targetRole: string;
  skillsText: string;
  signature: string;
  completedIds: string[];
};

type Completion = { sig: string; ids: string[] };

function getStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__lpe_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function readSaved(storage: Storage | null): Saved | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Saved>;
    if (typeof v.targetRole !== 'string' || typeof v.skillsText !== 'string') return null;
    return {
      targetRole: v.targetRole,
      skillsText: v.skillsText,
      signature: typeof v.signature === 'string' ? v.signature : '',
      completedIds: Array.isArray(v.completedIds)
        ? v.completedIds.filter((x): x is string => typeof x === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

function toInput(role: string, skillsText: string): PathInput {
  return { targetRole: role, skillGaps: parseSkills(skillsText) };
}

function isValid(input: PathInput) {
  const e = validateInput(input);
  return !e.targetRole && !e.skillGaps;
}

export function initializeLearningPath() {
  const storage = getStorage();
  const saved = readSaved(storage);
  const role = saved?.targetRole ?? SAMPLE_ROLE;
  const skillsText = saved?.skillsText ?? SAMPLE_SKILLS;
  const input = toInput(role, skillsText);
  const sig = signature(input);
  let ids: string[] = [];
  if (saved && saved.signature === sig && isValid(input)) {
    const valid = new Set(generatePath(input).map((n) => n.id));
    ids = Array.from(new Set(saved.completedIds.filter((id) => valid.has(id))));
  }
  return {
    storageAvailable: storage !== null,
    restored: saved !== null,
    role,
    skillsText,
    completion: { sig, ids } as Completion,
  };
}

export function useLearningPath() {
  const [initial] = useState(initializeLearningPath);
  const [role, setRole] = useState(initial.role);
  const [skillsText, setSkillsText] = useState(initial.skillsText);
  const [completion, setCompletion] = useState<Completion>(initial.completion);
  const [showErrors, setShowErrors] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(initial.storageAvailable);

  const input = useMemo(() => toInput(role, skillsText), [role, skillsText]);
  const sig = useMemo(() => signature(input), [input]);
  const errors = useMemo(() => validateInput(input), [input]);
  const valid = !errors.targetRole && !errors.skillGaps;
  const nodes = useMemo(() => (valid ? generatePath(input) : []), [valid, input]);

  // Any change to the normalized signature wipes completion — permanently.
  const effectiveIds = completion.sig === sig ? completion.ids : [];
  useEffect(() => {
    if (completion.sig !== sig) setCompletion({ sig, ids: [] });
  }, [sig, completion.sig]);

  const completedIds = useMemo(() => {
    const ok = new Set(nodes.map((n) => n.id));
    return effectiveIds.filter((id) => ok.has(id));
  }, [effectiveIds, nodes]);

  const summary = useMemo(() => summarize(nodes, completedIds), [nodes, completedIds]);

  const storageRef = useRef(storageAvailable);
  storageRef.current = storageAvailable;
  useEffect(() => {
    if (!storageRef.current) return;
    const data: Saved = { targetRole: role, skillsText, signature: sig, completedIds };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      setStorageAvailable(false);
    }
  }, [role, skillsText, sig, completedIds]);

  const toggle = useCallback(
    (id: string) => {
      if (!nodes.some((n) => n.id === id)) return;
      setCompletion((c) => {
        const base = c.sig === sig ? c.ids : [];
        return { sig, ids: base.includes(id) ? base.filter((x) => x !== id) : [...base, id] };
      });
    },
    [nodes, sig],
  );

  const generate = useCallback(() => {
    setShowErrors(true);
    return valid;
  }, [valid]);

  const resetProgress = useCallback(() => setCompletion({ sig, ids: [] }), [sig]);

  const loadSample = useCallback(() => {
    setRole(SAMPLE_ROLE);
    setSkillsText(SAMPLE_SKILLS);
    setShowErrors(false);
  }, []);

  return {
    role,
    setRole,
    skillsText,
    setSkillsText,
    parsedSkills: input.skillGaps,
    errors,
    showErrors,
    valid,
    nodes,
    completedIds,
    summary,
    toggle,
    generate,
    resetProgress,
    loadSample,
    storageAvailable,
    restored: initial.restored,
    isSample: role === SAMPLE_ROLE && skillsText === SAMPLE_SKILLS,
  };
}
