import { resources, type Resource } from './resources';

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
    ...(!normalizeText(input.targetRole) ? { targetRole: '请输入目标岗位 / Target Role is required.' } : {}),
    ...(!input.skillGaps.some(s => normalizeText(s)) ? { skillGaps: '请至少输入一项技能 / At least one skill gap is required.' } : {}),
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
    const resource = resources.find(r => r.skill === canonical);
    if (resource) nodes.push({ ...resource, requestedSkill: requestedSkill.trim(), isGuidance: false });
    else nodes.push({
      id: `guidance:${canonical}`, skill: requestedSkill.trim(),
      requestedSkill: requestedSkill.trim(), isGuidance: true,
      resourceName: `${requestedSkill.trim()} — 免费学习资源指南`,
      provider: 'Google Search', url: `https://www.google.com/search?q=${encodeURIComponent(`${requestedSkill.trim()} free tutorial ${input.targetRole.trim()}`)}`,
      embedUrl: null, estimatedHours: 1, cost: 'Free', kind: 'document',
      category: 'Cloud', embedding: 'external',
      embeddingNote: '资源库暂未收录此技能。这是搜索指南，不是经过审核的课程；请自行确认结果是否免费。预留 1 小时探索。',
    });
  }
  return nodes;
}

export function summarize(nodes: PathNode[], completedIds: readonly string[]) {
  const completed = new Set(completedIds);
  const totalHours = nodes.reduce((sum, node) => sum + node.estimatedHours, 0);
  const completedNodes = nodes.filter(node => completed.has(node.id));
  return {
    totalHours,
    completedHours: completedNodes.reduce((sum, node) => sum + node.estimatedHours, 0),
    completedCount: completedNodes.length,
    percentage: nodes.length ? Math.round(completedNodes.length / nodes.length * 100) : 0,
  };
}
