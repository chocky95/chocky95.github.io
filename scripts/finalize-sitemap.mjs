#!/usr/bin/env node
/**
 * finalize-sitemap.mjs — deux corrections du sitemap, apres le build.
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
 * Les alternates `xhtml:link` des blocs CONSERVES ne sont pas touches : le
 * cluster hreflang doit rester complet et reciproque (c'est ce que verifie
 * audit-dist.mjs). Google ignore de lui-meme un alternate en noindex.
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

const dropped = [];
const undated = [];
let out = xml;

for (const block of blocks) {
  const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1];
  if (!loc || !loc.startsWith(SITE)) continue;

  const rel = loc.slice(SITE.length).replace(/^\//, '');
  const file = path.join(DIST, rel, 'index.html');
  if (!existsSync(file)) continue;

  const html = await readFile(file, 'utf8');

  if (/content="noindex/.test(html)) {
    dropped.push(loc);
    out = out.replace(block, '');
    continue;
  }

  const lastmod = lastmodOf(html);
  if (!lastmod) {
    undated.push(loc);
    continue;
  }

  // Juste apres <loc>, l'ordre recommande par le protocole sitemaps.org.
  out = out.replace(block, block.replace('</loc>', `</loc><lastmod>${lastmod}</lastmod>`));
}

await writeFile(FILE, out, 'utf8');

console.log(
  `finalize-sitemap : ${dropped.length} URL en noindex retiree(s), ` +
    `${blocks.length - dropped.length - undated.length} datee(s).`,
);
if (undated.length > 0) {
  console.log(`  · ${undated.length} URL sans date de modification : ${undated.join(', ')}`);
}
