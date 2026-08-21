import { DEFAULT_LOCALE, isLocale, type Locale } from '~/i18n/locales';

/**
 * Faits invariants sur les cinq applications.
 *
 * Ce fichier n'est PAS une collection de contenu : rien ici n'est éditorial ni
 * traduisible. La prose vit dans `src/content/apps/<slug>.<locale>.md`.
 *
 * Tout est vérifié sur le disque des projets Flutter voisins :
 *   version    <- <projet>/pubspec.yaml
 *   locales    <- <projet>/lib/l10n/app_*.arb
 *   accent     <- pubspec flutter_launcher_icons, ou le seed du thème Dart
 *   packageId  <- android/app/src/main/AndroidManifest.xml
 */

/** Cible de compilation Flutter. N'implique PAS une disponibilité en boutique. */
export type BuildTarget = 'android' | 'ios' | 'web' | 'windows' | 'macos' | 'linux';

/**
 * Boutique où l'application est RÉELLEMENT téléchargeable.
 *
 * Les cinq projets compilent pour iOS, mais aucun n'est publié sur l'App Store
 * (aucune URL apps.apple.com n'existe dans les dépôts). Le site n'affiche donc
 * que des badges Google Play : annoncer iOS sans lien serait une promesse cassée.
 */
export type Store = 'play' | 'web';

export interface AppFacts {
  /** Segment d'URL. Sert aussi de clé de contenu et de dossier d'assets. */
  readonly slug: string;
  /** Nom affiché. Invariant : ne se traduit pas. */
  readonly name: string;
  readonly packageId: string;
  readonly version: string;
  /**
   * Vraie couleur de marque de l'application, relevée dans son projet Flutter.
   * Réservée aux usages DÉCORATIFS : aplats, bordures, fonds de badge, halos.
   * Ne jamais l'utiliser pour du texte — voir `accentText`.
   */
  readonly accent: string;
  /**
   * Variante lisible du même accent, garantie >= 4.5:1 sur le fond d'encre.
   * Sert au texte, aux liens et aux fonds de bouton.
   *
   * Deux marques l'exigent : Papayoo `#0D4167` ne donne que 1.80:1 et ScanFree
   * `#00696D` 2.97:1 — tous deux illisibles. Les autres sont déjà conformes et
   * reprennent donc leur couleur d'origine. `scripts/check-contrast.mjs` vérifie
   * les deux rôles à chaque CI.
   */
  readonly accentText: string;
  /** Regroupement éditorial du site. */
  readonly family: 'game' | 'business' | 'utility';
  /** `applicationCategory` de schema.org, pour le JSON-LD SoftwareApplication. */
  readonly schemaCategory: string;
  /**
   * Langues où l'INTERFACE DE L'APPLICATION existe réellement (fichiers
   * `.arb`). N'influence plus le routage du site : depuis que chaque page
   * d'application existe dans les 18 langues (comme l'accueil), ce champ ne
   * pilote plus que trois choses : la mention « Langue » du bloc de
   * caractéristiques, l'avis de repli anglais sur les pages hors de ce
   * sous-ensemble, et le sous-ensemble autorisé de `screenshotLocales`.
   */
  readonly nativeLocales: readonly Locale[];
  readonly status: 'published' | 'coming-soon';
  readonly playUrl: string | null;
  /** Version web jouable/utilisable, quand elle existe. */
  readonly webAppUrl: string | null;
  readonly stores: readonly Store[];
  readonly buildTargets: readonly BuildTarget[];
  /** Locales disposant de captures d'écran dans leur propre langue. */
  readonly screenshotLocales: readonly Locale[];
  /**
   * L'application adapte un jeu sous marque déposée : la page doit porter
   * l'avis de non-affiliation.
   */
  readonly trademarkNotice: string | null;
}

const PLAY = 'https://play.google.com/store/apps/details?id=';

const ALL_PLATFORMS: readonly BuildTarget[] = [
  'android',
  'ios',
  'web',
  'windows',
  'macos',
  'linux',
];

/** Les 15 locales de Papayoo et Mojogo (projets jumeaux). */
const CARD_GAME_LOCALES: readonly Locale[] = [
  'fr', 'en', 'de', 'ja', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'nb', 'pl', 'ro', 'ru', 'ko',
];

