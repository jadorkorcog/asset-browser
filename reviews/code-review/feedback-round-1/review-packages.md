# Package audit: jadorkor-certification-app

Source: `npm outdated --json`, `npm audit --json` at commit `b8ca8be`.

### Dependencies

| Package | Used version | Latest | Deprecated | CVEs | Health |
| ------- | ------------ | ------ | ---------- | ---- | ------ |
| `react` | 18.3.1 | 19.3.0 | not checked | none | Warn (1 major behind) |
| `react-dom` | 18.3.1 | 19.3.0 | not checked | none | Warn (1 major behind) |
| `@cognite/aura` | 0.3.5 | 1.46250.0 | not checked | low (transitive via `@streamdown/mermaid`) | Warn (low CVE) |
| `@cognite/app-sdk` | 0.9.0 | 0.10.0 | not checked | none | Pass (1 minor behind) |
| `@cognite/sdk` | 10.10.0 | up to date | not checked | none | Pass |
| `@tanstack/react-query` | 5.90.10 | up to date | not checked | none | Pass |
| `@tabler/icons-react` | 3.35.0 | up to date | not checked | none | Pass |
| `clsx` | 2.1.1 | up to date | not checked | none | Pass |
| `tailwind-merge` | 3.4.0 | up to date | not checked | none | Pass |

### Dev dependencies (informational)

| Package | Used version | Latest | CVEs | Health |
| ------- | ------------ | ------ | ---- | ------ |
| `vitest` / `@vitest/ui` / `@vitest/coverage-v8` | 4.1.10 | 5.0.3 | moderate (fix in 4.1.11) | Warn |
| `vite` | 7.3.7 | 8.3.3 | none | Warn (1 major) |
| `eslint` | 9.39.4 | 10.12.0 | none | Warn (1 major) |
| `typescript` | 5.9.3 | 7.0.2 | none | Warn (1 major) |
| `@types/react` / `@types/react-dom` | 18.3.x | 19.3.0 | none | Warn (1 major, matches React 18) |
| `@vitejs/plugin-react` | 5.2.0 | 6.1.2 | none | Warn (1 major, capped by `<6.0.0` range) |

Spot-check: `npm view <pkg> deprecated` was not run for the flagged packages. No deprecated packages were reported by npm during install.

### Security audit

| Severity | Count |
| -------- | ----- |
| Critical | 0 |
| High | 0 |
| Moderate | 4 |
| Low | 4 |
| Info | 0 |

#### Vulnerabilities

| Package | Severity | Title | Patched in | Advisory |
| ------- | -------- | ----- | ---------- | -------- |
| `@vitest/mocker` | moderate | Path traversal / arbitrary file read via redirect mock (CWE-22) | 4.1.11 | GHSA-82fw-gwwq-j7x9 |
| `vitest` | moderate | Affected by `@vitest/mocker` advisory (dev tooling) | 4.1.11 | via above |
| `@vitest/ui`, `@vitest/coverage-v8` | moderate | Depend on `vitest` range | 4.1.11 | via above |
| `@cognite/aura`, `@streamdown/mermaid`, `mermaid`, `katex` | low | Transitive advisories (`katex` prototype pollution, mermaid) | `@cognite/aura` 0.1.2 would be a downgrade. No safe in-range fix | npm audit |

Note: the `@cognite/aura` audit suggestion is a semver-major downgrade to 0.1.2 and should not be applied.
