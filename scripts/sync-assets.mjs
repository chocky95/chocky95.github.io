#!/usr/bin/env node
/**
 * sync-assets.mjs — le seul pont entre ce site et les projets Flutter voisins.
 *
 * Importe icônes, bannières, visuels de boutique et captures d'écran depuis
 * `C:\Mes projets Flutter\<projet>\` vers `src/assets/apps/<slug>/`, en les
 * redimensionnant et en les convertissant au passage.
 *
 * ── À lancer À LA MAIN, pas au build ──────────────────────────────────────
 * Les dérivés sont **committés**. Le build CI ne doit pas dépendre de dossiers
 * Flutter absents du runner, et une icône ne change pas assez souvent pour
 * justifier ~150 transformations sharp par run.
 *
 *     npm run assets:sync
 *
 * ── Règles Windows, apprises à la dure ────────────────────────────────────
 * Le chemin source contient un espace (`Mes projets Flutter`) et certains
 * fichiers voisins portent des accents (`téléchargement.jpg`) ou des parenthèses
 * (`banniere_papayoo (1).png`). Donc :
 *   - `path.join` uniquement, jamais de concaténation de chaînes ;
 *   - jamais de shell-out : un `cp` casserait sur l'espace et sur l'accent ;
 *   - `fs/promises` exclusivement ;
 *   - **liste blanche explicite de noms de fichiers**, jamais de glob — sinon
 *     les doublons `(1)` / `(2)` remontent dans le site.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const FLUTTER = path.resolve(ROOT, '..');
const OUT = path.join(ROOT, 'src', 'assets', 'apps');
const MANIFEST = path.join(OUT, '.sync-manifest.json');

/** Au-delà, un asset committé est trop lourd pour un site qui vise 100/100. */
const MAX_BYTES = 300 * 1024;

/* ── Déclaration des transferts ──────────────────────────────────────────── */

/**
 * Chaque entrée est explicite. Ajouter un asset = ajouter une ligne ici, ce qui
 * force à décider consciemment de sa taille et de son format.
 *
 * `from` est relatif à `C:\Mes projets Flutter\`.
 * `to`   est relatif à `src/assets/apps/`.
 */
const ICONS = [
  // 1024 px, 101 Ko — le plus propre des fichiers Mölkky disponibles.
  {
    from: ['molkkyScore', 'macos', 'Runner', 'Assets.xcassets', 'AppIcon.appiconset', 'app_icon_1024.png'],
    to: ['molkky-score', 'icon-512.png'],
  },
  // 2048 px, 5,9 Mo -> impératif de redimensionner avant tout commit.
  {
    from: ['Papayoo', 'assets', 'icons', 'icon-papayoo2.png'],
    to: ['papayoo', 'icon-512.png'],
  },
  // 2048 px, 7,1 Mo — le plus lourd du lot.
  {
    from: ['Mojogo', 'assets', 'icons', 'icon_mojogo.png'],
    to: ['mojogo', 'icon-512.png'],
  },
  {
    from: ['EasyCompta', 'store_assets', 'icon_512.png'],
    to: ['easycompta', 'icon-512.png'],
  },
  {
    from: ['scangratuit', 'store_assets', 'icon_512.png'],
    to: ['scanfree', 'icon-512.png'],
  },
];

const BANNERS = [
  // 3040x1408, 5,7 Mo — l'artwork du feature graphic Play.
  {
    from: ['Papayoo', 'assets', 'banniere_papayoo.png'],
    to: ['papayoo', 'banner-1600.webp'],
  },
  // 2976x1440, 8,6 Mo
  {
    from: ['Mojogo', 'assets', 'banniere_mojogo.png'],
    to: ['mojogo', 'banner-1600.webp'],
  },
  /*
   * Mölkky Score : le feature graphic Play est ce fichier au nom malheureux.
   * C'est bien la bannière de la fiche — photo d'ambiance, titre « Mölkky
   * Score » et accroche « Vos parties & tournois, simplifiés. ».
   * D'où la liste blanche explicite : un glob attraperait aussi
   * `unnamed (1).jpg`, qui est un doublon.
   */
  {
    from: ['molkkyScore', 'assets', 'images', 'unnamed.jpg'],
    to: ['molkky-score', 'banner-1600.webp'],
  },
];

