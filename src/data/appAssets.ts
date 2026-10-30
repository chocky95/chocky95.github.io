import type { ImageMetadata } from 'astro';

import type { Locale } from '~/i18n/locales';

/**
 * Résolution des visuels d'application.
 *
 * Les fichiers arrivent par `scripts/sync-assets.mjs` depuis les projets
 * Flutter voisins. Ils sont résolus ici par `import.meta.glob` en mode `eager` :
 * ainsi `astro:assets` connaît les dimensions à la compilation et peut émettre
 * `width`/`height` — sans quoi chaque image provoquerait un décalage de mise en
 * page (CLS), que Google mesure directement dans les Core Web Vitals.
 *
 * Toutes les entrées sont optionnelles. Mölkky Score et Mojogo n'ont aucune
 * capture de boutique ; les composants doivent dégrader proprement plutôt que
 * de supposer leur présence.
 */

type Glob = Record<string, { default: ImageMetadata }>;

const icons = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/apps/*/icon-512.png',
  { eager: true },
) as Glob;

const banners = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/apps/*/banner-1600.webp',
  { eager: true },
) as Glob;

const features = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/apps/*/feature.webp',
  { eager: true },
) as Glob;

const diagrams = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/apps/*/diagram-*.webp',
  { eager: true },
) as Glob;

const screenshots = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/apps/*/screenshots/*/*.webp',
  { eager: true },
) as Glob;

/** `/src/assets/apps/papayoo/banner-1600.webp` -> `papayoo` */
function slugOf(key: string): string {
  return key.split('/')[4] ?? '';
}

function pick(glob: Glob, slug: string): ImageMetadata | undefined {
  for (const [key, mod] of Object.entries(glob)) {
    if (slugOf(key) === slug) return mod.default;
  }
  return undefined;
}

export function appIcon(slug: string): ImageMetadata | undefined {
  return pick(icons, slug);
}

/**
 * Le visuel large de la page : la bannière du jeu, à défaut le feature graphic
 * de la fiche boutique. C'est le même artwork que sur Google Play, donc le
 * visiteur qui arrive par la recherche reconnaît l'application.
 */
export function appHeroImage(slug: string): ImageMetadata | undefined {
  return pick(banners, slug) ?? pick(features, slug);
}

export interface NamedImage {
  readonly name: string;
  readonly image: ImageMetadata;
}

/** Schémas de jeu, triés par nom de fichier. Aujourd'hui : Mölkky uniquement. */
export function appDiagrams(slug: string): readonly NamedImage[] {
  return Object.entries(diagrams)
    .filter(([key]) => slugOf(key) === slug)
    .map(([key, mod]) => ({
      name: (key.split('/').pop() ?? '').replace(/^diagram-|\.webp$/g, ''),
      image: mod.default,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const pressImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/press/*/*.png',
  { eager: true },
) as Glob;

/**
 * Les mêmes fichiers, en URL de l'original : `?url` fait émettre le PNG tel
 * quel dans `/_astro/`, là où `<Image>` n'émet que des déclinaisons réduites.
 * C'est ce que télécharge un journaliste.
 */
const pressOriginals = import.meta.glob<string>('/src/assets/press/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export interface PressImage {
  readonly image: ImageMetadata;
  /** URL du PNG original, pleine résolution. */
  readonly original: string;
}

/**
 * Un visuel d'espace presse, par nom de fichier sans extension.
 *
 * Lève une erreur si le fichier manque : un dossier de presse annoncé avec un
 * visuel absent ne doit pas pouvoir atteindre `dist/`.
 */
export function pressImage(slug: string, file: string): PressImage {
  const key = `/src/assets/press/${slug}/${file}.png`;
  const image = pressImages[key]?.default;
  const original = pressOriginals[key];
  if (!image || !original) {
    throw new Error(`Visuel presse absent : ${key.slice(1)} (déclaré dans press/${slug}.*.md).`);
  }
  return { image, original };
}

/**
 * Captures d'écran dans la langue demandée.
 *
 * ScanFree en a dans ses 12 langues de publication : une page suédoise montre
 * donc une interface suédoise. C'est ce qui distingue une page réellement
 * localisée d'une page traduite à la va-vite — et Google sait faire la
 * différence.
 *
 * Aucun repli vers une autre langue : montrer une capture française sur une
 * page japonaise serait pire que ne rien montrer.
 */
export function appScreenshots(slug: string, locale: Locale): readonly NamedImage[] {
  const prefix = `/src/assets/apps/${slug}/screenshots/${locale}/`;

  return Object.entries(screenshots)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, mod]) => ({
      name: (key.split('/').pop() ?? '').replace(/\.webp$/, ''),
      image: mod.default,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
