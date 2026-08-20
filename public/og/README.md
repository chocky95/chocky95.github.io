# Images Open Graph

Générées par `node scripts/generate-og.mjs`, puis **committées**.

Elles ne sont pas produites au build : une image de partage change rarement,
et la garder hors du pipeline évite six transformations sharp par run CI.

Relancer le script après un changement de nom, de couleur de marque, ou après
un `npm run assets:sync` qui apporte de nouvelles icônes d'application.
