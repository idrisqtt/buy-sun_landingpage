import { useEffect, useState } from 'react'
import { api } from './api'
import { DeliveryBadges, TYPE_LABELS, formatDate } from './common'

const FILTERS = [
  ['', 'Все'],
  ['anketa', 'Анкеты'],
  ['callback', 'Обратный звонок'],
  ['quick', 'Оставьте заявку'],
]

function LeadList({ onError }) {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  // Search after a short pause in typing
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(q.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [q])

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (type) params.set('type', type)
    if (page > 1) params.set('page', page)
    api('GET', `/leads?${params}`)
      .then((d) => { if (!cancelled) { setData(d); setError('') } })
      .catch((err) => { if (!cancelled) { setError(err.message); onError(err) } })
    return () => { cancelled = true }
  }, [search, type, page, onError])

  return (
    <section>
      <div className="cab-toolbar">
        <input
          className="cab-search"
          type="search"
          placeholder="Имя, телефон, email или номер заявки"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Поиск"
        />
        <div className="cab-filters" role="tablist">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={type === value}
              className={type === value ? 'active' : ''}
              onClick={() => { setType(value); setPage(1) }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="cab-error">{error}</p>}
      {data && data.items.length === 0 && <p className="cab-empty">Ничего не найдено</p>}

      {data && data.items.length > 0 && (
        <ul className="cab-list">
          {data.items.map((lead) => (
            <li key={lead.id}>
              <a href={`#/leads/${lead.id}`} className="cab-row">
                <span className="cab-row-id">#{lead.id}</span>
                <span className="cab-row-main">
                  <b>{lead.name || lead.phone}</b>
                  <small>{TYPE_LABELS[lead.type]}{lead.position ? ` · ${lead.position}` : ''}</small>
                </span>
                <span className="cab-row-phone">{lead.phone}</span>
                <span className="cab-row-date">{formatDate(lead.created_at)}</span>
                <DeliveryBadges lead={lead} compact />
              </a>
            </li>
          ))}
        </ul>
      )}

      {data && data.pages > 1 && (
        <div className="cab-pages">
          <button type="button" className="cab-link" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Новее</button>
          <span>Страница {data.page} из {data.pages} · всего {data.total}</span>
          <button type="button" className="cab-link" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Старше →</button>
        </div>
      )}
    </section>
  )
}

export default LeadList
