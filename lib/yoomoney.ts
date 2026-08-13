/**
 * ЮMoney OAuth + REST API wrapper.
 *
 * Docs:
 *   - Authorization: https://yoomoney.ru/docs/wallet/using-api/authorization
 *   - Operation history: https://yoomoney.ru/docs/wallet/using-api/operation-history
 *   - Notifications: https://yoomoney.ru/docs/wallet/using-api/notifications
 *
 * We use the OAuth app flow (register app as individual, get client_id +
 * optional client_secret). No "payment.*" scope — guests click a quickpay
 * link and pay themselves; we only read the history to match incoming
 * transfers to pending EventContributions by `label = secretKey`.
 */

const AUTH_BASE = 'https://yoomoney.ru/oauth'
const API_BASE = 'https://yoomoney.ru/api'
const QUICKPAY_BASE = 'https://yoomoney.ru/quickpay/confirm'

export type YoomoneyConfig = {
  clientId: string
  clientSecret?: string
  redirectUri: string
  wallet: string // "41001XXXXXXXX" — номер кошелька получателя
}

export type OperationStatus = 'success' | 'refused' | 'in_progress'

export type YoomoneyOperation = {
  operation_id: string
  status: OperationStatus
  datetime: string // ISO 8601, e.g. "2026-08-13T14:32:11Z"
  title: string
  pattern_id: string | null
  direction: 'in' | 'out'
  amount: number
  amount_currency: string // "643"
  label: string | null
  type: string // "deposition" / "payment" / ...
  is_sbp_operation: boolean
}

export type YoomoneyOperationDetails = YoomoneyOperation & {
  details?: string // "Payment comment" — содержит message из формы
}

export type YoomoneyAccountInfo = {
  account: string
  balance: number
  currency: string
  account_status: string // "identified" / "anonymous" / ...
  account_type: string
}

/**
 * Build the OAuth authorization URL — redirect the user (admin) here to grant
 * access. After approval, YooMoney redirects back to `redirect_uri` with `?code=`.
 */
export function getAuthorizeUrl(
  cfg: YoomoneyConfig,
  scope: string[] = ['account-info', 'operation-history', 'operation-details'],
): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: scope.join(' '),
  })
  return `${AUTH_BASE}/authorize?${params.toString()}`
}

/**
 * Exchange the OAuth code for an access token.
 *
 * POST https://yoomoney.ru/oauth/token
 * Content-Type: application/x-www-form-urlencoded
 * Body: code=...&client_id=...&client_secret=...&redirect_uri=...&grant_type=authorization_code
 */
export async function exchangeCodeForToken(
  cfg: YoomoneyConfig,
  code: string,
): Promise<string> {
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    grant_type: 'authorization_code',
  })
  if (cfg.clientSecret) {
    body.set('client_secret', cfg.clientSecret)
  }
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`yoomoney_token_exchange_failed: ${res.status}`)
  }
  const data = (await res.json()) as { access_token?: string; error?: string }
  if (!data.access_token) {
    throw new Error(`yoomoney_token_missing: ${data.error ?? 'unknown'}`)
  }
  return data.access_token
}

/**
 * Fetch operation history. YooMoney accepts both GET query and POST form
 * bodies; we use POST with application/x-www-form-urlencoded and ask for JSON.
 *
 * If `label` is set, YooMoney returns only operations with that label.
 * If `from` is set, history is filtered from that point.
 */
export async function getOperationHistory(
  token: string,
  opts: { label?: string; from?: Date; till?: Date; records?: number } = {},
): Promise<YoomoneyOperation[]> {
  const body = new URLSearchParams({ format: 'json' })
  if (opts.label) body.set('label', opts.label)
  if (opts.from) body.set('from', opts.from.toISOString())
  if (opts.till) body.set('till', opts.till.toISOString())
  if (opts.records) body.set('records', String(opts.records))

  const res = await fetch(`${API_BASE}/operation-history`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    throw new Error(`yoomoney_history_failed: ${res.status}`)
  }
  const data = (await res.json()) as { operations?: YoomoneyOperation[] }
  return data.operations ?? []
}

/**
 * Fetch details of a single operation by its `operation_id`. Returns the
 * `details` field which contains the payment comment if the user provided one.
 */
export async function getOperationDetails(
  token: string,
  operationId: string,
): Promise<YoomoneyOperationDetails | null> {
  const body = new URLSearchParams({
    operation_id: operationId,
    format: 'json',
  })
  const res = await fetch(`${API_BASE}/operation-details`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    throw new Error(`yoomoney_details_failed: ${res.status}`)
  }
  const data = (await res.json()) as YoomoneyOperationDetails | null
  return data
}

/**
 * Build the quickpay URL — the link the guest clicks to pay.
 * YooMoney supports both `PC` (from YooMoney wallet) and `AC` (from any card);
 * we use `AC` to accept cards directly without forcing the user to have a
 * YooMoney wallet.
 */
export function buildQuickpayUrl(
  wallet: string,
  opts: {
    sum: number
    label: string
    targets: string // отображается как "назначение платежа"
    successUrl?: string
    paymentType?: 'PC' | 'AC'
  },
): string {
  const params = new URLSearchParams({
    receiver: wallet,
    'quickpay-form': 'shop',
    targets: opts.targets.slice(0, 150), // YooMoney limits targets length
    paymentType: opts.paymentType ?? 'AC',
    sum: String(opts.sum),
    label: opts.label,
  })
  if (opts.successUrl) params.set('successUrl', opts.successUrl)
  return `${QUICKPAY_BASE}?${params.toString()}`
}

/**
 * Verify the YooMoney webhook notification signature.
 *
 * YooMoney (since May 2026) uses `sign` = HMAC-SHA256 in HEX, not the
 * deprecated `sha1_hash`. Algorithm:
 *   1. Take all POST params except `sign`
 *   2. Sort by key A-Z
 *   3. URL-encode each value (RFC 3986, UTF-8)
 *   4. Concatenate as `key1=value1&key2=value2&...` (empty values as `key=`)
 *   5. HMAC-SHA256(string, secret) → HEX lowercase
 *   6. Compare with `sign`
 */
export async function verifyWebhookSignature(
  body: Record<string, string>,
  secret: string,
): Promise<boolean> {
  const sign = body.sign
  if (!sign) return false

  const params = Object.entries(body)
    .filter(([k]) => k !== 'sign')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

  const stringToSign = params
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign))
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // constant-time compare
  if (computed.length !== sign.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ sign.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Read env-backed YooMoney config. Returns null if not configured (widget
 * should then fall back to manual confirmation flow).
 */
export function getYoomoneyConfig(): YoomoneyConfig | null {
  const clientId = process.env.YOOMONEY_CLIENT_ID
  const redirectUri = process.env.YOOMONEY_REDIRECT_URI
  const wallet = process.env.YOOMONEY_WALLET
  if (!clientId || !redirectUri || !wallet) return null
  return {
    clientId,
    clientSecret: process.env.YOOMONEY_CLIENT_SECRET || undefined,
    redirectUri,
    wallet,
  }
}