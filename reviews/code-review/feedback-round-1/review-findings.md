# Findings: jadorkor-certification-app

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
| instances.list/query/search | `src/assets/AssetService.ts:59` (search), `:69`, `:80`, `:107` (list), `:94` (retrieve). No `instances.query` |
| QueuedTaskRunner / 429 | none |
| any / as any / as unknown as | none in `src/` |
| vi.mock (real) | none (only `vi.mocked(...)` in tests) |
| lint | pass (`npm run lint`, no output) |
| tsc | pass (`npx tsc --noEmit`, no output) |
| CogniteClient / DI / ViewModel | `src/App.test.tsx:70,77` (test only). Context DI: `useAssetBrowserViewModel.ts:35,80`, `hostSync.ts:9`, `assetBrowserStorage.ts:10`. Service interface: `AssetService.ts:15,51` |
| unused files | `src/lib/utils.ts` |
| console.log / debug | none |
| TODO / FIXME / HACK | none |
| useEffect | `src/App.tsx:52-60` (cleanup present; no rejection handling on `connectToHostApp()`) |
| Route definitions | none (single view, no router) |
| Components > 150 lines | `src/assets/AssetDetailPanel.tsx` (157 lines, presentational only). All other production `.tsx` are under 150 lines |
| Fetch UI states | Loading/error/empty handled via `LoadableContent` and `AssetList`/`AssetDetailPanel` empty states |

## Coverage run
- Framework: Vitest 4.1.10 with v8 provider
- Tests: 10 files, 97 passed, 0 failed, 0 skipped
- Lines 97.82% (180/184); statements 97.15%; branches 93.71%; functions 96.84%
- Scope check with explicit `--coverage.include='src/**/*.{ts,tsx}'`: lines 97.29% (180/185). Same result within a few statements.
- Files with no test file: `AssetBrowserStateProvider.tsx`, `assetBrowserStorage.ts`, `useAssetService.ts`, `host/hostSync.ts`, `lib/utils.ts`

## Must / should / nice

### Must Fix
- [ ] `src/lib/utils.ts:1-6` - Unused file (`cn` helper is never imported). Delete it, or import it where it's needed. - criterion 1.5
  - _Impact:_ Dead code adds review and maintenance surface, and the file implies a styling convention (`cn`) that the app does not follow.

### Should Fix
- [ ] `src/App.tsx:52-56` - `connectToHostApp()` has no `.catch`. On failure the app shows "Loading project..." forever and `errorFallback` (lines 32-42) is never rendered. - criterion 1.1
- [ ] `src/App.tsx`, `src/main.tsx` - No ErrorBoundary around the app. A render error blanks the page. - criterion 1.1
- [ ] `src/assets/AssetService.ts:58-66` - Search returns at most 50 results with no `nextCursor` and no "load more" or truncation indicator. Matches beyond 50 are silently missing. - criteria 2.3, 1.1
- [ ] `src/assets/AssetService.ts:107-111` - `listAssetTypes` requests a single page of 1000 with no paging. Types beyond 1000 are silently dropped from the type filter. - criterion 2.3
- [ ] `src/main.tsx:9-14`, `src/assets/useAssetBrowserViewModel.ts:95-120` - No concurrency cap (no `QueuedTaskRunner`/`cdfTaskRunner`) and no explicit 429 handling. TanStack Query's default retry applies, without jitter. - criterion 2.5
- [ ] `package.json` - `react` and `react-dom` are one major behind (18.3.1 vs 19.3.0) in `dependencies`. - criterion 1.3
- [ ] `package.json` - Moderate CVEs in `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `@vitest/mocker` (dev tooling only). Fix: `vitest` 4.1.11 (semver-minor). - criterion 1.3
- [ ] `vitest.config.ts:11-15` - Coverage has no explicit `include: ['src/**/*.{ts,tsx}']`. Scope is implicit, and the coverage table does not list every `src/` file. Set the scope explicitly so the 80% gate is verifiable. - criterion 1.4
- [ ] `src/assets/AssetBrowserStateProvider.tsx`, `src/assets/assetBrowserStorage.ts`, `src/assets/useAssetService.ts`, `src/host/hostSync.ts` - No test files for non-trivial modules (`AssetBrowserStateProvider` holds shared host-synced state). - criterion 1.4
- [ ] `src/` (structure) - No `src/hooks/`, `src/utils/`, or `src/types/` folders. Hooks live in `src/assets/`. File names mix camelCase (`assetBrowserState.ts`) and PascalCase (`AssetList.tsx`) with no kebab-case convention. - criterion 1.5 (`code-quality` Steps 7, 9)

### Nice Fix
- [ ] `src/assets/AssetDetailPanel.tsx` - 157 lines. Presentational only, so the split is optional. Consider extracting the ancestor breadcrumb and the children list. - criterion 1.6
- [ ] Transitive low-severity CVEs in `@cognite/aura` / `@streamdown/mermaid` / `mermaid` / `katex`. Not exploitable in this app's usage as far as the scan shows. - criterion 1.3
