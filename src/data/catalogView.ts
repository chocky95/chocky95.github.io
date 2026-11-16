import {
  CARS,
  carName,
  categoryName,
  countryName,
  makeOf,
  type Car,
  type CatalogLocale,
} from '~/data/catalog';
import { CATALOG_STRINGS } from '~/data/catalogStrings';

/**
 * Mise en forme des fiches : tout ce que les trois gabarits du catalogue
 * (index, marque, voiture) affichent de la même façon.
 */

const number = (locale: CatalogLocale, value: number, digits = 0): string =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

export const formatCount = (locale: CatalogLocale, value: number): string => number(locale, value);

/** « 1986–1999 », « 1967 » pour une seule année, « depuis 2018 » si elle est encore produite. */
export function yearsLabel(locale: CatalogLocale, car: Car): string {
  if (car.yearEnd === null) return CATALOG_STRINGS[locale].car.since(car.yearStart);
  if (car.yearEnd === car.yearStart) return String(car.yearStart);
  return `${car.yearStart}–${car.yearEnd}`;
}

export const powerLabel = (locale: CatalogLocale, hp: number): string =>
  `${number(locale, hp)} ${CATALOG_STRINGS[locale].hpUnit}`;

export const speedLabel = (locale: CatalogLocale, kmh: number): string =>
  `${number(locale, kmh)} km/h`;

export interface SpecRow {
  readonly label: string;
  readonly value: string;
}

/** Les lignes de la fiche technique. Une valeur absente du catalogue n'a pas de ligne. */
export function specRows(locale: CatalogLocale, car: Car): readonly SpecRow[] {
  const s = CATALOG_STRINGS[locale];
  const { specs } = car;
  const rows: SpecRow[] = [{ label: s.specs.production, value: yearsLabel(locale, car) }];

  if (specs.engine) rows.push({ label: s.specs.engine, value: specs.engine });
  if (specs.hp !== undefined) rows.push({ label: s.specs.power, value: powerLabel(locale, specs.hp) });
  if (specs.torqueNm !== undefined) {
    rows.push({ label: s.specs.torque, value: `${number(locale, specs.torqueNm)} Nm` });
  }
  if (specs.zeroTo100 !== undefined) {
    rows.push({ label: s.specs.accel, value: `${number(locale, specs.zeroTo100, 1)} s` });
  }
  if (specs.topSpeed !== undefined) {
    rows.push({ label: s.specs.topSpeed, value: speedLabel(locale, specs.topSpeed) });
  }
  if (specs.weightKg !== undefined) {
    rows.push({ label: s.specs.weight, value: `${number(locale, specs.weightKg)} kg` });
  }
  if (specs.weightKg !== undefined && specs.hp !== undefined && specs.hp > 0) {
    rows.push({
      label: s.specs.powerToWeight,
      value: `${number(locale, specs.weightKg / specs.hp, 1)} kg/${s.hpUnit}`,
    });
  }
  if (specs.drivetrain) {
    rows.push({
      label: s.specs.drivetrain,
      value: s.drivetrains[specs.drivetrain] ?? specs.drivetrain,
    });
  }
  if (specs.transmission) {
    rows.push({
      label: s.specs.transmission,
      value: s.transmissions[specs.transmission] ?? specs.transmission,
    });
  }
  rows.push({ label: s.specs.country, value: countryName(locale, car) });
  rows.push({ label: s.specs.category, value: categoryName(locale, car) });

  return rows;
}

/* ── Classements ─────────────────────────────────────────────────────────── */

export interface RankRow {
  readonly label: string;
  /** Absent quand la marque compte moins de trois modèles chiffrés sur ce critère. */
  readonly inMake: string | undefined;
  readonly inCatalog: string;
}

const RANKED = [
  { key: 'hp', lowerIsBetter: false },
  { key: 'topSpeed', lowerIsBetter: false },
  { key: 'zeroTo100', lowerIsBetter: true },
] as const;

/** Rang parmi `cars` : 1 + le nombre de voitures strictement meilleures (les ex æquo partagent leur rang). */
function rankAmong(
  cars: readonly Car[],
  value: number,
  key: (typeof RANKED)[number]['key'],
  lowerIsBetter: boolean,
): { rank: number; total: number } {
  let better = 0;
  let total = 0;
  for (const other of cars) {
    const otherValue = other.specs[key];
    if (otherValue === undefined) continue;
    total += 1;
    if (lowerIsBetter ? otherValue < value : otherValue > value) better += 1;
  }
  return { rank: better + 1, total };
}

