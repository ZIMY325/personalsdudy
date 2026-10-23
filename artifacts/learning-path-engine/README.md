# 学习路径引擎

Standalone, client-only app at `/`. No FuturePath imports, API calls, backend,
authentication, or database dependency.

## Input contract

`generatePath({ targetRole: string, skillGaps: string[] })` is exported from
`src/lib/engine.ts`. The top-of-page form adapts comma/newline-separated text
to that contract. Valid inputs rebuild automatically; Generate Path also
validates. Invalid inputs return no nodes.

## Demo

The default sample is **Cloud Security Engineer** with Python, Networking,
Cloud, Web Security and Kubernetes.

- Clear either field: inline validation appears and the path disappears.
- Load the sample: 5 nodes, **22 estimated hours**, including unknown-skill
  Kubernetes search guidance.
- Complete Python and Networking: **40%**, **16 / 22 hours**. Toggle either off
  to reverse its contribution. Refresh restores current inputs and progress.
- Change the role or skill set: progress resets. Changing back does not
  revive old completion. Casing, whitespace, aliases and skill ordering are
  normalized; equivalent input is not a new path.
- Open Python: sandboxed YouTube iframe in an accessible dialog.
- Open Cloud or Web Security: explicit non-embeddable fallback.
- Open Kubernetes: guidance with a Google search link; search results are
  not curated and must be checked for free access.
- Open 资源库: all 17 resources and embedding labels. The official Python
  tutorial offers an iframe document example.
- Every viewer has **Open in new window** with `noopener noreferrer`.
- If browser storage is blocked, the app remains usable and warns that
  progress will not persist.

## Link verification

Public resources were requested with redirects followed on **2026-10-23**.
All 17 catalog URLs returned HTTP 200. Both YouTube videos also returned
public oEmbed metadata identifying freeCodeCamp and HTTP 200 from their
actual `/embed/` URLs.

Frame policy observations:

| Provider | Observed embedding policy |
| --- | --- |
| YouTube embed endpoints | Public embed pages, no prohibiting frame header |
| Python documentation | No prohibiting frame response header observed |
| MDN, Docker, OWASP | `X-Frame-Options: DENY` |
| W3Schools | CSP `frame-ancestors` restricts to its own properties |
| Microsoft Learn, AWS, PortSwigger | `X-Frame-Options: SAMEORIGIN` |
| Google Cloud documentation | CSP `frame-ancestors` restricts permitted origins |

Remote policies can change. HTTP/oEmbed checks do not guarantee successful
video playback in every browser, country or network. Cross-origin iframe
`load` does not prove that content rendered; the viewer states this and
always provides the external option, plus loading/error/timeout handling.
Estimated hours include recommended practice; they are not credentials.

## Checks

- Project: `pnpm run typecheck`
- Project build: `PORT=18619 BASE_PATH=/ pnpm run build`
- Engine checks:
  `pnpm --filter @workspace/scripts exec tsx --tsconfig ../artifacts/learning-path-engine/tsconfig.json --test ../artifacts/learning-path-engine/src/lib/engine.test.ts`

Use the app's existing managed workflow for interactive preview.
