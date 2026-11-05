import { useEffect, useRef, useState } from 'react'
import { api, fileUrl } from './api'
import { SECTIONS, PHOTOS, withAllFields } from './anketaForm'
import { DeliveryBadges, TYPE_LABELS, UTM_LABELS, formatDate } from './common'
import PhotoField from '../PhotoField'
import { processPhoto, defaultFocus } from '../photoUtils'
import { buildAnketaPdf } from '../anketaPdf'
import { blobToDataUrl } from '../api'
import PartnerPanel from './PartnerPanel'
import CanvaButton from './CanvaButton'

const PHOTO_TEXTS = {
  photoProcessing: 'Обрабатываем фото…',
  photoDrag: 'Перетащите фото, чтобы лицо было в круге',
  format: 'Не удалось открыть файл. Выберите фото JPG или PNG.',
  heic: 'Не удалось обработать HEIC. Сохраните фото как JPG.',
  tooLarge: 'Фото слишком большое.',
}

// A stored photo as the PDF builder needs it, without re-compressing it
async function loadStoredPhoto(leadId, file) {
  const response = await fetch(fileUrl(leadId, file.id), { credentials: 'same-origin' })
  if (!response.ok) throw new Error('Не удалось загрузить фото')
  const dataUrl = await blobToDataUrl(await response.blob())
  const img = await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
  const photo = { dataUrl, width: img.naturalWidth, height: img.naturalHeight }
  if (file.kind === 'selfie') photo.focus = file.focus || defaultFocus(photo.width, photo.height)
  return photo
}

