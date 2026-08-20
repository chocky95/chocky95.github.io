import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Segment d'URL -> balise hreflang. Ici l'identite, mais @astrojs/sitemap
 * exige la map explicite et c'est aussi notre liste de locales canonique.
 *
 * L'ordre suit les paliers de qualite du plan de contenu :
 *   palier 1 : fr en de fi ja
 *   palier 2 : es it nl pt sv et
 *   palier 3 : da nb pl ro ru ko cs
 */
export const HREFLANG = /** @type {const} */ ({
  fr: 'fr', en: 'en', de: 'de', fi: 'fi', ja: 'ja',
  es: 'es', it: 'it', nl: 'nl', pt: 'pt', sv: 'sv', et: 'et',
  da: 'da', nb: 'nb', pl: 'pl', ro: 'ro', ru: 'ru', ko: 'ko', cs: 'cs',
});

/*
 * Domaine du site.
 *
 * Cette constante pilote a elle seule les 94 canonicals, tous les clusters
 * hreflang, le sitemap et le Sitemap: de robots.txt. C'est pourquoi elle est
 * declaree ici plutot que semee dans les composants.
 *
 * chocky95.github.io redirige en 301 vers ce domaine, redirection posee
 * automatiquement par GitHub. Le capital de referencement accumule sur
 * l'ancienne adresse est donc transfere.
 *
 * Le domaine lui-meme est declare dans public/CNAME : avec un deploiement par
 * GitHub Actions, l'absence de ce fichier dans l'artefact peut reinitialiser le
 * reglage cote GitHub au deploiement suivant.
 */
const SITE = 'https://chocky.dev';

export default defineConfig({
  site: SITE,
  // Depot user-site => base '/'. Inchange par le passage a chocky.dev :
  // le domaine remplace l'hote, pas le chemin.
  base: '/',

  // GitHub Pages sert dist/apps/papayoo/index.html sur /apps/papayoo/ et
  // renvoie un 301 sur la forme sans slash. Sans le slash partout, chaque
  // canonical / hreflang / entree de sitemap serait une redirection.
  trailingSlash: 'always',
  compressHTML: true,
  prefetch: false, // prefetch injecte du JS client

  build: {
    format: 'directory',
    inlineStylesheets: 'always',
    assets: '_astro',
  },

  i18n: {
    defaultLocale: 'fr',
    locales: Object.keys(HREFLANG),
    routing: { prefixDefaultLocale: false },
    // fallback : VOLONTAIREMENT ABSENT.
    // Le declarer ferait synthetiser des URL hors sous-ensemble
    // (/ru/apps/scanfree/) qui ne doivent jamais exister.
  },

  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },

  fonts: [
    {
      // Provider `local`, alimente par les .woff2 de @fontsource-variable/inter
      // (installe, epingle par le lockfile). Aucun appel reseau pendant le build.
      //
      // Ce n'est pas un contournement mais le choix le plus solide :
      //   - le reseau d'entreprise bloque api.fontsource.org et cdn.jsdelivr.net.
      //     Le provider `fontsource` y perdait 5 minutes en retries pour finir
      //     sans emettre un seul @font-face ; le provider `npm`, meme en
      //     `remote: false`, allait encore chercher les metriques sur jsdelivr
      //     pour synthetiser les fallbacks ;
      //   - un build ne doit pas dependre d'un CDN tiers, ni ici ni sur le
      //     runner GitHub Actions ;
      //   - la version est reproductible, verrouillee par package-lock.json.
      //
      // Un variant par sous-ensemble, avec sa plage unicode exacte (relevee dans
      // le unicode.json du paquet) : le navigateur ne telecharge le fichier
      // cyrillique que sur une page contenant reellement du cyrillique.
      provider: fontProviders.local(),
      name: 'Inter Variable',
      cssVariable: '--font-sans',
      // Pas de sous-ensemble CJK : il peserait plusieurs Mo sur /ja/ et /ko/.
      // Ces langues basculent sur la pile systeme via :lang() dans global.css.
      options: {
        variants: [
          {
            // 47 Ko — couvre le francais, l'anglais, l'allemand, l'espagnol,
            // l'italien, le neerlandais, le portugais, les langues nordiques.
            src: ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'],
            weight: '400 800',
            style: 'normal',
            unicodeRange: [
              'U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6',
              'U+02DA', 'U+02DC', 'U+0304', 'U+0308', 'U+0329', 'U+2000-206F',
              'U+20AC', 'U+2122', 'U+2191', 'U+2193', 'U+2212', 'U+2215',
              'U+FEFF', 'U+FFFD',
            ],
          },
          {
            // 83 Ko — diacritiques du tcheque, du polonais, du roumain,
            // de l'estonien. Charge uniquement sur ces pages.
            src: ['@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2'],
            weight: '400 800',
            style: 'normal',
            unicodeRange: [
              'U+0100-02BA', 'U+02BD-02C5', 'U+02C7-02CC', 'U+02CE-02D7',
              'U+02DD-02FF', 'U+0304', 'U+0308', 'U+0329', 'U+1D00-1DBF',
              'U+1E00-1E9F', 'U+1EF2-1EFF', 'U+2020', 'U+20A0-20AB',
              'U+20AD-20C0', 'U+2113', 'U+2C60-2C7F', 'U+A720-A7FF',
            ],
          },
          {
            // 18 Ko — russe uniquement.
            src: ['@fontsource-variable/inter/files/inter-cyrillic-wght-normal.woff2'],
            weight: '400 800',
            style: 'normal',
            unicodeRange: ['U+0301', 'U+0400-045F', 'U+0490-0491', 'U+04B0-04B1', 'U+2116'],
          },
        ],
      },
      display: 'swap',
      fallbacks: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      // Astro lit les metriques dans le fichier local et synthetise un fallback
      // metriquement apparie : CLS proche de zero pendant le swap.
      optimizedFallbacks: true,
    },
  ],

  integrations: [
    sitemap({
      i18n: { defaultLocale: 'fr', locales: HREFLANG },
      changefreq: 'monthly',
      priority: 0.7,
      serialize(item) {
        // @astrojs/sitemap emet les xhtml:link alternates mais PAS x-default.
        if (item.links?.length) {
          const fr = item.links.find((l) => l.lang === 'fr');
          if (fr) item.links = [...item.links, { lang: 'x-default', url: fr.url }];
        }
        if (item.url === `${SITE}/`) item.priority = 1.0;
        return item;
      },
    }),
  ],
});
