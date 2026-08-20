#!/usr/bin/env node
/**
 * audit-dist.mjs — le garde-fou de sortie de build.
 *
 * Lit `dist/` et échoue si quelque chose que Google verrait est cassé.
 *
 * ── Pourquoi la matrice ci-dessous est DÉLIBÉRÉMENT dupliquée ──────────────
 * Elle redit ce que `src/data/apps.ts` déclare déjà. C'est voulu : un audit qui
 * dérive ses attentes de la source qu'il audite ne prouve rien — il confirme
 * seulement que le code fait ce que le code dit. En saisissant l'inventaire une
 * seconde fois, à la main, on obtient un vrai contrôle à deux clés : une faute
 * de frappe dans un sous-ensemble de locales, ou une collision de priorité de
 * routes entre `[...locale]/index.astro` et `[...locale]/apps/index.astro`,
 * font échouer l'audit au lieu de passer inaperçues.
 *
 * Quand vous ajoutez une app ou une langue, il FAUT modifier les deux fichiers.
 * C'est le prix, et il est correct.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://chocky95.github.io';

/* ── Inventaire attendu ──────────────────────────────────────────────────── */

const LOCALES = [
  'fr', 'en', 'de', 'fi', 'ja',
  'es', 'it', 'nl', 'pt', 'sv', 'et',
  'da', 'nb', 'pl', 'ro', 'ru', 'ko', 'cs',
];
const DEFAULT_LOCALE = 'fr';

const APP_LOCALES = {
  'molkky-score': ['fr', 'en', 'de', 'fi', 'ja', 'es', 'sv', 'et', 'cs'],
  papayoo: ['fr', 'en', 'de', 'ja', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'nb', 'pl', 'ro', 'ru', 'ko'],
  mojogo: ['fr', 'en', 'de', 'ja', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'nb', 'pl', 'ro', 'ru', 'ko'],
  scanfree: ['fr', 'en', 'de', 'ja', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'nb', 'ko'],
  easycompta: ['fr'],
};

/** Cas nommés : chacun a déjà été, ou pourrait être, un vrai bug. */
const NAMED_CASES = [
  // EasyCompta est le seul mono-locale. Il emprunte des chemins de code que
  // rien d'autre n'emprunte : zéro hreflang, sélecteur de langue vide,
  // og:locale:alternate vide. Autant d'endroits plausibles pour un bug de
  // tableau vide.
  { url: '/apps/easycompta/', expectAlternates: 0 },
  { url: '/apps/molkky-score/', expectAlternates: 10 }, // 9 + x-default
  { url: '/apps/papayoo/', expectAlternates: 16 }, // 15 + x-default
  { url: '/apps/scanfree/', expectAlternates: 13 }, // 12 + x-default
  { url: '/ja/apps/mojogo/', expectAlternates: 16 },
];

/* ── Utilitaires ─────────────────────────────────────────────────────────── */

const errors = [];
const notes = [];

const fail = (msg) => errors.push(msg);
const note = (msg) => notes.push(msg);

/** '' -> '/', 'apps' -> '/apps/', avec préfixe de locale sauf pour fr. */
function urlFor(locale, p) {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const body = p === '' ? '' : `/${p}`;
  return `${prefix}${body}/`;
}

function distPathFor(url) {
  return path.join(DIST, url.replace(/^\/|\/$/g, ''), 'index.html');
}

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Toutes les occurrences d'un motif global, en tableau. */
const all = (html, re) => [...html.matchAll(re)];

/* ── Contrôles ───────────────────────────────────────────────────────────── */

function buildExpectedUrls() {
  const urls = new Set();
  for (const locale of LOCALES) {
    urls.add(urlFor(locale, ''));
    urls.add(urlFor(locale, 'apps'));
  }
  for (const [slug, locales] of Object.entries(APP_LOCALES)) {
    for (const locale of locales) urls.add(urlFor(locale, `apps/${slug}`));
  }
  return urls;
}

/** Toute combinaison locale x app qui n'est PAS dans un sous-ensemble. */
function buildForbiddenUrls() {
  const forbidden = new Set();
  for (const [slug, locales] of Object.entries(APP_LOCALES)) {
    for (const locale of LOCALES) {
      if (!locales.includes(locale)) forbidden.add(urlFor(locale, `apps/${slug}`));
    }
  }
  return forbidden;
}

