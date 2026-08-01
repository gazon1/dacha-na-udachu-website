import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

/**
 * Safe wrapper around `after(() => revalidatePath(...))` that no-ops
 * outside a Next.js request scope.
 *
 * Why we need this: `after()` from `next/server` only works during a
 * request (Server Component, Route Handler, Server Action). It throws
 * "after was called outside a request scope" when invoked from bin
 * scripts like `payload seed` or `payload migrate`, which run as
 * standalone Node processes with no request context.
 *
 * Bin scripts never need to revalidate — they're not modifying the
 * live site, they're populating the database. So silently dropping
 * the call is correct.
 */
export function revalidateAfter(path: string): void {
  try {
    after(() => {
      revalidatePath(path)
    })
  } catch {
    // Outside a request scope (e.g. `payload seed`, `payload migrate`).
    // Skipping is safe — these scripts don't render pages.
  }
}
