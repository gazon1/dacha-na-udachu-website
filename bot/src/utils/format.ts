/**
 * Форматирование для сообщений.
 */

/**
 * "1 234 ₽" — русское форматирование чисел с пробелами.
 */
export function formatRub(n: number): string {
  return `${n.toLocaleString('ru-RU')} ₽`
}

/**
 * "500 рублей / 1 рубль / 2 рубля / 5 рублей"
 */
export function pluralRubles(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'рублей'
  if (mod10 === 1) return 'рубль'
  if (mod10 >= 2 && mod10 <= 4) return 'рубля'
  return 'рублей'
}

/**
 * "13 августа 2026, среда" — для дат событий.
 */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'short',
  })
}

/**
 * "13 авг." — короткий формат для списка событий.
 */
export function formatDateShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Обрезка строки с многоточием.
 */
export function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}
