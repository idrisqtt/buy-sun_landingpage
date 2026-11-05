// Draft of the anketa kept on the candidate's device, so closing the window
// or reloading the page does not lose 50+ answers and 3 photos.
// Text answers go to localStorage (small, synchronous); photos are too big for
// it, so they go to IndexedDB. Every access is wrapped: private mode or blocked
// storage simply means no draft, never a broken form.

const TEXT_KEY = 'buysun-anketa-draft'
const DB_NAME = 'buysun-anketa'
const STORE = 'photos'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export const PHOTO_FIELDS = ['selfiePhoto', 'fullBodyPhoto', 'additionalPhoto1']

const isExpired = (savedAt) => !savedAt || Date.now() - savedAt > MAX_AGE_MS

let dbPromise = null
const openDb = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'))
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }).catch((err) => {
      dbPromise = null
      throw err
    })
  }
  return dbPromise
}

const withStore = async (mode, action) => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = action(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(request?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

// Keeps only known fields with the expected type, so an old or edited draft
// can never put unexpected values into the form.
const sanitize = (data, emptyForm) => {
  const clean = {}
  for (const [key, empty] of Object.entries(emptyForm)) {
    if (PHOTO_FIELDS.includes(key) || !(key in data)) continue
    if (typeof data[key] === typeof empty) clean[key] = data[key]
  }
  return clean
}

const isValidPhoto = (photo) =>
  photo && typeof photo.dataUrl === 'string' && photo.dataUrl.startsWith('data:image/') &&
  photo.width > 0 && photo.height > 0

const hasAnswers = (formData, emptyForm) =>
  Object.keys(emptyForm).some((key) => !PHOTO_FIELDS.includes(key) && formData[key] !== emptyForm[key])

export const clearDraft = async () => {
  try { localStorage.removeItem(TEXT_KEY) } catch { /* storage blocked */ }
  try { await withStore('readwrite', (store) => store.clear()) } catch { /* storage blocked */ }
}

// Returns the saved answers and photos, or null when there is no fresh draft.
export const loadDraft = async (emptyForm) => {
  let answers = {}
  try {
    const raw = localStorage.getItem(TEXT_KEY)
    if (raw) {
      const { savedAt, data } = JSON.parse(raw)
      if (isExpired(savedAt)) {
        await clearDraft()
        return null
      }
      answers = sanitize(data || {}, emptyForm)
    }
  } catch { /* broken or blocked storage: start clean */ }

  const photos = {}
  try {
    await Promise.all(PHOTO_FIELDS.map(async (name) => {
      const saved = await withStore('readonly', (store) => store.get(name))
      if (saved && !isExpired(saved.savedAt) && isValidPhoto(saved.photo)) photos[name] = saved.photo
    }))
  } catch { /* no photos then */ }

  if (Object.keys(answers).length === 0 && Object.keys(photos).length === 0) return null
  return { ...answers, ...photos }
}

export const saveDraftAnswers = (formData, emptyForm) => {
  try {
    if (!hasAnswers(formData, emptyForm)) {
      localStorage.removeItem(TEXT_KEY)
      return
    }
    const data = {}
    for (const key of Object.keys(emptyForm)) {
      if (!PHOTO_FIELDS.includes(key)) data[key] = formData[key]
    }
    localStorage.setItem(TEXT_KEY, JSON.stringify({ savedAt: Date.now(), data }))
  } catch { /* storage full or blocked: the form still works */ }
}

export const saveDraftPhoto = async (name, photo) => {
  try {
    await withStore('readwrite', (store) =>
      photo ? store.put({ savedAt: Date.now(), photo }, name) : store.delete(name))
  } catch { /* storage full or blocked: the form still works */ }
}
