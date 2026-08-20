import { getCollection, type CollectionEntry } from 'astro:content';

import { parseContentId } from '~/content.config';
import type { AppFacts } from '~/data/apps';
import { type Locale } from '~/i18n/locales';
import { useTranslations } from '~/i18n/t';

/**
 * Accès au contenu, indexé par clé puis par locale.
 *
 * Le point important est la stratégie d'absence : une page d'application doit
 * exister dans toutes les langues où l'application existe, mais la prose arrive
 * par vagues (voir Phase 6 du plan). Une page sans contenu rédigé est donc
 * générée à partir des faits, et marquée `noindex` — elle est atteignable par un
 * utilisateur, invisible pour Google, et le devient dès que le fichier arrive.
 *
 * C'est ce qui rend le déploiement progressif possible sans jamais publier de
 * page mince dans l'index.
 */

export type AppEntry = CollectionEntry<'apps'>;
export type GuideEntry = CollectionEntry<'guides'>;
export type PageEntry = CollectionEntry<'pages'>;

type ByLocale<T> = ReadonlyMap<Locale, T>;

async function indexByKeyAndLocale<T extends { id: string }>(
  entries: readonly T[],
  collectionName: string,
): Promise<ReadonlyMap<string, ByLocale<T>>> {
  const out = new Map<string, Map<Locale, T>>();

  for (const entry of entries) {
    const parsed = parseContentId(entry.id);
    if (!parsed) {
      throw new Error(
        `Contenu mal nommé : "${collectionName}/${entry.id}". ` +
          'Attendu "<cle>.<locale>.md", avec une locale du site.',
      );
    }
    const bucket = out.get(parsed.key) ?? new Map<Locale, T>();
    bucket.set(parsed.locale, entry);
    out.set(parsed.key, bucket);
  }

  return out;
}

export async function appContent(): Promise<ReadonlyMap<string, ByLocale<AppEntry>>> {
  return indexByKeyAndLocale(await getCollection('apps'), 'apps');
}

export async function guideContent(): Promise<ReadonlyMap<string, ByLocale<GuideEntry>>> {
  return indexByKeyAndLocale(await getCollection('guides'), 'guides');
}

export async function pageContent(): Promise<ReadonlyMap<string, ByLocale<PageEntry>>> {
  return indexByKeyAndLocale(await getCollection('pages'), 'pages');
}

/** Ce qu'une page d'application affiche, que la prose existe ou non. */
export interface AppView {
  readonly title: string;
  readonly metaDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly highlights: readonly string[];
  readonly faq: readonly { q: string; a: string }[];
  readonly updatedOn: Date | undefined;
  /** `true` tant que la prose n'est pas rédigée ou pas relue. */
  readonly noindex: boolean;
  /** L'entrée de contenu, quand elle existe, pour rendre le corps Markdown. */
  readonly entry: AppEntry | undefined;
}

/**
 * Repli sans contenu rédigé.
 *
 * Volontairement bref et factuel : la page reste utile à un visiteur, mais elle
 * n'a rien à faire dans un index de moteur de recherche tant qu'elle n'a pas été
 * écrite. D'où `noindex: true`.
 */
function fallbackView(app: AppFacts, locale: Locale): AppView {
  const t = useTranslations(locale);
  const availability =
    app.status === 'coming-soon' ? t('apps.comingSoon') : t('apps.free');

  return {
    title: `${app.name} — ${t('site.name')}`,
    metaDescription: `${app.name} — ${availability}.`,
    h1: app.name,
    lead: availability,
    highlights: [],
    faq: [],
    updatedOn: undefined,
    noindex: true,
    entry: undefined,
  };
}

export function toAppView(
  app: AppFacts,
  locale: Locale,
  entry: AppEntry | undefined,
): AppView {
  if (!entry) return fallbackView(app, locale);

  const d = entry.data;
  return {
    title: d.title,
    metaDescription: d.metaDescription,
    h1: d.h1,
    lead: d.lead,
    highlights: d.highlights,
    faq: d.faq,
    updatedOn: d.updatedOn,
    // Une traduction automatique non relue reste hors de l'index.
    noindex: d.translationStatus === 'raw-mt',
    entry,
  };
}
