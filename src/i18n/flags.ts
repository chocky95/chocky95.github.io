/**
 * Drapeaux du sélecteur de langue, en SVG inline.
 *
 * Les drapeaux emoji Unicode (approche précédente) ne s'affichent pas sur
 * Windows : Segoe UI Emoji n'embarque pas les drapeaux de pays (contrairement
 * à macOS/iOS/Android), donc la plupart des visiteurs Windows/Chrome ne
 * voyaient rien. On inline à la place les SVG du paquet `flag-icons`
 * (MIT) au moment du build -- zéro requête réseau, zéro JS, rendu identique
 * sur toutes les plateformes.
 */

import type { Locale } from './locales';

/**
 * Le SVG officiel de `flag-icons` pour l'Espagne pèse 80 Ko à lui seul
 * (l'écusson est détaillé point par point) -- pour une puce décorative de
 * quelques pixels, on garde uniquement les trois bandes de couleur.
 */
const ES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#AA151B" d="M0 0h640v480H0z"/><path fill="#F1BF00" d="M0 120h640v240H0z"/></svg>`;

import FR from 'flag-icons/flags/4x3/fr.svg?raw';
import GB from 'flag-icons/flags/4x3/gb.svg?raw';
import DE from 'flag-icons/flags/4x3/de.svg?raw';
import FI from 'flag-icons/flags/4x3/fi.svg?raw';
import JP from 'flag-icons/flags/4x3/jp.svg?raw';
import IT from 'flag-icons/flags/4x3/it.svg?raw';
import NL from 'flag-icons/flags/4x3/nl.svg?raw';
import PT from 'flag-icons/flags/4x3/pt.svg?raw';
import SE from 'flag-icons/flags/4x3/se.svg?raw';
import EE from 'flag-icons/flags/4x3/ee.svg?raw';
import DK from 'flag-icons/flags/4x3/dk.svg?raw';
import NO from 'flag-icons/flags/4x3/no.svg?raw';
import PL from 'flag-icons/flags/4x3/pl.svg?raw';
import RO from 'flag-icons/flags/4x3/ro.svg?raw';
import RU from 'flag-icons/flags/4x3/ru.svg?raw';
import KR from 'flag-icons/flags/4x3/kr.svg?raw';
import CZ from 'flag-icons/flags/4x3/cz.svg?raw';

/** Marquage géographique conventionnel des langues sans pays unique (`en` -> Royaume-Uni). */
export const FLAG_SVG: Readonly<Record<Locale, string>> = {
  fr: FR,
  en: GB,
  de: DE,
  fi: FI,
  ja: JP,
  es: ES,
  it: IT,
  nl: NL,
  pt: PT,
  sv: SE,
  et: EE,
  da: DK,
  nb: NO,
  pl: PL,
  ro: RO,
  ru: RU,
  ko: KR,
  cs: CZ,
};
