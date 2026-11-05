// The anketa as managers edit it: the same fields, labels and choices as the
// form candidates fill in on the site (src/ResumeModal.jsx).

const levels = ['C2', 'C1', 'B2', 'B1', 'A2', 'A1'].map((v) => [v, v])
const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  .map((name, i) => [String(i + 1).padStart(2, '0'), name])
const days = Array.from({ length: 31 }, (_, i) => [String(i + 1).padStart(2, '0'), String(i + 1)])

const text = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra })
const select = (name, label, options, extra = {}) => ({ name, label, type: 'select', options, ...extra })

export const SECTIONS = [
  {
    title: 'Основная информация',
    fields: [
      text('firstName', 'Имя (на англ.)', { required: true }),
      text('lastName', 'Фамилия (на англ.)', { required: true }),
      text('phone', 'Номер телефона', { type: 'tel', required: true }),
      text('email', 'Email', { type: 'email' }),
      text('city', 'Город проживания (на англ.)'),
      text('age', 'Возраст', { type: 'number' }),
      text('birthDate', 'Дата рождения', { type: 'date' }),
      select('maritalStatus', 'Семейное положение', [['single', 'Холост / не замужем'], ['married', 'Женат / замужем'], ['divorced', 'Разведён / разведена']]),
      text('citizenship', 'Гражданство (на англ.)'),
      text('nationality', 'Национальность (на англ.)'),
      select('gender', 'Пол', [['male', 'Мужской'], ['female', 'Женский']]),
      text('height', 'Рост (см)', { type: 'number' }),
      text('weight', 'Вес (кг)', { type: 'number' }),
    ],
  },
  {
    title: 'Работа в Турции',
    fields: [
      select('desiredPosition', 'Желаемая вакансия', [
        ['waiter', 'Официант'], ['bartender', 'Бармен'], ['receptionist', 'Ресепшн'], ['housekeeping', 'Горничная'],
        ['kitchen', 'Кухня'], ['animator', 'Аниматор'], ['other', 'Другое'],
      ]),
      select('isStudent', 'Студент', [['yes', 'Да'], ['no', 'Нет']]),
      select('startMonth', 'Готов начать: месяц', months),
      select('startDay', 'Готов начать: день', days),
      select('endMonth', 'Работать до: месяц', months),
      select('endDay', 'Работать до: день', days),
      { name: 'readyToWorkPermanently', label: 'Готов работать постоянно', type: 'checkbox', wide: true },
    ],
  },
  {
    title: 'Языки',
    fields: [
      select('russian', 'Русский', levels),
      select('english', 'Английский', levels),
      select('turkish', 'Турецкий', levels),
      text('additionalLanguage', 'Дополнительный язык'),
      select('additionalLanguageLevel', 'Уровень доп. языка', levels),
    ],
  },
  {
    title: 'Образование',
    fields: [
      text('institution', 'Учебное заведение (на англ.)'),
      text('specialty', 'Специальность (на англ.)'),
      text('studyStart', 'Начало учёбы (год)'),
      text('studyEnd', 'Окончание учёбы (год)'),
    ],
  },
  ...[1, 2, 3].map((n) => ({
    title: `Опыт работы ${n}`,
    fields: [
      text(`company${n}`, 'Компания (на англ.)'),
      text(`country${n}`, 'Страна'),
      text(`position${n}`, 'Должность (на англ.)'),
      text(`workStart${n}`, 'Начало (год)'),
      text(`workEnd${n}`, 'Окончание (год)'),
    ],
  })),
  {
    title: 'Дополнительно',
    fields: [
      text('fatherName', 'Имя отца (на англ.)'),
      text('motherName', 'Имя матери (на англ.)'),
      text('hobbies', 'Хобби', { wide: true }),
      text('courses', 'Курсы и сертификаты', { wide: true }),
      text('instagram', 'Instagram (без @)'),
      select('source', 'Откуда узнал', [['social', 'Социальные сети'], ['friend', 'От друзей'], ['advertisement', 'Реклама'], ['other', 'Другое']]),
      text('manager', 'Менеджер (указал кандидат)'),
    ],
  },
]

export const FIELD_NAMES = SECTIONS.flatMap((s) => s.fields.map((f) => f.name))

export const PHOTOS = [
  { name: 'selfiePhoto', kind: 'selfie', label: 'Главная фотография (лицо)' },
  { name: 'fullBodyPhoto', kind: 'full_body', label: 'Фотография в полный рост' },
  { name: 'additionalPhoto1', kind: 'additional', label: 'Дополнительная фотография' },
]

// Every field present, so inputs are always controlled
export const withAllFields = (answers = {}) => Object.fromEntries(
  FIELD_NAMES.map((name) => [name, name === 'readyToWorkPermanently' ? Boolean(answers[name]) : (answers[name] ?? '')]),
)
