# Flows App Playbook

A standalone manual for building Cognite Data Fusion "Flows" (custom) apps, and for understanding and querying the data they run on. It is written from the experience of building an Asset Browser app, but it does not depend on any project: all the code you need is in this file.

You can copy this file anywhere, open it in any Markdown viewer, or print it to PDF.

> **How to read the confidence markers**
>
> - Statements without a marker were verified while building the example app (builds, tests and the installed package type definitions agreed with them).
> - **Verify:** means I believe it is right but did not confirm it against your SDK version or project. Check the type definitions or the API reference before relying on it.
> - Cognite's product and SDK change. When this file and the official docs disagree, trust the docs.

---

## Contents

**Part A. Foundations**

1. [What a Flows app is](#1-what-a-flows-app-is)
2. [Local setup and daily commands](#2-local-setup-and-daily-commands)
3. [The build workflow](#3-the-build-workflow)

**Part B. Understanding your project's data** 4. [Data modeling concepts](#4-data-modeling-concepts) 5. [Reconnaissance: a repeatable way to explore a project](#5-reconnaissance-a-repeatable-way-to-explore-a-project) 6. [Reading a view definition](#6-reading-a-view-definition) 7. [The Cognite core data model in practice](#7-the-cognite-core-data-model-in-practice) 8. [Building a data dictionary](#8-building-a-data-dictionary)

**Part C. Querying data** 9. [Choosing the right call](#9-choosing-the-right-call) 10. [Query cookbook](#10-query-cookbook) 11. [Graph traversal with `instances.query`](#11-graph-traversal-with-instancesquery) 12. [Debugging queries](#12-debugging-queries) 13. [Limits, pagination, performance](#13-limits-pagination-performance)

**Part D. Building the app** 14. [Architecture](#14-architecture) 15. [Starter kit: full reference code](#15-starter-kit-full-reference-code) 16. [Host integration and URL state](#16-host-integration-and-url-state) 17. [Testing](#17-testing) 18. [TypeScript rules](#18-typescript-rules) 19. [React gotchas](#19-react-gotchas) 20. [Aura design system](#20-aura-design-system)

**Part E. Shipping** 21. [Troubleshooting log](#21-troubleshooting-log) 22. [Certification checklist](#22-certification-checklist) 23. [Git and commits](#23-git-and-commits) 24. [Practice exercises](#24-practice-exercises) 25. [References](#25-references)

---

# Part A. Foundations

## 1. What a Flows app is

A Flows app is a React single-page app that runs inside Fusion in an iframe.

| Piece       | Package            | Role                                                                                                                            |
| ----------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Host        | Fusion itself      | Owns auth, the URL, navigation, sidebar and topbar                                                                              |
| App SDK     | `@cognite/app-sdk` | Connects your app to the host (`connectToHostApp`) and provides an authenticated client (`CogniteSdkProvider`, `useCogniteSdk`) |
| Cognite SDK | `@cognite/sdk`     | JavaScript client for CDF APIs (data modeling, time series, files, ...)                                                         |
| UI kit      | `@cognite/aura`    | Cognite's design system (components and tokens)                                                                                 |

Typical stack: React, TypeScript, Vite, Tailwind, TanStack Query, Vitest.

Principles:

- The app is mostly a view over CDF data, usually data model instances.
- Never hard-code the cluster, project, or token. They come from the host or SDK client.
- The host owns the URL. Anything a user would expect to survive a reload or a shared link must be pushed to the host (section 16).

Docs: <https://docs.cognite.com/cdf/flows>

## 2. Local setup and daily commands

New apps are usually started from Fusion's **Custom apps, Start building** flow, which gives you a template and a prompt.

```bash
npm install
npm start          # Vite dev server on https://localhost:3001
```

`npm start` prints a **Fusion link**. Open the app through that link. Opening `https://localhost:3001` directly usually fails, because the app expects Fusion to embed it and provide authentication.

### HTTPS certificates

If the terminal says "Using basic self-signed SSL certificate":

```bash
brew install mkcert
mkcert -install                         # trusts the local CA, may ask for your password
npx @cognite/cli apps setup-https       # Cognite's helper
```

Restart the dev server and fully restart the browser.

### Commands you will use daily

| Command                                      | Purpose                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `npm start`                                  | Dev server                                                              |
| `npx vitest run`                             | Run all tests once                                                      |
| `npx vitest`                                 | Watch mode while coding                                                 |
| `npx tsc --noEmit`                           | Type check only                                                         |
| `npm run lint`                               | ESLint. `npx eslint --fix src --ext .ts,.tsx` fixes style automatically |
| `npm run build`                              | Production build                                                        |
| `npx @cognite/cli apps deploy --interactive` | Deploy to Fusion                                                        |
| `npx @cognite/cli apps submit`               | Prepare a certification submission                                      |

Run this gate before every commit:

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

### Dependency pitfalls (both happened)

- **Aura version.** Per-component imports such as `@cognite/aura/components/card` need a recent Aura (0.3.x worked). Version 0.1.2 had no such subpaths and failed with `Missing "./components/card" specifier`.
- **Vitest family.** `vitest`, `@vitest/ui`, and `@vitest/coverage-v8` must have identical versions. Bumping only one gives `ERESOLVE` peer dependency errors.

When an import fails, read the installed package's `exports` in `node_modules/<pkg>/package.json` before assuming your code is wrong.

## 3. The build workflow

The order is the cheapest way to avoid rework:

```
1. Spec       what and why, data used, state, acceptance criteria
2. Discover   inspect the real data: what exists, how much, which space
3. Types      your own domain types
4. Tests      write them before the code
5. Service    interface plus implementation, the only code that talks to CDF
6. State      storage layer plus view model: state, loading, errors, URL sync
7. UI         components that only render
8. Reviews    code review, design review
9. Submit
```

### A spec template

```markdown
# NNN - Feature name

## Summary

## Persona and user story

## User scenarios (numbered, one behaviour each)

## Functional requirements (FR-1, FR-2, ...)

## Host-synced state (table: state, type)

## Data

### Existing views read (view, space, version, what for)

### New views needed

### Spaces used (definition space vs instance space)

### Query approach (list vs search vs query, filters, pagination)

## Non-functional requirements

## Out of scope

## Acceptance criteria
```

The Data section is the one people skip, and the one that prevents the most surprises. Tool: [github/spec-kit](https://github.com/github/spec-kit).

---

# Part B. Understanding your project's data

## 4. Data modeling concepts

CDF data modeling ("DMS") is a graph of typed instances.

| Term                        | Meaning                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Space**                   | A namespace. Both definitions and instances live in spaces. Access control is usually per space                       |
| **Container**               | Physical storage: defines properties, types, constraints and indexes                                                  |
| **View**                    | A named, versioned selection of container properties. **This is what you query through.** Can `implement` other views |
| **Data model**              | A named, versioned group of views that belong together                                                                |
| **Node**                    | An instance (an asset, a pump, a work order)                                                                          |
| **Edge**                    | A relationship instance between two nodes. It has a type and can carry properties                                     |
| **Direct relation**         | A property whose value is `{ space, externalId }` pointing at another node                                            |
| **Reverse direct relation** | A view property that finds nodes pointing at this one, with no data stored on this side                               |
| **`instanceType`**          | `'node'` or `'edge'`                                                                                                  |

### Four things that confuse everyone

1. **Definition space is not instance space.** A view defined in `cdf_cdm` can have instances stored in your own space such as `my_instances`. Querying the view finds instances across spaces you can read.
2. **A model existing does not mean it has data.** Always count (section 5).
3. **A view is a lens.** The same node can appear through several views. Property values come back grouped by view: `properties[viewSpace]['ViewExternalId/version'].propertyName`.
4. **Interface views overlap.** If every type implements `Describable`, then `Describable` has a huge count that is just the sum of its implementers. Count concrete types, not interfaces.

Docs: <https://docs.cognite.com/cdf/dm/> (**Verify:** the exact page path) and the API reference at <https://developer.cognite.com/api>.

## 5. Reconnaissance: a repeatable way to explore a project

Use this routine at the start of every project. It answers: what models exist, which ones have data, what the data looks like, and where it is stored.

### Step 1. List spaces

```ts
const spaces = await client.spaces.list({ includeGlobal: true, limit: 1000 });
spaces.items.forEach((s) => console.log(s.space, s.name ?? ""));
```

Look for project-specific spaces (not `cdf_*` or `cog_*` global ones). Those usually hold your real definitions and instances.

### Step 2. List data models

```ts
const models = await client.dataModels.list({
  limit: 1000,
  includeGlobal: true,
});
for (const m of models.items) {
  console.log(
    `${m.space} / ${m.externalId} ${m.version}  (${m.views?.length ?? 0} views)`,
  );
}
```

REST equivalent:

```http
GET {baseUrl}/api/v1/projects/{project}/models/datamodels?limit=1000&includeGlobal=true
Authorization: Bearer <token>
```

**Verify:** `client.dataModels.retrieve(ids, { inlineViews: true })` returns a model with full view definitions inline. Check the type definitions in your SDK version.

### Step 3. Count instances per view

Counting is the single most useful reconnaissance step.

```ts
type ViewRef = { space: string; externalId: string; version: string };

async function countInstances(
  client: CogniteClient,
  view: ViewRef,
): Promise<number> {
  const res = await client.instances.aggregate({
    view: { type: "view", ...view },
    aggregates: [{ count: { property: "externalId" } }],
  });
  return (
    res.items[0]?.aggregates.find((a) => a.aggregate === "count")?.value ?? 0
  );
}
```

Run counts for all views in a model with **bounded concurrency** (about 4 at a time). Firing a hundred at once invites HTTP 429:

```ts
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}
```

A real result from one project (the core model, 34 views, only 12 had data):

```
CogniteDescribable 139,334   <- interface: sum of implementers, ignore
CogniteAsset        19,032
CogniteEquipment    12,306
CogniteTimeSeries   11,960
CogniteActivity     10,133
CogniteFile             47
CogniteAssetType         6
```

### Step 4. Pull a raw sample

```ts
const sample = await client.instances.list({
  instanceType: "node",
  sources: [
    {
      source: {
        type: "view",
        space: "cdf_cdm",
        externalId: "CogniteAsset",
        version: "v1",
      },
    },
  ],
  limit: 3,
});
console.log(JSON.stringify(sample.items, null, 2));
```

Read the sample for: the **instance space** (`item.space`), the nesting of `properties`, which properties are actually populated, and the shape of relations. A real sample revealed that instances lived in a project space while the view came from the core space, and that `parent`, `type`, `root` and `path` were `{ space, externalId }` objects.

### Step 5. Profile the interesting properties

- **Which values exist?** Group by a property to list distinct values and counts:

```ts
const byType = await client.instances.aggregate({
  view: {
    type: "view",
    space: "cdf_cdm",
    externalId: "CogniteAsset",
    version: "v1",
  },
  groupBy: ["type"],
  aggregates: [{ count: { property: "externalId" } }],
  limit: 100,
});
// each item: { group: { type: { space, externalId } }, aggregates: [...] }
```

`groupBy` supports text, direct relations, numbers, booleans and enums (up to 5 properties).

- **How populated is it?** Count with an `exists` filter and compare with the total:

```ts
filter: {
  exists: {
    property: ["cdf_cdm", "CogniteAsset/v1", "description"];
  }
}
```

- **How deep is a hierarchy?** Sample a few deep nodes and look at the length of their `path` array.

### Step 6. Check access if results look empty

Empty results can mean "no data" or "no access". Data modeling permissions are granted per space (capabilities in the `dataModelsAcl` and `dataModelInstancesAcl` family, **Verify** exact names in your project's group setup). If an admin sees data and you do not, ask for read access to the instance space.

### Ways to run reconnaissance

| Method                                     | Good for                                               | Notes                                               |
| ------------------------------------------ | ------------------------------------------------------ | --------------------------------------------------- |
| Fusion's Data models page                  | Quick visual scan of models, views, properties         | Browser, no code                                    |
| A temporary explorer panel inside your app | Counts and samples using the app's own auth            | See the component below                             |
| A Node script with the SDK                 | Repeatable dumps to a file you can read                | Needs credentials (below)                           |
| `curl` against the REST API                | Checking one request exactly                           | Needs a token                                       |
| Industrial MCP in your editor              | Letting an AI agent list and query models              | <https://docs.cognite.com/cdf/build/industrial_mcp> |
| Python SDK or Toolkit                      | If you work in notebooks or manage definitions as code | <https://github.com/cognitedata/toolkit>            |

### A temporary explorer component

Add this while discovering, then delete it. It needs the app's `useCogniteSdk()`:

```tsx
import { useCogniteSdk } from "@cognite/app-sdk/react";
import { useEffect, useState } from "react";

export function DataModelExplorer() {
  const client = useCogniteSdk();
  const [models, setModels] = useState<{ key: string; views: ViewRef[] }[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    void client.dataModels
      .list({ limit: 1000, includeGlobal: true })
      .then((res) => {
        if (cancelled) return;
        setModels(
          res.items.map((m) => ({
            key: `${m.space}/${m.externalId}/${m.version}`,
            views: (m.views ?? []).map((v) => ({
              space: v.space,
              externalId: v.externalId,
              version: v.version,
            })),
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  async function check(views: ViewRef[]) {
    const results = await mapWithLimit(
      views,
      4,
      async (v) => [v, await countInstances(client, v)] as const,
    );
    setCounts((prev) => ({
      ...prev,
      ...Object.fromEntries(
        results.map(([v, n]) => [`${v.space}/${v.externalId}`, n]),
      ),
    }));
  }

  return (
    <ul>
      {models.map((m) => (
        <li key={m.key}>
          {m.key}{" "}
          <button onClick={() => void check(m.views)}>Check data</button>
        </li>
      ))}
      <pre>{JSON.stringify(counts, null, 2)}</pre>
    </ul>
  );
}
```

### A Node script (outside Fusion)

Useful for dumping a project's structure to a file. **Verify** the auth options for your SDK version and tenant (client credentials via OIDC is typical):

```js
// explore.mjs   run: node explore.mjs   (env: CLUSTER, PROJECT, TENANT_ID, CLIENT_ID, CLIENT_SECRET)
import { CogniteClient } from "@cognite/sdk";

async function getToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        scope: `https://${process.env.CLUSTER}.cognitedata.com/.default`,
      }),
    },
  );
  return (await res.json()).access_token;
}

const client = new CogniteClient({
  appId: "dm-explorer",
  project: process.env.PROJECT,
  baseUrl: `https://${process.env.CLUSTER}.cognitedata.com`,
  oidcTokenProvider: getToken,
});

const models = await client.dataModels.list({
  limit: 1000,
  includeGlobal: true,
});
console.log(
  JSON.stringify(
    models.items.map((m) => ({
      space: m.space,
      id: m.externalId,
      version: m.version,
      views: m.views?.length,
    })),
    null,
    2,
  ),
);
```

Never commit the client secret. Use environment variables or a secrets manager.

### The same calls over REST

```bash
BASE=https://<cluster>.cognitedata.com
P=<project>
H="Authorization: Bearer $TOKEN"

curl -s -H "$H" "$BASE/api/v1/projects/$P/models/spaces?includeGlobal=true&limit=1000"
curl -s -H "$H" "$BASE/api/v1/projects/$P/models/datamodels?includeGlobal=true&limit=1000"
curl -s -H "$H" "$BASE/api/v1/projects/$P/models/views?space=cdf_cdm&includeInheritedProperties=true&limit=1000"

curl -s -X POST -H "$H" -H "Content-Type: application/json" \
  "$BASE/api/v1/projects/$P/models/instances/list" \
  -d '{"instanceType":"node","limit":3,"sources":[{"source":{"type":"view","space":"cdf_cdm","externalId":"CogniteAsset","version":"v1"}}]}'
```

API reference: <https://developer.cognite.com/api>.

## 6. Reading a view definition

Once you pick a view, read its full definition, including inherited properties:

```ts
const res = await client.views.retrieve(
  [{ space: "cdf_cdm", externalId: "CogniteAsset", version: "v1" }],
  { includeInheritedProperties: true },
);
console.log(JSON.stringify(res.items[0], null, 2));
```

Or list views in a space:

```ts
const views = await client.views.list({
  space: "cdf_cdm",
  includeInheritedProperties: true,
  includeGlobal: true,
  limit: 1000,
});
```

Read the output for these fields. The exact JSON shape is **Verify**: print it once and read it rather than trusting memory.

| In the definition                                               | Tells you                                                                                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `implements`                                                    | Parent views whose properties this view inherits (the interface chain)                                                                       |
| `properties.<name>.type`                                        | The data type: text, int, float, boolean, timestamp, date, json, direct relation, time series reference, and so on, and whether it is a list |
| `properties.<name>.source` (on a direct relation)               | The **view the relation points to**. This is how you learn that `type` points to an asset type view                                          |
| `properties.<name>.container` and `containerPropertyIdentifier` | Where the value is stored                                                                                                                    |
| `connectionType` (on connection properties)                     | Edge connections and reverse direct relations, i.e. relationships you can traverse without a direct pointer                                  |
| `filter`                                                        | A built-in filter limiting which instances appear through this view                                                                          |
| `name`, `description`                                           | Human-readable hints. Read them, they are often the best documentation                                                                       |

### From a definition to a filter path

A property reference for a filter is always:

```
[ viewSpace, 'ViewExternalId/version', propertyName ]
```

Example: `['cdf_cdm', 'CogniteAsset/v1', 'parent']`. Node-level (non-view) fields use the `node` prefix: `['node', 'externalId']`, `['node', 'space']`.

### Following relationships

To understand how entities connect, for each interesting view list the properties whose type is a direct relation and note `source` (what it points to) and whether it is a list:

```ts
// pseudo-code: run after printing a definition once to confirm the shape
for (const [name, prop] of Object.entries(view.properties)) {
  // inspect prop.type and prop.source to find relations
}
```

Sketch your own map: `Equipment.asset -> Asset`, `Asset.parent -> Asset`, `Asset.type -> AssetType`. This map decides which queries you need.

## 7. The Cognite core data model in practice

The core model (often `cdf_cdm / CogniteCore / v1`) is the standard industrial model. Common concepts:

| Concept                                                                                             | Typical use                                                                        |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `CogniteAsset`                                                                                      | Things in a hierarchy: sites, units, platforms, systems                            |
| `CogniteAssetType`, `CogniteAssetClass`                                                             | Classification of assets                                                           |
| `CogniteEquipment`, `CogniteEquipmentType`                                                          | Physical equipment, usually linked to an asset                                     |
| `CogniteTimeSeries`                                                                                 | Sensor data streams, linked to assets or equipment                                 |
| `CogniteFile`, `CogniteFileCategory`                                                                | Documents and files                                                                |
| `CogniteActivity`                                                                                   | Work: maintenance, inspections, events with time ranges                            |
| `CogniteSourceSystem`                                                                               | Where data came from                                                               |
| Interfaces (`CogniteDescribable`, `CogniteSourceable`, `CogniteSchedulable`, `CogniteVisualizable`) | Shared property groups: name and description, source info, start and end times, 3D |

**Typical relationships (Verify in your view definitions before relying on them):**

- Asset to Asset: `parent`, `root`, `path` (root to asset list).
- Equipment to Asset: `asset`.
- TimeSeries to Asset or Equipment: `assets`, `equipment` (lists).
- Activity to Asset, Equipment, TimeSeries: lists.
- File to Asset: list.
- Several of these have reverse relations on the target (an asset seeing its equipment), which let you traverse without extra queries.

Industry models (for example a process-industries extension) and enterprise models extend the core by adding properties or new views. They often show the **same instance counts** as the core, because they are different lenses on the same nodes. Check counts before concluding there is more data.

Docs: <https://docs.cognite.com/cdf/dm/> (**Verify** exact path).

## 8. Building a data dictionary

Before designing the app, write a one-page dictionary for each view you will use. It keeps you and your reviewers honest.

```markdown
### CogniteAsset (cdf_cdm / v1) instances live in: <instance space> count: 19,032

| Property    | Type                       | Populated     | Notes                      |
| ----------- | -------------------------- | ------------- | -------------------------- |
| name        | text                       | ~100%         | display name               |
| description | text                       | high          |                            |
| type        | direct -> CogniteAssetType | high          | 6 distinct values          |
| parent      | direct -> CogniteAsset     | all but roots |                            |
| path        | list of direct             | all           | root to self               |
| tags        | text list                  | most          | operator, ids, water depth |

Relationships: children (assets whose parent = this), equipment, time series...
Gotchas: search returns one page only; instance space differs from view space.
```

Fill the "Populated" column using `exists` filters and counts (step 5). A property that is empty 95% of the time is a poor choice for a filter or a column.

Questions your dictionary should answer:

1. Which view do I query for each screen?
2. In which space are the instances?
3. What are the unique values of the properties I want to filter by?
4. How do I get from a selected item to its relatives (parent, children, linked equipment)?
5. How many rows are there, and therefore do I need server-side search and paging?

---

# Part C. Querying data

## 9. Choosing the right call

| Need                                  | Call                                                        | Notes                               |
| ------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| Flat list from one view, with filters | `instances.list`                                            | Cursor pagination via `nextCursor`  |
| Free-text search, ranked              | `instances.search`                                          | **No cursor**: one page, up to 1000 |
| Fetch known identifiers               | `instances.retrieve`                                        | Batch the ids                       |
| Counts, facets, grouping              | `instances.aggregate`                                       | `groupBy` for facets                |
| Related nodes or edges in one request | `instances.query`                                           | Graph traversal (section 11)        |
| Incremental changes                   | `instances.sync`                                            | Cursor-based change feed            |
| Latest time series value              | `instances.query` for ids, then `datapoints.retrieveLatest` | Batch about 100 ids                 |

Rule of thumb: **if the read needs graph context, it is a query. If it is a single-type lookup with flat filters, it is a list.** For discovery by name, search first, then hydrate with a query or retrieve.

## 10. Query cookbook

All examples use these helpers:

```ts
const ASSET_VIEW = {
  type: "view",
  space: "cdf_cdm",
  externalId: "CogniteAsset",
  version: "v1",
} as const;
const prop = (name: string) => ["cdf_cdm", "CogniteAsset/v1", name];
```

**List with a limit**

```ts
await client.instances.list({
  instanceType: "node",
  sources: [{ source: ASSET_VIEW }],
  limit: 50,
});
```

**Filter on a direct relation (exact match)**

```ts
filter: { equals: { property: prop('type'), value: { space: 'my_space', externalId: 'TYPE-PLATFORM' } } }
```

**Children of a node**

```ts
filter: { equals: { property: prop('parent'), value: { space: 'my_space', externalId: 'FLD-1' } } }
```

**Text filters**

```ts
filter: { prefix: { property: prop('name'), value: 'Pump' } }          // starts with
filter: { in: { property: prop('sourceContext'), values: ['A', 'B'] } } // one of
filter: { containsAny: { property: prop('aliases'), values: ['10242'] } } // list property contains
filter: { exists: { property: prop('description') } }                  // is set
```

**Combine**

```ts
filter: {
  and: [filterA, { or: [filterB, filterC] }, { not: filterD }];
}
```

**Numeric or time ranges** (Verify operator names in the API reference)

```ts
filter: { range: { property: prop('sourceCreatedTime'), gte: '2020-01-01T00:00:00Z' } }
```

**Restrict to one instance space**

```ts
filter: { equals: { property: ['node', 'space'], value: 'my_instances' } }
```

**Sorting**

```ts
sort: [{ property: prop("name"), direction: "ascending", nullsFirst: false }];
```

**Search**

```ts
await client.instances.search({
  view: ASSET_VIEW,
  instanceType: "node",
  query: "tequila",
  properties: ["name", "description"], // optional: limit which properties are searched
  filter: typeFilter, // optional
  limit: 50,
});
```

**Retrieve by id (batched)**

```ts
await client.instances.retrieve({
  sources: [{ source: ASSET_VIEW }],
  items: refs.map((r) => ({
    instanceType: "node",
    space: r.space,
    externalId: r.externalId,
  })),
});
```

**Facet counts (group by)**

```ts
await client.instances.aggregate({
  view: ASSET_VIEW,
  groupBy: ["type"],
  aggregates: [{ count: { property: "externalId" } }],
  limit: 100,
});
```

**Page through everything**

```ts
let cursor: string | undefined;
do {
  const page = await client.instances.list({
    instanceType: "node",
    sources: [{ source: ASSET_VIEW }],
    limit: 1000,
    cursor,
  });
  // process page.items
  cursor = page.nextCursor;
} while (cursor);
```

## 11. Graph traversal with `instances.query`

`query` runs named **steps** in one request. Each step selects nodes or edges. Later steps refer to earlier ones with `from`.

Anatomy:

```ts
await client.instances.query({
  with: {
    // step name -> what to select
    start: {
      nodes: {
        filter: {
          equals: { property: ["node", "externalId"], value: "PLTF-1" },
        },
      },
      limit: 1, // limit goes on the STEP, not inside nodes/edges
    },
    kids: {
      nodes: {
        from: "start", // continue from the previous step
        through: ["cdf_cdm", "CogniteAsset/v1", "parent"], // the relation property to follow
        direction: "inwards", // nodes that point AT start via `parent`
      },
      limit: 100,
    },
  },
  select: {
    start: {
      sources: [{ source: ASSET_VIEW, properties: ["name", "description"] }],
    },
    kids: { sources: [{ source: ASSET_VIEW, properties: ["name"] }] },
  },
});
```

**Verify** the `through` and `direction` semantics against the API reference for your case. The reliable method is to build the query one step at a time and print the result.

### Rules that prevent common errors

| Rule                                                                         | Why                                                         |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `limit` belongs on `with.<step>`, not on `nodes` or `edges`                  | Otherwise `Unexpected field - nodes.limit`                  |
| Every `select.<step>.sources` entry needs an explicit `properties` array     | Otherwise `properties must not be null`                     |
| Start steps should filter by space and use `hasData` for the expected view   | Avoids scanning unrelated nodes                             |
| Use versioned refs in traversal filters: `[space, 'View/version', property]` | Non-versioned refs silently return empty                    |
| Page per step: read `nextCursor.<step>`, send `cursors: { <step>: ... }`     | One cursor does not page all steps                          |
| You cannot traverse **inwards** through a **list** direct relation           | Traverse from the owning node outwards, or remodel as edges |
| Dedupe merged results by a stable key and decide tie-breaks                  | Multiple edges to one node inflate totals                   |

### Edges with properties

If relationships carry business data (weight, status, ownership), treat the edge as its own step and project its properties, then join to endpoint nodes. Do not treat edges as mere plumbing.

### Latest values: two-phase read

1. `instances.query` to collect the time series node ids.
2. `datapoints.retrieveLatest` in batches of about 100, with `ignoreUnknownIds: true`.
3. Merge back by a stable key.

Do not try to force latest values into a traversal.

## 12. Debugging queries

Work from the simplest query outward.

1. **Start with a bare list** of one view and `limit: 1`. Does it return data? If not: wrong view, wrong version, or no access.
2. **Add one filter at a time.** The step that makes results vanish is the culprit.
3. **Print the response** and read property paths. A common mistake is reading `item.properties.name` instead of `item.properties[viewSpace]['View/version'].name`.
4. **Check the space.** Add `{ equals: { property: ['node', 'space'], value: ... } }` to scope results.
5. **Check the view version.** `v1` and `v2` can differ in properties.
6. **Compare with a count.** `aggregate` with the same filter tells you the expected result size.
7. **Test the same call over REST** with `curl` to separate SDK issues from query issues.

| Symptom                                              | Likely cause                                                                               | Fix                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Empty list, no error                                 | Wrong view version, filter on wrong property path, or no read access to the instance space | Re-check the path, version, access               |
| `Unexpected field - nodes.limit`                     | Limit nested wrongly                                                                       | Move to `with.<step>.limit`                      |
| `properties must not be null`                        | `sources` without `properties`                                                             | Add the array                                    |
| Traversal step empty despite data                    | Missing `hasData`, wrong `direction`, unversioned ref                                      | Fix each in turn                                 |
| `Cannot traverse lists of direct relations inwards.` | Inwards through a list relation                                                            | Traverse outwards from the owner                 |
| First page fine, later pages missing                 | Cursor not step-scoped                                                                     | Use `nextCursor.<step>`                          |
| 429 or intermittent 5xx                              | Too many concurrent requests                                                               | Bound concurrency, retry with backoff and jitter |
| Totals too high after traversal                      | Duplicates from multiple edges                                                             | Dedupe and define tie-break                      |

## 13. Limits, pagination, performance

- Set an explicit `limit` on every call. Typical maximum for list is 1000.
- Bound concurrent requests (about 4) and retry only transient failures (408, 425, 429, 5xx) with exponential backoff and jitter.
- Filter on the server. Never download thousands of rows to filter in the browser.
- Ask for the properties you display. Avoid wildcard projections.
- `search` is not paginated. For large browse experiences use `list` with cursors, and use `search` for "find by text".
- Batch `retrieve` calls and dedupe ids first.
- Cache with React Query (`staleTime`) so repeat views do not refetch.
- If you call an LLM over query results, cap how many items you send per request.

---

# Part D. Building the app

## 14. Architecture

```
Component        render only, props in and JSX out
   ^
View             calls the view model once, composes components
   ^
ViewModel hook   use<Name>ViewModel: stateless, composes storage + queries + commands
   ^                       ^
Storage (context)      Service interface -> SDK
```

Rules:

1. **Parse at the edge.** Turn raw CDF JSON into your own types once, with type guards.
2. **Interface plus private class plus factory** for anything that talks to CDF. Consumers use the interface.
3. **Depend on narrow slices**: `Pick<CogniteClient['instances'], 'list' | 'search'>`, not the whole client.
4. **Inject dependencies through React context** so tests can swap them. No `vi.mock` needed.
5. **ViewModels own no state.** State lives in a shared provider. Two components calling a stateful hook would otherwise get separate copies.
6. **Components fetch nothing.**
7. **Server state through React Query.** Put every input that affects the request in the query key.

Suggested layout:

```
src/
  <feature>/       types, parsing, service, state, view model, components, tests
  components/      shared UI (LoadableContent)
  host/            host integration contexts
  __mocks__/       shared test fixtures
  App.tsx          connects to host, mounts providers
specs/             one folder per feature
```

## 15. Starter kit: full reference code

Complete, typed code for the core pieces, using an `Asset` example. Adapt names to your feature.

### 15.1 Domain types

```ts
// types.ts
export type InstanceRef = { space: string; externalId: string };

export type Asset = {
  space: string;
  externalId: string;
  name: string;
  description?: string;
  type?: InstanceRef;
  parent?: InstanceRef;
  path: InstanceRef[];
  tags: string[];
};

export type AssetPage = { items: Asset[]; nextCursor?: string };

export const refKey = (ref: InstanceRef): string =>
  `${ref.space}/${ref.externalId}`;
export const isSameRef = (a: InstanceRef, b: InstanceRef): boolean =>
  a.space === b.space && a.externalId === b.externalId;
```

### 15.2 Parsing with type guards

```ts
// parsing.ts
import type { Asset, InstanceRef } from "./types";

export type RawInstance = {
  space: string;
  externalId: string;
  instanceType: string;
  properties?: unknown;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function toRef(v: unknown): InstanceRef | undefined {
  if (!isRecord(v)) return undefined;
  const { space, externalId } = v;
  return typeof space === "string" && typeof externalId === "string"
    ? { space, externalId }
    : undefined;
}

const toRefs = (v: unknown): InstanceRef[] =>
  Array.isArray(v)
    ? v.flatMap((e) => {
        const r = toRef(e);
        return r ? [r] : [];
      })
    : [];

const toStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((e): e is string => typeof e === "string") : [];

const toOptionalString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

function viewProps(
  item: RawInstance,
  viewSpace: string,
  viewKey: string,
): Record<string, unknown> | undefined {
  if (!isRecord(item.properties)) return undefined;
  const space = item.properties[viewSpace];
  if (!isRecord(space)) return undefined;
  const view = space[viewKey];
  return isRecord(view) ? view : undefined;
}

export function parseAsset(item: RawInstance): Asset | undefined {
  const p = viewProps(item, "cdf_cdm", "CogniteAsset/v1");
  if (!p) return undefined;
  return {
    space: item.space,
    externalId: item.externalId,
    name: toOptionalString(p.name) ?? item.externalId,
    description: toOptionalString(p.description),
    type: toRef(p.type),
    parent: toRef(p.parent),
    path: toRefs(p.path),
    tags: toStrings(p.tags),
  };
}
```

### 15.3 Service

```ts
// AssetService.ts
import type { CogniteClient } from "@cognite/sdk";
import { parseAsset } from "./parsing";
import { refKey, type Asset, type AssetPage, type InstanceRef } from "./types";

export type InstancesApi = Pick<
  CogniteClient["instances"],
  "list" | "search" | "retrieve"
>;

export type AssetQuery = {
  query?: string;
  type?: InstanceRef;
  cursor?: string;
  limit?: number;
};

export interface AssetService {
  /** Search when a query is given (single page), otherwise a cursor-paginated list. */
  listAssets(params: AssetQuery): Promise<AssetPage>;
  getAssets(refs: InstanceRef[]): Promise<Asset[]>;
}

const PAGE_SIZE = 50;
const VIEW = {
  type: "view",
  space: "cdf_cdm",
  externalId: "CogniteAsset",
  version: "v1",
} as const;

const typeFilter = (ref: InstanceRef) => ({
  equals: {
    property: ["cdf_cdm", "CogniteAsset/v1", "type"],
    value: { space: ref.space, externalId: ref.externalId },
  },
});

const toAssets = (items: Parameters<typeof parseAsset>[0][]): Asset[] =>
  items.flatMap((i) => {
    const a = parseAsset(i);
    return a ? [a] : [];
  });

class InstancesAssetService implements AssetService {
  constructor(private readonly instances: InstancesApi) {}

  async listAssets({
    query,
    type,
    cursor,
    limit = PAGE_SIZE,
  }: AssetQuery): Promise<AssetPage> {
    const text = query?.trim();
    const filter = type ? typeFilter(type) : undefined;

    if (text) {
      const res = await this.instances.search({
        view: VIEW,
        instanceType: "node",
        query: text,
        limit,
        ...(filter ? { filter } : {}),
      });
      return { items: toAssets(res.items) };
    }

    const res = await this.instances.list({
      instanceType: "node",
      sources: [{ source: VIEW }],
      limit,
      ...(cursor ? { cursor } : {}),
      ...(filter ? { filter } : {}),
    });
    return { items: toAssets(res.items), nextCursor: res.nextCursor };
  }

  async getAssets(refs: InstanceRef[]): Promise<Asset[]> {
    const unique = [...new Map(refs.map((r) => [refKey(r), r])).values()];
    if (unique.length === 0) return [];
    const res = await this.instances.retrieve({
      sources: [{ source: VIEW }],
      items: unique.map((r) => ({
        instanceType: "node",
        space: r.space,
        externalId: r.externalId,
      })),
    });
    const byKey = new Map(toAssets(res.items).map((a) => [refKey(a), a]));
    return unique.flatMap((r) => {
      const a = byKey.get(refKey(r));
      return a ? [a] : [];
    });
  }
}

export const createAssetService = (instances: InstancesApi): AssetService =>
  new InstancesAssetService(instances);
```

Default hook that builds the service from the app's client:

```ts
// useAssetService.ts
import { useCogniteSdk } from "@cognite/app-sdk/react";
import { useMemo } from "react";
import { createAssetService, type AssetService } from "./AssetService";

export function useAssetService(): AssetService {
  const client = useCogniteSdk();
  return useMemo(() => createAssetService(client.instances), [client]);
}
```

### 15.4 Host-synced state: parse, serialise

```ts
// browserState.ts
import type { InstanceRef } from "./types";

export type BrowserState = {
  query: string;
  type?: InstanceRef;
  selected?: InstanceRef;
};
export const DEFAULT_STATE: BrowserState = { query: "" };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function toRef(v: unknown): InstanceRef | undefined {
  if (!isRecord(v)) return undefined;
  return typeof v.space === "string" && typeof v.externalId === "string"
    ? { space: v.space, externalId: v.externalId }
    : undefined;
}

export function parseBrowserState(raw: string | undefined): BrowserState {
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return DEFAULT_STATE;
    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      type: toRef(parsed.type),
      selected: toRef(parsed.selected),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export const serializeBrowserState = (state: BrowserState): string =>
  JSON.stringify(state);
```

### 15.5 Shared storage and provider

```ts
// storage.ts
import { createContext, useContext } from "react";
import { DEFAULT_STATE, type BrowserState } from "./browserState";

export type Storage = {
  state: BrowserState;
  setState: (next: BrowserState) => void;
};

export const StorageContext = createContext<Storage>({
  state: DEFAULT_STATE,
  setState: () => undefined,
});
export const useStorage = (): Storage => useContext(StorageContext);
```

```tsx
// StateProvider.tsx
import { useMemo, useState, type ReactNode } from "react";
import { parseBrowserState } from "./browserState";
import { StorageContext } from "./storage";

export function StateProvider({
  initialState,
  children,
}: {
  initialState?: string;
  children: ReactNode;
}) {
  const [state, setState] = useState(() => parseBrowserState(initialState));
  const value = useMemo(() => ({ state, setState }), [state]);
  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
}
```

### 15.6 Host sync context

```ts
// hostSync.ts
import type { HostAppAPI } from "@cognite/app-sdk";
import { createContext, useContext } from "react";

export type HostSync = Pick<HostAppAPI, "syncInternalState">;
export const HostSyncContext = createContext<{ sync: HostSync | null }>({
  sync: null,
});
export const useHostSync = () => useContext(HostSyncContext);
```

### 15.7 The `Loadable` type and view model

```ts
// useAssetBrowserViewModel.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext } from "react";
import { serializeBrowserState, type BrowserState } from "./browserState";
import { useHostSync } from "./hostSync";
import { useStorage } from "./storage";
import { useAssetService } from "./useAssetService";
import { refKey, type Asset, type InstanceRef } from "./types";

export type Loadable<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

export type PagedAssets = {
  items: Asset[];
  hasMore: boolean;
  isLoadingMore: boolean;
};

const defaultDeps = { useAssetService };
export const ViewModelContext = createContext(defaultDeps);

const FIRST_PAGE: string | undefined = undefined;

export function useAssetBrowserViewModel() {
  const { useAssetService: useService } = useContext(ViewModelContext);
  const service = useService();
  const { sync } = useHostSync();
  const { state, setState } = useStorage();

  const update = useCallback(
    (patch: Partial<BrowserState>) => {
      const next = { ...state, ...patch };
      setState(next);
      void sync?.syncInternalState(serializeBrowserState(next));
    },
    [state, setState, sync],
  );

  const q = useInfiniteQuery({
    queryKey: ["assets", state.query, state.type ? refKey(state.type) : null],
    queryFn: ({ pageParam }) =>
      service.listAssets({
        query: state.query,
        type: state.type,
        cursor: pageParam,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (last) => last.nextCursor,
  });

  const assets: Loadable<PagedAssets> = q.isError
    ? {
        status: "error",
        message: q.error instanceof Error ? q.error.message : "Unknown error",
      }
    : q.data
      ? {
          status: "ready",
          data: {
            items: q.data.pages.flatMap((p) => p.items),
            hasMore: q.hasNextPage,
            isLoadingMore: q.isFetchingNextPage,
          },
        }
      : { status: "loading" };

  return {
    query: state.query,
    assets,
    setQuery: (query: string) => update({ query }),
    setType: (type: InstanceRef | undefined) => update({ type }),
    selectAsset: (selected: InstanceRef) => update({ selected }),
    loadMore: () => void q.fetchNextPage(),
  };
}
```

Notes: the query key includes every input; the view model holds no `useState`; the setter writes to storage and syncs to the host; `FIRST_PAGE` is typed instead of using an `as` cast.

### 15.8 A reusable loading, error, ready wrapper

```tsx
// LoadableContent.tsx
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@cognite/aura/components/alert";
import { Loader } from "@cognite/aura/components/loader";
import type { ReactNode } from "react";
import type { Loadable } from "./useAssetBrowserViewModel";

type Props<T> = {
  loadable: Loadable<T>;
  loadingLabel: string;
  errorTitle: string;
  children: (data: T) => ReactNode;
};

export function LoadableContent<T>({
  loadable,
  loadingLabel,
  errorTitle,
  children,
}: Props<T>) {
  if (loadable.status === "loading") {
    return (
      <div
        role="status"
        className="inline-flex items-center gap-3 p-2 text-muted-foreground"
      >
        <Loader size={20} />
        <span>{loadingLabel}</span>
      </div>
    );
  }
  if (loadable.status === "error") {
    return (
      <Alert variant="error">
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription>{loadable.message}</AlertDescription>
      </Alert>
    );
  }
  return <>{children(loadable.data)}</>;
}
```

### 15.9 A presentational component

```tsx
// AssetList.tsx
import { Button } from "@cognite/aura/components/button";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@cognite/aura/components/empty-state";
import { LoadableContent } from "./LoadableContent";
import { type InstanceRef } from "./types";
import type { Loadable, PagedAssets } from "./useAssetBrowserViewModel";

type Props = {
  assets: Loadable<PagedAssets>;
  onSelect: (ref: InstanceRef) => void;
  onLoadMore: () => void;
};

export function AssetList({ assets, onSelect, onLoadMore }: Props) {
  return (
    <LoadableContent
      loadable={assets}
      loadingLabel="Loading assets..."
      errorTitle="Could not load assets"
    >
      {({ items, hasMore, isLoadingMore }) =>
        items.length === 0 ? (
          <EmptyState>
            <EmptyStateTitle>No assets found</EmptyStateTitle>
            <EmptyStateDescription>
              Try a different search or filter.
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            <ul className="flex flex-col gap-1">
              {items.map((a) => (
                <li key={`${a.space}/${a.externalId}`}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() =>
                      onSelect({ space: a.space, externalId: a.externalId })
                    }
                  >
                    {a.name}
                  </Button>
                </li>
              ))}
            </ul>
            {hasMore ? (
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </Button>
            ) : null}
          </div>
        )
      }
    </LoadableContent>
  );
}
```

### 15.10 Wiring in `App.tsx`

Connect to the host first, then mount providers, so `initialState` is available on the first render:

```tsx
import { connectToHostApp } from "@cognite/app-sdk";
import { CogniteSdkProvider } from "@cognite/app-sdk/react";
import { useEffect, useMemo, useState } from "react";

function App() {
  const [connection, setConnection] = useState<{
    api: HostSync;
    initialState?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void connectToHostApp().then((result) => {
      if (!cancelled) setConnection(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hostSync = useMemo(
    () => ({ sync: connection?.api ?? null }),
    [connection],
  );

  return (
    <CogniteSdkProvider
      loadingFallback={<p>Loading...</p>}
      errorFallback={<p>Could not connect</p>}
    >
      {connection ? (
        <HostSyncContext.Provider value={hostSync}>
          <StateProvider initialState={connection.initialState}>
            <AssetBrowserView />
          </StateProvider>
        </HostSyncContext.Provider>
      ) : (
        <p>Loading...</p>
      )}
    </CogniteSdkProvider>
  );
}
```

**Verify:** `connectToHostApp` may require options (an application name) in your SDK version. Use the template's existing call as the source of truth.

`main.tsx` must wrap `<App />` in a `QueryClientProvider`.

## 16. Host integration and URL state

### Decide for each piece of state

> "Would a user expect this to survive a page reload, or to be restored when someone opens a shared link?"

| Yes: sync to host                                                                            | No: local only                                                              |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Page, selected tab, filters, selected id, search query, sort, expanded rows, side panel open | Text typed before submit, hover and focus, toasts, animation, optimistic UI |

If in doubt, sync it. Over-syncing is cheap; under-syncing breaks reload and sharing.

### The round trip

```ts
const { api, initialState } = await connectToHostApp(/* template options */);
const seeded = parseBrowserState(initialState); // defensive parse, never trust the string
await api.syncInternalState(JSON.stringify(next)); // on every change
```

Keep the serialised state **small and identifier-only**. A real bug: a whole object including a display name was stored in the URL. Store `{ space, externalId }`, look names up at render time.

### Other host calls

| Need                               | Use                                                            |
| ---------------------------------- | -------------------------------------------------------------- |
| Navigate inside Fusion             | `api.navigateInternal({ path, queryParams, hash })`            |
| Open an external link (https only) | `api.navigateExternal({ url, openInNewTab })`                  |
| Base URL, token, project           | `api.getBaseUrl()`, `api.getAccessToken()`, `api.getProject()` |
| Never                              | `window.location = ...`, hard-coded cluster URLs               |

## 17. Testing

Stack: Vitest, React Testing Library, jsdom, `@testing-library/user-event`.

### What to cover

| File type   | Cases                                                          |
| ----------- | -------------------------------------------------------------- |
| Service     | request construction, response parsing, error propagation      |
| ViewModel   | loading, success (derived values), error, paging, host sync    |
| Pure helper | every export and branch                                        |
| Component   | content from props, loading, error and empty states, callbacks |

Structure: Arrange, Act, Assert. One behaviour per test. Helpers at the bottom.

### Service test: assert the payload

```ts
const instances = {
  list: vi.fn(() => Promise.resolve({ items: [] } as Partial<ListRes> as ListRes)),
  search: vi.fn(...),
  retrieve: vi.fn(...),
};
const service = createAssetService(instances);

it('lists asset nodes with the view and default limit', async () => {
  await service.listAssets({});
  expect(instances.list).toHaveBeenCalledWith({
    instanceType: 'node',
    sources: [{ source: VIEW }],
    limit: 50,
  });
});

it('rejects when the request fails', async () => {
  vi.mocked(instances.list).mockRejectedValue(new Error('boom'));
  await expect(service.listAssets({})).rejects.toThrow('boom');
});
```

Asserting the payload catches the bug class where the code "works" but sends the wrong query. `Partial<T> as T` is acceptable only inside test fixtures.

### View model test

```tsx
const wrapper = ({ children }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <HostSyncContext.Provider value={{ sync }}>
      <ViewModelContext.Provider value={{ useAssetService: () => service }}>
        <StateProvider initialState={initialState}>{children}</StateProvider>
      </ViewModelContext.Provider>
    </HostSyncContext.Provider>
  </QueryClientProvider>
);

it("exposes loaded assets", async () => {
  const { result } = renderHook(() => useAssetBrowserViewModel(), { wrapper });
  expect(result.current.assets.status).toBe("loading");
  await waitFor(() => expect(result.current.assets.status).toBe("ready"));
});

it("syncs the query to the host", async () => {
  const { result } = renderHook(() => useAssetBrowserViewModel(), { wrapper });
  act(() => result.current.setQuery("tequila"));
  expect(sync.syncInternalState).toHaveBeenCalledWith(
    serializeBrowserState({ query: "tequila" }),
  );
});
```

Use `retry: false` in tests so failures surface immediately.

### Component test (no providers needed)

```tsx
it("selects an asset when its row is clicked", async () => {
  const onSelect = vi.fn();
  render(
    <AssetList
      assets={ready([asset("A", "Platform A")])}
      onSelect={onSelect}
      onLoadMore={vi.fn()}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: /Platform A/ }));
  expect(onSelect).toHaveBeenCalledWith({ space: "sp", externalId: "A" });
});
```

Query by role and accessible name, like a user would, not by CSS class.

### Integration test

Render the real view, view model and storage, mocking only the service (the external boundary). Type a search, assert the list changes; click a row, assert the details appear and `syncInternalState` was called.

### Tests find real bugs

Both found while testing the UI: a display name leaking into URL state, and Enter not reliably submitting a form that had several controls and no submit button.

### Coverage

Many certification flows require at least 80% line coverage: `npx vitest run --coverage`. **Verify** the current threshold in the quality guidelines.

## 18. TypeScript rules

- Never `any`. Use `unknown` and narrow it.
- Never `as` casts. Write type guards. Exception: `Partial<T> as T` in test mocks.
- Annotate every function parameter.
- Import types directly: `import type { ReactNode } from 'react'`.

```ts
// Never
const user = data as User;

// Type guard
function isUser(v: unknown): v is User {
  return typeof v === "object" && v !== null && "id" in v;
}
if (isUser(data)) {
  /* narrowed */
}
```

Tips:

- Derive types from libraries: `type InstancesApi = Pick<CogniteClient['instances'], 'list'>`, `Awaited<ReturnType<InstancesApi['list']>>`.
- Discriminated unions (`status: 'loading' | 'error' | 'ready'`) make impossible states unrepresentable.
- `??` treats `null` as missing. When `null` is meaningful, compare with `=== undefined`.
- `satisfies` checks shape without widening the type.

## 19. React gotchas

**Do not copy props or fetched data into state inside an effect.** ESLint flags `react-hooks/set-state-in-effect`:

```tsx
// Bad: extra render
useEffect(() => {
  setOpen(parse(initialState));
}, [initialState]);

// Good: compute during render
const [userChoice, setUserChoice] = useState<string | null | undefined>(
  undefined,
);
const open = userChoice === undefined ? restoredFromHost : userChoice;
```

Alternatives: reset a component with `key={identity}`, do the work in the event handler, or call `setState` only inside a subscription callback.

Reading: <https://react.dev/learn/you-might-not-need-an-effect>

**Clean up async effects**

```ts
useEffect(() => {
  let cancelled = false;
  void load().then((r) => {
    if (!cancelled) setData(r);
  });
  return () => {
    cancelled = true;
  };
}, [load]);
```

**Other reminders**

- Stable keys (`${space}/${externalId}`), not array indexes.
- Never call hooks conditionally.
- Memoise context values.
- `void` intentional fire-and-forget promises; always handle rejections of real work.
- A form with several controls needs a real submit button, or Enter will not reliably submit.

## 20. Aura design system

Rules:

1. Check Aura before writing raw HTML or custom CSS.
2. **Import each component from its own subpath**: `@cognite/aura/components/card`. Never from the `@cognite/aura/components` barrel, which pulls in very large dependencies and can exhaust build memory.

Components used in the example: `alert`, `badge`, `breadcrumb`, `button`, `card`, `empty-state`, `loader`, `search`, `select`.

To discover what exists and how to use it:

- List available components: the `exports` keys in `node_modules/@cognite/aura/package.json`.
- Read props: the `.d.ts` under `node_modules/@cognite/aura/dist/components/ui/core/<name>/`.

Facts from the installed version:

- `Button` variants: `default`, `secondary`, `outline`, `ghost`, `destructive` (plus on-dark variants); sizes `default`, `sm`, `lg`, icon sizes.
- `Alert` variants: `default`, `info`, `warning`, `error`. `secondary` is deprecated.
- `Select` is built on Base UI: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`. Pass an `items` array of `{ value, label }` to `Select` so the closed trigger shows the label, not the raw value.
- `Search` supports `onClear`.
- `EmptyState` has `EmptyStateTitle` and `EmptyStateDescription`.
- `Breadcrumb` has `BreadcrumbPageButton` for clickable crumbs and `BreadcrumbPage` for the current item.

Accessibility: give controls accessible names (`aria-label="Search assets"`), do not convey state by colour alone, and make every data fetch show loading, empty and error states. Design review scoring covers clarity and navigation (see section 22).

---

# Part E. Shipping

## 21. Troubleshooting log

Every row happened for real.

| Symptom                                                    | Cause                                                | Fix                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Missing "./components/card" specifier in "@cognite/aura"` | Aura too old                                         | Install a version with per-component exports, delete `node_modules` and the lockfile, reinstall |
| `ERESOLVE ... peer vitest@"x"`                             | Vitest packages at different versions                | Pin `vitest`, `@vitest/ui`, `@vitest/coverage-v8` to the same version                           |
| `git push`: "Password authentication is not supported"     | GitHub rejects account passwords over HTTPS          | `gh auth login` (GitHub CLI) or a personal access token; clear a stale keychain entry           |
| `react-hooks/set-state-in-effect`                          | `setState` in an effect body                         | Derive during render (section 19)                                                               |
| "localhost might be temporarily down"                      | Dev server not running, or opened localhost directly | Keep `npm start` running; use the printed Fusion link                                           |
| "Using basic self-signed SSL certificate"                  | mkcert missing or untrusted                          | `brew install mkcert`, `mkcert -install`, `apps setup-https`, restart server and browser        |
| Display names in the URL state                             | Stored whole objects in synced state                 | Store identifiers only                                                                          |
| Enter does not submit the search                           | Several controls, no submit button                   | Add a submit `Button`                                                                           |
| Search has no "load more"                                  | `instances.search` has no cursor                     | Expected. Use `list` with a `prefix` filter if you need paging                                  |
| Few results from a "rich" model                            | Model installed but empty                            | Count instances per view first                                                                  |
| Same counts in two models                                  | Different lenses on the same nodes                   | Compare instance spaces and counts before concluding there is more data                         |
| A shell command is blocked by an admin policy              | Environment policy                                   | Retry, or run it yourself in the terminal                                                       |

General debugging: read the **first** error, not the last. Find which layer produced it (config, package version, your code). Reproduce with the smallest command (`npx tsc --noEmit`, one test file). Change one thing at a time.

## 22. Certification checklist

From the guides used while building the example. **Verify** the numbers against the current quality guidelines: <https://docs.cognite.com/cdf/flows/guides/quality-guidelines>

- [ ] App brief written (name, value case, persona, problem, design intent)
- [ ] Code review done, **0 must-fix issues open**
- [ ] Design review done, average score **at least 3.8** (10 questions, each scored 1 to 5)
- [ ] Line coverage **at least 80%**
- [ ] Type check, lint, tests and build all pass
- [ ] Spec lists views and spaces used
- [ ] Loading, empty, and error states wherever data is fetched
- [ ] No `any`, no `as` casts, no secrets or tokens in code
- [ ] Dependencies audited, no known critical vulnerabilities
- [ ] Hosting permission requested from your CDF admin early (deploying needs app hosting write access)
- [ ] Submitted with `npx @cognite/cli apps submit`

Typical order: build, then brief, then code review (repeat until clean), then design review, then submit.

## 23. Git and commits

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
type(scope): imperative description
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

Examples:

```
docs(spec): add asset browser spec
feat(assets): add asset service and parsing
feat(assets): add host-synced view model
feat(assets): add asset browser UI
build(deps): pin vitest packages to the same version
```

Habits:

- Small, buildable commits with lint and tests green.
- Split unrelated changes (dependency bumps and lockfile in their own commit).
- Review `git status` and `git diff` before every commit.
- Never commit tokens, `.env` files, client secrets, or `node_modules`.

## 24. Practice exercises

Write the test first for each. Try without an agent, then compare.

**Foundations**

1. **Pure function.** `formatWaterDepth(tags: string[]): string | undefined` that finds a tag like `Water depth [ft]: 660` and returns `660 ft`. Test valid, missing and malformed tags.
2. **Parser field.** Add `sourceCreatedTime` to the `Asset` type and parser. Extend the parser tests first.
3. **Type guard.** Write `isInstanceRef(value: unknown): value is InstanceRef` and use it to replace `toRef`.

**Data exploration** 4. **Count script.** Write the per-view counting helper with bounded concurrency and test that it never exceeds the limit and survives one failing view. 5. **Facets.** Use `aggregate` with `groupBy` to list asset types with counts. Show them in a small table. 6. **Populated-ness.** For three properties, compute `exists` count divided by total count. Which are good filter candidates? 7. **Data dictionary.** Write the dictionary (section 8) for one view in your own project.

**Queries** 8. **Service method.** Add `listByAlias(alias)` using `containsAny` on `aliases`. Assert the exact payload. 9. **Traversal.** Write an `instances.query` that returns an asset and its children in one request. Build it step by step and print each step. 10. **Two-phase read.** For one asset, find its time series and fetch the latest datapoint of each with `retrieveLatest`.

**App skills** 11. **View model state.** Add a host-synced sort option (name ascending or descending). 12. **Component.** Build `CopyableId` showing an external id with a copy button. Pass the clipboard function as a prop so it is testable. 13. **Edge case.** What if the selected item disappears from the list after a filter change? Decide, test, implement. 14. **End to end.** Write a spec section and add an "Equipment" tab listing equipment linked to the selected asset.

## 25. References

### Cognite

- Flows documentation: <https://docs.cognite.com/cdf/flows>
- Flows quality guidelines: <https://docs.cognite.com/cdf/flows/guides/quality-guidelines>
- Industrial MCP: <https://docs.cognite.com/cdf/build/industrial_mcp>
- Documentation MCP server: <https://docs.cognite.com/mcp>
- API reference: <https://developer.cognite.com/api>
- JavaScript SDK: <https://github.com/cognitedata/cognite-sdk-js>
- Python SDK: <https://github.com/cognitedata/cognite-sdk-python>
- Cognite Toolkit (manage definitions as code): <https://github.com/cognitedata/toolkit>

**Verify:** I opened none of these pages while writing. The Flows, quality-guidelines and Industrial MCP links came from the project skills I worked with. The others are standard public locations. If a link moved, search the Cognite documentation site.

### General

- React: <https://react.dev> (especially "You might not need an effect")
- TanStack Query: <https://tanstack.com/query/latest>
- Vitest: <https://vitest.dev>
- Testing Library: <https://testing-library.com/docs/react-testing-library/intro>
- TypeScript handbook: <https://www.typescriptlang.org/docs/handbook/intro.html>
- Conventional Commits: <https://www.conventionalcommits.org/en/v1.0.0/>
- spec-kit: <https://github.com/github/spec-kit>
- Tailwind CSS: <https://tailwindcss.com/docs>
- MDN Web Docs: <https://developer.mozilla.org>

---

## One-page recap

1. **Spec first.** Name the views, the spaces and the host-synced state.
2. **Explore before designing.** List models, count instances per view, pull samples, read view definitions, write a data dictionary.
3. **Counts beat names.** A model that exists may be empty. Interface views double-count.
4. **Definition space is not instance space.** Check `item.space` in a sample.
5. **Use the right call.** `list` for flat reads, `search` for text (one page), `retrieve` for ids, `aggregate` for facets and counts, `query` for relationships.
6. **Filter on the server, page with cursors, bound concurrency.**
7. **Debug from simple to complex.** One filter or step at a time, print responses, compare with a count.
8. **Parse CDF JSON once into your own types with type guards.** No `any`, no `as`.
9. **Services behind interfaces, injected through context.** Narrow dependencies.
10. **ViewModels own no state.** Shared provider for state, query keys drive refetching.
11. **Sync reload-worthy state to the host, identifiers only.**
12. **Components take props and render.** Loading, empty and error everywhere.
13. **Test first, assert the request payload, and run `tsc`, lint, tests and build before every commit.**
