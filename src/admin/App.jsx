import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from './api'
import Login from './Login'
import LeadList from './LeadList'
import LeadPage from './LeadPage'

// #/ is the list, #/leads/123 one lead (the link from Bitrix24 opens it directly)
const useHashRoute = () => {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const match = /^#\/leads\/(\d+)/.exec(hash)
  return match ? { page: 'lead', id: Number(match[1]) } : { page: 'list' }
}

function App() {
  const [me, setMe] = useState(undefined) // undefined: checking, null: logged out
  const route = useHashRoute()

  const refresh = useCallback(async () => {
    try {
      setMe(await api('GET', '/me'))
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Any 401 later (session ended) brings the login back
  const onError = useCallback((err) => {
    if (err instanceof ApiError && err.status === 401) setMe(null)
  }, [])

  const logout = async () => {
    await api('POST', '/logout').catch(() => {})
    setMe(null)
  }

  if (me === undefined) return <div className="cab-loading">Загрузка…</div>
  if (!me || me.next) return <Login state={me} onDone={setMe} />

  return (
    <div className="cab">
      <header className="cab-top">
        <a className="cab-brand" href="#/">BUY SUN <span>Кабинет менеджера</span></a>
        <div className="cab-user">
          <span>{me.user.name}</span>
          <button type="button" className="cab-link" onClick={logout}>Выйти</button>
        </div>
      </header>
      <main className="cab-main">
        {route.page === 'lead'
          ? <LeadPage key={route.id} id={route.id} onError={onError} />
          : <LeadList onError={onError} />}
      </main>
    </div>
  )
}

export default App
