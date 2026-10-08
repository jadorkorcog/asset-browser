# File inventory: jadorkor-certification-app (round 3)

Reviewed commit: `9ebe21786f24b8e09fa28db4a5c35dbb0c3caba9` (working tree clean at review time).

Changes since round 2: `src/App.tsx` now catches host connection failures and renders `errorFallback`. `src/App.test.tsx` adds a regression test for it. `src/lib/utils.ts` was deleted in commit `24c1bf7`.

Scope: every `.ts`/`.tsx` under `src/` except tests, `dist`, `node_modules`, plus config files.

| File | Structure | Quality | Patterns | Tests | Notes |
| ---- | --------- | ------- | -------- | ----- | ----- |
| `src/main.tsx` | Entry | OK | QueryClient at root | Exempt (bootstrap) | No ErrorBoundary; default query retry |
| `src/App.tsx` | Root shell | OK | Context (`HostSyncContext`), `CogniteSdkProvider`, failure state | `App.test.tsx` | Connect failure now handled (fixed since round 2) |
| `src/App.test.tsx` | Test | OK | Injected deps | n/a | Includes connect-failure regression test |
| `src/assets/AssetBrowserView.tsx` | View | OK | Pure render, VM consumer | `AssetBrowserView.test.tsx` | Good |
| `src/assets/AssetBrowserStateProvider.tsx` | Context provider | OK | Shared state at root | None | Missing test |
| `src/assets/AssetList.tsx` | View | OK | Props only | `AssetList.test.tsx` | Good |
| `src/assets/AssetDetailPanel.tsx` | View | OK | Props only | `AssetDetailPanel.test.tsx` | 157 lines, presentational only |
| `src/assets/AssetSearchBar.tsx` | View | OK | Local draft state only | `AssetSearchBar.test.tsx` | aria-labels present |
| `src/assets/useAssetBrowserViewModel.ts` | ViewModel | OK | DI via `AssetBrowserViewModelContext` | `useAssetBrowserViewModel.test.tsx` | Host sync owned by VM |
| `src/assets/useAssetService.ts` | Hook | OK | Uses `useCogniteSdk()` | None | Missing test |
| `src/assets/AssetService.ts` | Service | OK | Interface `AssetService` + class | `AssetService.test.ts` | Search capped at 50, no paging; types capped at 1000 |
| `src/assets/assetBrowserStorage.ts` | Context | OK | Context hook | None | Missing test |
| `src/assets/assetBrowserState.ts` | Pure util | OK | Type guards, no `as` | `assetBrowserState.test.ts` | Good |
| `src/assets/assetParsing.ts` | Pure util | OK | Type guards | `assetParsing.test.ts` | Good |
| `src/assets/assetTypes.ts` | Types | OK | Types only | Exempt | Good |
| `src/components/LoadableContent.tsx` | Shared component | OK | Generic | `LoadableContent.test.tsx` | Good |
| `src/host/hostSync.ts` | Context | OK | Context hook | None | Trivial, missing test |
| `src/__mocks__/assetFixtures.ts` | Test fixture | OK | Factories | Exempt | Good |

Config inspected: `vitest.config.ts`, `package.json`, `eslint.config.mjs`, `tsconfig.json`.
