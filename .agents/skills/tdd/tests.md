# Good and Bad Tests

## Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```typescript
// GOOD: Tests observable behavior
test("contribution is retrievable by its secret key", async () => {
  const result = await fetchContributionBySecretKey(key);
  expect(result.amount).toBe(1500);
});

// GOOD: The negative that actually protects the route
test("contribution response does not leak the contributor name", async () => {
  const result = await fetchContributionBySecretKey(key);
  expect(result).not.toHaveProperty("name");
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```typescript
// BAD: Tests implementation details
test("findBySecretKey calls payload.find", async () => {
  const spy = vi.spyOn(payload.db, "find");
  await findBySecretKey(key);
  expect(spy).toHaveBeenCalled();
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

```typescript
// BAD: Bypasses interface to verify
test("createBooking writes a row to bookings", async () => {
  await createBooking({ house, guest });
  const row = await db.query("SELECT * FROM bookings WHERE ...", [...]);
  expect(row).toBeDefined();
});

// GOOD: Verifies through interface
test("createBooking makes the booking retrievable", async () => {
  const booking = await createBooking({ house, guest });
  const retrieved = await getBooking(booking.id);
  expect(retrieved.house.id).toBe(house.id);
});
```

**Tautological tests**: Expected value restates the implementation, so the test passes by construction.

```typescript
// BAD: Expected value is recomputed the way the code computes it
test("verifyYoMoneySignature sums the body the same way the impl does", () => {
  const body = JSON.stringify(payload);
  const expected = buildMac(body);           // the very function under test
  expect(verifyYoMoneySignature(body, expected)).toBe(true);
});

// GOOD: Expected value is an independent, known literal — the other side of the signature
test("verifyYoMoneySignature accepts a signature computed by the provider algorithm", () => {
  expect(verifyYoMoneySignature(body, KNOWN_GOOD_SIGNATURE)).toBe(true);
});
```