async function checkInventory(expected, forbidden) {
  for (const url of expected) {
    if (!existsSync(distPathFor(url))) fail(`Page attendue absente : ${url}`);
  }
  for (const url of forbidden) {
    if (existsSync(distPathFor(url))) {
      fail(`URL INTERDITE générée : ${url} — l'app n'existe pas dans cette langue.`);
    }
  }

  const files = await walk(DIST);
  const pages = files.filter((f) => f.endsWith('index.html'));

  if (pages.length !== expected.size) {
    fail(
      `Nombre de pages : ${pages.length} générées, ${expected.size} attendues. ` +
        'Une collision de priorité de routes produit exactement ce symptôme.',
    );
  } else {
    note(`${pages.length} pages, conformes à l'inventaire.`);
  }

  // Le 404 doit être à la racine et NULLE PART ailleurs : GitHub Pages ne sert
  // /404.html que depuis la racine de l'hôte.
  if (!existsSync(path.join(DIST, '404.html'))) fail('dist/404.html manquant.');
  const strays = files.filter(
    (f) => /404/.test(path.basename(path.dirname(f))) || (f.endsWith('404.html') && path.dirname(f) !== DIST),
  );
  for (const s of strays) fail(`404 égaré (Pages ne le servira jamais) : ${path.relative(DIST, s)}`);

  for (const required of ['robots.txt', 'sitemap-index.xml', 'sitemap-0.xml', '.nojekyll']) {
    if (!existsSync(path.join(DIST, required))) fail(`dist/${required} manquant.`);
  }

  return pages;
}

async function checkPage(file, expected) {
  const rel = '/' + path.relative(DIST, path.dirname(file)).split(path.sep).join('/') + '/';
  const url = rel === '//' ? '/' : rel;
  const html = await readFile(file, 'utf8');

  /* -- canonical ------------------------------------------------------------ */
  const canonicals = all(html, /<link rel="canonical" href="([^"]+)"/g).map((m) => m[1]);
  if (canonicals.length !== 1) {
    fail(`${url} : ${canonicals.length} balise(s) canonical, 1 attendue.`);
    return;
  }
  const canonical = canonicals[0];
  const selfUrl = SITE + url;

  if (canonical !== selfUrl) {
    fail(`${url} : canonical "${canonical}" au lieu de "${selfUrl}" (auto-référence obligatoire).`);
  }
  if (!canonical.endsWith('/')) {
    fail(`${url} : canonical sans slash final — Pages y répondrait par un 301.`);
  }

  /* -- hreflang ------------------------------------------------------------- */
  // On ne compte QUE link[rel=alternate] : le sélecteur de langue porte aussi
  // des attributs hreflang sur ses <a>, un comptage naïf doublerait tout.
  const alts = all(html, /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g).map((m) => ({
    lang: m[1],
    href: m[2],
  }));

  if (alts.length > 0) {
    const langs = alts.map((a) => a.lang);
    const dupes = langs.filter((l, i) => langs.indexOf(l) !== i);
    if (dupes.length) fail(`${url} : hreflang en doublon (${[...new Set(dupes)].join(', ')}).`);

    const xDefault = alts.filter((a) => a.lang === 'x-default');
    if (xDefault.length !== 1) fail(`${url} : ${xDefault.length} x-default, 1 attendu.`);

    // Auto-référence : Google ignore un cluster entier si les pages ne se
    // référencent pas elles-mêmes.
    if (!alts.some((a) => a.href === canonical)) {
      fail(`${url} : le cluster hreflang ne contient pas la page elle-même.`);
    }

    // Chaque cible doit être une page réellement générée.
    for (const alt of alts) {
      if (!alt.href.startsWith(SITE)) {
        fail(`${url} : hreflang "${alt.lang}" pointe hors du site (${alt.href}).`);
        continue;
      }
      const target = alt.href.slice(SITE.length);
      if (!expected.has(target)) {
        fail(`${url} : hreflang "${alt.lang}" pointe vers ${target}, qui n'existe pas.`);
      }
    }
  }

  /* -- titre et description ------------------------------------------------- */
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  if (!title) fail(`${url} : <title> vide ou absent.`);
  else if (title.length > 65) note(`${url} : <title> de ${title.length} caractères (Google tronque vers 60).`);

  const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
  if (!desc) fail(`${url} : meta description absente.`);

  const h1Count = all(html, /<h1[\s>]/g).length;
  if (h1Count !== 1) fail(`${url} : ${h1Count} balise(s) <h1>, exactement 1 attendue.`);

  /* -- liens internes ------------------------------------------------------- */
  for (const m of all(html, /\shref="(\/[^"]*)"/g)) {
    const link = m[1];
    if (link.startsWith('//')) {
      fail(`${url} : lien "${link}" commence par // (bug de double préfixe base).`);
      continue;
    }
    if (/\/(_astro|favicon|apple-touch|sitemap|robots)/.test(link)) continue;
    if (link.includes('#')) continue;

    if (!link.endsWith('/')) {
      fail(`${url} : lien interne "${link}" sans slash final — Pages y répondrait par un 301.`);
    } else if (!expected.has(link)) {
      fail(`${url} : lien interne cassé vers "${link}".`);
    }
  }

  /* -- assets référencés ---------------------------------------------------- */
  // Une image OG en 404 casse silencieusement tous les aperçus de partage, et
  // rien dans le HTML ne le signale. On vérifie donc que chaque asset local
  // référencé existe bien dans dist/.
  const assetRefs = [
    ...all(html, /<link rel="(?:icon|apple-touch-icon)" href="(\/[^"]+)"/g),
    ...all(html, /<meta (?:property="og:image"|name="twitter:image") content="([^"]+)"/g),
    ...all(html, /<img[^>]+src="(\/[^"]+)"/g),
  ].map((m) => m[1]);

  for (const ref of assetRefs) {
    const local = ref.startsWith(SITE) ? ref.slice(SITE.length) : ref;
    if (!local.startsWith('/')) continue; // asset distant, hors périmètre
    const onDisk = path.join(DIST, local.replace(/^\//, ''));
    if (!existsSync(onDisk)) fail(`${url} : asset référencé absent de dist/ — ${local}`);
  }

  /* -- doublement de segment ------------------------------------------------ */
  const doubled = /\/([a-z-]+)\/\1\//.exec(url);
  if (doubled) fail(`${url} : segment "${doubled[1]}" doublé dans l'URL.`);

  return { url, alts: alts.length, noindex: /content="noindex/.test(html) };
}

async function checkNoClientJs() {
  const files = await walk(DIST);
  const js = files.filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));
  if (js.length > 0) {
    fail(
      `${js.length} fichier(s) JS dans dist/ — le site doit être à zéro JS client : ` +
        js.map((f) => path.relative(DIST, f)).join(', '),
    );
  } else {
    note('Zéro JS client.');
  }

  // Un <script> inline échapperait au contrôle précédent.
  for (const page of files.filter((f) => f.endsWith('.html'))) {
    const html = await readFile(page, 'utf8');
    const scripts = all(html, /<script(?![^>]*type="application\/ld\+json")/g);
    if (scripts.length > 0) {
      fail(`${path.relative(DIST, page)} : ${scripts.length} <script> non-JSON-LD.`);
    }
  }
}

