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

/** Un guide tel qu'on le LIE, indépendamment de la page qui le lie. */
export interface GuideLink {
  /** Slug localisé, prêt pour `href(locale, …)`. */
  readonly slug: string;
  /** Ancre longue et descriptive, pour un bloc en corps de page. */
  readonly h1: string;
  /** Ancre courte, pour la navigation. À défaut de `navLabel`, le titre. */
  readonly navLabel: string;
  readonly metaDescription: string;
}

/**
 * Les guides existant dans cette langue, dans un ordre stable.
 *
 * ── Pourquoi cet accesseur existe ────────────────────────────────────────────
 * C'est ce qui rend le maillage STRUCTUREL. Les 12 traductions du guide du
 * Mölkky ajoutées par le commit a7fe56f n'ont jamais été rattachées à leur
 * accueil : le lien vivait dans la prose Markdown de six `home.<locale>.md`, et
 * personne n'a pensé à écrire les douze autres. Search Console a écarté ces
 * pages en « Détectée, actuellement non indexée » — elles étaient à deux clics.
 *
 * Désormais, poser `guides/papayoo-rules.<locale>.md` publie le lien sur les 18
 * accueils et les 144 pieds de page sans toucher un seul fichier. Le maillage
 * est une conséquence du contenu, plus un geste à ne pas oublier.
 */
export async function guidesForLocale(locale: Locale): Promise<readonly GuideLink[]> {
  const clusters = await guideContent();
  const out: GuideLink[] = [];

  // Tri par clé de cluster : l'ordre ne dépend pas de l'ordre de lecture du
  // disque, donc deux builds successifs produisent le même HTML.
  for (const key of [...clusters.keys()].sort()) {
    const entry = clusters.get(key)?.get(locale);
    if (!entry) continue;

    const d = entry.data;
    out.push({
      slug: d.slug,
      h1: d.h1,
      navLabel: d.navLabel ?? d.title,
      metaDescription: d.metaDescription,
    });
  }

  return out;
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

/** Ce que l'accueil affiche, que la prose existe ou non. */
export interface HomeView {
  readonly title: string;
  readonly metaDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly faq: readonly { q: string; a: string }[];
  readonly updatedOn: Date | undefined;
  readonly entry: PageEntry | undefined;
}

/**
 * L'accueil d'une locale, avec repli sur le dictionnaire d'interface.
 *
 * ── Pourquoi l'accueil n'est JAMAIS mis en `noindex` ─────────────────────
 * Contrairement à une page d'application, la racine d'une locale est la cible
 * de `x-default`, du sélecteur de langue et de tout le maillage interne. La
 * sortir de l'index couperait le cluster hreflang à sa racine. Le champ
 * `noindex` de la collection `pages` reste donc réservé à ce pour quoi il a été
 * écrit — mentions légales, support — et n'est pas lu ici.
 *
 * Le repli n'est donc pas un filet de sécurité mais un aveu : une locale sans
 * `home.<locale>.md` sort une page indexable de ~60 mots, que Google explore
 * puis écarte en « Explorée, actuellement non indexée ». C'est exactement le
 * défaut que ces fichiers existent pour combler.
 */
export function toHomeView(locale: Locale, entry: PageEntry | undefined): HomeView {
  const t = useTranslations(locale);

  if (!entry) {
    return {
      title: `${t('site.name')} — ${t('site.tagline')}`,
      metaDescription: t('site.description'),
      h1: t('site.tagline'),
      lead: t('site.description'),
      faq: [],
      updatedOn: undefined,
      entry: undefined,
    };
  }

  const d = entry.data;
  return {
    title: d.title,
    metaDescription: d.metaDescription,
    h1: d.h1,
    lead: d.lead,
    faq: d.faq,
    updatedOn: d.updatedOn,
    entry,
  };
}

/** Ce que le hub `/apps/` affiche, que la prose existe ou non. */
export interface HubView {
  readonly title: string;
  readonly metaDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly faq: readonly { q: string; a: string }[];
  readonly updatedOn: Date | undefined;
  /** `true` tant que le hub n'a rien à dire que l'accueil ne dise déjà. */
  readonly noindex: boolean;
  readonly entry: PageEntry | undefined;
}

/**
 * Le hub `/apps/`, avec repli sur le dictionnaire d'interface.
 *
 * ── Pourquoi le repli est en `noindex` ───────────────────────────────────
 * Sans prose propre, ce hub réaffiche le chapô de l'accueil et la même liste
 * des cinq applications : une page de soixante mots, en double interne, dans
 * les 18 langues. Search Console les écartait toutes en « Explorée,
 * actuellement non indexée », et elle avait raison.
 *
 * La page redevient donc indexable exactement quand elle mérite de l'être :
 * quand un `pages/apps.<locale>.md` existe et dit quelque chose que l'accueil
 * ne dit pas — ici, le comparatif des cinq applications et la couverture réelle
 * de leurs interfaces. C'est la même règle que pour les pages d'application, et
 * elle est vérifiée par le build, pas par la bonne volonté.
 */
export function toHubView(locale: Locale, entry: PageEntry | undefined): HubView {
  const t = useTranslations(locale);

  if (!entry) {
    return {
      title: `${t('apps.all')} — ${t('site.name')}`,
      metaDescription: `${t('apps.all')} — ${t('site.description')}`,
      h1: t('apps.all'),
      lead: t('site.description'),
      faq: [],
      updatedOn: undefined,
      noindex: true,
      entry: undefined,
    };
  }

  const d = entry.data;
  return {
    title: d.title,
    metaDescription: d.metaDescription,
    h1: d.h1,
    lead: d.lead,
    faq: d.faq,
    updatedOn: d.updatedOn,
    noindex: d.noindex,
    entry,
  };
}