const FEATURE_GRAPHICS = [
  {
    from: ['EasyCompta', 'store_assets', 'feature_graphic_1024x500.png'],
    to: ['easycompta', 'feature.webp'],
  },
  {
    from: ['scangratuit', 'store_assets', 'feature_graphic_1024x500.png'],
    to: ['scanfree', 'feature.webp'],
  },
];

/**
 * Schémas de jeu de Mölkky Score.
 *
 * Mölkky Score n'a AUCUNE capture de boutique — mais ces deux schémas valent
 * mieux : ils illustrent le placement des quilles, ce que la fiche Play ne
 * montre pas, et ils servent directement la page « règles du Mölkky ».
 */
const DIAGRAMS = [
  {
    // Aplats vectoriels : compresse très bien, on garde de la résolution.
    from: ['molkkyScore', 'assets', 'images', 'molkky_placement.png'],
    to: ['molkky-score', 'diagram-placement.webp'],
    width: 1000,
    quality: 88,
  },
  {
    // Rendu photographique 2000x2000 sur transparence. À 1000 px et q85 il
    // pesait 407 Ko : au-dessus du seuil, et inutilement gros pour un visuel
    // qui s'affiche à 400 px de large au maximum.
    from: ['molkkyScore', 'assets', 'images', 'molkky_pins.png'],
    to: ['molkky-score', 'diagram-pins.webp'],
    width: 720,
    quality: 72,
  },
];

/**
 * Captures d'écran, par locale.
 *
 * Le préfixe `T_` désigne le format téléphone (1080x1920) : c'est le seul repris.
 * Les variantes tablette 7" et 10" montrent les mêmes écrans dans un cadre plus
 * large et n'apportent rien sur une page web responsive.
 *
 * ScanFree a ses captures dans EXACTEMENT ses 12 langues de publication : chaque
 * page ScanFree affiche donc des captures dans sa propre langue. C'est le
 * meilleur signal anti-contenu-mince dont dispose le site.
 */
const SCREENSHOTS = [
  {
    slug: 'easycompta',
    base: ['EasyCompta', 'store_assets', 'screenshots'],
    // Le dossier FR d'EasyCompta ajoute un niveau « telephone ».
    dir: (loc) => [loc.toUpperCase(), 'telephone'],
    locales: ['fr'],
    files: [
      ['T_01_%L_accueil.png', 'accueil.webp'],
      ['T_02_%L_recettes.png', 'recettes.webp'],
      ['T_03_%L_depenses.png', 'depenses.webp'],
      ['T_04_%L_analyses.png', 'analyses.webp'],
      ['T_05_%L_urssaf.png', 'urssaf.webp'],
    ],
  },
  {
    slug: 'scanfree',
    base: ['scangratuit', 'store_assets', 'screenshots'],
    dir: (loc) => [loc.toUpperCase()],
    locales: ['fr', 'en', 'de', 'ja', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'nb', 'ko'],
    files: [
      ['T_01_%L_accueil.png', 'accueil.webp'],
      ['T_02_%L_document.png', 'document.webp'],
      ['T_03_%L_parametres.png', 'parametres.webp'],
    ],
  },
];

/* ── Moteur ──────────────────────────────────────────────────────────────── */

const results = { written: 0, skipped: 0, missing: [], tooBig: [] };
const manifest = {};

/** Empreinte du fichier source, pour rendre le script idempotent. */
async function sourceStamp(abs) {
  const s = await stat(abs);
  return `${s.size}:${Math.floor(s.mtimeMs)}`;
}

let previous = {};
if (existsSync(MANIFEST)) {
  try {
    previous = JSON.parse(await readFile(MANIFEST, 'utf8'));
  } catch {
    previous = {};
  }
}

/**
 * @param {string[]} fromParts chemin relatif à FLUTTER
 * @param {string[]} toParts   chemin relatif à OUT
 * @param {(img: import('sharp').Sharp) => import('sharp').Sharp} transform
 * @param {string} spec signature de la transformation, p. ex. "webp w=720 q=72"
 */
