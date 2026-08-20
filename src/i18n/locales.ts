/**
 * Registre des locales du site.
 *
 * Les 18 locales sont l'union exacte des fichiers `lib/l10n/app_*.arb` des cinq
 * applications. Aucune locale n'est orpheline, et `fr` est present dans les
 * cinq sous-ensembles -- ce qui en fait la cible de `x-default`.
 *
 * L'ordre suit les paliers de qualite editoriale (voir LOCALE_TIER).
 */

export const LOCALES = [
  // Palier 1 -- redige, mots-cles recherches par marche
  'fr', 'en', 'de', 'fi', 'ja',
  // Palier 2 -- traduit puis edite
  'es', 'it', 'nl', 'pt', 'sv', 'et',
  // Palier 3 -- pages courtes et honnetes
  'da', 'nb', 'pl', 'ro', 'ru', 'ko', 'cs',
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE = 'fr' satisfies Locale;

/** Palier de qualite editoriale. Pilote la longueur de page attendue. */
export const LOCALE_TIER: Readonly<Record<Locale, 1 | 2 | 3>> = {
  fr: 1, en: 1, de: 1, fi: 1, ja: 1,
  es: 2, it: 2, nl: 2, pt: 2, sv: 2, et: 2,
  da: 3, nb: 3, pl: 3, ro: 3, ru: 3, ko: 3, cs: 3,
};

/**
 * Segment d'URL -> valeur de l'attribut `hreflang`.
 *
 * Identite ici : nos segments d'URL sont deja des etiquettes de langue valides.
 * On garde `nb` (et non `no`), et `pt` designe le portugais europeen.
 */
export const HREFLANG: Readonly<Record<Locale, string>> = {
  fr: 'fr', en: 'en', de: 'de', fi: 'fi', ja: 'ja',
  es: 'es', it: 'it', nl: 'nl', pt: 'pt', sv: 'sv', et: 'et',
  da: 'da', nb: 'nb', pl: 'pl', ro: 'ro', ru: 'ru', ko: 'ko', cs: 'cs',
};

/** Valeur de `og:locale` / `og:locale:alternate` (format Facebook, avec pays). */
export const OG_LOCALE: Readonly<Record<Locale, string>> = {
  fr: 'fr_FR', en: 'en_US', de: 'de_DE', fi: 'fi_FI', ja: 'ja_JP',
  es: 'es_ES', it: 'it_IT', nl: 'nl_NL', pt: 'pt_PT', sv: 'sv_SE', et: 'et_EE',
  da: 'da_DK', nb: 'nb_NO', pl: 'pl_PL', ro: 'ro_RO', ru: 'ru_RU', ko: 'ko_KR', cs: 'cs_CZ',
};

/**
 * Endonymes : chaque langue est nommee dans sa propre langue.
 * C'est la seule maniere correcte d'etiqueter un selecteur de langue -- un
 * lecteur japonais cherche « 日本語 », pas « Japonais ».
 */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
  fi: 'Suomi',
  ja: '日本語',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands',
  pt: 'Português',
  sv: 'Svenska',
  et: 'Eesti',
  da: 'Dansk',
  nb: 'Norsk bokmål',
  pl: 'Polski',
  ro: 'Română',
  ru: 'Русский',
  ko: '한국어',
  cs: 'Čeština',
};

/**
 * Langues a ecriture CJK. Elles basculent sur la pile de polices systeme :
 * embarquer un sous-ensemble CJK couterait plusieurs Mo par page.
 */
export const CJK_LOCALES: ReadonlySet<Locale> = new Set<Locale>(['ja', 'ko']);

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Direction d'ecriture. Aucune locale RTL pour l'instant, mais le point d'entree existe. */
export function localeDir(_locale: Locale): 'ltr' {
  return 'ltr';
}
