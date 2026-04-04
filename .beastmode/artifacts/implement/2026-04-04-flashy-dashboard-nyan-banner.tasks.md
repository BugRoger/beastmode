# Nyan Banner — Implementation Tasks

## Goal

Add a `NyanBanner` component that renders the 2-line beastmode ASCII block-character art with continuously cycling nyan cat rainbow colors, and integrate it into the ThreePanelLayout header replacing the plain cyan "beastmode" text.

## Architecture

- **Pure color engine** (`nyan-colors.ts`): stateless function mapping `(charIndex, tickOffset)` to one of 6 hex colors
- **React component** (`NyanBanner.tsx`): calls color engine, runs 80ms animation loop via `useEffect`
- **Layout integration** (`ThreePanelLayout.tsx`): swaps plain `<Text>` for `<NyanBanner />`
- **Tests** (`nyan-banner.test.ts`): pure function tests for color engine logic

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `cli/src/dashboard/nyan-colors.ts` | Pure color cycling engine |
| Create | `cli/src/dashboard/NyanBanner.tsx` | React component with animation loop |
| Modify | `cli/src/dashboard/ThreePanelLayout.tsx` | Replace plain header with NyanBanner |
| Create | `cli/src/__tests__/nyan-banner.test.ts` | Unit tests for color engine + banner logic |

---

## Task 0: Color Cycling Engine + Tests

**Wave:** 1 — **Status: DONE**

- [x] Step 1: Write the color engine
- [x] Step 2: Write the unit tests
- [x] Step 3: Run tests to verify they pass
- [x] Step 4: Commit

## Task 1: NyanBanner React Component

**Wave:** 2 — **Status: DONE**

- [x] Step 1: Create the NyanBanner component
- [x] Step 2: Verify the component compiles
- [x] Step 3: Commit

## Task 2: Integrate NyanBanner into ThreePanelLayout

**Wave:** 3 — **Status: DONE**

- [x] Step 1: Replace header text with NyanBanner
- [x] Step 2: Add integration-style tests for banner text constants
- [x] Step 3: Run all tests to verify nothing broke
- [x] Step 4: Commit
