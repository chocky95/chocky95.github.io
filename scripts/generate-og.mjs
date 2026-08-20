#!/usr/bin/env node
/**
 * generate-og.mjs — images Open Graph 1200x630.
 *
 * Génère l'image par défaut du site, et une par application dès que l'icône
 * correspondante est présente dans `src/assets/apps/<slug>/icon-512.png`
 * (produit par `sync-assets.mjs`).
 *
 * Les images sont écrites dans `public/og/` et COMMITTÉES : une image OG n'a
 * pas besoin d'être régénérée à chaque build, et la garder hors du pipeline
 * évite ~6 transformations sharp par run CI.
 *
 * Le texte est rendu en SVG puis rasterisé. Aucune police n'est embarquée dans
 * le SVG : on s'appuie sur la pile système de la machine qui génère, ce qui est
 * acceptable pour une image de partage (elle est produite une fois, revue à
 * l'œil, puis figée).
 */

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'og');
const ICONS = path.join(ROOT, 'src', 'assets', 'apps');

const W = 1200;
const H = 630;

const INK = '#0b0f14';
const INK_SOFT = '#11171d';
const TEXT = '#f2f5f7';
const MUTED = '#8b98a3';

/** Doit rester synchrone avec src/data/apps.ts (rôles accent / accentText). */
const APPS = [
  { slug: 'molkky-score', name: 'Mölkky Score', accent: '#E69500', accentText: '#E69500', kicker: 'Jeux' },
  { slug: 'papayoo', name: 'Papayoo', accent: '#0D4167', accentText: '#4198D8', kicker: 'Jeux' },
  { slug: 'mojogo', name: 'Mojogo', accent: '#D4C4A8', accentText: '#D4C4A8', kicker: 'Jeux' },
  { slug: 'easycompta', name: 'EasyCompta', accent: '#159B8C', accentText: '#159B8C', kicker: 'Gestion' },
  { slug: 'scanfree', name: 'ScanFree', accent: '#00696D', accentText: '#12A5AA', kicker: 'Utilitaires' },
];

const FONT = "system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Échappe le texte destiné à un nœud SVG. */
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function card({ kicker, title, subtitle, accent, accentText }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${INK_SOFT}"/>
      <stop offset="100%" stop-color="${INK}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.18" r="0.6">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="${accentText}"/>

  <text x="80" y="130" font-family="${FONT}" font-size="26" font-weight="700"
        letter-spacing="4" fill="${accentText}">${esc(kicker.toUpperCase())}</text>

  <text x="80" y="290" font-family="${FONT}" font-size="88" font-weight="800"
        letter-spacing="-2" fill="${TEXT}">${esc(title)}</text>

  <text x="80" y="360" font-family="${FONT}" font-size="34" font-weight="400"
        fill="${MUTED}">${esc(subtitle)}</text>

  <text x="80" y="560" font-family="${FONT}" font-size="34" font-weight="800"
        fill="${TEXT}">chocky.</text>
</svg>`;
}

await mkdir(OUT, { recursive: true });

/* ── Image par défaut ────────────────────────────────────────────────────── */

const defaultSvg = card({
  kicker: 'Studio indépendant',
  title: 'Des apps utiles.',
  subtitle: 'Deux jeux, un scanner, une compta de micro-entrepreneur.',
  accent: '#16a37f',
  accentText: '#16a37f',
});

await sharp(Buffer.from(defaultSvg)).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'default.png'));
console.log('  · og/default.png');

/* ── Une image par application ───────────────────────────────────────────── */

for (const app of APPS) {
  const svg = card({
    kicker: app.kicker,
    title: app.name,
    subtitle: 'Chocky Studio',
    accent: app.accent,
    accentText: app.accentText,
  });

  let image = sharp(Buffer.from(svg));

  // Si l'icône de l'app a été synchronisée, on la compose en haut à droite.
  const icon = path.join(ICONS, app.slug, 'icon-512.png');
  if (existsSync(icon)) {
    const badge = await sharp(icon).resize(220, 220, { fit: 'contain' }).png().toBuffer();
    image = sharp(await image.png().toBuffer()).composite([{ input: badge, top: 90, left: 860 }]);
  }

  await image.png({ compressionLevel: 9 }).toFile(path.join(OUT, `${app.slug}.png`));
  console.log(`  · og/${app.slug}.png${existsSync(icon) ? '' : '   (sans icône — lancer assets:sync)'}`);
}

/* ── L'ancien chemin référencé par SeoHead ───────────────────────────────── */

await writeFile(
  path.join(ROOT, 'public', 'og', 'README.md'),
  [
    '# Images Open Graph',
    '',
    'Générées par `node scripts/generate-og.mjs`, puis **committées**.',
    '',
    'Elles ne sont pas produites au build : une image de partage change rarement,',
    'et la garder hors du pipeline évite six transformations sharp par run CI.',
    '',
    'Relancer le script après un changement de nom, de couleur de marque, ou après',
    "un `npm run assets:sync` qui apporte de nouvelles icônes d'application.",
    '',
  ].join('\n'),
);

console.log('\n✓ Images OG générées dans public/og/\n');