export const APPS: readonly AppFacts[] = [
  {
    slug: 'molkky-score',
    name: 'Mölkky Score',
    packageId: 'com.chocky.molkkyscore',
    version: '1.0.21',
    accent: '#E69500',
    accentText: '#E69500', // 7.93:1 sur le fond : conforme tel quel
    family: 'game',
    schemaCategory: 'GameApplication',
    nativeLocales: ['fr', 'en', 'de', 'fi', 'ja', 'es', 'sv', 'et', 'cs'],
    status: 'published',
    playUrl: PLAY + 'com.chocky.molkkyscore',
    webAppUrl: null,
    stores: ['play'],
    buildTargets: ALL_PLATFORMS,
    // Aucune capture store : on utilise les schémas de placement des quilles,
    // qui sont un atout SEO réel (absents de la fiche Play).
    screenshotLocales: [],
    trademarkNotice:
      'Mölkky® est une marque déposée. Mölkky Score est une application indépendante, non affiliée au détenteur de la marque.',
  },
  {
    slug: 'papayoo',
    name: 'Papayoo',
    packageId: 'com.chocky.papayoo',
    version: '1.0.178',
    accent: '#0D4167',
    // Le bleu de marque ne donne que 1.80:1 sur l'encre : illisible en texte.
    // Éclairci en conservant la teinte (205°) -> 6.14:1.
    accentText: '#4198D8',
    family: 'game',
    schemaCategory: 'GameApplication',
    nativeLocales: CARD_GAME_LOCALES,
    status: 'published',
    playUrl: PLAY + 'com.chocky.papayoo',
    webAppUrl: null,
    stores: ['play'],
    buildTargets: ALL_PLATFORMS,
    screenshotLocales: [],
    trademarkNotice:
      'Papayoo est un jeu édité par Gigamic. Cette application est une adaptation indépendante, non affiliée à l’éditeur.',
  },
  {
    slug: 'easycompta',
    name: 'EasyCompta',
    packageId: 'com.chocky.easycompta',
    version: '1.7.9',
    accent: '#159B8C',
    accentText: '#159B8C', // 5.58:1 sur le fond : conforme tel quel
    family: 'business',
    schemaCategory: 'BusinessApplication',
    // Français uniquement : aucun fichier .arb, et l'URSSAF est une
    // institution française. Une page localisée n'aurait aucun sens.
    nativeLocales: ['fr'],
    status: 'published',
    playUrl: PLAY + 'com.chocky.easycompta',
    webAppUrl: 'https://easycompta.web.app',
    stores: ['play', 'web'],
    buildTargets: ['android', 'web'],
    screenshotLocales: ['fr'],
    trademarkNotice: null,
  },
  {
    slug: 'scanfree',
    name: 'ScanFree',
    packageId: 'com.chocky.scanfree',
    version: '1.0.7',
    accent: '#00696D',
    // Le teal de marque ne donne que 2.97:1 sur l'encre : sous le seuil.
    // Éclairci en conservant la teinte (182°) -> 6.40:1.
    accentText: '#12A5AA',
    family: 'utility',
    schemaCategory: 'UtilitiesApplication',
    nativeLocales: ['fr', 'en', 'de', 'ja', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'nb', 'ko'],
    status: 'published',
    playUrl: PLAY + 'com.chocky.scanfree',
    webAppUrl: null,
    stores: ['play'],
    buildTargets: ['android'],
    // 36 captures dans exactement ses 12 langues : chaque page ScanFree a des
    // captures dans sa propre langue. C'est le meilleur signal anti-contenu-mince
    // dont dispose le site.
    screenshotLocales: ['fr', 'en', 'de', 'ja', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'nb', 'ko'],
    trademarkNotice: null,
  },
  {
    slug: 'mojogo',
    name: 'Mojogo',
    packageId: 'com.chocky.mojogo',
    version: '1.0.0',
    accent: '#D4C4A8',
    accentText: '#D4C4A8', // 11.22:1 sur le fond : conforme tel quel
    family: 'game',
    schemaCategory: 'GameApplication',
    nativeLocales: CARD_GAME_LOCALES,
    status: 'coming-soon',
    playUrl: null,
    webAppUrl: null,
    stores: [],
    buildTargets: ALL_PLATFORMS,
    screenshotLocales: [],
    trademarkNotice: null,
  },
];

const BY_SLUG = new Map(APPS.map((app) => [app.slug, app]));

