/**
 * One-time YooMoney OAuth authorization page.
 *
 * Opens YooMoney's consent screen via /api/event-contributions/yoomoney-auth.
 * On success YooMoney redirects back to /api/event-contributions/yoomoney-callback,
 * which displays the access token for the admin to copy into .env.
 *
 * Visit this page once after registering the YooMoney app and adding
 * YOOMONEY_* to your .env. Restart the server after updating YOOMONEY_ACCESS_TOKEN.
 */
export default function YoomoneyAuthPage() {
  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">Авторизация ЮMoney</h1>
      <p className="text-base-content/80">
        Чтобы автоматически сверять добровольные взносы на события, нужно один раз
        разрешить нашему сайту читать историю входящих переводов вашего кошелька ЮMoney.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-base-content/80">
        <li>Нажмите кнопку ниже — откроется окно ЮMoney.</li>
        <li>Войдите и подтвердите доступ (нужен код из SMS или email).</li>
        <li>ЮMoney вернёт вас на наш сайт, где будет показан access token.</li>
        <li>
          Скопируйте token и добавьте в файл <code>.env</code>:
          <pre className="bg-base-200 p-3 mt-2 rounded font-mono text-sm">
            YOOMONEY_ACCESS_TOKEN=&lt;скопированное_значение&gt;
          </pre>
        </li>
        <li>Перезапустите сервер (token читается из env при старте).</li>
      </ol>
      <a
        href="/api/event-contributions/yoomoney-auth"
        className="btn btn-primary btn-lg w-full"
      >
        Авторизовать ЮMoney
      </a>
      <p className="text-sm text-base-content/60">
        Если кнопка возвращает ошибку <code>yoomoney_not_configured</code>, проверьте,
        что в <code>.env</code> заданы <code>YOOMONEY_CLIENT_ID</code>,{' '}
        <code>YOOMONEY_REDIRECT_URI</code> и <code>YOOMONEY_WALLET</code>.
      </p>
    </div>
  )
}