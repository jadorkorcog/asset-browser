# Design Review — Asset Browser — round 1

## User and tasks

- **Primary user:** Operations analyst who tracks the company's current assets and handles reporting. Works mixed between a desk and a control room, using a desktop or laptop browser.
- **Tasks evaluated:**
  1. Search for an asset by name or description, then submit.
  2. Filter the results by asset type, combined with search.
- **Context:** Desktop browser. Time-sensitive reporting work. Success criterion from `App-Brief.md`: asset lookup under 2 minutes, down from up to 5 minutes today.

## Task walkthrough findings

- **Task 1 — Search.** Searched for "enchilada", pressed the Search button, and got one result ("A (Enchilada)-FIXED"). The details panel opened on the right. Worked first time. Everything was clear.
- **Task 2 — Filter.** Searched for "tlp" (intended to find platforms) with type "Field", which returned "No assets found". The details panel still showed "A (Enchilada)-FIXED", an Offshore Platform that the filter excluded. Finding: the selected asset stays visible when the current list no longer includes it. This is the main UX issue. A second run chose a company type with the search "enchilada" and returned no results, which is the correct behavior. The user found everything clear.

## Scores

| Question | Score | Rationale | Improvement note |
| --- | --- | --- | --- |
| Q1 Aura consistency | 5 | Aura used in 5 files. No hard-coded hex, rgb, or hsl values. No style overrides found. | Run the `aura/no-overriding-styles` lint rule to confirm. |
| Q2 Navigation & hierarchy | 4 | Walkthrough found navigation clear. The details panel stays on an asset the active filter excludes, so the list and details disagree. | Clear or deselect the selected asset when the filter excludes it, or show a note that it is outside the current filter. |
| Q3 Labels & language | 4 | Walkthrough found everything clear. One vague-label match in `src/assets/AssetSearchBar.tsx` is unverified. | Check the one vague-label match and confirm the label is specific. |
| Q4 Feedback & validation | 4 | Loading, error, and empty states exist for the list and details. No ErrorBoundary. Host connection failure shows loading forever. | Add an ErrorBoundary and surface the host connection error (see code review). |
| Q5 Clickability | 5 | No `div` or `span` click handlers. Interactions use Aura buttons. | None. |
| Q6 Error prevention | 5 | Read-only app with no destructive actions. Rubric default is 5. | None. |
| Q7 Responsive | 4 | Desktop-only by design. Rendered cleanly on desktop. Smaller sizes not tested. | Test a laptop-width viewport (around 1280px) and confirm the two-column layout still works. |
| Q8 Empty states | 4 | "No assets found. Try a different search or filter." and "Select an asset" both exist. The stale selected asset during an empty result weakens the empty state. | Fix the stale selection (see Q2). |
| Q9 Performance | 4 | Production build: 554 kB raw, 176 kB gzipped JS. Under the 1 MB gzipped limit. Lists are paginated. No code splitting; the build warns about chunk size. | Code-split the app to reduce the initial bundle. |
| Q10 Accessibility | 3 | Six `aria-label`s found. No images missing alt text. No focus-visible styles or `tabIndex` usage in app code. No axe scan run. | Run an axe scan, confirm keyboard-only navigation, and check focus indicators and contrast. |

## Summary

- Average score: 4.2
- Quality level: Good

## Must Fix (any score < 3)

- None.

## Should Fix (any score 3 – 3.7)

- Q10 Accessibility (3): run an axe scan, verify keyboard-only navigation and focus indicators, and check contrast. Add focus styles if Aura does not provide them.

## Nice to Fix (any score 3.8 – 4.4)

- Q2 Navigation (4): clear or deselect the selected asset when the active filter excludes it.
- Q3 Labels (4): verify the one vague-label match in `src/assets/AssetSearchBar.tsx`.
- Q4 Feedback (4): add an ErrorBoundary and surface the host connection error.
- Q7 Responsive (4): test a laptop-width viewport.
- Q8 Empty states (4): fixing the stale selection (Q2) also fixes this.
- Q9 Performance (4): code-split the app to reduce the initial bundle.
