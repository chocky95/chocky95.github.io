import { getAbsoluteLocaleUrl, getRelativeLocaleUrl } from 'astro:i18n';

import { APPS, type AppFacts } from '~/data/apps';
import { DEFAULT_LOCALE, HREFLANG, LOCALES, type Locale } from '~/i18n/locales';

/**
 * Le registre de routes.
 *
 * Une page n'est décrite que par une chose : la table des chemins par locale.
 * `getStaticPaths`, les balises hreflang, le sitemap et le sélecteur de langue
 * dérivent tous de cette même table, ce qui les rend structurellement
 * incapables de se contredire.
 *
 * Les deux erreurs que cela empêche :
 *   - une URL générée pour une locale où l'app n'existe pas (/ru/apps/scanfree/) ;
 *   - un cluster hreflang non réciproque ou sans auto-référence, ce qui fait
 *     ignorer le cluster entier par Google.
 *
 * Convention de `path` : le chemin SANS préfixe de locale, SANS slash de début
 * ni de fin. La racine est la chaîne vide.
 *   ''              -> /            et /en/
 *   'apps'          -> /apps/       et /en/apps/
 *   'apps/papayoo'  -> /apps/papayoo/ et /ja/apps/papayoo/
 */
export type LocalePaths = ReadonlyMap<Locale, string>;

export interface Alternate {
  /** Valeur de l'attribut hreflang. */
  readonly hreflang: string;
  /** URL absolue, avec slash final. */
  readonly href: string;
  readonly locale: Locale;
}

/**
 * `Astro.site` est typé `URL | undefined` même quand `site` est configuré.
 * Passer par cette fonction évite de semer des `Astro.site!` : le jour où
 * quelqu'un retire `site` de la config, on obtient une erreur de build
 * explicite au lieu de 145 pages de canonical `undefined`.
 */
export function requireSite(site: URL | undefined): URL {
  if (!site) {
    throw new Error(
      "`site` n'est pas défini dans astro.config.mjs. " +
        'Les canonical, hreflang, og:url et le sitemap en dépendent tous.',
    );
  }
  return site;
}

/** URL relative, préfixe de locale et slash final gérés par Astro. */
export function href(locale: Locale, path: string): string {
  return getRelativeLocaleUrl(locale, path);
}

/** URL absolue pour canonical, og:url et hreflang. */
export function absolute(locale: Locale, path: string): string {
  return getAbsoluteLocaleUrl(locale, path);
}

/**
 * Construit le cluster hreflang complet d'une page.
 *
 * Trois garanties, structurelles et non maintenues à la main :
 *   1. auto-référence — on itère sur TOUTES les entrées, la locale courante
 *      incluse ; Google ignore un cluster dont les pages ne se référencent pas ;
 *   2. réciprocité — les deux côtés d'une paire appellent cette fonction sur la
 *      même table, ils ne peuvent donc pas produire des tableaux différents ;
 *   3. `x-default` unique, pointant sur `fr`, dont `apps.ts` garantit la
 *      présence dans tous les sous-ensembles.
 *
 * Une page mono-locale (EasyCompta) renvoie un tableau vide : un cluster
 * hreflang d'un seul élément n'a aucun sens, et l'émettre serait du bruit.
 */
export function alternates(paths: LocalePaths): readonly Alternate[] {
  if (paths.size <= 1) return [];

  const out: Alternate[] = [];

  // On itère sur LOCALES, non sur les clés de la table : l'ordre de sortie est
  // ainsi stable et déterministe, quel que soit l'ordre d'insertion.
  for (const locale of LOCALES) {
    const path = paths.get(locale);
    if (path === undefined) continue;
    out.push({ hreflang: HREFLANG[locale], href: absolute(locale, path), locale });
  }

  const fallback = paths.get(DEFAULT_LOCALE);
  if (fallback === undefined) {
    throw new Error(
      `Cluster hreflang sans "${DEFAULT_LOCALE}" : impossible de désigner x-default. ` +
        `Locales présentes : ${[...paths.keys()].join(', ')}.`,
    );
  }
  out.push({
    hreflang: 'x-default',
    href: absolute(DEFAULT_LOCALE, fallback),
    locale: DEFAULT_LOCALE,
  });

  return out;
}

/**
 * Les entrées du sélecteur de langue : chaque locale disponible pointe vers
 * *la page équivalente*, jamais vers l'accueil.
 */
export function switcherLinks(
  paths: LocalePaths,
  current: Locale,
): readonly { locale: Locale; href: string; isCurrent: boolean }[] {
  return LOCALES.filter((locale) => paths.has(locale)).map((locale) => ({
    locale,
    href: href(locale, paths.get(locale) as string),
    isCurrent: locale === current,
  }));
}

/* ------------------------------------------------------------------------- *
 * Constructeurs de tables — un par famille de pages.
 * ------------------------------------------------------------------------- */

function sameEverywhere(path: string): LocalePaths {
  return new Map(LOCALES.map((locale) => [locale, path]));
}

/** L'accueil existe dans les 18 langues. */
export function homePaths(): LocalePaths {
  return sameEverywhere('');
}

/** L'index des applications existe dans les 18 langues (au moins EasyCompta y figure). */
export function appsIndexPaths(): LocalePaths {
  return sameEverywhere('apps');
}

/**
 * Une page d'application existe dans les 18 langues, comme l'accueil — que
 * l'application elle-même gère nativement cette langue ou non (`apps.ts`
 * garde trace du sous-ensemble natif séparément, pour l'avis de repli et le
 * bloc « Langue »).
 *
 * Le slug reste identique dans toutes les langues : c'est un nom de marque.
 * On ne traduit pas « papayoo ».
 */
export function appPaths(app: AppFacts): LocalePaths {
  return sameEverywhere(`apps/${app.slug}`);
}

/**
 * Une page éditoriale (règles, guide, page légale), dont le slug EST localisé :
 * `/regles-du-molkky/` se positionne mieux que `/fr/molkky-rules/`.
 *
 * `slugs` provient de la collection de contenu : la page existe exactement dans
 * les langues où un fichier a été écrit.
 */
export function editorialPaths(slugs: ReadonlyMap<Locale, string>): LocalePaths {
  return slugs;
}

/* ------------------------------------------------------------------------- *
 * Le garde-fou : l'inventaire complet des URL que le site doit produire.
 *
 * `audit-dist.mjs` compare la sortie de build à cet inventaire. Toute URL
 * générée en trop, ou manquante, fait échouer le build.
 * ------------------------------------------------------------------------- */

export interface ExpectedUrl {
  readonly locale: Locale;
  readonly path: string;
  readonly kind: 'home' | 'apps-index' | 'app';
}

/**
 * Les routes structurelles (hors contenu éditorial, qui dépend des fichiers
 * présents). Sert d'assertion permanente en CI.
 */
export function structuralUrls(): readonly ExpectedUrl[] {
  const out: ExpectedUrl[] = [];

  for (const locale of LOCALES) {
    out.push({ locale, path: '', kind: 'home' });
    out.push({ locale, path: 'apps', kind: 'apps-index' });
  }
  for (const app of APPS) {
    for (const locale of LOCALES) {
      out.push({ locale, path: `apps/${app.slug}`, kind: 'app' });
    }
  }

  return out;
}
