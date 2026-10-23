---
name: Learning path independence
description: Product boundary for 学习路径引擎 and resource embedding expectations.
---

学习路径引擎 must remain a standalone, independently presentable demo, not part of FuturePath and not dependent on its API.

**Why:** The user explicitly required this product boundary.

**How to apply:** Keep future learning-path features self-contained; do not integrate FuturePath services or branding without an explicit request.

Keep the product UI in English and keep manual role/skill inputs out of the main experience; the standalone demo's Dev Test tab should simulate upstream data.

**Why:** The user wants this to be an independently embeddable plugin, not another input form in a parent product.

**How to apply:** Preserve the upstream-driven experience when adding features; do not reintroduce prominent manual inputs. The user replaced the collapsed debug panel with a separate Dev Test tab.
