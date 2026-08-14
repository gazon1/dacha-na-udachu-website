const FALLBACK = 'https://dacha.maxdrobin.ru'

export function siteUrl(path = ''): string {
  const base = process.env.PAYLOAD_PUBLIC_SERVER_URL ?? FALLBACK
  return path ? `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : base
}

export function siteEventsUrl(slug: string): string {
  return siteUrl(`events/${slug}`)
}
