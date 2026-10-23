export type Category = 'Python' | 'Networking' | 'Cloud' | 'Web Security';

export interface Resource {
  id: string;
  skill: string;
  resourceName: string;
  provider: string;
  url: string;
  embedUrl: string | null;
  estimatedHours: number;
  cost: 'Free';
  kind: 'video' | 'document';
  category: Category;
  embedding: 'allowed' | 'blocked' | 'external';
  embeddingNote: string;
}

// Public URLs and response frame policies checked 2026-10-23.
// Hours include suggested study/practice time, not just video runtime.
const doc = (
  id: string, skill: string, resourceName: string, provider: string,
  url: string, estimatedHours: number, category: Category,
  framePolicy = '网站通过 X-Frame-Options 或 CSP 禁止第三方嵌入。',
): Resource => ({
  id, skill, resourceName, provider, url, estimatedHours, category,
  embedUrl: null, cost: 'Free', kind: 'document', embedding: 'blocked',
  embeddingNote: framePolicy,
});

const video = (
  id: string, skill: string, resourceName: string,
  youtubeId: string, estimatedHours: number, category: Category,
): Resource => ({
  id, skill, resourceName, provider: 'freeCodeCamp',
  url: `https://www.youtube.com/watch?v=${youtubeId}`,
  embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
  estimatedHours, category, cost: 'Free', kind: 'video', embedding: 'allowed',
  embeddingNote: 'YouTube 公开嵌入播放器；地区、浏览器或发布者设置可能影响播放。',
});

export const resources: readonly Resource[] = [
  video('python-video', 'Python', 'Learn Python — Full Course for Beginners', 'rfscVS0vtbw', 6, 'Python'),
  {
    ...doc('python-official', 'Python', 'The Python Tutorial', 'Python Software Foundation',
      'https://docs.python.org/3/tutorial/', 8, 'Python'),
    embedUrl: 'https://docs.python.org/3/tutorial/',
    embedding: 'allowed',
    embeddingNote: '检查时未发现禁止嵌入的响应头；如果浏览器无法显示，请在新窗口打开。',
  },
  doc('python-w3', 'Python', 'Python Tutorial', 'W3Schools', 'https://www.w3schools.com/python/', 5, 'Python'),
  doc('python-lists', 'Python Lists', 'Python Lists', 'W3Schools', 'https://www.w3schools.com/python/python_lists.asp', 1, 'Python'),
  doc('python-functions', 'Python Functions', 'Python Functions', 'W3Schools', 'https://www.w3schools.com/python/python_functions.asp', 1.5, 'Python'),
  video('networking-video', 'Networking', 'Computer Networking — Network Engineering', 'qiQR5rTSshw', 10, 'Networking'),
  doc('internet-mdn', 'Internet', 'How does the Internet work?', 'MDN Web Docs',
    'https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/How_does_the_Internet_work', 1, 'Networking'),
  doc('http-mdn', 'HTTP', 'An overview of HTTP', 'MDN Web Docs',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview', 2, 'Networking'),
  doc('dns-mdn', 'DNS', 'DNS — Domain Name System', 'MDN Web Docs',
    'https://developer.mozilla.org/en-US/docs/Glossary/DNS', 0.5, 'Networking'),
  doc('cloud-ms', 'Cloud', 'Describe cloud computing', 'Microsoft Learn',
    'https://learn.microsoft.com/en-us/training/modules/describe-cloud-compute/', 2, 'Cloud'),
  doc('aws-overview', 'AWS', 'Overview of Amazon Web Services', 'AWS',
    'https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html', 3, 'Cloud'),
  doc('gcp-overview', 'Google Cloud', 'Google Cloud overview', 'Google Cloud',
    'https://docs.cloud.google.com/docs/overview', 2, 'Cloud'),
  doc('docker-start', 'Docker', 'Get started with Docker', 'Docker',
    'https://docs.docker.com/get-started/', 4, 'Cloud'),
  doc('security-mdn', 'Web Security', 'Web security', 'MDN Web Docs',
    'https://developer.mozilla.org/en-US/docs/Web/Security', 3, 'Web Security'),
  doc('owasp-top-ten', 'OWASP', 'OWASP Top 10', 'OWASP',
    'https://owasp.org/projects/top-ten', 3, 'Web Security'),
  doc('sql-injection', 'SQL Injection', 'SQL injection', 'PortSwigger Web Security Academy',
    'https://portswigger.net/web-security/sql-injection', 3, 'Web Security'),
  doc('xss-academy', 'XSS', 'Cross-site scripting (XSS)', 'PortSwigger Web Security Academy',
    'https://portswigger.net/web-security/cross-site-scripting', 3, 'Web Security'),
];
