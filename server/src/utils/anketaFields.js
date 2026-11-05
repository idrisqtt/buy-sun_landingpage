// Anketa fields as they come from the form on buysun.kz (src/ResumeModal.jsx)
// and how managers see them in Bitrix24 and in the email copy.

// Every key the form sends: used to validate the anketa
const ANKETA_KEYS = [
  'firstName', 'lastName', 'phone', 'email', 'instagram', 'city', 'age', 'birthDate', 'gender',
  'maritalStatus', 'citizenship', 'nationality', 'height', 'weight', 'desiredPosition', 'isStudent',
  'readyToWorkPermanently', 'startMonth', 'startDay', 'endMonth', 'endDay', 'russian', 'english',
  'turkish', 'additionalLanguage', 'additionalLanguageLevel', 'institution', 'specialty', 'studyStart',
  'studyEnd', 'company1', 'country1', 'position1', 'workStart1', 'workEnd1', 'company2', 'country2',
  'position2', 'workStart2', 'workEnd2', 'company3', 'country3', 'position3', 'workStart3', 'workEnd3',
  'fatherName', 'motherName', 'hobbies', 'courses', 'manager', 'source',
]

const BOOLEAN_FIELDS = new Set(['readyToWorkPermanently'])

// The form stores codes; managers should read words
const OPTION_LABELS = {
  gender: { male: 'Мужской', female: 'Женский' },
  maritalStatus: { single: 'Холост / не замужем', married: 'Женат / замужем', divorced: 'Разведён / разведена' },
  isStudent: { yes: 'Да', no: 'Нет' },
  desiredPosition: {
    waiter: 'Официант',
    bartender: 'Бармен',
    receptionist: 'Ресепшн',
    housekeeping: 'Горничная',
    kitchen: 'Кухня',
    animator: 'Аниматор',
    other: 'Другое',
  },
  source: { social: 'Социальные сети', friend: 'От друзей', advertisement: 'Реклама', other: 'Другое' },
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

const clean = (value) => (value == null ? '' : String(value).trim())

const option = (key) => (a) => OPTION_LABELS[key][a[key]] || clean(a[key])

// "15" + "05" -> "15 мая"
const dayMonth = (day, month) => {
  const m = MONTHS[Number(month) - 1]
  if (!m) return ''
  return day ? `${Number(day)} ${m}` : m
}

// "1999-05-15" -> "15.05.1999"
const date = (key) => (a) => {
  const value = clean(a[key])
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('.') : value
}

const withUnit = (key, unit) => (a) => (clean(a[key]) ? `${clean(a[key])} ${unit}` : '')

const period = (from, to) => {
  const [a, b] = [clean(from), clean(to)]
  return a && b && a !== b ? `${a} – ${b}` : a || b
}

const experience = (n) => (a) => {
  const parts = [clean(a[`position${n}`]), clean(a[`company${n}`]), clean(a[`country${n}`])].filter(Boolean)
  const years = period(a[`workStart${n}`], a[`workEnd${n}`])
  return [parts.join(', '), years].filter(Boolean).join('; ')
}

const language = (level, name = '') => [name, clean(level)].filter(Boolean).join(': ')

// Rows in the order a manager reads them: who, what job and when, contacts,
// personal details, languages, education, experience, the rest
const DISPLAY = [
  ['Имя', (a) => clean(a.firstName)],
  ['Фамилия', (a) => clean(a.lastName)],
  ['Желаемая вакансия', option('desiredPosition')],
  ['Готов начать', (a) => dayMonth(a.startDay, a.startMonth)],
  ['Работать до', (a) => dayMonth(a.endDay, a.endMonth)],
  ['Готов работать постоянно', (a) => (a.readyToWorkPermanently ? 'Да' : '')],
  ['Телефон', (a) => clean(a.phone)],
  ['Email', (a) => clean(a.email)],
  ['Instagram', (a) => (clean(a.instagram) ? `@${clean(a.instagram).replace(/^@/, '')}` : '')],
  ['Город', (a) => clean(a.city)],
  ['Возраст', (a) => clean(a.age)],
  ['Дата рождения', date('birthDate')],
  ['Пол', option('gender')],
  ['Семейное положение', option('maritalStatus')],
  ['Гражданство', (a) => clean(a.citizenship)],
  ['Национальность', (a) => clean(a.nationality)],
  ['Рост', withUnit('height', 'см')],
  ['Вес', withUnit('weight', 'кг')],
  ['Студент', option('isStudent')],
  ['Английский', (a) => language(a.english)],
  ['Турецкий', (a) => language(a.turkish)],
  ['Русский', (a) => language(a.russian)],
  ['Другой язык', (a) => (clean(a.additionalLanguage) ? language(a.additionalLanguageLevel, clean(a.additionalLanguage)) : '')],
  ['Учёба', (a) => [clean(a.institution), clean(a.specialty), period(a.studyStart, a.studyEnd)].filter(Boolean).join(', ')],
  ['Опыт 1', experience(1)],
  ['Опыт 2', experience(2)],
  ['Опыт 3', experience(3)],
  ['Курсы и сертификаты', (a) => clean(a.courses)],
  ['Хобби', (a) => clean(a.hobbies)],
  ['Имя отца', (a) => clean(a.fatherName)],
  ['Имя матери', (a) => clean(a.motherName)],
  ['Менеджер (указал кандидат)', (a) => clean(a.manager)],
  ['Откуда узнал', option('source')],
]

// [[label, value], ...] for filled fields only
const anketaRows = (answers = {}) =>
  DISPLAY.map(([label, get]) => [label, get(answers)]).filter(([, value]) => value !== '')

const positionLabel = (answers = {}) => option('desiredPosition')(answers)

module.exports = { ANKETA_KEYS, BOOLEAN_FIELDS, OPTION_LABELS, anketaRows, positionLabel }
