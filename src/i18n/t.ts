import { DEFAULT_LOCALE, type Locale } from '~/i18n/locales';
import en from '~/i18n/ui/en';
import fr, { type UiDict, type UiKey } from '~/i18n/ui/fr';

import cs from '~/i18n/ui/cs';
import da from '~/i18n/ui/da';
import de from '~/i18n/ui/de';
import es from '~/i18n/ui/es';
import et from '~/i18n/ui/et';
import fi from '~/i18n/ui/fi';
import it from '~/i18n/ui/it';
import ja from '~/i18n/ui/ja';
import ko from '~/i18n/ui/ko';
import nb from '~/i18n/ui/nb';
import nl from '~/i18n/ui/nl';
import pl from '~/i18n/ui/pl';
import pt from '~/i18n/ui/pt';
import ro from '~/i18n/ui/ro';
import ru from '~/i18n/ui/ru';
import sv from '~/i18n/ui/sv';

export type { UiKey };

/**
 * Les 18 dictionnaires. `fr` et `en` sont complets ; les autres sont partiels et
 * se complètent par repli.
 */
const DICTS: Readonly<Record<Locale, UiDict | Partial<UiDict>>> = {
  fr, en, de, fi, ja,
  es, it, nl, pt, sv, et,
  da, nb, pl, ro, ru, ko, cs,
};

/**
 * Chaîne d'interface pour une locale.
 *
 * Ordre de repli : locale demandée -> anglais -> français.
 *
 * Le repli est volontairement *visible mais pas cassé* : une clé non traduite
 * affiche l'anglais, ce qui reste lisible, plutôt qu'une clé technique ou une
 * chaîne vide. `scripts/check-i18n.mjs` recense ces replis et sert de garde-fou
 * en CI ; c'est là qu'on décide si une langue est prête à sortir de `noindex`.
 */
export function useTranslations(locale: Locale) {
  const dict = DICTS[locale];

  return function t(key: UiKey): string {
    return dict[key] ?? en[key] ?? fr[key];
  };
}

export type Translate = ReturnType<typeof useTranslations>;

/** Les clés dont cette locale n'a pas de traduction propre. Utilisé par check-i18n. */
export function missingKeys(locale: Locale): readonly UiKey[] {
  if (locale === DEFAULT_LOCALE) return [];
  const dict = DICTS[locale];
  return (Object.keys(fr) as UiKey[]).filter((key) => dict[key] === undefined);
}

/** Part de clés réellement traduites, entre 0 et 1. */
export function coverage(locale: Locale): number {
  const total = Object.keys(fr).length;
  return (total - missingKeys(locale).length) / total;
}

/**
 * Famille d'application -> clé de traduction.
 * Une table explicite plutôt qu'une clé construite par interpolation : ainsi
 * TypeScript vérifie que la clé existe.
 */
export const FAMILY_KEY = {
  game: 'apps.family.game',
  business: 'apps.family.business',
  utility: 'apps.family.utility',
} as const satisfies Record<string, UiKey>;
