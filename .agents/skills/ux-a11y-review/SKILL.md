---
name: ux-a11y-review
description: Accessibility and UX review checklist for web UI changes — contrast, focus, screen reader, keyboard navigation, reduced motion.
---

# UX / Accessibility Review

## When to use

- Before merging any user-facing UI change (page, component, layout, form)
- When reviewing a PR that adds or modifies rendered markup
- When a user reports a usability issue

## Prerequisites

- WCAG 2.1 AA standards
- DaisyUI theme values in `globals.css` (the `everpet` dark theme is the reference)
- A screen reader is not required to catch most blocking issues

## Step-by-step

### Step 1 — Visual review

- [ ] Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI borders
- [ ] No information conveyed by color alone (status pills carry text or an icon too)
- [ ] Text reflows at 320px width without horizontal scroll
- [ ] Text scales correctly at 200% zoom (`next/font` with `display: swap` keeps layout stable)
- [ ] Images keep their aspect ratio — no CLS on load

### Step 2 — Keyboard navigation

- [ ] All interactive elements are real `<button>`/`<a>`/`<input>` — not `<div onClick>`
- [ ] Focus order follows visual/DOM order
- [ ] Focus is visible (do not remove the outline without a replacement)
- [ ] `Escape` closes modals/drawers; focus returns to the trigger on close
- [ ] Tabs implement `role="tablist"`, `role="tab"`, `aria-selected`, and arrow-key movement
- [ ] No keyboard trap (focus can always leave)

### Step 3 — Screen reader

- [ ] Every `<img>` has `alt`; decorative images use `alt=""`
- [ ] Buttons announce their action, not just their label
- [ ] Form fields have associated `<label htmlFor>`; errors use `aria-describedby`
- [ ] Status/toast messages land in a live region (`components/layout/Toaster`)
- [ ] Reading order is logical — do not reorder with CSS `order` against the DOM order
- [ ] Icon-only controls carry an accessible name (`aria-label` or visually-hidden text)

### Step 4 — Motion and animation

- [ ] Animations respect `prefers-reduced-motion`
- [ ] No flashing content (>3 flashes per second)
- [ ] Transitions ≤ 300ms

### Step 5 — Content and copy

- [ ] Error messages are specific and in the user's language
- [ ] Empty states have a message and a call to action
- [ ] Loading states are indicated — every async route has `loading.tsx` or a skeleton
- [ ] No lorem ipsum or placeholder text shipped to production

## Common pitfalls

1. **`aria-label` missing on icon buttons** — the most frequent issue in this codebase
2. **Missing `alt` on CMS-driven images** — content editors will ship broken images
3. **CSS `order` reordering** — visual and focus order diverge, which screen readers follow as DOM order
4. **Focus outline removed** — `outline: none` with nothing in its place
5. **Color-only status** — booking status, contribution state, RSVP presence
6. **Modal without focus management** — focus stays behind the overlay

## Decision tree: when to block

```
REVIEWER SEES ISSUE
  │
  ├─── Contrast ratio < 4.5:1 for body text?
  │         YES → BLOCK — WCAG AA violation
  │         NO  → Continue
  │
  ├─── Interactive element not reachable by keyboard?
  │         YES → BLOCK — keyboard navigation broken
  │         NO  → Continue
  │
  ├─── Image or icon button without accessible name?
  │         YES → BLOCK — screen reader cannot describe it
  │         NO  → Continue
  │
  ├─── Information conveyed by color alone?
  │         YES → BLOCK — colorblind users cannot see it
  │         NO  → Continue
  │
  ├─── Form field without a label?
  │         YES → BLOCK — unusable with a screen reader
  │         NO  → Continue
  │
  └─── All checks pass → APPROVE (with non-blocking suggestions)
```

## Output template

```
## UX/A11y Review: PR-XXX

**Visual:** PASS / FAIL
- [ ] Contrast: FAIL — button text #AAAAAA on #FFFFFF (2.8:1)
- [ ] Reflow at 320px: PASS
- [ ] Color-only info: PASS

**Keyboard:** PASS / FAIL
- [ ] Focus order: FAIL — skip link after the nav
- [ ] Focus visible: PASS

**Screen reader:** PASS / FAIL
- [ ] Accessible names: FAIL — filter icon button has none
- [ ] Reading order: PASS

**Motion:** PASS / FAIL
- [ ] prefers-reduced-motion: PASS

**Blocking issues:** 2
**Non-blocking suggestions:** 3
```