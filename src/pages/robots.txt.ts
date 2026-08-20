import type { APIRoute } from 'astro';

import { requireSite } from '~/i18n/routes';

/**
 * robots.txt — doit rester ICI, hors de `[...locale]/`.
 *
 * Les crawlers ne lisent robots.txt qu'à la racine de l'hôte. C'est aussi la
 * raison pour laquelle le site est un dépôt *user-site* (`chocky95.github.io`)
 * et non un dépôt de projet : dans un sous-dossier, ce fichier serait servi sur
 * `/mon-repo/robots.txt`, que personne ne lit.
 *
 * Rien n'est en Disallow : tout ce qui ne doit pas être indexé porte
 * `<meta name="robots" content="noindex">`, ce qui est le mécanisme correct.
 * Bloquer par robots.txt empêcherait Google de LIRE le noindex.
 */
export const GET: APIRoute = ({ site }) => {
  const base = requireSite(site);

  // @astrojs/sitemap écrit `sitemap-index.xml` ET `sitemap-0.xml`, jamais un
  // `sitemap.xml` nu. Pointer vers /sitemap.xml renverrait un 404.
  const sitemap = new URL('sitemap-index.xml', base).href;

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
