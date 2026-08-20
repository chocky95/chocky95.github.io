# Chocky Dev — site vitrine

Site statique multilingue présentant les cinq applications de Chocky Dev.
Construit pour être référencé : une URL HTML réelle par application et par
langue, zéro JavaScript côté client, hreflang calculés par machine.

**En ligne** : https://chocky.dev
**Contact** : djchocky@gmail.com

## Démarrer

```bash
npm ci
npm run dev          # http://localhost:4321
npm run verify       # astro check + build + audit-dist
```

| Commande | Rôle |
|---|---|
| `npm run build` | Génère `dist/` |
| `npm run check` | Types (`astro check`) |
| `npm run audit` | Garde-fou de sortie de build — voir plus bas |
| `npm run check:i18n` | Couverture de traduction de l'interface |
| `npm run check:contrast` | Contrastes WCAG de la palette |
| `npm run assets:sync` | Importe icônes et captures depuis les projets Flutter |
| `npm run versions:drift` | Compare les versions `pubspec.yaml` ↔ `apps.ts` |
| `node scripts/generate-og.mjs` | Régénère les images Open Graph |

## Architecture

```
src/
├─ data/apps.ts          Faits sur les 5 apps + invariants vérifiés au build
├─ i18n/
│  ├─ locales.ts         Les 18 locales, paliers, endonymes
│  ├─ routes.ts          ★ La clé de voûte — voir ci-dessous
│  ├─ t.ts               Chaînes d'interface, repli sur l'anglais
│  └─ ui/<locale>.ts     18 dictionnaires ; `fr` définit la forme
├─ content/              La prose, en `<cle>.<locale>.md`
├─ components/seo/       canonical, hreflang, Open Graph, JSON-LD
└─ pages/[...locale]/    Routes, pilotées par le registre
```

### `src/i18n/routes.ts` — la clé de voûte

Une page n'est décrite que par une chose : **la table de ses chemins par
locale**. `getStaticPaths`, les balises hreflang, le sitemap et le sélecteur de
langue dérivent tous de cette même table.

Cela rend deux erreurs structurellement impossibles :

- **générer une URL pour une langue où l'app n'existe pas.** ScanFree n'est pas
  traduit en russe, donc `/ru/apps/scanfree/` n'est jamais produit ;
- **publier un cluster hreflang non réciproque ou sans auto-référence.** Google
  ignore un cluster entier dans ce cas — c'est-à-dire 17 langues sur 18.

Quand vous ajoutez une app ou une langue, modifiez `src/data/apps.ts` **et**
`scripts/audit-dist.mjs`. La duplication y est délibérée : un audit qui dérive
ses attentes de la source qu'il audite ne prouve rien.

### Langues par application

L'union fait 18 locales, mais chaque app n'existe que dans les siennes — celles
de ses fichiers `lib/l10n/app_*.arb`.

| App | Locales | N |
|---|---|---|
| Mölkky Score | `cs de en es et fi fr ja sv` | 9 |
| Papayoo | `da de en es fr it ja ko nb nl pl pt ro ru sv` | 15 |
| Mojogo | idem Papayoo | 15 |
| ScanFree | `da de en es fr it ja ko nb nl pt sv` | 12 |
| EasyCompta | `fr` — l'URSSAF est française | 1 |

`fr` est présent partout : c'est ce qui en fait la cible de `x-default`.

### Contenu et déploiement par vagues

Une page d'application existe dans toutes les langues de l'application, mais la
prose arrive par vagues. Sans fichier de contenu, la page est générée à partir
des faits et marquée **`noindex`**. Idem pour
`translationStatus: 'raw-mt'` — une traduction non relue n'entre jamais dans
l'index.

C'est ce qui permet de publier progressivement sans jamais exposer de page mince
à Google, ce dont ses systèmes anti-« contenu à grande échelle » se méfient
précisément.

### Deux rôles de couleur, à ne pas confondre

| Variable | Usage | Contrainte |
|---|---|---|
| `--accent` | Décor : aplats, bordures, fonds de badge | aucune |
| `--accent-text` | Texte, liens, fonds de bouton | ≥ 4.5:1 sur le fond |

