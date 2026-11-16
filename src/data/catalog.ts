import snapshot from '~/data/catalog/cars.json';
import type { Locale } from '~/i18n/locales';
import type { LocalePaths } from '~/i18n/routes';

/**
 * Le catalogue de voitures de Garage Master TCG, tel que le site le publie.
 *
 * `catalog/cars.json` est un instantané écrit par `scripts/sync-catalog.mjs` :
 * ne jamais l'éditer à la main. Ce qui en est exclu (Formule 1, cartes Premium,
 * illustrations sans licence) l'est dans ce script, pas ici.
 *
 * Le catalogue n'existe que dans les cinq langues où le jeu rédige ses fiches.
 * Aucune page n'est produite ailleurs : traduire 1 300 fiches à la machine
 * serait exactement le contenu en série que Google sanctionne.
 */
export const CATALOG_LOCALES = ['fr', 'en', 'de', 'es', 'it'] as const satisfies readonly Locale[];
export type CatalogLocale = (typeof CATALOG_LOCALES)[number];

export function isCatalogLocale(locale: Locale): locale is CatalogLocale {
  return (CATALOG_LOCALES as readonly Locale[]).includes(locale);
}

/**
 * Premier segment d'URL, traduit comme le slug d'un guide : `/voitures/`,
 * `/en/cars/`. Dupliqué à la main dans `scripts/audit-dist.mjs` (CATALOG).
 */
export const CATALOG_SEGMENT: Readonly<Record<CatalogLocale, string>> = {
  fr: 'voitures',
  en: 'cars',
  de: 'autos',
  es: 'coches',
  it: 'auto',
};

type Texts = Readonly<Record<CatalogLocale, string>>;

export interface CarSpecs {
  readonly hp?: number;
  readonly torqueNm?: number;
  readonly zeroTo100?: number;
  readonly topSpeed?: number;
  readonly weightKg?: number;
  readonly engine?: string;
  readonly drivetrain?: string;
  readonly transmission?: string;
}

export interface Car {
  readonly id: string;
  readonly make: string;
  readonly makeSlug: string;
  /** Dernier segment d'URL : l'identifiant sans le préfixe de marque. */
  readonly slug: string;
  readonly model: string;
  readonly yearStart: number;
  /** `null` : toujours en production. */
  readonly yearEnd: number | null;
  readonly country: string;
  readonly category: string;
  readonly class: string;
  readonly number: number;
  readonly popularity: number;
  readonly iconic: boolean;
  readonly specs: CarSpecs;
  readonly story: Texts;
  readonly rarityNote: Texts;
  readonly funFact: Texts;
  readonly image: {
    readonly license: string;
    readonly author: string | null;
    readonly sourceUrl: string;
    readonly version: number;
  };
}

export interface Make {
  readonly slug: string;
  readonly name: string;
  /** Par année de lancement, puis par nom. */
  readonly cars: readonly Car[];
  /** Années de lancement du plus ancien et du plus récent modèle. */
  readonly yearMin: number;
  readonly yearMax: number;
}

const data = snapshot as unknown as {
  version: number;
  generatedAt: string;
  labels: {
    class: Record<CatalogLocale, Record<string, string>>;
    category: Record<CatalogLocale, Record<string, string>>;
  };
  cars: Car[];
};

export const CARS: readonly Car[] = data.cars;
export const CATALOG_UPDATED_ON = new Date(data.generatedAt);

const byMake = new Map<string, Car[]>();
for (const car of CARS) {
  const list = byMake.get(car.makeSlug) ?? [];
  list.push(car);
  byMake.set(car.makeSlug, list);
}

export const MAKES: readonly Make[] = [...byMake.entries()]
  .map(([slug, cars]) => {
    const sorted = [...cars].sort(
      (a, b) => a.yearStart - b.yearStart || a.model.localeCompare(b.model),
    );
    return {
      slug,
      name: sorted[0]!.make,
      cars: sorted,
      yearMin: Math.min(...sorted.map((car) => car.yearStart)),
      yearMax: Math.max(...sorted.map((car) => car.yearStart)),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const makeBySlug = new Map(MAKES.map((make) => [make.slug, make]));

export function makeOf(car: Car): Make {
  return makeBySlug.get(car.makeSlug)!;
}

/**
 * En dessous, la page de marque n'est qu'une liste d'un ou deux liens : elle
 * reste en ligne pour le fil d'Ariane et le maillage, mais en `noindex`.
 */
export const MAKE_INDEX_THRESHOLD = 3;

export const carName = (car: Car): string => `${car.make} ${car.model}`;

/* ── Chemins ─────────────────────────────────────────────────────────────── */

const pathsFor = (suffix: string): LocalePaths =>
  new Map(CATALOG_LOCALES.map((locale) => [locale, `${CATALOG_SEGMENT[locale]}${suffix}`]));

export const catalogIndexPath = (locale: CatalogLocale): string => CATALOG_SEGMENT[locale];
export const makePath = (locale: CatalogLocale, make: Make): string =>
  `${CATALOG_SEGMENT[locale]}/${make.slug}`;
export const carPath = (locale: CatalogLocale, car: Car): string =>
  `${CATALOG_SEGMENT[locale]}/${car.makeSlug}/${car.slug}`;

export const catalogIndexPaths = (): LocalePaths => pathsFor('');
export const makePaths = (make: Make): LocalePaths => pathsFor(`/${make.slug}`);
export const carPaths = (car: Car): LocalePaths => pathsFor(`/${car.makeSlug}/${car.slug}`);

/* ── Photos ──────────────────────────────────────────────────────────────── */

/** 640 × 480, servie depuis `public/img/cars/`. */
export const carImage = (car: Car): string => `/img/cars/${car.id}.webp`;
/** 256 × 192. */
export const carThumb = (car: Car): string => `/img/cars/thumb/${car.id}.webp`;

/**
 * Adresse du texte de la licence, à partir du libellé du catalogue
 * (« CC BY-SA 3.0 de », « CC0 »…). `undefined` pour le domaine public, qui n'a
 * pas de texte de licence à lier.
 */
export function licenseUrl(license: string): string | undefined {
  if (license === 'CC0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
  const cc = /^CC (BY(?:-SA)?) (\d\.\d)(?: ([a-z]{2}))?$/.exec(license);
  if (!cc) return undefined;
  const [, kind, version, port] = cc;
  return `https://creativecommons.org/licenses/${kind!.toLowerCase()}/${version}/${port ? `${port}/` : ''}`;
}

/* ── Libellés repris de l'application ────────────────────────────────────── */

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

export const className = (locale: CatalogLocale, car: Car): string =>
  data.labels.class[locale][car.class] ?? car.class;

export const categoryName = (locale: CatalogLocale, car: Car): string =>
  capitalize(data.labels.category[locale][car.category] ?? car.category);

export function countryName(locale: CatalogLocale, car: Car): string {
  return new Intl.DisplayNames([locale], { type: 'region' }).of(car.country) ?? car.country;
}
