#!/usr/bin/env node
/**
 * Importe le catalogue de Garage Master TCG dans le site.
 *
 *   npm run catalog:sync                 -> la version la plus récente du dépôt
 *   npm run catalog:sync -- v25-qfeUh…   -> une version précise
 *
 * ── Pourquoi un instantané commité ───────────────────────────────────────
 * Le site se construit dans GitHub Actions, où le dépôt `tcg` n'existe pas.
 * Comme pour `sync-assets.mjs`, la synchronisation se fait donc sur le poste
 * et son résultat est commité : `src/data/catalog/cars.json` et les photos de
 * `public/img/cars/`.
 *
 * ── Ce qui n'entre PAS sur le site ───────────────────────────────────────
 * Seule la série `global` est publiée. Restent dehors, par décision du
 * 2026-11-16 :
 *   - la série `formule-1` (livrées, sponsors et marque F1 de tiers) ;
 *   - les séries `premium` et `gift` (voitures de films ou de créateurs, et
 *     cartes que le jeu lui-même masque tant qu'on ne les possède pas) ;
 *   - toute carte dont l'illustration n'est pas une photo sous licence
 *     (`kind: ai`), ou dont la photo n'a ni licence ni source.
 * Une voiture retirée du catalogue du jeu disparaît du site à la
 * synchronisation suivante, photo comprise.
 *
 * ── Attention à la version ───────────────────────────────────────────────
 * Le dépôt `tcg` contient des versions préparées à l'avance. Ne synchroniser
 * qu'une version EN LIGNE en production : le script ne sait pas le vérifier.
 */

import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TCG = path.resolve(ROOT, '..', 'tcg');
const CATALOGS = path.join(TCG, 'hosting', 'public', 'catalog');
const IMAGES = path.join(TCG, 'hosting', 'public', 'img', 'cars');
const ARB = path.join(TCG, 'packages', 'tcg_core', 'lib', 'l10n');

const OUT_JSON = path.join(ROOT, 'src', 'data', 'catalog', 'cars.json');
const OUT_IMG = path.join(ROOT, 'public', 'img', 'cars');

/** Les langues dans lesquelles le jeu rédige ses fiches. */
const LOCALES = ['fr', 'en', 'de', 'es', 'it'];

