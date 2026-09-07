#!/usr/bin/env node
/**
 * finalize-sitemap.mjs — trois corrections du sitemap, apres le build.
 *
 * La source de verite est le HTML rendu, jamais une seconde matrice a tenir a
 * jour. Une page sort du sitemap si et seulement si elle porte reellement la
 * balise `noindex` ; sa date de modification est celle que la page affiche
 * vraiment. Rien a resynchroniser a la main.
 *
 * ── 1. Retirer les pages en `noindex` ────────────────────────────────────
 * Un sitemap est une liste de souhaits d'indexation. Y faire figurer une page
 * qui porte `<meta name="robots" content="noindex">` envoie deux signaux
 * contradictoires : le sitemap demande l'indexation, la page la refuse. Search
 * Console le remonte en « Exclue par la balise noindex ».
 *
 * ── 2. Ecrire un `<lastmod>` ─────────────────────────────────────────────
 * @astrojs/sitemap n'en emet aucun : il ne connait pas les dates du contenu.
 * Or `changefreq` et `priority` sont ignores par Google depuis des annees,
 * tandis que `lastmod` est le seul signal qu'il lit reellement pour decider de
 * repasser sur une URL. Sans lui, une page que Google a deja ecartee ne lui
 * donne aucune raison de revenir, et les demandes manuelles de Search Console
 * sont plafonnees a une dizaine par jour — inutilisable pour 60 pages.
 *
 * La date vient de `article:modified_time` (pages d'app et guides) ou de
 * `og:updated_time` (accueil, hub), tous deux emis par SeoHead depuis
 * `updatedOn`. C'est donc la vraie date de redaction : une page inchangee garde
 * son ancien `lastmod`, ce qui est exactement ce qu'attend un moteur.
 *
 * ── 3. Reecrire les `xhtml:link` depuis le HTML ──────────────────────────
 * Le mode i18n de @astrojs/sitemap regroupe les alternates par SUBSTITUTION DU
 * PREFIXE DE LOCALE : il postule que la page existe au meme chemin dans toutes
 * les langues. Vrai pour les 126 pages a chemin invariant (accueil, hub, pages
 * d'app), structurellement faux pour les guides, dont le slug est traduit — rien
 * dans un chemin ne relie /regles-du-molkky/ a /fi/molkky-saannot/.
 *
 * Mesure avant correction : 12 blocs de guide sans aucun alternate, 6 blocs avec
 * un cluster tronque de 3 entrees et sans x-default (`en`/`ja`/`ko` partagent
 * `molkky-rules`, `da`/`nb`/`sv` partagent `molkky-regler`), pendant que le HTML
 * des memes pages declarait les 19 bons alternates. Le sitemap contredisait donc
 * la page qu'il annoncait.
 *
 * On remplace le cluster de CHAQUE bloc par celui que la page declare dans son
 * <head>. Le HTML le tient de `alternates()` (src/i18n/routes.ts), qui garantit
 * l'auto-reference, la reciprocite et l'unicite du x-default : le sitemap HERITE
 * de ces trois garanties au lieu de les re-deriver. audit-dist.mjs verifie la
 * parite stricte des deux cotes, ce qui rend la contradiction impossible.
 *
 * Le mode i18n du plugin est CONSERVE bien que sa sortie soit ecrasee : ses 126
 * clusters justes, calcules par un tout autre mecanisme, forment un second avis
 * sur lequel ce script s'aligne. L'ecart est journalise (« X reecrit(s),
 * Y deja juste(s) ») : si Y tombe a zero, c'est le format de sortie qui a change.
 *
 * Un alternate peut pointer vers une page retiree du sitemap par le point 1
 * (noindex) : c'est voulu. Le cluster doit rester complet et reciproque, et
 * Google ignore de lui-meme un alternate en noindex.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://chocky.dev';
const FILE = path.join(DIST, 'sitemap-0.xml');

if (!existsSync(FILE)) {
  console.error('dist/sitemap-0.xml absent. Lancez `astro build` d abord.');
  process.exit(1);
}

const xml = await readFile(FILE, 'utf8');
const blocks = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0]);

if (blocks.length === 0) {
  console.error('Aucun bloc <url> dans le sitemap : format inattendu, rien de modifie.');
  process.exit(1);
}

/** Date de modification affichee par la page, au format `YYYY-MM-DD`. */
function lastmodOf(html) {
  const iso =
    /<meta property="article:modified_time" content="([^"]+)"/.exec(html)?.[1] ??
    /<meta property="og:updated_time" content="([^"]+)"/.exec(html)?.[1];
  return iso ? iso.slice(0, 10) : null;
}

/**
 * Le cluster hreflang declare par le <head> de la page.
 *
 * Meme expression que audit-dist.mjs, et pour la meme raison : on ne prend QUE
 * `link[rel=alternate]`. Le selecteur de langue porte lui aussi des attributs
 * `hreflang`, sur des `<a>` ; un motif plus large doublerait chaque cluster.
 */
function alternatesOf(html) {
  return [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => ({
    lang: m[1],
    href: m[2],
  }));
}

/**
 * Echappement d'attribut XML. Les slugs actuels sont en ASCII pur, mais un futur
 * slug contenant `&` produirait un sitemap non parsable — et Google le
 * refuserait sans que rien dans le HTML ne le signale.
 */
