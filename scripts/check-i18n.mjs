#!/usr/bin/env node
/**
 * check-i18n.mjs — couverture de traduction de l'interface.
 *
 * `fr` définit la forme du dictionnaire. Ce script signale, pour chaque langue,
 * les clés qui replient sur l'anglais.
 *
 * Il n'échoue PAS sur une couverture incomplète : le déploiement se fait par
 * vagues, et une langue partiellement traduite est un état normal du projet.
 * Il échoue seulement sur ce qui est réellement cassé :
 *   - une clé présente dans une autre langue mais absente de `fr` (donc morte) ;
 *   - une valeur vide, qui produirait un libellé blanc dans l'interface ;
 *   - une couverture insuffisante sur `en`, qui est la cible de repli de tous.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const UI_DIR = path.join(import.meta.dirname, '..', 'src', 'i18n', 'ui');

/** Seuil sous lequel l'anglais n'est plus un repli fiable. */
const EN_MIN_COVERAGE = 1;

/**
 * Extrait les paires clé/valeur d'un dictionnaire.
 * Les clés sont toutes de la forme 'famille.nom', ce qui les rend sûres à
 * repérer par expression régulière — pas besoin de parser du TypeScript.
 */
function extractEntries(source) {
  const entries = new Map();

  // Retire les commentaires de bloc et de ligne pour éviter les faux positifs.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const re = /'([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)'\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  for (const m of code.matchAll(re)) {
    entries.set(m[1], m[2] ?? m[3] ?? '');
  }

  // Chaînes sur plusieurs lignes (concaténation) : on retient la clé, la valeur
  // exacte importe peu pour un contrôle de couverture.
  const multiline = /'([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)'\s*:\s*\n/g;
  for (const m of code.matchAll(multiline)) {
    if (!entries.has(m[1])) entries.set(m[1], '<multiligne>');
  }

  return entries;
}

const files = (await readdir(UI_DIR)).filter((f) => f.endsWith('.ts')).sort();

const dicts = new Map();
for (const file of files) {
  const locale = path.basename(file, '.ts');
  dicts.set(locale, extractEntries(await readFile(path.join(UI_DIR, file), 'utf8')));
}

const reference = dicts.get('fr');
if (!reference || reference.size === 0) {
  console.error('✗ Impossible de lire le dictionnaire de référence src/i18n/ui/fr.ts');
  process.exit(1);
}

const errors = [];
const rows = [];

for (const [locale, dict] of dicts) {
  const missing = [...reference.keys()].filter((k) => !dict.has(k));
  const orphans = [...dict.keys()].filter((k) => !reference.has(k));
  const empties = [...dict.entries()].filter(([, v]) => v.trim() === '').map(([k]) => k);

  for (const key of orphans) {
    errors.push(`${locale} : clé "${key}" absente de fr.ts — clé morte, à supprimer ou à ajouter à fr.`);
  }
  for (const key of empties) {
    errors.push(`${locale} : clé "${key}" a une valeur vide — produirait un libellé blanc.`);
  }

  const cov = (reference.size - missing.length) / reference.size;
  rows.push({ locale, cov, missing: missing.length });

  if (locale === 'en' && cov < EN_MIN_COVERAGE) {
    errors.push(
      `en : couverture ${(cov * 100).toFixed(0)} %, or l'anglais est la cible de repli ` +
        `de toutes les autres langues. Clés manquantes : ${missing.join(', ')}`,
    );
  }
}

rows.sort((a, b) => b.cov - a.cov || a.locale.localeCompare(b.locale));

console.log(`\n─── check-i18n (${reference.size} clés de référence) ───`);
for (const r of rows) {
  const pct = (r.cov * 100).toFixed(0).padStart(3);
  const bar = '█'.repeat(Math.round(r.cov * 20)).padEnd(20, '·');
  const tail = r.missing > 0 ? `${r.missing} clé(s) repliée(s) sur l'anglais` : 'complet';
  console.log(`  ${r.locale.padEnd(3)} ${bar} ${pct} %  ${tail}`);
}

if (errors.length > 0) {
  console.error(`\n${errors.length} ERREUR(S) :`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const ready = rows.filter((r) => r.cov === 1).map((r) => r.locale);
console.log(`\n✓ ${ready.length}/18 langue(s) à couverture complète : ${ready.join(', ')}\n`);
