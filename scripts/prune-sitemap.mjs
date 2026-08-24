#!/usr/bin/env node
/**
 * prune-sitemap.mjs — retire du sitemap les pages en `noindex`.
 *
 * Un sitemap est une liste de souhaits d'indexation. Y faire figurer une page
 * qui porte `<meta name="robots" content="noindex">` envoie deux signaux
 * contradictoires : le sitemap demande l'indexation, la page la refuse. Search
 * Console les remonte en « Exclue par la balise noindex » — 26 URL sur 132,
 * soit un cinquieme du sitemap consacre a des pages qu'on ne veut pas indexer,
 * et autant de budget d'exploration depense pour rien.
 *
 * La source de verite est le HTML rendu, pas une seconde matrice a tenir a
 * jour : une page sort du sitemap si et seulement si elle porte reellement la
 * balise. Le jour ou sa traduction est redigee, elle y revient sans qu'on
 * touche a ce script.
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
  console.error('Aucun bloc <url> dans le sitemap : format inattendu, rien de retire.');
  process.exit(1);
}

const dropped = [];
let out = xml;

for (const block of blocks) {
  const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1];
  if (!loc || !loc.startsWith(SITE)) continue;

  const rel = loc.slice(SITE.length).replace(/^\//, '');
  const file = path.join(DIST, rel, 'index.html');
  if (!existsSync(file)) continue;

  if (/content="noindex/.test(await readFile(file, 'utf8'))) {
    dropped.push(loc);
    out = out.replace(block, '');
  }
}

await writeFile(FILE, out, 'utf8');

console.log(
  `prune-sitemap : ${dropped.length} URL en noindex retiree(s), ` +
    `${blocks.length - dropped.length} conservee(s).`,
);
