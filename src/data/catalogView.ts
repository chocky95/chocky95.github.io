import {
  carName,
  categoryName,
  countryName,
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