const EXCLUDED_CATEGORIES = new Set(['formula']);

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function die(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function pickCatalogDir(requested) {
  if (requested) {
    const dir = path.join(CATALOGS, requested);
    if (!existsSync(dir)) die(`Version introuvable : ${dir}`);
    return dir;
  }
  const versions = (await readdir(CATALOGS))
    .map((name) => ({ name, n: Number(/^v(\d+)/.exec(name)?.[1] ?? NaN) }))
    .filter((v) => Number.isFinite(v.n))
    .sort((a, b) => b.n - a.n);
  if (versions.length === 0) die(`Aucune version dans ${CATALOGS}`);
  return path.join(CATALOGS, versions[0].name);
}

/** Libellés repris de l'application : `classD`, `categorySupercar`… */
async function readLabels() {
  const labels = { class: {}, category: {} };
  for (const locale of LOCALES) {
    const arb = JSON.parse(await readFile(path.join(ARB, `app_${locale}.arb`), 'utf8'));
    labels.class[locale] = {};
    labels.category[locale] = {};
    for (const [key, value] of Object.entries(arb)) {
      const cls = /^class([A-Z])$/.exec(key);
      if (cls) labels.class[locale][cls[1]] = value;
      const cat = /^category([A-Z][a-z]+)$/.exec(key);
      if (cat) labels.category[locale][cat[1].toLowerCase()] = value;
    }
  }
  return labels;
}

async function copyIfChanged(from, to) {
  if (existsSync(to)) {
    const [a, b] = await Promise.all([stat(from), stat(to)]);
    if (a.size === b.size && a.mtimeMs <= b.mtimeMs) return false;
  }
  await copyFile(from, to);
  return true;
}

const dir = await pickCatalogDir(process.argv[2]);
const source = JSON.parse(await readFile(path.join(dir, 'cars.json'), 'utf8'));
const labels = await readLabels();

const cars = [];
const skipped = { series: 0, category: 0, image: 0 };

for (const car of source.cars) {
  if (car.seriesId !== 'global') {
    skipped.series += 1;
    continue;
  }
  if (EXCLUDED_CATEGORIES.has(car.category)) {
    skipped.category += 1;
    continue;
  }
  const image = car.images?.base;
  if (image?.kind !== 'photo' || !image.license || !image.sourceUrl) {
    skipped.image += 1;
    continue;
  }

  const makeSlug = slugify(car.make);
  if (!car.id.startsWith(`${makeSlug}-`)) {
    die(`${car.id} : l'identifiant ne commence pas par la marque « ${makeSlug} ».`);
  }
  for (const field of ['story', 'rarityNote', 'funFact']) {
    for (const locale of LOCALES) {
      if (!car[field]?.[locale]) die(`${car.id} : ${field}.${locale} manquant.`);
    }
  }
  if (!labels.category.fr[car.category]) die(`${car.id} : catégorie « ${car.category} » sans libellé.`);

  const pick = (texts) => Object.fromEntries(LOCALES.map((l) => [l, texts[l]]));

  cars.push({
    id: car.id,
    make: car.make,
    makeSlug,
    /** Dernier segment d'URL : l'identifiant sans le préfixe de marque. */
    slug: car.id.slice(makeSlug.length + 1),
    model: car.model,
    yearStart: car.yearStart,
    yearEnd: car.yearEnd ?? null,
    country: car.country,
    category: car.category,
    class: car.class,
    number: car.number,
    popularity: car.popularity ?? 0,
    iconic: car.iconic === true,
    specs: car.specs,
    story: pick(car.story),
    rarityNote: pick(car.rarityNote),
    funFact: pick(car.funFact),
    image: {
      license: image.license,
      author: image.author ?? null,
      sourceUrl: image.sourceUrl,
      version: image.version ?? 1,
    },
  });
}

cars.sort((a, b) => a.id.localeCompare(b.id));

/* ── Photos ──────────────────────────────────────────────────────────────── */

await mkdir(path.join(OUT_IMG, 'thumb'), { recursive: true });

let copied = 0;
for (const car of cars) {
  const mid = path.join(IMAGES, 'mid', `${car.id}.webp`);
  const thumb = path.join(IMAGES, 'thumb', `${car.id}.webp`);
  if (!existsSync(mid) || !existsSync(thumb)) die(`${car.id} : photo absente de ${IMAGES}.`);
  if (await copyIfChanged(mid, path.join(OUT_IMG, `${car.id}.webp`))) copied += 1;
  await copyIfChanged(thumb, path.join(OUT_IMG, 'thumb', `${car.id}.webp`));
}

// Une voiture sortie du catalogue ne garde pas sa photo en ligne.
const keep = new Set(cars.map((car) => `${car.id}.webp`));
let removed = 0;
for (const sub of ['', 'thumb']) {
  for (const name of await readdir(path.join(OUT_IMG, sub))) {
    if (name.endsWith('.webp') && !keep.has(name)) {
      await rm(path.join(OUT_IMG, sub, name));
      removed += 1;
    }
  }
}

/* ── Instantané ──────────────────────────────────────────────────────────── */

await mkdir(path.dirname(OUT_JSON), { recursive: true });
await writeFile(
  OUT_JSON,
  JSON.stringify({ version: source.version, generatedAt: source.generatedAt, labels, cars }) + '\n',
);

const makes = new Set(cars.map((car) => car.makeSlug));
console.log(`Catalogue v${source.version} (${path.basename(dir)})`);
console.log(`  ${cars.length} voitures, ${makes.size} marques`);
console.log(
  `  écartées : ${skipped.series} hors série globale, ${skipped.category} par catégorie, ${skipped.image} sans photo sous licence`,
);
console.log(`  photos : ${copied} copiée(s), ${removed} retirée(s)`);
console.log('\nReportez ces deux nombres dans CATALOG de scripts/audit-dist.mjs :');
console.log(`  cars: ${cars.length}, makes: ${makes.size}`);
