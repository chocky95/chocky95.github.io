#!/usr/bin/env node
/**
 * check-contrast.mjs — contrastes WCAG de la palette sombre.
 *
 * Le site attribue à chaque application sa vraie couleur de marque sur un fond
 * d'encre. Deux d'entre elles sont illisibles en texte :
 *   - Papayoo `#0D4167` : bleu profond, 1.80:1 — presque le fond lui-même ;
 *   - ScanFree `#00696D` : teal sombre, 2.97:1 — sous le seuil.
 *
 * D'où la séparation des rôles `accent` / `accentText` : la marque est conservée
 * pour le décor, une variante éclaircie de même teinte porte le texte.
 *
 * Le script échoue sur toute paire réellement utilisée en texte ou en bouton qui
 * n'atteint pas AA. Les couleurs purement décoratives sont listées sans seuil,
 * avec un rappel qu'elles ne doivent jamais porter de texte.
 */

/** sRGB -> luminance relative (WCAG 2.1). */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* Doivent rester synchrones avec src/styles/tokens.css et src/data/apps.ts. */
const INK = '#0b0f14';
const INK_CARD = '#11171d';

const TEXT = {
  'text-100': '#f2f5f7',
  'text-300': '#c2ccd4',
  'text-500': '#8b98a3',
  'text-700': '#5c6771',
};

/**
 * Deux rôles par application, à ne pas confondre :
 *   accent     — vraie couleur de marque. DÉCORATIVE : aplats, bordures,
 *                fonds de badge. Aucun seuil de contraste exigé.
 *   accentText — variante lisible. TEXTE, liens, fonds de bouton.
 *                Doit atteindre AA (4.5:1) sur le fond d'encre.
 *
 * Doit rester synchrone avec src/data/apps.ts.
 */
const ACCENTS = {
  'brand (Chocky)': { accent: '#16a37f', accentText: '#16a37f' },
  'molkky-score': { accent: '#E69500', accentText: '#E69500' },
  papayoo: { accent: '#0D4167', accentText: '#4198D8' },
  easycompta: { accent: '#159B8C', accentText: '#159B8C' },
  scanfree: { accent: '#00696D', accentText: '#12A5AA' },
  mojogo: { accent: '#D4C4A8', accentText: '#D4C4A8' },
};

/** Seuils WCAG AA : 4.5 pour du texte courant, 3.0 pour du grand texte. */
const AA_TEXT = 4.5;
const AA_LARGE = 3;

const errors = [];
const warnings = [];

console.log('\n─── check-contrast ───');
console.log(`\nTexte sur fond d'encre (${INK}) — seuil AA ${AA_TEXT} :`);
for (const [name, hex] of Object.entries(TEXT)) {
  const r = ratio(hex, INK);
  // text-700 ne sert qu'aux mentions légales et aux dates : grand texte exclu,
  // mais c'est du texte décoratif secondaire. On exige AA_LARGE au minimum.
  const threshold = name === 'text-700' ? AA_LARGE : AA_TEXT;
  const ok = r >= threshold;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(10)} ${r.toFixed(2)}:1  (seuil ${threshold})`);
  if (!ok) errors.push(`${name} sur ${INK} : ${r.toFixed(2)}:1, seuil ${threshold}.`);
}

console.log(`\naccentText en TEXTE sur fond d'encre (${INK}) — seuil AA ${AA_TEXT} :`);
for (const [name, { accent, accentText }] of Object.entries(ACCENTS)) {
  const r = ratio(accentText, INK);
  const ok = r >= AA_TEXT;
  const shift = accent === accentText ? '' : `  (éclairci depuis ${accent})`;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(16)} ${accentText}  ${r.toFixed(2)}:1${shift}`);
  if (!ok) {
    errors.push(
      `accentText "${name}" (${accentText}) : ${r.toFixed(2)}:1 sur le fond, seuil ${AA_TEXT}. ` +
        'À éclaircir en conservant la teinte.',
    );
  }
}

console.log(`\naccentText en FOND de bouton, texte ${INK} par-dessus — seuil ${AA_TEXT} :`);
for (const [name, { accentText }] of Object.entries(ACCENTS)) {
  const r = ratio(accentText, INK);
  const ok = r >= AA_TEXT;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(16)} ${r.toFixed(2)}:1`);
  if (!ok) errors.push(`Bouton "${name}" : encre sur ${accentText} donne ${r.toFixed(2)}:1.`);
}

console.log(`\naccent DÉCORATIF (aplats, bordures, badges) — aucun seuil, pour information :`);
for (const [name, { accent, accentText }] of Object.entries(ACCENTS)) {
  const r = ratio(accent, INK);
  if (accent !== accentText) {
    warnings.push(
      `"${name}" : la couleur de marque ${accent} (${r.toFixed(2)}:1) ne doit servir qu'en ` +
        `décor. Tout texte de cette page doit utiliser --accent-text (${accentText}).`,
    );
  }
  console.log(`  · ${name.padEnd(16)} ${accent}  ${r.toFixed(2)}:1`);
}

console.log(`\nTexte principal sur fond de carte (${INK_CARD}) :`);
for (const [name, hex] of [['text-100', TEXT['text-100']], ['text-300', TEXT['text-300']]]) {
  const r = ratio(hex, INK_CARD);
  const ok = r >= AA_TEXT;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(10)} ${r.toFixed(2)}:1`);
  if (!ok) errors.push(`${name} sur carte ${INK_CARD} : ${r.toFixed(2)}:1.`);
}

if (warnings.length > 0) {
  console.log('\nÀ savoir :');
  for (const w of warnings) console.log(`  ! ${w}`);
}

if (errors.length > 0) {
  console.error(`\n${errors.length} ERREUR(S) DE CONTRASTE :`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log('\n✓ Contrastes conformes.\n');
