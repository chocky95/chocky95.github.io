import type { UiDict } from './fr';

/**
 * Anglais — deuxième dictionnaire complet, et cible de repli pour les 16 autres
 * langues. Doit rester complet : typé `UiDict` (et non `Partial`), une clé
 * manquante fait échouer `astro check`.
 */
const en: UiDict = {
  'site.name': 'Chocky Dev',
  'site.tagline': 'Useful apps, fun games',
  'site.description':
    'Two board games, a document scanner and accounting for the self-employed. Built by one independent developer.',

  'nav.apps': 'Apps',
  'nav.guides': 'Guides',
  'nav.about': 'About',
  'nav.support': 'Support',
  'nav.skipToContent': 'Skip to content',
  'nav.home': 'Home',

  'lang.label': 'Language',
  'lang.choose': 'Choose a language',

  'apps.title': 'The apps',
  'apps.all': 'All apps',
  'apps.family.game': 'Games',
  'apps.family.business': 'Business',
  'apps.family.utility': 'Utilities',
  'apps.comingSoon': 'Coming soon',
  'apps.version': 'Version',
  'apps.availableOn': 'Available on',
  'apps.free': 'Free',

  'cta.play': 'Get it on Google Play',
  'cta.webApp': 'Open in your browser',
  'cta.discover': 'Discover',
  'cta.readRules': 'Read the rules',

  'breadcrumb.label': 'Breadcrumb',

  'footer.tagline': 'Digital products that do you good.',
  'footer.otherApps': 'More apps from Chocky Dev',
  'footer.legal': 'Legal notice',
  'footer.privacy': 'Privacy',
  'footer.contact': 'Contact',
  'footer.rights': '© 2026 Chocky Dev',

  'meta.updatedOn': 'Updated on',
  'faq.title': 'Frequently asked questions',
  'notFound.title': 'Page not found',
  'notFound.body': 'This page does not exist or has been moved.',
  'notFound.backHome': 'Back to home',
};

export default en;