export const APP_SLUGS: readonly string[] = APPS.map((app) => app.slug);

export function getApp(slug: string): AppFacts {
  const app = BY_SLUG.get(slug);
  if (!app) throw new Error('Application inconnue : ' + slug);
  return app;
}

/**
 * Les applications à lister sur l'accueil et l'index, dans l'ordre de APPS.
 *
 * Chaque application a désormais une page dans les 18 langues (comme
 * l'accueil) : ce filtre ne retire donc plus rien. Le paramètre est conservé
 * pour la forme de l'appel — un jour où une app deviendrait indisponible dans
 * une langue donnée, c'est ici que le filtre reviendrait.
 */
export function appsForLocale(_locale: Locale): readonly AppFacts[] {
  return APPS;
}

/** L'application affiche-t-elle nativement son interface dans cette langue ? */
export function appHasLocale(slug: string, locale: Locale): boolean {
  return BY_SLUG.get(slug)?.nativeLocales.includes(locale) ?? false;
}

/* ------------------------------------------------------------------------- *
 * Invariants vérifiés au build.
 *
 * Ces assertions s'exécutent à chaque `astro build`. Chacune protège un
 * comportement dont dépendent les hreflang, le sitemap ou getStaticPaths.
 * ------------------------------------------------------------------------- */

/** Fond du site, doit rester synchrone avec `--ink-800` de tokens.css. */
const INK_BG = '#0b0f14';

/** Luminance relative sRGB (WCAG 2.1). */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastOnInk(hex: string): number {
  const a = luminance(hex);
  const b = luminance(INK_BG);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const seenSlugs = new Set<string>();

for (const app of APPS) {
  const where = 'apps.ts / ' + app.slug;

  if (seenSlugs.has(app.slug)) throw new Error(where + ' : slug en doublon.');
  seenSlugs.add(app.slug);

  if (app.nativeLocales.length === 0) throw new Error(where + ' : aucune locale.');

  // `fr` doit être partout : c'est la cible de x-default.
  if (!app.nativeLocales.includes(DEFAULT_LOCALE)) {
    throw new Error(where + ' : "' + DEFAULT_LOCALE + '" absent, or c\'est la cible de x-default.');
  }

  const dupes = app.nativeLocales.filter((l, i) => app.nativeLocales.indexOf(l) !== i);
  if (dupes.length > 0) throw new Error(where + ' : locale en doublon (' + dupes.join(', ') + ').');

  for (const locale of app.nativeLocales) {
    if (!isLocale(locale)) throw new Error(where + ' : locale invalide "' + locale + '".');
  }

  // Des captures dans une langue où la page n'existe pas seraient inatteignables.
  for (const locale of app.screenshotLocales) {
    if (!app.nativeLocales.includes(locale)) {
      throw new Error(where + ' : captures en "' + locale + '" mais la page n\'existe pas dans cette langue.');
    }
  }

  for (const [role, value] of [
    ['accent', app.accent],
    ['accentText', app.accentText],
  ] as const) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      throw new Error(`${where} : ${role} "${value}" n'est pas un hex sur 6 chiffres.`);
    }
  }

  // `accentText` sert au texte : il doit atteindre AA (4.5:1) sur le fond
  // d'encre. Vérifié ici, au build, et non seulement en CI — une couleur
  // illisible ne doit pas pouvoir atteindre `dist/`.
  const contrast = contrastOnInk(app.accentText);
  if (contrast < 4.5) {
    throw new Error(
      `${where} : accentText "${app.accentText}" donne ${contrast.toFixed(2)}:1 sur le fond ` +
        `d'encre ${INK_BG}, en dessous du seuil AA de 4.5:1. Éclaircir en conservant la teinte.`,
    );
  }

  if (app.status === 'published' && app.stores.length === 0) {
    throw new Error(where + ' : marquée "published" mais aucune boutique.');
  }
  if (app.stores.includes('play') !== (app.playUrl !== null)) {
    throw new Error(where + ' : incohérence entre stores "play" et playUrl.');
  }
  if (app.stores.includes('web') !== (app.webAppUrl !== null)) {
    throw new Error(where + ' : incohérence entre stores "web" et webAppUrl.');
  }
  if (app.status === 'coming-soon' && app.playUrl !== null) {
    throw new Error(where + ' : "coming-soon" ne doit pas avoir de lien Play.');
  }
}
