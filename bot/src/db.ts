/**
 * Payload singleton для бота — переиспользует ту же конфигурацию, что и app.
 *
 * Вызывает getPayload() один раз на процесс, дальше кешируется внутри Payload.
 * В dev (tsx watch) и в проде (tsx через npx) — один и тот же путь:
 * импорт .ts файла напрямую.
 */
import { getPayload } from 'payload'
import payloadConfig from '../../payload.config'

let payloadPromise: ReturnType<typeof getPayload> | null = null

export async function getBotPayload() {
  if (!payloadPromise) {
    payloadPromise = getPayload({ config: payloadConfig })
  }
  return payloadPromise
}
