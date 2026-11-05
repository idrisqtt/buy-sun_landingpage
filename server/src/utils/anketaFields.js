// Anketa fields as they come from the form on buysun.kz (src/ResumeModal.jsx),
// with the labels managers see in Bitrix24 and in the email copy.
// Order here is the order of rows in the email and the Bitrix24 comment.
const ANKETA_FIELDS = [
  ['firstName', 'Имя'],
  ['lastName', 'Фамилия'],
  ['phone', 'Телефон'],
  ['email', 'Email'],
  ['instagram', 'Instagram'],
  ['city', 'Город'],
  ['age', 'Возраст'],
  ['birthDate', 'Дата рождения'],
  ['gender', 'Пол'],
  ['maritalStatus', 'Семейное положение'],
  ['citizenship', 'Гражданство'],
  ['nationality', 'Национальность'],
  ['height', 'Рост, см'],
  ['weight', 'Вес, кг'],
  ['desiredPosition', 'Желаемая вакансия'],
  ['isStudent', 'Студент'],
  ['readyToWorkPermanently', 'Готов работать постоянно'],
  ['startMonth', 'Начало работы: месяц'],
  ['startDay', 'Начало работы: день'],
  ['endMonth', 'Окончание работы: месяц'],
  ['endDay', 'Окончание работы: день'],
  ['russian', 'Русский'],
  ['english', 'Английский'],
  ['turkish', 'Турецкий'],
  ['additionalLanguage', 'Дополнительный язык'],
  ['additionalLanguageLevel', 'Уровень доп. языка'],
  ['institution', 'Учебное заведение'],
  ['specialty', 'Специальность'],
  ['studyStart', 'Начало учёбы'],
  ['studyEnd', 'Окончание учёбы'],
  ['company1', 'Опыт 1: компания'],
  ['country1', 'Опыт 1: страна'],
  ['position1', 'Опыт 1: должность'],
  ['workStart1', 'Опыт 1: начало'],
  ['workEnd1', 'Опыт 1: окончание'],
  ['company2', 'Опыт 2: компания'],
  ['country2', 'Опыт 2: страна'],
  ['position2', 'Опыт 2: должность'],
  ['workStart2', 'Опыт 2: начало'],
  ['workEnd2', 'Опыт 2: окончание'],
  ['company3', 'Опыт 3: компания'],
  ['country3', 'Опыт 3: страна'],
  ['position3', 'Опыт 3: должность'],
  ['workStart3', 'Опыт 3: начало'],
  ['workEnd3', 'Опыт 3: окончание'],
  ['fatherName', 'Имя отца'],
  ['motherName', 'Имя матери'],
  ['hobbies', 'Хобби'],
  ['courses', 'Курсы и сертификаты'],
  ['manager', 'Менеджер (указал кандидат)'],
  ['source', 'Откуда узнал'],
]

const BOOLEAN_FIELDS = new Set(['readyToWorkPermanently'])

const SOURCE_LABELS = {
  social: 'Социальные сети',
  friend: 'От друзей',
  advertisement: 'Реклама',
  other: 'Другое',
}

const formatValue = (key, value) => {
  if (BOOLEAN_FIELDS.has(key)) return value ? 'Да' : ''
  if (key === 'source') return SOURCE_LABELS[value] || value || ''
  return value == null ? '' : String(value).trim()
}

// [[label, value], ...] for filled fields only
const anketaRows = (answers = {}) =>
  ANKETA_FIELDS
    .map(([key, label]) => [label, formatValue(key, answers[key])])
    .filter(([, value]) => value !== '')

module.exports = { ANKETA_FIELDS, BOOLEAN_FIELDS, SOURCE_LABELS, anketaRows }
