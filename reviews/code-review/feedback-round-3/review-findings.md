# Findings: jadorkor-certification-app (round 3)

Reviewed commit: `9ebe21786f24b8e09fa28db4a5c35dbb0c3caba9`. Working tree clean.

## Config inspected
- Coverage config file(s): `vitest.config.ts` (`coverage.exclude` only; no `coverage.include`)
- Production paths excluded from coverage: none under `src/`. Excluded: `node_modules/`, `dist/`, `.claude/`, `.agents/`, `vitest.setup.ts`, `**/*.config.ts`, `**/*.d.ts`
- Tests excluded from the test run: none beyond Vitest defaults plus `.claude/**` and `.agents/**`

## Searches
| Check | Hits (file:line or none) |
| ----- | ------------------------ |
| ErrorBoundary | none |
| coverage/test exclude | `vitest.config.ts:10,14` (no `src/` production paths excluded) |
| CDF Raw | none |
| instances.list/query/search/retrieve | `src/assets/AssetService.ts:59` (search), `:69`, `:80`, `:107` (list), `:94` (retrieve). No `instances.query` |
| QueuedTaskRunner / cdfTaskRunner / 429 / backoff | none |
| any / as any / as unknown as | none in `src/` |
| vi.mock( | none |
| CogniteClient construction | none outside tests |
| console.log / debug | none |
| TODO / FIXME / HACK | none |
| unused production files | none |
| components > 150 lines (production) | `src/assets/AssetDetailPanel.tsx` (157 lines, presentational only) |
| useEffect | `src/App.tsx` (cleanup present; rejection now handled, `setConnectFailed` path) |
| Route definitions | none (single view) |
| lint | pass (`npm run lint`) |
| tsc | pass (`npx tsc --noEmit`) |

## Coverage run
- Framework: Vitest 4.1.10 with v8 provider
- Tests: 10 files, 98 passed, 0 failed, 0 skipped
- Lines 97.86% (183/187); statements 97.22%; branches 93.25%; functions 96.87%
- Files with no test file: `AssetBrowserStateProvider.tsx`, `assetBrowserStorage.ts`, `useAssetService.ts`, `host/hostSync.ts`

## Round 2 to round 3 changes
- Resolved: Should Fix `src/App.tsx` connect-failure handling. `connectToHostApp()` now has a rejection handler, and `errorFallback` renders. Regression test added in `src/App.test.tsx`.
- Unchanged: all other Should Fix and Nice Fix items.

## Must / should / nice

### Must Fix
None.

### Should Fix
- [ ] `src/App.tsx`, `src/main.tsx` - No ErrorBoundary around the app. - criterion 1.1
- [ ] `src/assets/AssetService.ts:58-66` - Search returns at most 50 results with no `nextCursor` and no "load more" or truncation indicator. - criterion 2.3
- [ ] `src/assets/AssetService.ts:107-111` - `listAssetTypes` requests one page of 1000 with no paging. - criterion 2.3
- [ ] `src/main.tsx:9-14`, `src/assets/useAssetBrowserViewModel.ts:95-120` - No concurrency cap (no `QueuedTaskRunner`/`cdfTaskRunner`) and no explicit 429 handling. TanStack default retry without jitter. - criterion 2.5
- [ ] `package.json` - `react` and `react-dom` 18.3.1, one major behind 19.3.0. - criterion 1.3
- [ ] `package.json` - Moderate CVEs in `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `@vitest/mocker` (dev only). Fix: `vitest@4.1.11`. - criterion 1.3
- [ ] `vitest.config.ts:11-15` - No explicit `coverage.include: ['src/**/*.{ts,tsx}']`. - criterion 1.4
- [ ] `src/assets/AssetBrowserStateProvider.tsx`, `src/assets/assetBrowserStorage.ts`, `src/assets/useAssetService.ts`, `src/host/hostSync.ts` - No test files. - criterion 1.4
- [ ] `src/` structure - No `hooks/`, `utils/`, or `types/` folders. Mixed file naming against `code-quality` conventions. - criterion 1.5

### Nice Fix
- [ ] `src/assets/AssetDetailPanel.tsx` - 157 lines, presentational only. Optional split. - criterion 1.6
- [ ] Low-severity transitive advisories in `@cognite/aura`, `@streamdown/mermaid`, `mermaid`, `katex`. No safe in-range fix. - criterion 1.3
