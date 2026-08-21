/**
 * Dictionnaire de référence.
 *
 * `fr` est la source de vérité : c'est ce fichier qui définit la FORME du
 * dictionnaire. Toute clé ajoutée ici devient obligatoire pour `check-i18n.mjs`,
 * et les 17 autres langues sont typées comme des sous-ensembles partiels.
 *
 * Ne contient que des chaînes d'interface (navigation, boutons, libellés). La
 * prose éditoriale vit dans `src/content/`, jamais ici.
 */
const fr = {
  // Marque
  'site.name': 'Chocky Dev',
  'site.tagline': 'Des applis utiles, des jeux Fun',
  'site.description':
    'Deux jeux de société, un scanner de documents et une comptabilité de micro-entrepreneur. Développés par un seul développeur indépendant.',

  // Navigation
  'nav.apps': 'Applications',
  'nav.guides': 'Guides',
  'nav.about': 'À propos',
  'nav.support': 'Support',
  'nav.skipToContent': 'Aller au contenu',
  'nav.home': 'Accueil',

  // Sélecteur de langue
  'lang.label': 'Langue',
  'lang.choose': 'Choisir une langue',

  // Applications
  'apps.title': 'Les applications',
  'apps.all': 'Toutes les applications',
  'apps.family.game': 'Jeux',
  'apps.family.business': 'Gestion',
  'apps.family.utility': 'Utilitaires',
  'apps.comingSoon': 'Bientôt disponible',
  'apps.version': 'Version',
  'apps.availableOn': 'Disponible sur',
  'apps.free': 'Gratuit',
  'apps.languageFallbackNotice':
    "Cette application n'affiche pas encore son interface en {lang} ; elle s'affichera en anglais tant qu'elle n'aura pas été traduite.",

  // Appels à l'action
  'cta.play': 'Télécharger sur Google Play',
  'cta.webApp': 'Utiliser dans le navigateur',
  'cta.discover': 'Découvrir',
  'cta.readRules': 'Lire les règles',

  // Fil d'Ariane
  'breadcrumb.label': "Fil d'Ariane",

  // Pied de page
  'footer.tagline': 'Des produits numériques qui font du bien.',
  'footer.otherApps': 'Les autres applications de Chocky Dev',
  'footer.legal': 'Mentions légales',
  'footer.privacy': 'Confidentialité',
  'footer.contact': 'Contact',
  'footer.rights': '© 2026 Chocky Dev',

  // Divers
  'meta.updatedOn': 'Mis à jour le',
  'faq.title': 'Questions fréquentes',
  'notFound.title': 'Page introuvable',
  'notFound.body': "Cette page n'existe pas ou a été déplacée.",
  'notFound.backHome': "Retour à l'accueil",
} as const;

export default fr;

/** La forme du dictionnaire, imposée par `fr`. */
export type UiKey = keyof typeof fr;
export type UiDict = Readonly<Record<UiKey, string>>;
