import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { SocksProxyAgent } from 'socks-proxy-agent'

/**
 * Custom fetch-обёртка для запросов к api.telegram.org через SOCKS5 proxy.
 *
 * Используется ТОЛЬКО для исходящих запросов бота к Telegram (Bot API).
 * Все остальные HTTP-запросы в этом проекте (Payload DB через Postgres,
 * internal broadcast между app и bot внутри Docker network) идут
 * напрямую — SOCKS5 нужен только для обхода блокировок Telegram в РФ.
 *
 * Реализация: Node http/https request с агентом socks-proxy-agent.
 * Native fetch не поддерживает SOCKS5 из коробки, поэтому оборачиваем.
 *
 * @param proxyUrl — socks5://[user:pass@]host:port
 */
export function createProxiedFetch(proxyUrl: string): typeof fetch {
  // Таймаут SOCKS5-коннекта — 10 секунд. Без него SocksClient зависает
  // на дефолтных ~120s и Docker успевает сделать healthcheck-fail +
  // restart. 10s — баланс между терпимостью к медленному прокси и
  // быстрой диагностикой.
  const agent = new SocksProxyAgent(proxyUrl, {
    timeout: 10_000,
  })
  console.log(`[telegram-fetch] using SOCKS5 proxy: ${redactProxy(proxyUrl)}`)

  // Тестируем прокси сразу — если он недоступен (типичная ситуация:
  // неправильный URL/порт или firewall в Docker network), лучше узнать
  // сейчас, чем при первом Bot API запросе.
  void testProxy(proxyUrl)

  // Типизируем через `typeof fetch` чтобы не зависеть от DOM lib
  // (bot tsconfig использует только ES2022 — RequestInfo/BodyInit там нет).
  type FetchInput = Parameters<typeof fetch>[0]
  type FetchInit = Parameters<typeof fetch>[1]

  return (async (input: FetchInput, init?: FetchInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString()
    const parsed = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const lib = isHttps ? https : http

    const headers: Record<string, string> = {}
    if (init?.headers) {
      // Headers могут быть Headers, Record<string, string> или массивом [k, v][].
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => {
          headers[k] = v
        })
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) headers[k] = v
      } else {
        Object.assign(headers, init.headers)
      }
    }

    const body = normalizeBody(init?.body)

    return new Promise<Response>((resolve, reject) => {
      const reqOpts: http.RequestOptions = {
        method: init?.method ?? 'GET',
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? '443' : '80'),
        path: parsed.pathname + parsed.search,
        headers,
        agent,
      }

      const req = lib.request(reqOpts, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          const responseHeaders = new Headers()
          for (const [k, v] of Object.entries(res.headers)) {
            if (Array.isArray(v)) {
              for (const item of v) responseHeaders.append(k, item)
            } else if (v !== undefined) {
              responseHeaders.set(k, v)
            }
          }
          resolve(
            new Response(buf, {
              status: res.statusCode ?? 0,
              statusText: res.statusMessage ?? '',
              headers: responseHeaders,
            }),
          )
        })
      })

      req.on('error', reject)

      if (init?.signal) {
        if (init.signal.aborted) {
          req.destroy()
          reject(new Error('aborted'))
          return
        }
        init.signal.addEventListener('abort', () => req.destroy())
      }

      if (body !== undefined) {
        req.write(body)
      }
      req.end()
    })
  }) as typeof fetch
}

/**
 * Приводит body из fetch к Buffer | undefined. Используется только для
 * исходящих Bot API запросов — они обычно содержат JSON или form-data.
 */
function normalizeBody(body: unknown): Buffer | undefined {
  if (body === null || body === undefined) return undefined
  if (Buffer.isBuffer(body)) return body
  if (typeof body === 'string') return Buffer.from(body, 'utf8')
  if (body instanceof URLSearchParams) return Buffer.from(body.toString(), 'utf8')
  if (body instanceof ArrayBuffer) return Buffer.from(body)
  if (ArrayBuffer.isView(body)) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength)
  }
  // FormData / ReadableStream — Telegram API это не использует, кидаем.
  throw new Error('unsupported body type for SOCKS5-proxied fetch')
}

/**
 * Прячет пароль в URL прокси при логировании.
 * socks5://user:secret@host:port → socks5://user:***@host:port
 */
function redactProxy(url: string): string {
  try {
    const u = new URL(url)
    if (u.password) {
      return `${u.protocol}//${u.username}:***@${u.host}${u.pathname}`
    }
    return `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    return '<unparseable proxy url>'
  }
}

/**
 * Проверяет, что прокси реально доступен. Делает короткий тест-коннект
 * через net.Socket (TCP). Не выполняет SOCKS-handshake — это делает
 * SocksProxyAgent сам при первом HTTP-запросе.
 */
async function testProxy(proxyUrl: string): Promise<void> {
  try {
    const u = new URL(proxyUrl)
    const host = u.hostname
    const port = Number(u.port || '1080')
    await new Promise<void>((resolve, reject) => {
      const socket = net.connect({ host, port, timeout: 5_000 })
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.once('timeout', () => {
        socket.destroy()
        reject(new Error('tcp connect timeout'))
      })
      socket.once('error', reject)
    })
    console.log(`[telegram-fetch] SOCKS5 proxy reachable at ${host}:${port}`)
  } catch (err) {
    console.warn(
      `[telegram-fetch] SOCKS5 proxy unreachable: ${(err as Error).message}. ` +
        `Bot API calls will fail until proxy is fixed.`,
    )
  }
}
