# When to Mock

Mock at **system boundaries** only:

- External APIs (payment, email, etc.)
- Databases (sometimes - prefer test DB)
- Time/randomness
- File system (sometimes)

Don't mock:

- Your own classes/modules
- Internal collaborators
- Anything you control

## Designing for Mockability

At system boundaries, design interfaces that are easy to mock:

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```typescript
// Easy to mock
function createWebhookResponse(event, yoomoney) {
  return yoomoney.getPayment(event.paymentId);
}

// Hard to mock
function createWebhookResponse(event) {
  const client = new YooMoneyClient(process.env.YOOMONEY_SHOP_ID);
  return client.getPayment(event.paymentId);
}
```

**2. Prefer SDK-style interfaces over generic fetchers**

Create specific functions for each external operation instead of one generic function with conditional logic:

```typescript
// GOOD: Each function is independently mockable
const api = {
  getHouse: (slug) => fetch(`/api/houses?where[slug][equals]=${slug}`),
  getEvents: (limit) => fetch(`/api/events?limit=${limit}`),
  createBooking: (data) => fetch('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
};

// BAD: Mocking requires conditional logic inside the mock
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

The SDK approach means:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per endpoint