async function checkNamedCases() {
  for (const c of NAMED_CASES) {
    const file = distPathFor(c.url);
    if (!existsSync(file)) {
      fail(`Cas nommé absent : ${c.url}`);
      continue;
    }
    const html = await readFile(file, 'utf8');
    const count = all(html, /<link rel="alternate" hreflang=/g).length;
    if (count !== c.expectAlternates) {
      fail(`${c.url} : ${count} hreflang, ${c.expectAlternates} attendus.`);
    }
  }
}

async function checkSitemap() {
  const xml = await readFile(path.join(DIST, 'sitemap-0.xml'), 'utf8');
  const locs = all(xml, /<loc>([^<]+)<\/loc>/g).map((m) => m[1]);

  if (locs.some((l) => l.includes('/404'))) fail('Le sitemap contient la page 404.');

  const forbidden = buildForbiddenUrls();
  for (const loc of locs) {
    const p = loc.replace(SITE, '');
    if (forbidden.has(p)) fail(`Le sitemap référence une URL interdite : ${p}`);
    if (!p.endsWith('/')) fail(`Le sitemap contient une URL sans slash final : ${p}`);
  }

  const robots = await readFile(path.join(DIST, 'robots.txt'), 'utf8');
  if (!robots.includes('sitemap-index.xml')) {
    fail('robots.txt ne pointe pas vers sitemap-index.xml. Attention : /sitemap.xml renvoie 404.');
  }
  note(`Sitemap : ${locs.length} URL.`);
}

/* ── Exécution ───────────────────────────────────────────────────────────── */

if (!existsSync(DIST)) {
  console.error('dist/ absent. Lancez `npm run build` d’abord.');
  process.exit(1);
}

const expected = buildExpectedUrls();
const forbidden = buildForbiddenUrls();

const pages = await checkInventory(expected, forbidden);

let noindexCount = 0;
for (const page of pages) {
  const res = await checkPage(page, expected);
  if (res?.noindex) noindexCount += 1;
}

await checkNoClientJs();
await checkNamedCases();
await checkSitemap();

const distSize = (await Promise.all((await walk(DIST)).map((f) => stat(f)))).reduce(
  (sum, s) => sum + s.size,
  0,
);

console.log('\n─── audit-dist ───');
for (const n of notes) console.log(`  · ${n}`);
console.log(`  · ${noindexCount} page(s) en noindex (traduction non rédigée ou non relue).`);
console.log(`  · dist/ : ${(distSize / 1024 / 1024).toFixed(2)} Mo`);

if (errors.length > 0) {
  console.error(`\n${errors.length} ERREUR(S) :`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log('\n✓ Audit passé.\n');
