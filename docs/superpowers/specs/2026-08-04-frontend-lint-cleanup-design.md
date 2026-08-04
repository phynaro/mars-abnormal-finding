# Frontend Lint Cleanup Design

## Goal

Bring the frontend ESLint baseline to zero findings through small, module-by-module cleanup batches while preserving application behavior.

## Scope

- Apply only to `frontend/`.
- Do not add, change, or enable CI checks.
- Keep the current ESLint rules enabled; do not downgrade rules or use broad suppressions to reduce the baseline.
- Permit small, local refactors only when they are needed to replace unsafe types, remove dead code, or satisfy React Fast Refresh boundaries cleanly.
- Do not introduce formatting tooling as part of this work.

## Current Baseline

`npm run lint` reports 450 errors and 86 warnings across the frontend. The main categories are unused imports and variables, explicit `any` types, React Fast Refresh boundary violations, and React Hook dependency warnings.

## Batch Order

1. Shared foundations: `components/ui`, contexts, hooks, utilities, types, and API services.
2. Shared layout and common components.
3. EMS: shared components, equipment, dashboard, schedule, roles, work orders, and EMS pages.
4. EDEN domains: dashboard, tickets, ticket management and approval, home, asset, organization, settings, machine management, personnel, user management, and works.
5. Application entry points and remaining isolated source files.
6. Repository-wide lint cleanup and final verification.

The order resolves shared type and component issues before their feature consumers, limiting repeated changes and reducing merge risk.

## Lint-Fix Standards

- Remove an unused value only after confirming it is not part of a required public API; otherwise consume it or rename an intentionally unused parameter with an underscore only where ESLint configuration permits it.
- Replace `any` with a domain interface, an existing shared type, a generic type parameter, or `unknown` narrowed at the use site. Do not replace `any` with overly broad object types merely to satisfy ESLint.
- For Fast Refresh violations, move shared constants, utilities, or non-component exports into a nearby dedicated module when that preserves a clear API. Do not disable the rule for a whole feature.
- For React Hook dependency findings, first determine whether the dependency represents stable data, a callback that needs memoization, or a stale-closure bug. Change the dependency array or callback structure only when the resulting render and request behavior remains correct.
- Avoid new blanket `eslint-disable` directives. A one-line suppression requires a documented reason in the code and is acceptable only when no correct structural solution exists.

## Verification

Each batch must run lint for its touched paths and a full frontend production build. Changes to effects, callbacks, asynchronous handling, routing, and form behavior also require the closest existing automated test or a focused manual smoke check of the affected flow.

The final batch runs `npm run lint` and `npm run build` from `frontend/`. Completion means both commands succeed with no lint errors or warnings.

## Non-Goals

- Backend or script linting.
- GitHub Actions or other CI changes.
- Styling-only reformatting.
- Broad architecture rewrites unrelated to lint violations.
