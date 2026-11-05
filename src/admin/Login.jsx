import { useEffect, useState } from 'react'
import { api } from './api'

// Every step of getting in: email and password, a new password on the first
// login, connecting the phone app once, then the 6-digit code every time.
function Login({ state, onDone }) {
  const step = state?.next || 'login'
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action) => {
    setError('')
    setBusy(true)
    try {
      onDone(await action())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cab-login">
      <div className="cab-card">
        <div className="cab-login-brand">BUY SUN</div>
        <h1>Кабинет менеджера</h1>
        {step === 'login' && <PasswordStep busy={busy} run={run} />}
        {step === 'password' && <NewPasswordStep busy={busy} run={run} name={state.user.name} />}
        {step === 'setup-2fa' && <SetupStep busy={busy} run={run} />}
        {step === 'code' && <CodeStep busy={busy} run={run} url="/code" />}
        {error && <p className="cab-error" role="alert">{error}</p>}
      </div>
    </div>
  )
}

function PasswordStep({ busy, run }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => api('POST', '/login', { email, password })) }}>
      <label className="cab-field">
        <span>Email</span>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </label>
      <label className="cab-field">
        <span>Пароль</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button className="cab-btn" disabled={busy}>{busy ? 'Проверяем…' : 'Войти'}</button>
    </form>
  )
}

function NewPasswordStep({ busy, run, name }) {
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const submit = (e) => {
    e.preventDefault()
    if (password !== repeat) return setMismatch(true)
    setMismatch(false)
    run(() => api('POST', '/password', { password }))
  }
  return (
    <form onSubmit={submit}>
      <p className="cab-lead">{name}, это первый вход. Придумайте свой пароль: не короче 10 символов, временный больше не подойдёт.</p>
      <label className="cab-field">
        <span>Новый пароль</span>
        <input type="password" autoComplete="new-password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
      </label>
      <label className="cab-field">
        <span>Ещё раз</span>
        <input type="password" autoComplete="new-password" minLength={10} value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
      </label>
      {mismatch && <p className="cab-error" role="alert">Пароли не совпадают</p>}
      <button className="cab-btn" disabled={busy}>Сохранить пароль</button>
    </form>
  )
}

function SetupStep({ busy, run }) {
  const [setup, setSetup] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api('POST', '/2fa/setup').then(setSetup).catch((err) => setError(err.message))
  }, [])
  if (error) return <p className="cab-error">{error}</p>
  if (!setup) return <p className="cab-lead">Готовим QR-код…</p>
  return (
    <div>
      <p className="cab-lead">Вход в кабинет защищён кодом с телефона. Это делается один раз:</p>
      <ol className="cab-steps">
        <li>Установите на телефон <b>Google Authenticator</b> или <b>Яндекс Ключ</b>.</li>
        <li>В приложении нажмите «+» и отсканируйте этот QR-код.</li>
        <li>Введите 6 цифр, которые покажет приложение.</li>
      </ol>
      <img className="cab-qr" src={setup.qr} alt="QR-код для приложения" width="220" height="220" />
      <p className="cab-secret">Не получается отсканировать? Введите ключ вручную: <code>{setup.secret}</code></p>
      <CodeStep busy={busy} run={run} url="/2fa/confirm" />
    </div>
  )
}

function CodeStep({ busy, run, url }) {
  const [code, setCode] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => api('POST', url, { code })) }}>
      {url === '/code' && <p className="cab-lead">Откройте приложение с кодами на телефоне и введите 6 цифр для BUY SUN.</p>}
      <label className="cab-field">
        <span>Код из приложения</span>
        <input
          className="cab-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          required
          autoFocus
        />
      </label>
      <button className="cab-btn" disabled={busy || code.length !== 6}>{busy ? 'Проверяем…' : 'Подтвердить'}</button>
    </form>
  )
}

export default Login
