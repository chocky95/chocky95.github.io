import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

import { APP_SLUGS } from '~/data/apps';
import { LOCALES } from '~/i18n/locales';

/**
 * Collections de contenu.
 *
 * Convention de nommage : `<cle>.<locale>.md`
 *   apps/papayoo.fi.md            -> app "papayoo", locale "fi"
 *   guides/molkky-rules.fr.md     -> cluster "molkky-rules", locale "fr"
 *
 * La locale est déduite du nom de fichier, jamais répétée en frontmatter : une
 * seule source de vérité, et pas de risque de désaccord entre les deux.
 *
 * ⚠️ D'où `generateId` sur chaque collection : l'implémentation par défaut du
 * loader `glob` *slugifie* le chemin, ce qui supprime le point et transforme
 * `easycompta.fr.md` en `easycomptafr`. La convention `<cle>.<locale>` devient
 * alors indécodable. On conserve donc le chemin brut, sans extension.
 */

/** Chemin relatif sans extension : `papayoo.fi`, `guides/molkky-rules.fr`. */
const rawId = ({ entry }: { entry: string }): string => entry.replace(/\.md$/, '');



/**
 * Statut de traduction — le garde-fou anti-contenu-mince.
 *
 * `raw-mt` (traduction automatique non relue) force `noindex, follow`. Google
 * ne pénalise pas la traduction automatique en soi, il pénalise volume x faible
 * valeur : une page non relue ne doit donc jamais entrer dans l'index.
 */
const translationStatus = z.enum(['authored', 'reviewed', 'raw-mt']);

/** Une question de FAQ. Doit être VISIBLE dans la page pour justifier le JSON-LD FAQPage. */
const faqItem = z.object({
  q: z.string().min(8),
  a: z.string().min(30),
});

const seoFields = {
  /** Balise <title>. Google tronque au-delà d'environ 60 caractères. */
  title: z.string().min(10).max(65),
  /**
   * Meta description. Le minimum de 110 caractères est délibéré : il force de
   * la vraie prose plutôt qu'un fragment traduit, ce qui est la différence
   * concrète entre une page localisée et une page mince.
   */
  metaDescription: z.string().min(110).max(160),
  /** Titre visible. Peut différer du <title>, plus long et plus naturel. */
  h1: z.string().min(10),
  /** Chapô : doit répondre à la requête dans les 100 premiers mots. */
  lead: z.string().min(80),
  translationStatus,
  updatedOn: z.coerce.date(),
  faq: z.array(faqItem).default([]),
};

const apps = defineCollection({
  loader: glob({ base: './src/content/apps', pattern: '**/*.md', generateId: rawId }),
  schema: z.object({
    ...seoFields,
    /** Points forts, affichés en liste. Structurés par locale, pas un bloc traduit. */
    highlights: z.array(z.string().min(12)).min(3).max(8),
    /**
     * Texte alternatif des captures d'écran, indexé par nom de fichier
     * (`accueil`, `recettes`, `document`…).
     *
     * C'est du contenu éditorial localisé, pas une chaîne d'interface : un
     * `alt` descriptif est lu par Google Images et par les lecteurs d'écran, et
     * « Capture 1 » n'apporte rien ni aux uns ni aux autres.
     */
    screenshotAlt: z.record(z.string(), z.string().min(15)).default({}),
    /** Texte alternatif du visuel principal (bannière du jeu / feature graphic). */
    heroAlt: z.string().min(15).optional(),
    /** Texte alternatif des schémas, indexé par nom (`placement`, `pins`). */
    diagramAlt: z.record(z.string(), z.string().min(15)).default({}),
  }),
});

const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '**/*.md', generateId: rawId }),
  schema: z.object({
    ...seoFields,
    /** Segment d'URL, localisé : `regles-du-molkky`, `molkky-saannot`. */
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug en minuscules ASCII, séparé par des tirets'),
    /** Application vers laquelle ce guide renvoie. Pilote le maillage interne. */
    relatedApp: z.enum(APP_SLUGS as [string, ...string[]]).optional(),
    /** `HowTo` pour des règles de jeu, `Article` pour un guide. */
    schemaType: z.enum(['HowTo', 'Article']).default('Article'),
  }),
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md', generateId: rawId }),
  schema: z.object({
    ...seoFields,
    slug: z.string().regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/),
    /** Retire la page de l'index : pages légales, support. */
    noindex: z.boolean().default(false),
  }),
});

export const collections = { apps, guides, pages };

/* ------------------------------------------------------------------------- *
 * Utilitaires de nommage
 * ------------------------------------------------------------------------- */

export interface ContentId {
  readonly key: string;
  readonly locale: (typeof LOCALES)[number];
}

/**
 * Découpe `papayoo.fi` en `{ key: 'papayoo', locale: 'fi' }`.
 * Renvoie `null` si le nom ne suit pas la convention, ce qui permet à l'appelant
 * de signaler un fichier mal nommé au lieu de l'ignorer silencieusement.
 */
export function parseContentId(id: string): ContentId | null {
  const at = id.lastIndexOf('.');
  if (at <= 0) return null;

  const key = id.slice(0, at);
  const locale = id.slice(at + 1);

  if (!(LOCALES as readonly string[]).includes(locale)) return null;
  return { key, locale: locale as (typeof LOCALES)[number] };
}


