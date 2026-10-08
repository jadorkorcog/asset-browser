# jadorkor-certification-app — Flows code review

This document is the platform review for jadorkor-certification-app, conducted as part of the Cognite Flows app certification process.

Reviewed commit: `b8ca8be1c284d581391e7382cfcd07757b205fd9`

Checks performed: `flows-review-checks` (fetched from `cognitedata/builder-skills`) and `code-quality` searches. Hunt results and file inventory are in `review-findings.md`, `review-files.md`, and `review-packages.md` in this folder.

Coverage scope: all `src/**/*.{ts,tsx}` except tests, `main.tsx`, and config. Line coverage 97.8% (Vitest 4.1.10, v8). 97 of 97 tests pass.

## Scores

| Area | Criterion | Score | Notes |
| ---- | --------- | ----- | ----- |
| User & customer | 1.1 Known bugs | 3/5 | No ErrorBoundary. Host connect failure leaves the app spinning. Search silently capped at 50. |
| User & customer | 1.3 Packages | 3/5 | React 18 one major behind. Moderate dev-only CVEs in Vitest. No high or critical CVEs. |
| User & customer | 1.4 Tests & coverage | 4/5 | Honest 97.8% line coverage. Some modules untested. Coverage scope not explicit. |
| User & customer | 1.5 Dead code | 2/5 | Unused `src/lib/utils.ts`. No naming or folder convention. |
| User & customer | 1.6 Patterns & testability | 4/5 | Context DI, `AssetService` interface, ViewModel pattern. No `vi.mock` or `as unknown as`. |
| Cognite services | 2.1 DMS query patterns | 4/5 | Uses `instances.list`/`search`/`retrieve` correctly for browsing. |
| Cognite services | 2.2 Server-side filter | 5/5 | Type and parent filters applied in DMS. Narrow `sources`. |
| Cognite services | 2.3 Limits & pages | 3/5 | Real cursor paging for list and children. Search and asset types silently truncated. |
| Cognite services | 2.4 Call rate | 4/5 | Query caching; search fires only on submit. |
| Cognite services | 2.5 429 backoff | 3/5 | No concurrency cap or explicit 429 handling. TanStack default retry only. |
| Cognite services | 2.6 CDF Raw | N/A | Raw not used. |
| Brand | 3.1 Aura | 4/5 | Aura Button, Card, Search, Select, Alert, Badge, Breadcrumb, EmptyState, Loader. Imports from subpaths. |

## Findings

### Must Fix

- [ ] `src/lib/utils.ts:1-6` — Unused file. `cn()` is never imported. Delete it or use it. — criterion 1.5
  - _Impact:_ Dead code increases review and maintenance cost and suggests a styling helper that the app does not use.

### Should Fix

- [ ] `src/App.tsx:52-56` — `connectToHostApp()` has no rejection handling. The `errorFallback` at `src/App.tsx:32-42` is never shown, so a failed connect leaves "Loading project..." forever. — 1.1
- [ ] `src/App.tsx`, `src/main.tsx` — No ErrorBoundary. A render error blanks the app. — 1.1
- [ ] `src/assets/AssetService.ts:58-66` — Search returns at most 50 results with no paging or truncation message. — 2.3
- [ ] `src/assets/AssetService.ts:107-111` — Asset types fetched in one page of 1000 with no paging. Types beyond 1000 are dropped from the filter. — 2.3
- [ ] `src/main.tsx:9-14`, `src/assets/useAssetBrowserViewModel.ts:95-120` — No concurrency cap or explicit 429 handling. TanStack default retry (no jitter). — 2.5
- [ ] `package.json` — `react` and `react-dom` 18.3.1, one major behind 19.3.0. — 1.3
- [ ] `package.json` — Moderate CVEs in `vitest` and related packages (dev only). Fix: `vitest@4.1.11`. — 1.3
- [ ] `vitest.config.ts:11-15` — No explicit `coverage.include` for `src/**`. Set it so the 80% gate is verifiable. — 1.4
- [ ] `src/assets/AssetBrowserStateProvider.tsx`, `src/assets/assetBrowserStorage.ts`, `src/assets/useAssetService.ts`, `src/host/hostSync.ts` — No test files. — 1.4
- [ ] `src/` structure — No `hooks/`, `utils/`, or `types/` folders. Mixed file naming against `code-quality` conventions. — 1.5

### Nice Fix

- [ ] `src/assets/AssetDetailPanel.tsx` — 157 lines, presentational only. Optional split of breadcrumb and children list. — 1.6
- [ ] Low-severity transitive advisories in `@cognite/aura`, `@streamdown/mermaid`, `mermaid`, `katex`. No safe in-range fix (the audit's suggested fix is a downgrade to 0.1.2). — 1.3

## Path to approval

This review found **1 must-fix item(s)** that block approval. Once the must-fix items are addressed, re-run `flows-code-review`.

### Reviewed commit
`b8ca8be1c284d581391e7382cfcd07757b205fd9`

## Summary

- Must Fix open: 1
- Should Fix open: 10
- Nice Fix open: 2