function LeadPage({ id, onError }) {
  const [lead, setLead] = useState(null)
  const [error, setError] = useState('')
  // The anketa as it is in the editor now, for the Canva file
  const builder = useRef(null)

  useEffect(() => {
    api('GET', `/leads/${id}`).then(setLead).catch((err) => { setError(err.message); onError(err) })
  }, [id, onError])

  if (error) return <p className="cab-error">{error} <a href="#/">К списку</a></p>
  if (!lead) return <p className="cab-empty">Загрузка…</p>

  const pdf = lead.files.find((f) => f.kind === 'pdf')

  return (
    <article className="cab-lead-page">
      <a href="#/" className="cab-back">← Все заявки</a>
      <div className="cab-head">
        <div>
          <h1>{lead.name || lead.phone}</h1>
          <p className="cab-meta">
            {TYPE_LABELS[lead.type]} #{lead.id} · {formatDate(lead.created_at)}
            {lead.updated_at && lead.events.length > 0 && <> · изменена {formatDate(lead.events[0].created_at)}</>}
          </p>
          <DeliveryBadges lead={lead} />
        </div>
        <div className="cab-actions">
          {pdf && <a className="cab-btn" href={fileUrl(lead.id, pdf.id, true)}>Скачать PDF</a>}
          {lead.type === 'anketa' && <CanvaButton builder={builder} />}
          {lead.type === 'anketa' && (
            <button type="button" className="cab-btn secondary" onClick={() => document.getElementById('partner')?.scrollIntoView({ behavior: 'smooth' })}>
              Для партнёра
            </button>
          )}
          {lead.bitrix_url && <a className="cab-btn secondary" href={lead.bitrix_url} target="_blank" rel="noopener noreferrer">Открыть в Битрикс24</a>}
        </div>
      </div>

      {lead.type === 'anketa'
        ? <AnketaEditor lead={lead} onSaved={setLead} onError={onError} builder={builder} />
        : <ShortLead lead={lead} />}

      {lead.events.length > 0 && (
        <section className="cab-section">
          <h2>История изменений</h2>
          <ul className="cab-history">
            {lead.events.map((e, i) => (
              <li key={i}>
                <time>{formatDate(e.created_at)}</time> {e.user || 'Менеджер'} изменил(а):{' '}
                {[...(e.details?.fields || []), ...(e.details?.files || [])].join(', ') || 'новый PDF'}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

function ShortLead({ lead }) {
  const rows = [['Имя', lead.name], ['Телефон', lead.phone], ...Object.entries(UTM_LABELS).map(([key, label]) => [label, lead.utm?.[key]])]
  return (
    <section className="cab-section">
      <dl className="cab-details">
        {rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {lead.phone && <a className="cab-btn secondary" href={`tel:${lead.phone}`}>Позвонить {lead.phone}</a>}
    </section>
  )
}

function AnketaEditor({ lead, onSaved, onError, builder }) {
  const [answers, setAnswers] = useState(() => withAllFields(lead.answers))
  const [photos, setPhotos] = useState({})
  const [photoStatus, setPhotoStatus] = useState({})
  const [changedPhotos, setChangedPhotos] = useState({})
  const [focusChanged, setFocusChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const savedAnswers = useRef(JSON.stringify(withAllFields(lead.answers)))
  const jobs = useRef({})

  // Current photos from the server
  useEffect(() => {
    let cancelled = false
    for (const { name, kind } of PHOTOS) {
      const file = lead.files.find((f) => f.kind === kind)
      if (!file) continue
      setPhotoStatus((s) => ({ ...s, [name]: { busy: true } }))
      loadStoredPhoto(lead.id, file)
        .then((photo) => { if (!cancelled) { setPhotos((p) => ({ ...p, [name]: photo })); setPhotoStatus((s) => ({ ...s, [name]: {} })) } })
        .catch(() => { if (!cancelled) setPhotoStatus((s) => ({ ...s, [name]: { error: 'format' } })) })
    }
    return () => { cancelled = true }
  }, [lead.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(answers) !== savedAnswers.current || Object.keys(changedPhotos).length > 0 || focusChanged

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const change = (e) => {
    const { name, type, value, checked } = e.target
    setAnswers((a) => ({ ...a, [name]: type === 'checkbox' ? checked : value }))
    setMessage(null)
  }

  const changePhoto = async (e) => {
    const input = e.target
    const { name } = input
    const file = input.files[0]
    if (!file) return
    const job = (jobs.current[name] || 0) + 1
    jobs.current[name] = job
    setPhotoStatus((s) => ({ ...s, [name]: { busy: true } }))
    try {
      const photo = await processPhoto(file)
      if (jobs.current[name] !== job) return
      if (name === 'selfiePhoto') photo.focus = defaultFocus(photo.width, photo.height)
      setPhotos((p) => ({ ...p, [name]: photo }))
      setChangedPhotos((c) => ({ ...c, [name]: true }))
      setPhotoStatus((s) => ({ ...s, [name]: {} }))
      setMessage(null)
    } catch (err) {
      if (jobs.current[name] !== job) return
      input.value = ''
      setPhotoStatus((s) => ({ ...s, [name]: { error: err.code || 'format' } }))
    }
  }

  const changeFocus = (focus) => {
    setPhotos((p) => ({ ...p, selfiePhoto: { ...p.selfiePhoto, focus } }))
    setFocusChanged(true)
    setMessage(null)
  }

  const busy = Object.values(photoStatus).some((s) => s.busy)
  builder.current = () => ({ answers, photos, waiting: busy })

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const pdf = await buildAnketaPdf({ ...answers, ...photos })
      const files = { pdf: await blobToDataUrl(pdf) }
      for (const { name, kind } of PHOTOS) {
        if (changedPhotos[name] && photos[name]) files[kind] = photos[name].dataUrl
      }
      const updated = await api('PUT', `/leads/${lead.id}`, { answers, selfieFocus: photos.selfiePhoto?.focus, files })
      savedAnswers.current = JSON.stringify(withAllFields(updated.answers))
      setAnswers(withAllFields(updated.answers))
      setChangedPhotos({})
      setFocusChanged(false)
      onSaved(updated)
      setMessage({ ok: true, text: 'Сохранено. Новый PDF готов, его можно скачать вверху.' })
    } catch (err) {
      onError(err)
      setMessage({ ok: false, text: err.message || 'Не удалось сохранить' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <form className="cab-form" onSubmit={save}>
        {SECTIONS.map((section) => (
          <section key={section.title} className="cab-section">
            <h2>{section.title}</h2>
            <div className="cab-grid">
              {section.fields.map((f) => <Field key={f.name} field={f} value={answers[f.name]} onChange={change} />)}
            </div>
          </section>
        ))}

        <section className="cab-section">
          <h2>Фотографии</h2>
          <p className="cab-hint">Новое фото заменит старое после сохранения. Круг на главном фото можно сдвинуть.</p>
          <div className="cab-photos">
            {PHOTOS.map(({ name, label }) => (
              <PhotoField
                key={name}
                name={name}
                label={label}
                state={{ photo: photos[name], ...photoStatus[name] }}
                t={PHOTO_TEXTS}
                onChange={changePhoto}
                onFocusChange={name === 'selfiePhoto' ? changeFocus : undefined}
              />
            ))}
          </div>
        </section>

        <div className={`cab-savebar${dirty ? ' dirty' : ''}`}>
          <span role="status">
            {message ? <span className={message.ok ? 'cab-ok' : 'cab-error'}>{message.text}</span>
              : dirty ? 'Есть несохранённые изменения' : 'Изменений нет'}
          </span>
          <button className="cab-btn" disabled={!dirty || saving || busy}>
            {saving ? 'Сохраняем и создаём PDF…' : 'Сохранить и обновить PDF'}
          </button>
        </div>
      </form>
      <PartnerPanel build={() => ({ answers, photos })} waiting={busy} dirty={dirty} onError={onError} />
    </>
  )
}

function Field({ field, value, onChange }) {
  const id = `f-${field.name}`
  if (field.type === 'checkbox') {
    return (
      <label className="cab-check wide">
        <input type="checkbox" id={id} name={field.name} checked={Boolean(value)} onChange={onChange} />
        {field.label}
      </label>
    )
  }
  return (
    <label className={`cab-field${field.wide ? ' wide' : ''}`} htmlFor={id}>
      <span>{field.label}{field.required && ' *'}</span>
      {field.type === 'select' ? (
        <select id={id} name={field.name} value={value} onChange={onChange} required={field.required}>
          <option value="">—</option>
          {field.options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      ) : (
        <input id={id} name={field.name} type={field.type} value={value} onChange={onChange} required={field.required} />
      )}
    </label>
  )
}

export default LeadPage
