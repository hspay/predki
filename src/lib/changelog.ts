// What changed in Predki, newest first. Add a new entry on top with every release: the date, then what changed (no headings).
export interface Release { date: string; items: { ru: string; en: string }[] }

export const CHANGELOG: Release[] = [
  {
    date: '2026-10-17',
    items: [
      { ru: 'Добавил демо-семьи: Каллены, Кардашьяны, «Игра престолов» и Романовы', en: 'Added sample families: the Cullens, the Kardashians, Game of Thrones and the Romanovs' },
      { ru: 'Добавил варианты для партнёров без брака, бывших, приёмных и т.д.', en: 'Added options for unmarried partners, former spouses, adoptive relatives and more' },
    ],
  },
  {
    date: '2026-10-16',
    items: [
      { ru: 'Мяу! Добавили питомцев.', en: 'Meow! Pets are here.' },
      { ru: 'Обновлены Настройки и Календарь', en: 'Settings and Calendar updated' },
      { ru: 'У светлой темы исправлена вёрстка', en: 'Light theme layout fixed' },
      { ru: 'Фикс багов в мобильной вёрстке', en: 'Mobile layout bug fixes' },
    ],
  },
  {
    date: '2026-10-15',
    items: [
      { ru: 'Редизайн и новый лого', en: 'Redesign and a new logo' },
      { ru: 'Новый Альбом и Наклейки', en: 'New Album and stickers' },
      { ru: 'Обновлены Карта и Пробелы', en: 'Map and Gaps updated' },
      { ru: 'Фикс багов в мобильной вёрстке', en: 'Mobile layout bug fixes' },
    ],
  },
  {
    date: '2026-10-12',
    items: [
      { ru: 'Добавили Пробелы — раздел для заполнения пробелов в истории семьи.', en: 'Added Gaps — a section for filling in the gaps in your family history.' },
      { ru: 'Добавили Календарь — памятные даты в одном месте.', en: 'Added Calendar — the family’s memorable dates in one place.' },
    ],
  },
  {
    date: '2026-10-09',
    items: [
      { ru: 'Исправлены баги интерфейса (за тест спасибо Ане Журавской <3)', en: 'Interface bugs fixed (thanks to Anya Zhuravskaya for testing <3)' },
      { ru: 'Линии древа теперь окрашены по семейным ветвям', en: 'Tree lines are now coloured by family branch' },
    ],
  },
  {
    date: '2026-10-08',
    items: [
      { ru: 'Добавлена светлая тема.', en: 'Added a light theme.' },
    ],
  },
  {
    date: '2026-10-07',
    items: [
      { ru: 'Новая карта: анимированная хроника переездов и событий семьи.', en: 'New map: an animated chronicle of family moves and events.' },
      { ru: 'Загруженные файлы теперь хранятся в защищённом облаке, а древо загружается быстрее.', en: 'Uploaded files are now kept in secure cloud storage, and the tree loads faster.' },
      { ru: 'Фото в профиле теперь можно удалить.', en: 'Profile photos can now be removed.' },
      { ru: 'Боковое меню теперь можно сворачивать.', en: 'The side menu can now be collapsed.' },
    ],
  },
  {
    date: '2026-10-06',
    items: [
      { ru: 'Рамки для портретов на Древе: 8 форм, цвет и размер. Часть рамок открывается за достижения.', en: 'Portrait frames on the Tree: 8 shapes, colour and size. Some frames unlock with achievements.' },
      { ru: 'Выбор линий в стиле Древа: плавные или прямые.', en: 'Choose the Tree lines in Tree style: smooth or straight.' },
    ],
  },
  {
    date: '2026-10-05',
    items: [
      { ru: 'Добавлена возможность авторизации через Google или почту.', en: 'Sign in with Google or email.' },
      { ru: 'Добавлена политика конфиденциальности.', en: 'Added a privacy policy.' },
    ],
  },
  {
    date: '2026-10-02',
    items: [
      { ru: 'Карточка отца создаётся сама, если у человека указано отчество.', en: 'A father’s card is created automatically when a patronymic is set.' },
      { ru: 'Автоматические аватары по полу и возрасту.', en: 'Automatic avatars by gender and age.' },
      { ru: 'Возможность создать «Паспорт семьи».', en: 'Create a “Family passport”.' },
      { ru: 'База городов для карты обновлена до 1 200+.', en: 'The map’s city database now has 1,200+ cities.' },
      { ru: 'Адаптивный дизайн для просмотра на телефоне.', en: 'Responsive design for phones.' },
    ],
  },
  {
    date: '2026-10-01',
    items: [
      { ru: 'Возможность кастомизации при онбординге.', en: 'Customization during onboarding.' },
      { ru: 'Корректное отображение страницы «Достижения» на мобильных устройствах.', en: 'The Achievements page now displays correctly on mobile devices.' },
    ],
  },
]