const attr = (v) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Les `xhtml:link` d'un bloc, au format exact qu'emet @astrojs/sitemap. */
const xhtmlLinks = (alts) =>
  alts
    .map((a) => `<xhtml:link rel="alternate" hreflang="${attr(a.lang)}" href="${attr(a.href)}"/>`)
    .join('');

/** Cle d'un cluster, insensible a l'ordre : le plugin trie ses locales autrement. */
const clusterKey = (pairs) => [...pairs].sort().join('|');

/*
 * Temps 1 — relire le HTML de chaque URL du sitemap.
 *
 * En deux temps parce que `String.replace` n'accepte pas de rappel asynchrone.
 * Benefice de bord : on quitte le `out = out.replace(block, …)` repete, qui etait
 * quadratique et sensible aux motifs `$` d'une chaine de remplacement.
 */
const info = new Map();
for (const block of blocks) {
  const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1];
  if (!loc || !loc.startsWith(SITE)) continue;

  const rel = loc.slice(SITE.length).replace(/^\//, '');
  const file = path.join(DIST, rel, 'index.html');
  if (!existsSync(file)) continue;

  const html = await readFile(file, 'utf8');
  info.set(loc, {
    noindex: /content="noindex/.test(html),
    lastmod: lastmodOf(html),
    alternates: alternatesOf(html),
  });
}

/* Temps 2 — reecrire le XML en une seule passe. */
const dropped = [];
const undated = [];
const clusterless = [];
let corrected = 0;
let identical = 0;

const out = xml.replace(/<url>[\s\S]*?<\/url>/g, (block) => {
  const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1];
  const page = loc ? info.get(loc) : undefined;
  // Bloc sans page correspondante sur le disque : on n'y touche pas.
  if (!page) return block;

  if (page.noindex) {
    dropped.push(loc);
    return '';
  }

  let next = block;

  if (page.lastmod) {
    // Juste apres <loc>, l'ordre recommande par le protocole sitemaps.org.
    // Remplacement par fonction : il neutralise les motifs `$`.
    next = next.replace('</loc>', () => `</loc><lastmod>${page.lastmod}</lastmod>`);
  } else {
    undated.push(loc);
  }

  if (page.alternates.length === 0) clusterless.push(loc);

  /*
   * Second avis : ce que le plugin avait calcule, compare a ce que la page dit.
   *
   * Le x-default est exclu de la comparaison : le plugin n'en emet JAMAIS (c'est
   * pour l'ajouter qu'un `serialize` a existe), il ne peut donc pas etre un
   * point de desaccord. Sans cette exclusion, les 144 blocs seraient declares
   * differents et le second avis ne dirait plus rien.
   */
  const fromPlugin = [...next.matchAll(/<xhtml:link\s[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)].map(
    (m) => `${m[1]} ${m[2]}`,
  );
  const fromHtml = page.alternates
    .filter((a) => a.lang !== 'x-default')
    .map((a) => `${a.lang} ${a.href}`);
  if (clusterKey(fromPlugin) === clusterKey(fromHtml)) identical += 1;
  else corrected += 1;

  // En fin de bloc — la place que @astrojs/sitemap leur donne deja, donc rien ne
  // bouge structurellement pour les 126 pages sur lesquelles il avait juste.
  next = next.replace(/<xhtml:link[^>]*\/>/g, '');
  return next.replace('</url>', (m) => xhtmlLinks(page.alternates) + m);
});

await writeFile(FILE, out, 'utf8');

/*
 * Le sitemap d'index recoit la date la plus recente de ses enfants : c'est elle
 * que Google regarde pour decider s'il vaut la peine de retelecharger
 * sitemap-0.xml. @astrojs/sitemap ne peut pas l'ecrire — les lastmod n'existent
 * qu'apres ce script.
 */
const latest = [...info.values()]
  .filter((p) => !p.noindex)
  .map((p) => p.lastmod)
  .filter(Boolean)
  .sort()
  .at(-1);

if (latest) {
  const INDEX = path.join(DIST, 'sitemap-index.xml');
  const idx = await readFile(INDEX, 'utf8');
  if (!idx.includes('<lastmod>')) {
    await writeFile(INDEX, idx.replace('</loc>', () => `</loc><lastmod>${latest}</lastmod>`), 'utf8');
  }
}

console.log(
  `finalize-sitemap : ${dropped.length} URL en noindex retiree(s), ` +
    `${blocks.length - dropped.length - undated.length} datee(s), ` +
    `${corrected} cluster(s) hreflang reecrit(s) depuis le HTML (${identical} deja juste(s)).`,
);
if (undated.length > 0) {
  console.log(`  · ${undated.length} URL sans date de modification : ${undated.join(', ')}`);
}
if (clusterless.length > 0) {
  console.log(`  · ${clusterless.length} URL sans aucun alternate dans le HTML : ${clusterless.join(', ')}`);
}
if (identical === 0 && corrected > 0) {
  console.log(
    '  · aucun cluster identique a celui du plugin : verifiez le format de sortie de ' +
      '@astrojs/sitemap, ou l ordre des attributs de link[rel=alternate] dans SeoHead.astro.',
  );
}
