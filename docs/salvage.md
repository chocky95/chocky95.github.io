# Récupération du prototype Flutter Web

Ce fichier conserve ce qui valait d'être sauvé du projet Flutter Web supprimé en tâche 0.2
(`lib/main.dart`, `web/index.html`, `web/manifest.json`). Le reste — 157 lignes de widgets
Dart et un `<canvas>` — n'a aucune valeur pour un site statique.

## Marque

| | |
|---|---|
| Nom | **Chocky Studio** |
| Logotype | `chocky.` (minuscules, point final, très gras) |
| Sur-titre | `STUDIO DIGITAL INDEPENDANT` |
| Accroche principale | **Des apps utiles.** / **Un peu plus humaines.** (deux lignes) |
| Sous-titre | Chocky imagine et développe des applications claires, calmes et utiles pour mieux travailler, créer et vivre au quotidien. |
| Accroche de pied | Des produits numériques qui font du bien. |
| Titre de section | La collection — *Des outils pensés pour votre quotidien.* |
| Mention légale | © 2026 Chocky Studio |
| Contact | `djchocky@gmail.com` · GitHub `chocky95` |

**À conserver telles quelles** : le logotype `chocky.` et l'accroche « Des apps utiles. Un peu
plus humaines. » Elles sont bonnes et elles vous appartiennent.

**À réécrire** : le sous-titre parle de « travailler, créer et vivre », ce qui ne décrit ni un
jeu de Mölkky, ni un scanner de documents, ni un livre des recettes URSSAF. Le vrai catalogue
est *deux jeux de société, un scanner, une compta de micro-entrepreneur*.

## Palette d'origine (thème clair)

Le site part sur une **vitrine produit sombre** — cette palette n'est donc pas reprise telle
quelle, mais l'encre et le vert restent utilisables comme accents de marque.

| Rôle | Hex | Devenir |
|---|---|---|
| Vert profond (seed) | `#0C6B58` | **Accent de marque Chocky** — conservé |
| Encre | `#17211E` | Base de la palette sombre |
| Fond crème | `#F7F8F3` | Abandonné (thème sombre) |
| Vert pâle (badge) | `#DDEDE7` | Abandonné |
| Texte secondaire | `#53615C` / `#65736D` | Repère de hiérarchie typographique |
| Orbe ambre | `#F4B65F` | Réserve, accent chaud |
| Orbe sauge | `#84B9A4` | Réserve |
| Police | `Trebuchet MS` (police système, non embarquée) | Remplacée par Inter Variable |

## Ce qui était faux et ne doit pas être repris

Les **3 applications affichées étaient fictives** : Chocky Notes (Organisation), Budget Bloom
(Finance), Focus Flow (Productivité) — toutes marquées « Bientôt disponible ». Elles
n'existent dans aucun projet. Le JSON-LD `Organization.hasPart` de `web/index.html` les
déclarait comme trois `SoftwareApplication`.

Le vrai catalogue est : **Mölkky Score, Papayoo, EasyCompta, ScanFree** (publiées) et
**Mojogo** (à paraître).

## Balises SEO d'origine — utiles comme référence

`web/index.html` avait été travaillé à la main. Ce qui est bon à reprendre :

```html
<meta name="description" content="Découvrez les applications Chocky Studio : des outils
      numériques clairs, calmes et utiles pour le quotidien.">
<meta name="author" content="Chocky Studio">
<meta property="og:type" content="website">
<meta property="og:url" content="https://chocky.app/">
```

Points à noter :

- **`og:url` revendiquait déjà `https://chocky.app/`.** Le site démarre sur
  `chocky95.github.io` ; si vous achetez ce domaine, c'est `public/CNAME` + une ligne de
  `astro.config.mjs`.
- **`<meta name="keywords">` est ignoré par Google depuis 2009.** Ne pas le réintroduire.
- Le `<noscript>` contenait le seul `<h1>` de tout le site. C'est exactement le symptôme du
  problème : sur un site statique, ce `<h1>` est la page.
- `apple-mobile-web-app-title` était resté sur `sitewebchocky`.
- `manifest.json` était intégralement par défaut : nom `sitewebchocky`, description « A new
  Flutter project. », `theme_color` `#0175C2` (bleu Flutter, en contradiction avec le vert du
  thème), `orientation: portrait-primary`.

## Fichiers supprimés en tâche 0.2

```
lib/  web/  test/  build/  .dart_tool/  .idea/
pubspec.yaml  pubspec.lock  .metadata  analysis_options.yaml  sitewebchocky.iml  README.md
```
