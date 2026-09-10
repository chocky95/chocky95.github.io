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
const SITE = 'https://chocky.dev';

/* ── Inventaire attendu ──────────────────────────────────────────────────── */

const LOCALES = [
  'fr', 'en', 'de', 'fi', 'ja',
  'es', 'it', 'nl', 'pt', 'sv', 'et',
  'da', 'nb', 'pl', 'ro', 'ru', 'ko', 'cs',
];
const DEFAULT_LOCALE = 'fr';

/**
 * Chaque application a une page dans les 18 langues, comme l'accueil — que
 * l'application elle-même gère nativement cette langue ou non (voir
 * NATIVE_LOCALES ci-dessous). Ce n'est donc plus un sous-ensemble par app,
 * mais on le retape quand même à la main pour la même raison que le reste de
 * ce fichier : confirmer que le code fait bien ce qu'il prétend faire.
 */
const APP_LOCALES = {
  'molkky-score': LOCALES,
  papayoo: LOCALES,
  mojogo: LOCALES,
  scanfree: LOCALES,
  easycompta: LOCALES,
};

/**
 * Langues où l'INTERFACE de l'application existe réellement (fichiers
 * `.arb`). En dehors de ce sous-ensemble, la page doit porter l'avis de repli
 * anglais (`lang-fallback-notice`) — sinon un visiteur découvre la limite
 * seulement après avoir installé l'app.
 */
const NATIVE_LOCALES = {
  'molkky-score': ['fr', 'en', 'de', 'fi', 'ja', 'es', 'sv', 'et', 'cs'],
  papayoo: ['fr', 'en', 'de', 'ja', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'nb', 'pl', 'ro', 'ru', 'ko'],
  mojogo: ['fr', 'en', 'de', 'ja', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'nb', 'pl', 'ro', 'ru', 'ko'],
  scanfree: ['fr', 'en', 'de', 'ja', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'nb', 'ko'],
  easycompta: ['fr'],
};

/**
 * Pages éditoriales : cluster -> { locale: slug localisé }.
 *
 * Contrairement aux pages d'application, dont le slug est un nom de marque
 * invariant, le slug d'un guide est traduit — un Finlandais tape
 * « mölkky säännöt », pas « molkky rules ». Le cluster hreflang regroupe donc
 * des URL de chemins différents, ce qui en fait le meilleur endroit du site
 * pour une erreur de réciprocité. D'où cette table, saisie à la main.
 */
const GUIDES = {
  'molkky-rules': {
    fr: 'regles-du-molkky',
    en: 'molkky-rules',
    de: 'molkky-regeln',
    fi: 'molkky-saannot',
    sv: 'molkky-regler',
    // Slug en ASCII pour le japonais : un slug en katakana serait
    // percent-encode dans toutes les URL, les hreflang et le sitemap.
    ja: 'molkky-rules',
    es: 'reglas-del-molkky',
    it: 'regole-del-molkky',
    nl: 'molkky-regels',
    pt: 'regras-do-molkky',
    et: 'molkky-reeglid',
    // da, nb et sv partagent le meme slug : les prefixes de locale suffisent
    // a les distinguer, et c'est bien le mot que ces trois publics tapent.
    da: 'molkky-regler',
    nb: 'molkky-regler',
    pl: 'zasady-molkky',
    ro: 'reguli-molkky',
    // Translitteres pour la meme raison que le japonais : un slug cyrillique
    // ou hangul serait percent-encode partout.
    ru: 'pravila-molkky',
    ko: 'molkky-rules',
    cs: 'pravidla-molkky',
  },
};

/**
 * Cas nommés : chacun a déjà été, ou pourrait être, un vrai bug.
 *
 * Depuis que chaque application a une page dans les 18 langues, le cluster
 * hreflang de toute page d'app vaut uniformément 19 (18 + x-default) — y
 * compris EasyCompta, qui était auparavant le seul cas à zéro.
 */