/**
 * La place du modèle dans sa marque et dans le catalogue, critère par critère.
 *
 * C'est une information que le catalogue seul permet de calculer, et qui n'est
 * la même sur aucune autre fiche.
 */
export function rankRows(locale: CatalogLocale, car: Car): readonly RankRow[] {
  const s = CATALOG_STRINGS[locale];
  const labels = { hp: s.specs.power, topSpeed: s.specs.topSpeed, zeroTo100: s.specs.accel };
  const makeCars = makeOf(car).cars;
  const rows: RankRow[] = [];

  for (const { key, lowerIsBetter } of RANKED) {
    const value = car.specs[key];
    if (value === undefined) continue;
    const inMake = rankAmong(makeCars, value, key, lowerIsBetter);
    const inCatalog = rankAmong(CARS, value, key, lowerIsBetter);
    rows.push({
      label: labels[key],
      inMake:
        inMake.total >= 3 ? s.rank.position(inMake.rank, number(locale, inMake.rank), number(locale, inMake.total)) : undefined,
      inCatalog: s.rank.position(
        inCatalog.rank,
        number(locale, inCatalog.rank),
        number(locale, inCatalog.total),
      ),
    });
  }
  return rows;
}

/* ── Voitures comparables ────────────────────────────────────────────────── */

const rivalsCache = new Map<string, readonly Car[]>();

/**
 * Six voitures d'autres marques, de la même catégorie, les plus proches par
 * l'année de lancement puis par la puissance.
 *
 * Sans elles, une fiche ne lie que sa propre marque et le catalogue forme 119
 * silos : ces liens font passer d'une marque à l'autre, pour le lecteur comme
 * pour le robot.
 */
export function rivals(car: Car): readonly Car[] {
  const cached = rivalsCache.get(car.id);
  if (cached) return cached;

  const distance = (other: Car): number => {
    const years = Math.abs(other.yearStart - car.yearStart);
    const power =
      car.specs.hp !== undefined && other.specs.hp !== undefined && car.specs.hp > 0 && other.specs.hp > 0
        ? Math.abs(Math.log(other.specs.hp / car.specs.hp)) * 10
        : 5;
    return years + power;
  };

  const picked = CARS.filter(
    (other) => other.makeSlug !== car.makeSlug && other.category === car.category,
  )
    .map((other) => ({ other, d: distance(other) }))
    .sort((a, b) => a.d - b.d || a.other.id.localeCompare(b.other.id))
    .slice(0, 6)
    .map(({ other }) => other);

  rivalsCache.set(car.id, picked);
  return picked;
}

/** Google tronque les titres vers 60 : au-delà de 65, on retombe sur une forme plus courte. */
export function carTitle(locale: CatalogLocale, car: Car): string {
  const s = CATALOG_STRINGS[locale].car;
  const long = s.titleLong(carName(car), yearsLabel(locale, car));
  if (long.length <= 65) return long;
  const short = s.titleShort(carName(car));
  return short.length <= 65 ? short : carName(car);
}

/** Coupe à la dernière espace avant `max`, sans laisser de ponctuation pendante. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:–-]+$/, '')}…`;
}

/**
 * Meta description : les chiffres d'abord, puis le début de l'histoire.
 *
 * Propre à chaque voiture par construction : 1 300 descriptions identiques à
 * un nom près seraient lues par Google comme une seule page répétée.
 */
export function carDescription(locale: CatalogLocale, car: Car): string {
  const s = CATALOG_STRINGS[locale];
  const figures = [
    car.specs.hp !== undefined ? powerLabel(locale, car.specs.hp) : undefined,
    car.specs.topSpeed !== undefined ? speedLabel(locale, car.specs.topSpeed) : undefined,
    car.specs.zeroTo100 !== undefined
      ? s.car.accelSummary(number(locale, car.specs.zeroTo100, 1))
      : undefined,
  ].filter((part) => part !== undefined);

  const head =
    figures.length > 0
      ? `${carName(car)} (${yearsLabel(locale, car)})${s.colon}${figures.join(', ')}. `
      : '';

  return truncate(`${head}${car.story[locale]}`, 158);
}
