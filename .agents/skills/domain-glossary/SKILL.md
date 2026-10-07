---
name: domain-glossary
description: Decide whether a term belongs in docs/CONTEXT.md and add it correctly.
---

# Domain Glossary

## When to use

A term appears in two or more features with a specific meaning that differs from common English. Before adding a new domain term or alias, use this skill to decide if it belongs in `docs/CONTEXT.md`.

## Decision tree

```
TERM TO CONSIDER
    │
    ├─── Is it used in only ONE feature?
    │         YES → ❌ Do NOT add to CONTEXT.md. Local to that feature.
    │         NO  → ✅ Continue
    │
    ├─── Does it mean the same as common English?
    │         YES → ❌ Do NOT add to CONTEXT.md. No special meaning.
    │         NO  → ✅ Continue
    │
    ├─── Is it referenced in an ADR?
    │         YES → ✅ Add to CONTEXT.md with "Used in: ADR-name"
    │         NO  → Continue
    │
    └─── Could a reader confuse it with a synonym or alias?
             YES → ✅ Add to CONTEXT.md with "Also known as: alias1, alias2"
             NO  → ⚠️  Consider adding anyway if term is architecturally significant
```

## Definition format

```markdown
## Term Name

**Also known as:** alias1, alias2    # omit if no aliases

Brief definition (1-3 sentences). Explain what it is, not how it's implemented.

**Used in:** `House` (`collections/Houses.ts`), `Event` (`collections/Events.ts`)
```

## How to add a term

1. Edit `docs/CONTEXT.md`
2. Find the right alphabetical position (terms are ordered A-Z by canonical name)
3. Add the definition using the format above
4. If the term has an alias, add "Also known as" with the old name

## Examples

### Example 1: New domain term (no alias)

**Term:** `Booking`
**Decision:** YES — a booking request spans the house page, the booking form, the admin widget and the bot
**Definition:**
```markdown
## Booking

**Booking** is a guest's request to stay in a house for a date range. It is a request, not a
confirmed reservation — the admin confirms it manually.

**Used in:** `collections/Bookings.ts`, `app/(frontend)/booking`, `components/admin/widgets/RecentBookings`
```

### Example 2: Term with alias

**Term:** `Contribution`
**Alias to deprecate:** `Donation`
**Decision:** YES — Donation is informal, Contribution is the entity name
**Definition:**
```markdown
## Contribution

**Also known as:** Donation (informal, avoid)

**Contribution** is a participant's pledge to an event, tracked against a target amount and
retrieved later by a secret key.

**Used in:** `collections/EventContributions.ts`, `app/(frontend)/events`, `bot/`
```

## Common pitfalls

1. **Adding implementation details** — CONTEXT.md defines *what* a term means, not *how* it works. Keep definitions at the domain level.
2. **Aliases without canonical names** — always pick one name as canonical, mark others as "Also known as".
3. **Cross-feature confusion** — if two features use the same term differently, that IS a domain term: add it with both usages documented.
4. **Over-defining** — not every class name needs to be here. If it only appears in one feature's internal implementation, it does not belong in CONTEXT.md.
