// What changed in Predki, newest first. Add a new entry on top with every release.
export interface Release { date: string; title: { ru: string; en: string }; items: { ru: string; en: string }[] }

export const CHANGELOG: Release[] = [
  {
    date: '2026-10-05',
    title: { ru: 'Аккаунты', en: 'Accounts' },
    items: [
      { ru: 'Добавлена возможность авторизации через Google или почту.', en: 'Sign in with Google or email.' },
      { ru: 'Добавлена политика конфиденциальности.', en: 'Added a privacy policy.' },
    ],
  },
  {
    date: '2026-10-02',
    title: { ru: 'Первая версия Predki', en: 'First version of Predki' },
    items: [
      { ru: 'Карточка отца создаётся сама, если у человека указано отчество.', en: 'A father’s card is created automatically when a patronymic is set.' },
      { ru: 'Автоматические аватары по полу и возрасту.', en: 'Automatic avatars by gender and age.' },
      { ru: 'Возможность создать «Паспорт семьи».', en: 'Create a “Family passport”.' },
      { ru: 'База городов для карты обновлена до 1 200+.', en: 'The map’s city database now has 1,200+ cities.' },
      { ru: 'Адаптивный дизайн для просмотра на телефоне.', en: 'Responsive design for phones.' },
    ],
  },
]
