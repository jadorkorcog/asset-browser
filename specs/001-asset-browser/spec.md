# 001 - Asset Browser

## Summary

A read-only app for finding and inspecting industrial assets in Cognite Data Fusion. A user searches or filters the asset hierarchy (about 19,000 assets), opens an asset, and sees its details, where it sits in the hierarchy, and what is directly under it.

The app is built for Flows app certification, so scope is deliberately small and complete: one core workflow, all states handled, state restored from the URL.

## Persona and user story

> Assumption: the persona is inferred from the data (offshore platforms and fields from a regulator source) and should be confirmed in `App-Brief.md`.

**Persona:** an operations or data analyst who needs to find a specific platform or field quickly and understand its context.

**User story:** As an analyst, I want to search the asset hierarchy by name and filter by asset type, so that I can find an asset and see its details and place in the hierarchy without browsing Fusion's full data explorer.

## User scenarios

1. **Search.** The user types part of an asset name or description. Matching assets appear in a paginated list.
2. **Filter by type.** The user selects an asset type (for example Platform). Only assets of that type are listed. Search and type filter combine.
3. **Open an asset.** The user selects a row. A detail panel shows the asset's properties, hierarchy path, and direct children.
4. **Navigate the hierarchy.** From the detail panel the user selects the parent, a path ancestor, or a child to open it.
5. **Share and reload.** Reloading the page or opening a shared link restores the same search, filter, and selected asset.

## Functional requirements

- FR-1: Search matches asset `name` and `description` using server-side search. No client-side filtering over the full set.
- FR-2: The type filter lists the asset types that exist in the project, and filters server-side.
- FR-3: Browsing (no search text) and the children list are paginated with a cursor, with a "Load more" action. Search results come from `instances.search`, which has no cursor, so a search returns a single page of up to 50 matches. Narrow the query to see others.
- FR-3a: Search runs when the user submits (Enter or the Search button), not on every keystroke.
- FR-4: The detail panel shows `name`, `description`, `type`, `tags`, `aliases`, `source` and `sourceContext`.
- FR-5: The detail panel shows the hierarchy `path` as navigable breadcrumbs, resolving each path entry to its name.
- FR-6: The detail panel lists direct children (assets whose `parent` is the selected asset).
- FR-7: Loading, empty, and error states are shown for the list, the type filter, and the detail panel.
- FR-8: The app is read-only. It never writes to CDF.

## Host-synced state

Per `AGENTS.md` section 2, these survive reload and shared links through `syncInternalState` and `initialState`. The view model owns the contract with the host.

| State | Type |
| --- | --- |
| Search query | string |
| Selected asset type | external id or none |
| Selected asset | space and external id, or none |

Local only: text typed in the search box before it is submitted, hover and focus, and in-flight request state.

## Data (Cognite Data Fusion)

### Existing views read

| View | Space | Version | Used for |
| --- | --- | --- | --- |
| `CogniteAsset` | `cdf_cdm` | `v1` | List, search, detail, children, ancestors |
| `CogniteAssetType` | `cdf_cdm` | `v1` | Populate and label the type filter |

### New views needed

None.

### Spaces used

| Space | Contents |
| --- | --- |
| `cdf_cdm` | The `CogniteAsset` and `CogniteAssetType` view definitions (read only) |
| `ecdm_instances` | The asset and asset type instances observed in this project |

Do not hard-code the instance space if avoidable. Restrict queries by view (`hasData`) and treat the space as a filter that can be adjusted in one place.

### Observed data (from a sample of 3 assets)

- About 19,032 `CogniteAsset` instances and 6 `CogniteAssetType` instances.
- Types are nodes in `ecdm_instances`, for example `COGATY-PLTF`.
- `path` runs from root to the asset. `parent` and `root` are direct relations.
- Hierarchy levels seen: root (`CNY-...`), field (`FLD-...`), platform (`PLTF-...`).

### Query approach

- Search: `instances.search` on `CogniteAsset` for ranking, then hydrate the selected asset with `instances.retrieve`.
- Type filter: server-side `equals` filter on the `type` direct relation.
- Children: `instances.list` on `CogniteAsset` filtered by `parent` equal to the selected asset. Use `instances.query` if more relations are needed later.
- Resolving path names: one batched `instances.retrieve` for the path entries.
- Concurrency and retries follow `dm-limits-and-best-practices`.

## Non-functional requirements

- Uses Aura components imported from per-component subpaths.
- Business logic in view models, rendering in components, dependencies injected, services behind interfaces.
- TypeScript strict, no `any`, no `as` casts.
- Tests accompany every module with logic (service, view model, utilities, components).

## Out of scope

Editing assets, time series or file viewing, 3D, charts, and an Atlas/agent integration. These may be added later.

## Acceptance criteria

- Searching for a known name returns that asset; clearing search returns the default list.
- Selecting a type shows only that type; the count of results is consistent with the filter.
- Opening an asset shows its path, parent, and children, and each is clickable.
- Reloading the page restores search, type, and selected asset.
- Each fetch shows a loading state, and failures show an error with no crash.
- An empty result shows an empty state.
- Lint, type check, and tests pass.
