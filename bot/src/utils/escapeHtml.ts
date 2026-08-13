/**
 * Экранирование HTML для Telegram Bot API (parse_mode: HTML).
 *
 * Telegram поддерживает ограниченный набор тегов: <b>, <i>, <u>, <s>,
 * <code>, <pre>, <a href="...">. Все угловые скобки и амперсанды в тексте
 * должны быть экранированы.
 *
 * @see https://core.telegram.org/bots/api#html-style
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
