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

/**
 * Est-ce un caractère « pleine largeur » ?
 *
 * Les idéogrammes CJK, les kana et le hangul occupent deux cellules à
 * l'affichage. Couvre les plages utiles ici : hangul, CJK et kana, formes
 * pleine largeur.
 */
function isWide(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60)
  );
}

/**
 * Largeur d'affichage d'une chaîne, en demi-cadratins.
 *
 * ── Pourquoi pas simplement `.length` ────────────────────────────────────
 * Google ne tronque pas les titres et descriptions à un nombre de caractères
 * mais à une largeur en pixels. Or une description japonaise de 77 caractères
 * occupe exactement la même place qu'une description française de 148 : les
 * caractères CJK sont deux fois plus larges.
 *
 * Valider `.length` imposerait donc aux langues CJK des textes deux fois trop
 * longs — tronqués dans les résultats de recherche — ou ferait échouer des
 * textes parfaitement calibrés. Mesurer la largeur unifie les 18 langues sous
 * un seul seuil, et c'est le seuil que Google applique réellement.
 */
function displayWidth(value: string): number {
  let width = 0;
  for (const char of value) {
    width += isWide(char.codePointAt(0) ?? 0) ? 2 : 1;
  }
  return width;
}

/** Contrainte de largeur d'affichage, avec un message qui donne la mesure. */
function widthBetween(min: number, max: number, label: string) {
  return (value: string, ctx: { addIssue: (issue: { code: 'custom'; message: string }) => void }) => {
    const w = displayWidth(value);
    if (w < min || w > max) {
      ctx.addIssue({
        code: 'custom',
        message:
          `${label} : largeur d'affichage ${w}, attendue entre ${min} et ${max}. ` +
          `(${value.length} caractères — en CJK, un caractère compte double.)`,
      });
    }
  };
}

/** Une question de FAQ. Doit être VISIBLE dans la page pour justifier le JSON-LD FAQPage. */
const faqItem = z.object({
  q: z.string().superRefine(widthBetween(8, 200, 'faq.q')),
  a: z.string().superRefine(widthBetween(30, 900, 'faq.a')),
});

const seoFields = {
  /** Balise <title>. Google tronque autour de 60 demi-cadratins. */
  title: z.string().superRefine(widthBetween(10, 65, 'title')),
  /**
   * Meta description. Le minimum de 110 est délibéré : il force de la vraie
   * prose plutôt qu'un fragment traduit, ce qui est la différence concrète
   * entre une page localisée et une page mince.
   */
  metaDescription: z.string().superRefine(widthBetween(110, 165, 'metaDescription')),
  /** Titre visible. Peut différer du <title>, plus long et plus naturel. */
  h1: z.string().superRefine(widthBetween(10, 400, 'h1')),
  /** Chapô : doit répondre à la requête dans les 100 premiers mots. */
  lead: z.string().superRefine(widthBetween(80, 1200, 'lead')),
  translationStatus,
  updatedOn: z.coerce.date(),
  faq: z.array(faqItem).default([]),
};

const apps = defineCollection({
  loader: glob({ base: './src/content/apps', pattern: '**/*.md', generateId: rawId }),
  schema: z.object({
    ...seoFields,
    /** Points forts, affichés en liste. Structurés par locale, pas un bloc traduit. */
    highlights: z
      .array(z.string().superRefine(widthBetween(12, 220, 'highlight')))
      .min(3)
      .max(8),
    /**
     * Texte alternatif des captures d'écran, indexé par nom de fichier
     * (`accueil`, `recettes`, `document`…).
     *
     * C'est du contenu éditorial localisé, pas une chaîne d'interface : un
     * `alt` descriptif est lu par Google Images et par les lecteurs d'écran, et
     * « Capture 1 » n'apporte rien ni aux uns ni aux autres.
     */
    screenshotAlt: z
      .record(z.string(), z.string().superRefine(widthBetween(15, 300, 'screenshotAlt')))
      .default({}),
    /** Texte alternatif du visuel principal (bannière du jeu / feature graphic). */
    heroAlt: z.string().superRefine(widthBetween(15, 300, 'heroAlt')).optional(),
    /** Texte alternatif des schémas, indexé par nom (`placement`, `pins`). */
    diagramAlt: z
      .record(z.string(), z.string().superRefine(widthBetween(15, 300, 'diagramAlt')))
      .default({}),
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

