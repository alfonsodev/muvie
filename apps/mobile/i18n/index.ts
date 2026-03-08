import { getLocales } from 'expo-localization';

export type SupportedLang = 'es' | 'en';

const strings = {
  es: {
    emptyTitle: '¿Qué deberíamos ver?',
    inputPlaceholder: 'Pregúntale cualquier cosa a Muvi...',
    disclaimer: 'Muvi puede cometer errores.',
    errorMessage: 'Algo salió mal. Inténtalo de nuevo.',
    suggestions: [
      'Recomiéndame un thriller para esta noche',
      'Las mejores comedias para ver con amigos',
      'Las películas mejor valoradas de 2024',
      'Algo como Inception pero más emotivo',
    ],
  },
  en: {
    emptyTitle: 'What should we watch?',
    inputPlaceholder: 'Ask Muvi anything...',
    disclaimer: 'Muvi can make mistakes.',
    errorMessage: 'Something went wrong. Try again.',
    suggestions: [
      'Recommend a thriller for tonight',
      'Best comedies to watch with friends',
      'Top rated movies of 2024',
      'Something like Inception but more emotional',
    ],
  },
} as const;

export type Strings = typeof strings.en;

function detectLang(): SupportedLang {
  const code = getLocales()[0]?.languageCode ?? 'es';
  return code === 'en' ? 'en' : 'es';
}

export const lang: SupportedLang = detectLang();
export const t: Strings = strings[lang];