async function convert(fromParts, toParts, transform, spec) {
  const src = path.join(FLUTTER, ...fromParts);
  const dest = path.join(OUT, ...toParts);
  const key = toParts.join('/');

  if (!existsSync(src)) {
    results.missing.push(`${fromParts.join('/')} -> ${key}`);
    return;
  }

  const stamp = await sourceStamp(src);
  manifest[key] = { from: fromParts.join('/'), stamp, spec };

  // La signature de transformation fait partie de la clé de cache : sans elle,
  // changer une qualité ou une largeur ne régénérerait rien, puisque le fichier
  // source, lui, n'a pas bougé.
  if (previous[key]?.stamp === stamp && previous[key]?.spec === spec && existsSync(dest)) {
    results.skipped += 1;
    return;
  }

  await mkdir(path.dirname(dest), { recursive: true });
  // On lit le fichier en mémoire plutôt que de passer un chemin à sharp :
  // évite toute ambiguïté d'encodage de chemin sous Windows.
  await transform(sharp(await readFile(src))).toFile(dest);

  const size = (await stat(dest)).size;
  if (size > MAX_BYTES) {
    results.tooBig.push(`${key} — ${(size / 1024).toFixed(0)} Ko`);
  }
  results.written += 1;
  console.log(`  · ${key.padEnd(46)} ${(size / 1024).toFixed(0)} Ko`);
}

console.log('\n─── sync-assets ───\n');
console.log(`Source : ${FLUTTER}`);
console.log(`Cible  : ${path.relative(ROOT, OUT)}\n`);

console.log('Icônes (512 px, PNG — canal alpha conservé) :');
for (const { from, to } of ICONS) {
  await convert(from, to, (img) =>
    img.resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({
      compressionLevel: 9,
      palette: true,
    }),
    'png 512 palette',
  );
}

console.log('\nBannières (1600 px de large, WebP) :');
for (const { from, to } of BANNERS) {
  await convert(
    from,
    to,
    (img) => img.resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }),
    'webp w=1600 q=80',
  );
}

console.log('\nVisuels de boutique (WebP) :');
for (const { from, to } of FEATURE_GRAPHICS) {
  await convert(
    from,
    to,
    (img) => img.resize({ width: 1024, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }),
    'webp w=1024 q=82',
  );
}

console.log('\nSchémas Mölkky (WebP — remplacent les captures absentes) :');
for (const { from, to, width, quality } of DIAGRAMS) {
  await convert(
    from,
    to,
    (img) => img.resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6 }),
    `webp w=${width} q=${quality}`,
  );
}

console.log('\nCaptures d’écran (540 px de large, WebP) :');
for (const set of SCREENSHOTS) {
  for (const locale of set.locales) {
    const L = locale.toUpperCase();
    for (const [pattern, outName] of set.files) {
      await convert(
        [...set.base, ...set.dir(locale), pattern.replace('%L', L)],
        [set.slug, 'screenshots', locale, outName],
        // 1080x1920 divisé par deux : largement assez pour un affichage web,
        // et `astro:assets` produira ses propres tailles responsive par-dessus.
        (img) => img.resize({ width: 540, withoutEnlargement: true }).webp({ quality: 78, effort: 6 }),
        'webp w=540 q=78',
      );
    }
  }
}

await mkdir(OUT, { recursive: true });
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

/* ── Rapport ─────────────────────────────────────────────────────────────── */

console.log('\n─── Bilan ───');
console.log(`  ${results.written} écrit(s), ${results.skipped} inchangé(s).`);

if (results.missing.length > 0) {
  console.log(`\n  ${results.missing.length} source(s) introuvable(s) :`);
  for (const m of results.missing) console.log(`    ? ${m}`);
  console.log('    (normal si le projet Flutter a été déplacé ou renommé)');
}

if (results.tooBig.length > 0) {
  console.error(`\n  ${results.tooBig.length} fichier(s) au-dessus de ${MAX_BYTES / 1024} Ko :`);
  for (const b of results.tooBig) console.error(`    ✗ ${b}`);
  console.error('\n  Trop lourd pour être committé. Réduire la taille ou la qualité.');
  process.exit(1);
}

console.log('\n✓ Assets synchronisés. Penser à `node scripts/generate-og.mjs`.\n');