const NAMED_CASES = [
  { url: '/apps/easycompta/', expectAlternates: 19 },
  { url: '/apps/molkky-score/', expectAlternates: 19 },
  { url: '/apps/papayoo/', expectAlternates: 19 },
  { url: '/apps/scanfree/', expectAlternates: 19 },
  { url: '/ja/apps/mojogo/', expectAlternates: 19 },
  /*
   * Les trois formes de guide. Leur slug est traduit, donc leur cluster relie 18
   * chemins DIFFÉRENTS — c'est le seul endroit du site où le regroupement par
   * préfixe de locale ne peut pas fonctionner, et c'est exactement là que le
   * sitemap déclarait 0 alternate pendant que le HTML en déclarait 19.
   *
   * Ce nombre 19, saisi à la main, est la seconde clé de `checkSitemapHreflang` :
   * la parité HTML/sitemap est satisfaite par deux clusters également vides, ce
   * contrôle-ci ne l'est pas.
   */
  // Slug unique à sa langue : @astrojs/sitemap n'avait personne à regrouper.
  { url: '/regles-du-molkky/', expectAlternates: 19 },
  { url: '/fi/molkky-saannot/', expectAlternates: 19 },
  // Slug PARTAGÉ par da, nb et sv : le plugin en tirait un faux cluster de 3.
  { url: '/sv/molkky-regler/', expectAlternates: 19 },
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

/** '/de/apps/' -> 'de' ; '/regles-du-molkky/' -> 'fr' (locale par défaut, sans préfixe). */
function localeOf(url) {
  const first = url.split('/')[1] ?? '';
  return LOCALES.includes(first) ? first : DEFAULT_LOCALE;
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
  // Les guides sont à la racine, avec un slug localisé.
  for (const byLocale of Object.values(GUIDES)) {
    for (const [locale, slug] of Object.entries(byLocale)) urls.add(urlFor(locale, slug));
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

  /*
   * Pages legales servies depuis public/, en fichiers PLATS et non en
   * index.html : le comptage ci-dessus n'admet que les 144 pages de
   * l'inventaire, un index.html de plus le ferait echouer.
   *
   * Leurs URL sont declarees dans Google Play Console (champs « Regles de
   * confidentialite » et « Suppression du compte »). Google les revisite
   * periodiquement : un 404 vaut un avertissement de conformite et peut
   * bloquer les mises a jour de l'application. Elles ne peuvent donc pas
   * etre supprimees ni renommees au fil d'un refactor -- d'ou cette
   * assertion, qui fait echouer le deploiement plutot que la fiche Play.
   *
   * Si ces pages migrent un jour vers une vraie route i18n, la page plate
   * doit RESTER, en <meta http-equiv="refresh"> vers la nouvelle : l'URL
   * connue de Google doit survivre.
   */
  for (const declared of ['legal/mojogo-privacy.html', 'legal/mojogo-delete-account.html']) {
    if (!existsSync(path.join(DIST, declared))) {
      fail(`dist/${declared} manquant — URL declaree dans Google Play Console.`);
    }
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

  if (alts.length === 0) {
    /*
     * Toute page de ce site existe dans au moins deux langues : un cluster vide
     * n'est pas un cas légitime mais une régression silencieuse — et c'est la
     * forme exacte qu'avait le défaut du sitemap sur les guides. Sans ce
     * contrôle, la parité HTML/sitemap serait satisfaite par deux clusters
     * également vides.
     *
     * Le jour où une page réellement mono-locale apparaît (`alternates()` rend
     * un tableau vide quand `paths.size <= 1`), ce contrôle doit être rouvert
     * délibérément, pas contourné.
     */
    fail(`${url} : aucun hreflang. Toute page du site existe en plusieurs langues.`);
  } else {
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
  // Collectés au passage : `checkInternalMesh` en dérive le graphe de liens sans
  // relire les 144 fichiers une troisième fois.
  const links = new Set();

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
    } else {
      links.add(link);
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

  return { url, alts, links, noindex: /content="noindex/.test(html) };
}

/**
 * Maillage interne intra-langue.
 *
 * ── Pourquoi ce contrôle existe ──────────────────────────────────────────────
 * Search Console écartait 23 pages en « Détectée, actuellement non indexée » :
 * Google connaissait les URL par le sitemap mais ne les avait jamais explorées.
 * Le relevé a montré pourquoi — aucun accueil ne liait son hub `/apps/`, et 6
 * accueils sur 18 seulement liaient leur guide. Ces 30 pages étaient à 2 clics,
 * et la prose des hubs comme des guides ne contient aucun lien interne.
 *
 * Deux invariants, donc :
 *
 *   1. aucune orpheline — chaque URL est désignée par au moins un lien venant de
 *      SA langue. Le filtre intra-langue est essentiel : le sélecteur de langue
 *      apporte 17 liens à toute page du site, ce qui masquerait n'importe quelle
 *      orpheline derrière un décompte flatteur ;
 *   2. profondeur 1 — l'accueil de la langue lie chacune de ses pages, et chaque
 *      page renvoie vers son accueil.
 *
 * Aucune E/S : le graphe vient des liens que `checkPage` a déjà collectés.
 */
function checkInternalMesh(expected, linksByUrl) {
  const before = errors.length;
  const inbound = new Map([...expected].map((u) => [u, new Set()]));

  for (const [url, links] of linksByUrl) {
    for (const target of links) {
      if (target !== url) inbound.get(target)?.add(url);
    }

    const home = urlFor(localeOf(url), '');
    if (url !== home && !links.has(home)) {
      fail(`${url} : ne renvoie pas vers l'accueil de sa langue (${home}).`);
    }
  }

  for (const [url, sources] of inbound) {
    if (!linksByUrl.has(url)) continue; // page absente : déjà signalée plus haut

    const home = urlFor(localeOf(url), '');
    const sameLocale = [...sources].filter((s) => localeOf(s) === localeOf(url));

    if (sameLocale.length === 0) {
      fail(`${url} : orpheline — aucun lien intra-langue ne la désigne.`);
    } else if (url !== home && !sameLocale.includes(home)) {
      fail(`${url} : à plus d'un clic de ${home} — l'accueil de sa langue ne la lie pas.`);
    }
  }

  if (errors.length === before) {
    note('Maillage : aucune orpheline, toutes les pages à 1 clic de leur accueil.');
  }
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

async function checkNamedCases(sitemapXml) {
  for (const c of NAMED_CASES) {
    const file = distPathFor(c.url);
    if (!existsSync(file)) {
      fail(`Cas nommé absent : ${c.url}`);
      continue;
    }
    const html = await readFile(file, 'utf8');
    const count = all(html, /<link rel="alternate" hreflang=/g).length;
    if (count !== c.expectAlternates) {
      fail(`${c.url} : ${count} hreflang dans le HTML, ${c.expectAlternates} attendus.`);
    }

    // Recherche par sous-chaîne, non par RegExp : un slug n'a pas à être
    // échappé pour être cherché.
    const start = sitemapXml.indexOf(`<url><loc>${SITE}${c.url}</loc>`);
    if (start === -1) {
      // Une page en noindex est légitimement absente du sitemap.
      if (!/content="noindex/.test(html)) fail(`Cas nommé absent du sitemap : ${c.url}`);
      continue;
    }
    const block = sitemapXml.slice(start, sitemapXml.indexOf('</url>', start));
    const inXml = all(block, /<xhtml:link/g).length;
    if (inXml !== c.expectAlternates) {
      fail(`${c.url} : ${inXml} xhtml:link dans le sitemap, ${c.expectAlternates} attendus.`);
    }
  }
}

/**
 * L'avis de repli anglais doit apparaître exactement là où l'application ne
 * gère pas nativement la langue de la page — jamais ailleurs, jamais absent.
 * `class="lang-fallback-notice"` sert de marqueur, plutôt que le texte : il
 * est traduit dans les 18 langues et donc impossible à chercher tel quel.
 */
async function checkLanguageFallback() {
  for (const [slug, locales] of Object.entries(APP_LOCALES)) {
    const native = new Set(NATIVE_LOCALES[slug]);
    for (const locale of locales) {
      const url = urlFor(locale, `apps/${slug}`);
      const file = distPathFor(url);
      if (!existsSync(file)) continue; // déjà signalé par checkInventory

      const html = await readFile(file, 'utf8');
      // Le sélecteur CSS `.lang-fallback-notice` est inliné sur CHAQUE page
      // (styles scoped d'Astro) : chercher la sous-chaîne nue matcherait
      // toujours. Il faut l'élément rendu, attribut `class=`.
      const hasNotice = /<p class="lang-fallback-notice"/.test(html);

      if (native.has(locale) && hasNotice) {
        fail(`${url} : avis de repli anglais affiché alors que l'app gère "${locale}" nativement.`);
      }
      if (!native.has(locale) && !hasNotice) {
        fail(`${url} : avis de repli anglais absent alors que l'app ne gère pas "${locale}" nativement.`);
      }
    }
  }
}

/**
 * Parité stricte entre les `xhtml:link` du sitemap et les hreflang du HTML.
 *
 * ── Pourquoi ce contrôle existe ──────────────────────────────────────────────
 * L'audit ne lisait que le HTML. Or le mode i18n de @astrojs/sitemap regroupe
 * les alternates par SUBSTITUTION DU PRÉFIXE DE LOCALE : il postule que la page
 * existe au même chemin dans toutes les langues. Vrai pour les 126 pages à
 * chemin invariant, structurellement faux pour les guides, dont le slug est
 * traduit — rien dans un chemin ne relie /regles-du-molkky/ à
 * /fi/molkky-saannot/.
 *
 * Mesure avant correction : 12 blocs de guide sans aucun alternate, 6 blocs avec
 * un cluster tronqué de 3 entrées et sans x-default, pendant que le HTML des
 * mêmes pages déclarait les 19 bons alternates. Le sitemap contredisait la page
 * qu'il annonçait, et rien ne le voyait.
 *
 * `finalize-sitemap.mjs` réécrit désormais ces liens depuis le HTML. Ce contrôle
 * est le garde-fou de cette réécriture : si elle est retirée, court-circuitée, ou
 * si une famille de pages y échappe, l'audit échoue ici.
 *
 * @returns le nombre de clusters vérifiés conformes.
 */
function checkSitemapHreflang(sitemapXml, altsByUrl) {
  let ok = 0;

  for (const m of all(sitemapXml, /<url>[\s\S]*?<\/url>/g)) {
    const block = m[0];
    const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1];
    if (!loc?.startsWith(SITE)) continue;
    const url = loc.slice(SITE.length);

    const htmlAlts = altsByUrl.get(url);
    if (!htmlAlts) {
      fail(`Sitemap : aucun hreflang HTML connu pour ${url} (page absente, ou déjà signalée plus haut).`);
      continue;
    }

    // Motif tolérant à l'ordre des attributs, PUIS contrôle du compte brut : une
    // balise xhtml:link que ce motif ne saurait pas lire doit se voir, pas
    // disparaître du décompte.
    const parsed = all(block, /<xhtml:link\s[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g).map(
      (x) => `${x[1]} ${x[2]}`,
    );
    const raw = all(block, /<xhtml:link/g).length;
    if (raw !== parsed.length) {
      fail(`Sitemap : ${url} — ${raw - parsed.length} xhtml:link illisible(s) (attributs réordonnés ?).`);
      continue;
    }

    const fromHtml = htmlAlts.map((a) => `${a.lang} ${a.href}`);

    // Comparaison des ENSEMBLES : Google ne lit pas l'ordre, et @astrojs/sitemap
    // trie ses locales autrement que LOCALES. Ce sont les contenus qui doivent
    // coïncider, à l'identique et sans doublon — d'où aussi le test des tailles.
    const missing = fromHtml.filter((a) => !parsed.includes(a));
    const extra = parsed.filter((a) => !fromHtml.includes(a));

    if (missing.length || extra.length || parsed.length !== fromHtml.length) {
      fail(
        `Sitemap : cluster hreflang de ${url} différent du HTML — ` +
          `${parsed.length} dans le sitemap, ${fromHtml.length} dans le HTML` +
          (missing.length ? ` ; manquant(s) : ${missing.join(' | ')}` : '') +
          (extra.length ? ` ; en trop : ${extra.join(' | ')}` : ''),
      );
      continue;
    }
    ok += 1;
  }

  return ok;
}

async function checkSitemap(xml, noindexUrls, altsByUrl, expected) {
  const locs = all(xml, /<loc>([^<]+)<\/loc>/g).map((m) => m[1]);
  const inSitemap = new Set(locs.map((l) => l.replace(SITE, '')));

  if (locs.some((l) => l.includes('/404'))) fail('Le sitemap contient la page 404.');

  const forbidden = buildForbiddenUrls();
  for (const loc of locs) {
    const p = loc.replace(SITE, '');
    if (forbidden.has(p)) fail(`Le sitemap référence une URL interdite : ${p}`);
    if (!p.endsWith('/')) fail(`Le sitemap contient une URL sans slash final : ${p}`);
    // Sitemap et balise noindex se contredisent : scripts/finalize-sitemap.mjs
    // retire ces URL apres le build. Voir `npm run build`.
    if (noindexUrls.has(p)) fail(`Le sitemap reference une page en noindex : ${p}`);
  }

  /*
   * Le sitemap doit lister EXACTEMENT les pages indexables. L'audit ne vérifiait
   * que le sens « rien en trop » ; un manque est aussi grave : une page absente
   * du sitemap n'a plus que les liens internes pour être découverte, et c'est
   * précisément ce qu'une régression de résolution de routes produit sans rien
   * casser d'autre.
   */
  for (const url of expected) {
    if (!noindexUrls.has(url) && !inSitemap.has(url)) {
      fail(`Page indexable absente du sitemap : ${url}`);
    }
  }

  /*
   * `changefreq` et `priority` doivent rester ABSENTS.
   *
   * Google les ignore depuis des années — c'est `lastmod` qu'il lit — et un
   * `changefreq: monthly` répété 144 fois est une affirmation que le site ne
   * tient pas. Ce contrôle est là pour qu'un copier-coller d'exemple de
   * configuration ne les réintroduise pas dans six mois. Voir astro.config.mjs.
   */
  for (const tag of ['changefreq', 'priority']) {
    const n = all(xml, new RegExp(`<${tag}>`, 'g')).length;
    if (n > 0) {
      fail(`Sitemap : ${n} balise(s) <${tag}> — Google les ignore, elles ne doivent pas être émises.`);
    }
  }

  /*
   * `lastmod` est le seul des trois indices de sitemap que Google lit encore —
   * `changefreq` et `priority` sont ignorés depuis des années. Sans lui, une
   * page qu'il a déjà écartée n'a aucune raison de le faire revenir, et les
   * demandes manuelles de Search Console sont plafonnées à une dizaine par jour.
   *
   * finalize-sitemap.mjs le dérive du HTML rendu. Si un type de page cesse
   * d'émettre sa date de modification, c'est ici que ça doit casser.
   */
  const dated = all(xml, /<lastmod>([^<]+)<\/lastmod>/g).length;
  if (dated !== locs.length) {
    fail(
      `Sitemap : ${locs.length} URL mais ${dated} lastmod. ` +
        "Une page n'émet plus sa date de modification.",
    );
  }

  const parity = checkSitemapHreflang(xml, altsByUrl);

  /*
   * Le sitemap d'index porte lui aussi un `lastmod` : c'est celui que Google
   * regarde pour décider s'il vaut la peine de retélécharger sitemap-0.xml.
   * @astrojs/sitemap ne peut pas l'écrire — les lastmod n'existent qu'après
   * finalize-sitemap.mjs.
   */
  const index = await readFile(path.join(DIST, 'sitemap-index.xml'), 'utf8');
  if (!index.includes('<lastmod>')) {
    fail("sitemap-index.xml sans lastmod : Google n'a aucune raison de retélécharger sitemap-0.xml.");
  }

  const robots = await readFile(path.join(DIST, 'robots.txt'), 'utf8');
  if (!robots.includes('sitemap-index.xml')) {
    fail('robots.txt ne pointe pas vers sitemap-index.xml. Attention : /sitemap.xml renvoie 404.');
  }
  note(
    `Sitemap : ${locs.length} URL, ${dated} avec lastmod, ` +
      `${parity} cluster(s) hreflang identique(s) au HTML.`,
  );
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
const noindexUrls = new Set();
/** URL -> cluster hreflang déclaré par le HTML. Source de vérité de la parité. */
const altsByUrl = new Map();
/** URL -> liens internes sortants. Alimente le contrôle de maillage. */
const linksByUrl = new Map();

for (const page of pages) {
  const res = await checkPage(page, expected);
  if (!res) continue;
  altsByUrl.set(res.url, res.alts);
  linksByUrl.set(res.url, res.links);
  if (res.noindex) {
    noindexCount += 1;
    noindexUrls.add(res.url);
  }
}

// Lu une seule fois, partagé : deux contrôles en ont besoin. La chaîne vide
// couvre le cas « fichier absent », déjà signalé par checkInventory — inutile
// d'ajouter une trace de pile à une erreur déjà rapportée.
const sitemapFile = path.join(DIST, 'sitemap-0.xml');
const sitemapXml = existsSync(sitemapFile) ? await readFile(sitemapFile, 'utf8') : '';

await checkNoClientJs();
checkInternalMesh(expected, linksByUrl);
await checkNamedCases(sitemapXml);
await checkLanguageFallback();
await checkSitemap(sitemapXml, noindexUrls, altsByUrl, expected);

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