Papayoo `#0D4167` ne donne que 1.80:1 sur le fond d'encre et ScanFree `#00696D`
2.97:1 : illisibles en texte. Chacun a donc une variante éclaircie de même
teinte. Vérifié **au build** dans `apps.ts` et **en CI** par
`check-contrast.mjs`.

## Comportements attendus, à ne pas « corriger »

- **`astro dev` affiche un interstitiel d'avertissement sur `/apps`** (sans slash
  final). C'est le comportement documenté de `trailingSlash: 'always'`.
- **`astro preview` renvoie 404 sur `/apps`** : il n'émule pas la redirection
  répertoire → slash de GitHub Pages. En production, Pages renvoie un 301.
- **`/sitemap.xml` n'existe pas.** `@astrojs/sitemap` écrit
  `sitemap-index.xml` **et** `sitemap-0.xml`. Tout pointer vers le premier.
- **`src/pages/404.astro` doit rester à la racine de `pages/`**, hors de
  `[...locale]/`. Pages ne sert `/404.html` que depuis la racine de l'hôte, et
  Astro ne traite spécialement que le pathname littéral `/404`. Sous
  `[...locale]/`, les 17 autres langues produiraient des fichiers morts.
  Même règle pour `robots.txt.ts`.
- **`i18n.fallback` est volontairement absent** de `astro.config.mjs`. Le
  déclarer recréerait silencieusement les 38 combinaisons langue × app
  interdites.
- **Les pages `/ja/` et `/ko/` n'embarquent aucune police.** Un sous-ensemble CJK
  pèserait plusieurs Mo ; `global.css` bascule ces langues sur la pile système.
- **La police n'est pas préchargée.** `preload` chargerait les trois
  sous-ensembles (148 Ko) là où une page française n'a besoin que de 47 Ko,
  annulant l'effet de `unicode-range`. Le CSS étant inliné, le navigateur les
  découvre de toute façon dès le premier parse.

## Polices

La police vient du paquet npm **`@fontsource-variable/inter`**, lu localement
par `fontProviders.local()`. Aucun appel réseau pendant le build.

Ce n'est pas un détail de confort : le réseau d'entreprise bloque
`api.fontsource.org` et `cdn.jsdelivr.net`. Le provider `fontsource` y perdait
**5 minutes en retries** pour finir sans émettre un seul `@font-face`, et le
provider `npm`, même en `remote: false`, allait chercher les métriques sur
jsdelivr. Le build est passé de 5 min 25 s à 1,3 s.

## Déploiement

Push sur `main` → `.github/workflows/deploy.yml` → GitHub Pages.

Dépôt **user-site** (`chocky95.github.io`), servi sur **`chocky.dev`**, donc
`base: '/'`. Le domaine est déclaré dans `public/CNAME` — avec un déploiement par
Actions, son absence de l'artefact peut réinitialiser le réglage côté GitHub.
GitHub pose automatiquement une redirection 301 depuis l'ancienne adresse.

Le choix du dépôt user-site n'est pas
qu'un confort : `robots.txt` n'est lu qu'à la racine de l'hôte. Dans un dépôt de
projet, il serait servi sur `/mon-repo/robots.txt`, que personne ne lit.

### Passer à un domaine propre

1. `echo chocky.app > public/CNAME`
2. Dans `astro.config.mjs`, changer la constante `SITE`
3. `base` reste `'/'`

Puis, dans Search Console, créer une propriété **Domaine** (vérification DNS) :
impossible sur `github.io`, qui figure sur la Public Suffix List.

## Après déploiement

- [ ] Search Console : propriété par préfixe d'URL, vérification par balise
      `<meta>`, soumettre `sitemap-index.xml`
- [ ] Demander l'indexation manuellement sur les 10 pages clés (~10/jour)
- [ ] Bing Webmaster Tools (import en un clic depuis Search Console)
- [ ] Fiches Play, **par langue** : champ *Site web* → la page de la même
      langue, jamais l'accueil ; champ *Politique de confidentialité* → la page
      dédiée à l'app
- [ ] Lien vers le site dans l'écran « À propos » de chaque application
