import { careerProfiles, resources, type Resource } from './resources';
import { LEVEL_ORDER } from './course-level';

export interface PathInput { targetRole: string; skillGaps: string[] }
export interface PathNode extends Resource { requestedSkill: string; isGuidance: boolean }

export function normalizeText(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

const aliases: Record<string, string[]> = {
  Python: ['py', 'python3', 'python 3', 'python programming', 'python基础', 'python 基础'],
  'Python Lists': ['python list', 'lists', 'python列表', '列表'],
  'Python Functions': ['python function', 'functions', 'python函数', '函数'],
  Networking: ['network', 'networks', 'computer networking', 'computer networks', 'network fundamentals', 'tcp/ip', '网络', '计算机网络', '网络基础'],
  Internet: ['internet basics', '互联网'],
  HTTP: ['https', 'http/https', 'http basics', 'http协议'],
  DNS: ['domain name system', '域名系统'],
  Cloud: ['cloud computing', 'cloud fundamentals', 'cloud basics', '云', '云计算', '云基础'],
  AWS: ['amazon web services', 'amazon cloud'],
  'Google Cloud': ['gcp', 'google cloud platform'],
  Docker: ['containers', 'container', '容器'],
  'Web Security': ['websecurity', 'web-security', 'web application security', 'application security', '网络安全', 'web安全', 'web 安全'],
  OWASP: ['owasp top 10', 'owasp top ten', 'owasp top10'],
  'SQL Injection': ['sqli', 'sql injection attacks', 'sql注入', 'sql 注入'],
  XSS: ['cross-site scripting', 'cross site scripting', '跨站脚本'],
  'Network Security': ['network-security', 'network defense', 'network defence', 'network security fundamentals'],
  'Linux Basics': ['linux', 'linux fundamentals', 'linux commands'],
  Cryptography: ['crypto', 'cryptology'],
  HTML: ['html5'],
  CSS: ['css3', 'cascading style sheets'],
  JavaScript: ['javascript', 'js', 'ecmascript'],
  Git: ['version control', 'git and github'],
  'Web Accessibility': ['web a11y', 'a11y', 'web accessibility'],
  SQL: ['sql basics', 'structured query language'],
  Excel: ['microsoft excel', 'spreadsheets', 'spreadsheet analysis'],
  Statistics: ['statistical analysis', 'probability and statistics'],
  'Data Analysis': ['data analytics', 'data analysis with python'],
  'Node.js': ['node', 'nodejs', 'node js'],
  'REST APIs': ['rest api', 'restful api', 'rest', 'apis'],
  Databases: ['database', 'postgresql', 'postgres', 'relational databases'],
  'Express.js': ['express', 'expressjs', 'express js'],
  'UX Design': ['ux', 'user experience', 'user experience design'],
  Wireframing: ['wireframe', 'wireframes', 'low-fidelity prototyping'],
  Usability: ['usability testing', 'heuristic evaluation'],
  Accessibility: ['inclusive design', 'digital accessibility'],
  React: ['reactjs', 'react.js'],
  Vue: ['vuejs', 'vue.js'],
  Angular: ['angularjs'],
  TypeScript: ['ts'],
  'Next.js': ['nextjs', 'next js'],
  'Machine Learning': ['ml'],
  'Natural Language Processing': ['nlp'],
  'Large Language Models': ['llm', 'llms'],
  'CI/CD': ['cicd', 'continuous integration'],
  'React Native': ['reactnative'],
};
const canonicalNames = new Map<string, string>();
for (const [canonical, alternatives] of Object.entries(aliases)) {
  for (const name of [canonical, ...alternatives]) canonicalNames.set(normalizeText(name), canonical);
}
function canonicalSkill(value: string): string {
  const normalized = normalizeText(value);
  return canonicalNames.get(normalized) ?? normalized;
}

export function parseSkills(value: string): string[] {
  return value.split(/[,，\n\r]+/).map(s => s.trim()).filter(Boolean);
}

// Treat aliases, casing, whitespace, order and duplicate skills as equivalent.
export function signature(input: PathInput): string {
  return JSON.stringify([
    normalizeText(input.targetRole),
    [...new Set(input.skillGaps.filter(s => normalizeText(s)).map(canonicalSkill))].sort(),
  ]);
}

export function validateInput(input: PathInput): { targetRole?: string; skillGaps?: string } {
  return {
    ...(!normalizeText(input.targetRole) ? { targetRole: 'Target Role is required.' } : {}),
    ...(!input.skillGaps.some(s => normalizeText(s)) ? { skillGaps: 'At least one skill gap is required.' } : {}),
  };
}

export function generatePath(input: PathInput): PathNode[] {
  if (Object.keys(validateInput(input)).length) return [];
  const seen = new Set<string>();
  const nodes: PathNode[] = [];
  for (const requestedSkill of input.skillGaps) {
    if (!normalizeText(requestedSkill)) continue;
    const canonical = canonicalSkill(requestedSkill);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const matches = resources.filter(r => r.skill.toLowerCase() === canonical.toLowerCase()).slice(0, 2);
    if (matches.length) nodes.push(...matches.map(resource => ({ ...resource, requestedSkill: requestedSkill.trim(), isGuidance: false })));
    else nodes.push({
      id: `guidance:${canonical}`, skill: requestedSkill.trim(),
      requestedSkill: requestedSkill.trim(), isGuidance: true,
       resourceName: `${requestedSkill.trim()} — Free learning resource guide`,
      provider: 'Google Search', url: `https://www.google.com/search?q=${encodeURIComponent(`${requestedSkill.trim()} free tutorial ${input.targetRole.trim()}`)}`,
      embedUrl: null, estimatedHours: 1, cost: 'Free', level: 'Beginner', kind: 'document',
      category: 'Cloud', embedding: 'external',
       embeddingNote: 'This skill is not yet in the curated catalog. Search results are unreviewed; check that each resource is free. Allow about 1 hour to explore.',
    });
  }
  // Stable sorting preserves the existing input/resource order within a level.
  return nodes.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

export function suggestSkills(targetRole: string): string[] {
  const normalizedRole = targetRole.trim().toLowerCase();
  const profile = careerProfiles.find((item) =>
    item.targetRole.toLowerCase() === normalizedRole ||
    item.id.toLowerCase() === normalizedRole,
  );
  return profile ? [...profile.skillGaps] : [];
}

export function summarize(nodes: PathNode[], completedIds: readonly string[]) {
  const completed = new Set(completedIds);
  const totalHours = nodes.reduce((sum, node) => sum + node.estimatedHours, 0);
  const completedNodes = nodes.filter(node => completed.has(node.id));
  return {
    totalHours,
    completedHours: completedNodes.reduce((sum, node) => sum + node.estimatedHours, 0),
    completedCount: completedNodes.length,
    percentage: totalHours ? Math.round(completedNodes.reduce((sum, node) => sum + node.estimatedHours, 0) / totalHours * 100) : 0,
  };
}
