import type { CatalogLocale } from '~/data/catalog';

/**
 * Les textes du catalogue de voitures, dans ses cinq langues.
 *
 * Ils vivent ici et non dans `i18n/ui` pour la même raison que les titres de
 * l'espace presse : `i18n/ui` exige les 18 langues, et le catalogue n'existe
 * que dans cinq.
 *
 * Aucune phrase ne prend d'article devant un nom de voiture : « la F40 » mais
 * « le Cayenne », « der Golf » mais « die Corvette ». Le genre n'est pas dans
 * le catalogue, et le deviner donnerait une faute sur une page sur trois.
 */
export interface CatalogStrings {
  /** Ancre du pied de page et du fil d'Ariane. */
  readonly navLabel: string;
  /** Séparateur entre un nom et ce qui le décrit : « : » ou « : » précédé d'une espace. */
  readonly colon: string;
  readonly hpUnit: string;

  readonly index: {
    readonly title: (cars: string) => string;
    readonly description: (cars: string, makes: number) => string;
    readonly h1: (cars: string) => string;
    readonly lead: (cars: string, makes: number, from: number, to: number) => string;
    readonly makesHeading: string;
    readonly iconicHeading: string;
  };

  readonly make: {
    readonly title: (make: string, count: number) => string;
    readonly description: (make: string, count: number) => string;
    readonly lead: (make: string, count: number, from: number, to: number) => string;
    readonly mostPowerful: string;
    readonly fastest: string;
    readonly listHeading: (make: string) => string;
  };

  readonly models: (count: number) => string;

  readonly car: {
    readonly titleLong: (name: string, years: string) => string;
    readonly titleShort: (name: string) => string;
    readonly since: (year: number) => string;
    readonly accelSummary: (seconds: string) => string;
    readonly specsHeading: string;
    readonly storyHeading: string;
    readonly rarityHeading: string;
    readonly funFactHeading: string;
    readonly gameHeading: string;
    readonly gameText: (
      name: string,
      total: string,
      number: number,
      cls: string,
      clsName: string,
    ) => string;
    readonly otherHeading: (make: string) => string;
    readonly allModels: (make: string) => string;
  };

  readonly specs: {
    readonly production: string;
    readonly power: string;
    readonly torque: string;
    readonly accel: string;
    readonly topSpeed: string;
    readonly weight: string;
    readonly engine: string;
    readonly drivetrain: string;
    readonly transmission: string;
    readonly country: string;
    readonly category: string;
  };

  /** Clés : valeurs brutes du catalogue (`FWD`, `RWD`, `AWD`, `4WD`). */
  readonly drivetrains: Readonly<Record<string, string>>;
  /** Clés : valeurs brutes du catalogue, en français (`manuelle`, `CVT`…). */
  readonly transmissions: Readonly<Record<string, string>>;

  readonly photo: {
    readonly label: string;
    readonly unknownAuthor: string;
    readonly via: string;
    readonly modified: string;
    readonly publicDomain: string;
  };

  readonly trademark: string;
  readonly removal: string;
}

export const REMOVAL_EMAIL = 'djchocky@gmail.com';

export const CATALOG_STRINGS: Readonly<Record<CatalogLocale, CatalogStrings>> = {
  fr: {
    navLabel: 'Catalogue de voitures',
    colon: ' : ',
    hpUnit: 'ch',
    index: {
      title: (cars) => `Catalogue de voitures : ${cars} fiches techniques`,
      description: (cars, makes) =>
        `${cars} voitures de ${makes} marques : puissance, couple, 0 à 100 km/h, vitesse maximale, poids et histoire de chaque modèle, avec une photo créditée.`,
      h1: (cars) => `Catalogue de voitures : ${cars} modèles et leurs fiches techniques`,
      lead: (cars, makes, from, to) =>
        `Voici les ${cars} voitures du catalogue de Garage Master TCG, classées par marque : ${makes} constructeurs et des modèles lancés entre ${from} et ${to}. Chaque fiche donne la puissance, le couple, le 0 à 100 km/h, la vitesse maximale et le poids du modèle, raconte son histoire et crédite sa photo.`,
      makesHeading: 'Toutes les marques',
      iconicHeading: 'Modèles emblématiques',
    },
    make: {
      title: (make, count) =>
        count > 1 ? `${make} : ${count} modèles et leurs fiches techniques` : `${make} : modèle et fiche technique`,
      description: (make, count) =>
        count > 1
          ? `Les ${count} modèles ${make} du catalogue Garage Master TCG : puissance, vitesse maximale, 0 à 100 km/h, poids et histoire de chaque voiture.`
          : `Le modèle ${make} du catalogue Garage Master TCG : puissance, vitesse maximale, 0 à 100 km/h, poids et histoire de la voiture.`,
      lead: (make, count, from, to) =>
        count > 1
          ? `${count} modèles ${make} figurent au catalogue, lancés entre ${from} et ${to}.`
          : `Un modèle ${make} figure au catalogue, lancé en ${from}.`,
      mostPowerful: 'Modèle le plus puissant',
      fastest: 'Modèle le plus rapide',
      listHeading: (make) => `Tous les modèles ${make}`,
    },
    models: (count) => (count > 1 ? `${count} modèles` : '1 modèle'),
    car: {
      titleLong: (name, years) => `${name} (${years}) : fiche technique et histoire`,
      titleShort: (name) => `${name} : fiche technique`,
      since: (year) => `depuis ${year}`,
      accelSummary: (seconds) => `0 à 100 km/h en ${seconds} s`,
      specsHeading: 'Fiche technique',
      storyHeading: 'Histoire',
      rarityHeading: 'Rareté',
      funFactHeading: 'Le saviez-vous ?',
      gameHeading: 'Dans Garage Master TCG',
      gameText: (name, total, number, cls, clsName) =>
        `${name} fait partie des ${total} voitures à collectionner de Garage Master TCG, le jeu de cartes automobile gratuit sur Android et iPhone. C'est la carte n° ${number} de la collection, en classe ${cls} (${clsName}).`,
      otherHeading: (make) => `Autres modèles ${make}`,
      allModels: (make) => `Tous les modèles ${make}`,
    },
    specs: {
      production: 'Production',
      power: 'Puissance',
      torque: 'Couple',
      accel: '0 à 100 km/h',
      topSpeed: 'Vitesse maximale',
      weight: 'Poids',
      engine: 'Moteur',
      drivetrain: 'Roues motrices',
      transmission: 'Boîte de vitesses',
      country: 'Pays',
      category: 'Catégorie',
    },
    drivetrains: {
      FWD: 'Traction',
      RWD: 'Propulsion',
      AWD: 'Transmission intégrale',
      '4WD': 'Quatre roues motrices',
    },
    transmissions: {
      manuelle: 'Manuelle',
      automatique: 'Automatique',
      robotisée: 'Robotisée',
      'rapport unique': 'Rapport unique',
      CVT: 'CVT',
    },
    photo: {
      label: 'Photo',
      unknownAuthor: 'auteur non précisé',
      via: 'via Wikimedia Commons',
      modified: 'Image recadrée et redimensionnée.',
      publicDomain: 'domaine public',
    },
    trademark:
      'Toutes les marques citées appartiennent à leurs propriétaires respectifs. Garage Master TCG est un jeu indépendant, ni affilié ni approuvé par les constructeurs.',
    removal: "Un ayant droit qui souhaite le retrait d'une image ou d'un contenu peut écrire à",
  },

  en: {
    navLabel: 'Car catalogue',
    colon: ': ',
    hpUnit: 'hp',
    index: {
      title: (cars) => `Car catalogue: ${cars} spec sheets by make`,
      description: (cars, makes) =>
        `${cars} cars from ${makes} makes: power, torque, 0–100 km/h, top speed, weight and the story of every model, each with a credited photo.`,
      h1: (cars) => `Car catalogue: ${cars} models and their specs`,
      lead: (cars, makes, from, to) =>
        `These are the ${cars} cars in the Garage Master TCG catalogue, sorted by make: ${makes} manufacturers and models launched between ${from} and ${to}. Each page gives the model's power, torque, 0–100 km/h time, top speed and weight, tells its story and credits its photo.`,
      makesHeading: 'All makes',
      iconicHeading: 'Iconic models',
    },
    make: {
      title: (make, count) =>
        count > 1 ? `${make}: ${count} models, specs and history` : `${make}: model, specs and history`,
      description: (make, count) =>
        count > 1
          ? `The ${count} ${make} models in the Garage Master TCG catalogue: power, top speed, 0–100 km/h, weight and the story of each car.`
          : `The ${make} model in the Garage Master TCG catalogue: power, top speed, 0–100 km/h, weight and the story of the car.`,
      lead: (make, count, from, to) =>
        count > 1
          ? `The catalogue lists ${count} ${make} models, launched between ${from} and ${to}.`
          : `The catalogue lists one ${make} model, launched in ${from}.`,
      mostPowerful: 'Most powerful model',
      fastest: 'Fastest model',
      listHeading: (make) => `All ${make} models`,
    },
    models: (count) => (count > 1 ? `${count} models` : '1 model'),
    car: {
      titleLong: (name, years) => `${name} (${years}): specs and history`,
      titleShort: (name) => `${name}: specs`,
      since: (year) => `since ${year}`,
      accelSummary: (seconds) => `0–100 km/h in ${seconds} s`,
      specsHeading: 'Specifications',
      storyHeading: 'History',
      rarityHeading: 'Rarity',
      funFactHeading: 'Did you know?',
      gameHeading: 'In Garage Master TCG',
      gameText: (name, total, number, cls, clsName) =>
        `${name} is one of the ${total} collectible cars in Garage Master TCG, the free car trading card game for Android and iPhone. It is card no. ${number} in the collection, in class ${cls} (${clsName}).`,
      otherHeading: (make) => `Other ${make} models`,
      allModels: (make) => `All ${make} models`,
    },
    specs: {
      production: 'Production',
      power: 'Power',
      torque: 'Torque',
      accel: '0–100 km/h (0–62 mph)',
      topSpeed: 'Top speed',
      weight: 'Weight',
      engine: 'Engine',
      drivetrain: 'Driven wheels',
      transmission: 'Gearbox',
      country: 'Country',
      category: 'Category',
    },
    drivetrains: {
      FWD: 'Front-wheel drive',
      RWD: 'Rear-wheel drive',
      AWD: 'All-wheel drive',
      '4WD': 'Four-wheel drive',
    },
    transmissions: {
      manuelle: 'Manual',
      automatique: 'Automatic',
      robotisée: 'Automated manual',
      'rapport unique': 'Single-speed',
      CVT: 'CVT',
    },
    photo: {
      label: 'Photo',
      unknownAuthor: 'author not stated',
      via: 'via Wikimedia Commons',
      modified: 'Image cropped and resized.',
      publicDomain: 'public domain',
    },
    trademark:
      'All trademarks mentioned belong to their respective owners. Garage Master TCG is an independent game, neither affiliated with nor endorsed by the manufacturers.',
    removal: 'A rights holder who wants an image or a piece of content removed can write to',
  },

  de: {
    navLabel: 'Autokatalog',
    colon: ': ',
    hpUnit: 'PS',
    index: {
      title: (cars) => `Autokatalog: ${cars} Modelle mit technischen Daten`,
      description: (cars, makes) =>
        `${cars} Autos von ${makes} Marken: Leistung, Drehmoment, 0–100 km/h, Höchstgeschwindigkeit, Gewicht und Geschichte jedes Modells, mit Foto und Bildnachweis.`,
      h1: (cars) => `Autokatalog: ${cars} Modelle und ihre technischen Daten`,
      lead: (cars, makes, from, to) =>
        `Hier stehen die ${cars} Autos aus dem Katalog von Garage Master TCG, nach Marken geordnet: ${makes} Hersteller und Modelle, die zwischen ${from} und ${to} auf den Markt kamen. Jede Seite nennt Leistung, Drehmoment, Beschleunigung von 0 auf 100 km/h, Höchstgeschwindigkeit und Gewicht des Modells, erzählt seine Geschichte und weist das Foto nach.`,
      makesHeading: 'Alle Marken',
      iconicHeading: 'Legendäre Modelle',
    },
    make: {
      title: (make, count) =>
        count > 1 ? `${make}: ${count} Modelle, Daten und Geschichte` : `${make}: Modell, Daten und Geschichte`,
      description: (make, count) =>
        count > 1
          ? `Die ${count} ${make}-Modelle im Katalog von Garage Master TCG: Leistung, Höchstgeschwindigkeit, 0–100 km/h, Gewicht und Geschichte jedes Autos.`
          : `Das ${make}-Modell im Katalog von Garage Master TCG: Leistung, Höchstgeschwindigkeit, 0–100 km/h, Gewicht und Geschichte des Autos.`,
      lead: (make, count, from, to) =>
        count > 1
          ? `Der Katalog führt ${count} ${make}-Modelle, die zwischen ${from} und ${to} auf den Markt kamen.`
          : `Der Katalog führt ein ${make}-Modell, das ${from} auf den Markt kam.`,
      mostPowerful: 'Stärkstes Modell',
      fastest: 'Schnellstes Modell',
      listHeading: (make) => `Alle ${make}-Modelle`,
    },
    models: (count) => (count > 1 ? `${count} Modelle` : '1 Modell'),
    car: {
      titleLong: (name, years) => `${name} (${years}): Technische Daten, Geschichte`,
      titleShort: (name) => `${name}: Technische Daten`,
      since: (year) => `seit ${year}`,
      accelSummary: (seconds) => `0–100 km/h in ${seconds} s`,
      specsHeading: 'Technische Daten',
      storyHeading: 'Geschichte',
      rarityHeading: 'Seltenheit',
      funFactHeading: 'Schon gewusst?',
      gameHeading: 'In Garage Master TCG',
      gameText: (name, total, number, cls, clsName) =>
        `${name} gehört zu den ${total} Sammelautos in Garage Master TCG, dem kostenlosen Auto-Sammelkartenspiel für Android und iPhone. In der Sammlung trägt die Karte die Nr. ${number} und gehört zur Klasse ${cls} (${clsName}).`,
      otherHeading: (make) => `Weitere ${make}-Modelle`,
      allModels: (make) => `Alle ${make}-Modelle`,
    },
    specs: {
      production: 'Bauzeit',
      power: 'Leistung',
      torque: 'Drehmoment',
      accel: '0–100 km/h',
      topSpeed: 'Höchstgeschwindigkeit',
      weight: 'Gewicht',
      engine: 'Motor',
      drivetrain: 'Antrieb',
      transmission: 'Getriebe',
      country: 'Land',
      category: 'Kategorie',
    },
    drivetrains: {
      FWD: 'Frontantrieb',
      RWD: 'Hinterradantrieb',
      AWD: 'Allradantrieb',
      '4WD': 'Zuschaltbarer Allradantrieb',
    },
    transmissions: {
      manuelle: 'Schaltgetriebe',
      automatique: 'Automatik',
      robotisée: 'Automatisiertes Schaltgetriebe',
      'rapport unique': 'Ein-Gang-Getriebe',
      CVT: 'CVT',
    },
    photo: {
      label: 'Foto',
      unknownAuthor: 'Urheber nicht angegeben',
      via: 'über Wikimedia Commons',
      modified: 'Bild zugeschnitten und verkleinert.',
      publicDomain: 'gemeinfrei',
    },
    trademark:
      'Alle genannten Marken gehören ihren jeweiligen Inhabern. Garage Master TCG ist ein unabhängiges Spiel, das mit den Herstellern weder verbunden ist noch von ihnen unterstützt wird.',
    removal: 'Rechteinhaber, die ein Bild oder einen Inhalt entfernen lassen möchten, schreiben an',
  },

  es: {
    navLabel: 'Catálogo de coches',
    colon: ': ',
    hpUnit: 'CV',
    index: {
      title: (cars) => `Catálogo de coches: ${cars} fichas técnicas`,
      description: (cars, makes) =>
        `${cars} coches de ${makes} marcas: potencia, par, 0 a 100 km/h, velocidad máxima, peso e historia de cada modelo, con una foto acreditada.`,
      h1: (cars) => `Catálogo de coches: ${cars} modelos y sus fichas técnicas`,
      lead: (cars, makes, from, to) =>
        `Estos son los ${cars} coches del catálogo de Garage Master TCG, ordenados por marca: ${makes} fabricantes y modelos lanzados entre ${from} y ${to}. Cada ficha indica la potencia, el par, el 0 a 100 km/h, la velocidad máxima y el peso del modelo, cuenta su historia y acredita su foto.`,
      makesHeading: 'Todas las marcas',
      iconicHeading: 'Modelos emblemáticos',
    },
    make: {
      title: (make, count) =>
        count > 1 ? `${make}: ${count} modelos y sus fichas técnicas` : `${make}: modelo y ficha técnica`,
      description: (make, count) =>
        count > 1
          ? `Los ${count} modelos de ${make} del catálogo de Garage Master TCG: potencia, velocidad máxima, 0 a 100 km/h, peso e historia de cada coche.`
          : `El modelo de ${make} del catálogo de Garage Master TCG: potencia, velocidad máxima, 0 a 100 km/h, peso e historia del coche.`,
      lead: (make, count, from, to) =>
        count > 1
          ? `El catálogo incluye ${count} modelos de ${make}, lanzados entre ${from} y ${to}.`
          : `El catálogo incluye un modelo de ${make}, lanzado en ${from}.`,
      mostPowerful: 'Modelo más potente',
      fastest: 'Modelo más rápido',
      listHeading: (make) => `Todos los modelos de ${make}`,
    },
    models: (count) => (count > 1 ? `${count} modelos` : '1 modelo'),
    car: {
      titleLong: (name, years) => `${name} (${years}): ficha técnica e historia`,
      titleShort: (name) => `${name}: ficha técnica`,
      since: (year) => `desde ${year}`,
      accelSummary: (seconds) => `0 a 100 km/h en ${seconds} s`,
      specsHeading: 'Ficha técnica',
      storyHeading: 'Historia',
      rarityHeading: 'Rareza',
      funFactHeading: '¿Sabías que…?',
      gameHeading: 'En Garage Master TCG',
      gameText: (name, total, number, cls, clsName) =>
        `${name} es uno de los ${total} coches coleccionables de Garage Master TCG, el juego gratuito de cartas coleccionables de coches para Android y iPhone. Es la carta n.º ${number} de la colección, de clase ${cls} (${clsName}).`,
      otherHeading: (make) => `Otros modelos de ${make}`,
      allModels: (make) => `Todos los modelos de ${make}`,
    },
    specs: {
      production: 'Producción',
      power: 'Potencia',
      torque: 'Par motor',
      accel: '0 a 100 km/h',
      topSpeed: 'Velocidad máxima',
      weight: 'Peso',
      engine: 'Motor',
      drivetrain: 'Tracción',
      transmission: 'Caja de cambios',
      country: 'País',
      category: 'Categoría',
    },
    drivetrains: {
      FWD: 'Delantera',
      RWD: 'Trasera',
      AWD: 'Total',
      '4WD': 'A las cuatro ruedas',
    },
    transmissions: {
      manuelle: 'Manual',
      automatique: 'Automática',
      robotisée: 'Robotizada',
      'rapport unique': 'De una sola marcha',
      CVT: 'CVT',
    },
    photo: {
      label: 'Foto',
      unknownAuthor: 'autor no indicado',
      via: 'vía Wikimedia Commons',
      modified: 'Imagen recortada y redimensionada.',
      publicDomain: 'dominio público',
    },
    trademark:
      'Todas las marcas citadas pertenecen a sus respectivos propietarios. Garage Master TCG es un juego independiente, sin afiliación ni respaldo de los fabricantes.',
    removal: 'El titular de derechos que desee la retirada de una imagen o de un contenido puede escribir a',
  },

  it: {
    navLabel: 'Catalogo auto',
    colon: ': ',
    hpUnit: 'CV',
    index: {
      title: (cars) => `Catalogo auto: ${cars} schede tecniche per marca`,
      description: (cars, makes) =>
        `${cars} auto di ${makes} marche: potenza, coppia, 0–100 km/h, velocità massima, peso e storia di ogni modello, con una foto accreditata.`,
      h1: (cars) => `Catalogo auto: ${cars} modelli e le loro schede tecniche`,
      lead: (cars, makes, from, to) =>
        `Ecco le ${cars} auto del catalogo di Garage Master TCG, ordinate per marca: ${makes} costruttori e modelli lanciati tra il ${from} e il ${to}. Ogni scheda riporta potenza, coppia, 0–100 km/h, velocità massima e peso del modello, ne racconta la storia e accredita la foto.`,
      makesHeading: 'Tutte le marche',
      iconicHeading: 'Modelli iconici',
    },
    make: {
      title: (make, count) =>
        count > 1 ? `${make}: ${count} modelli e schede tecniche` : `${make}: modello e scheda tecnica`,
      description: (make, count) =>
        count > 1
          ? `I ${count} modelli ${make} del catalogo di Garage Master TCG: potenza, velocità massima, 0–100 km/h, peso e storia di ogni auto.`
          : `Il modello ${make} del catalogo di Garage Master TCG: potenza, velocità massima, 0–100 km/h, peso e storia dell'auto.`,
      lead: (make, count, from, to) =>
        count > 1
          ? `Il catalogo comprende ${count} modelli ${make}, lanciati tra il ${from} e il ${to}.`
          : `Il catalogo comprende un modello ${make}, lanciato nel ${from}.`,
      mostPowerful: 'Modello più potente',
      fastest: 'Modello più veloce',
      listHeading: (make) => `Tutti i modelli ${make}`,
    },
    models: (count) => (count > 1 ? `${count} modelli` : '1 modello'),
    car: {
      titleLong: (name, years) => `${name} (${years}): scheda tecnica e storia`,
      titleShort: (name) => `${name}: scheda tecnica`,
      since: (year) => `dal ${year}`,
      accelSummary: (seconds) => `0–100 km/h in ${seconds} s`,
      specsHeading: 'Scheda tecnica',
      storyHeading: 'Storia',
      rarityHeading: 'Rarità',
      funFactHeading: 'Lo sapevi?',
      gameHeading: 'In Garage Master TCG',
      gameText: (name, total, number, cls, clsName) =>
        `${name} è una delle ${total} auto da collezione di Garage Master TCG, il gioco gratuito di carte collezionabili sulle auto per Android e iPhone. È la carta n. ${number} della collezione, in classe ${cls} (${clsName}).`,
      otherHeading: (make) => `Altri modelli ${make}`,
      allModels: (make) => `Tutti i modelli ${make}`,
    },
    specs: {
      production: 'Produzione',
      power: 'Potenza',
      torque: 'Coppia',
      accel: '0–100 km/h',
      topSpeed: 'Velocità massima',
      weight: 'Peso',
      engine: 'Motore',
      drivetrain: 'Trazione',
      transmission: 'Cambio',
      country: 'Paese',
      category: 'Categoria',
    },
    drivetrains: {
      FWD: 'Anteriore',
      RWD: 'Posteriore',
      AWD: 'Integrale',
      '4WD': 'Sulle quattro ruote',
    },
    transmissions: {
      manuelle: 'Manuale',
      automatique: 'Automatico',
      robotisée: 'Robotizzato',
      'rapport unique': 'A rapporto unico',
      CVT: 'CVT',
    },
    photo: {
      label: 'Foto',
      unknownAuthor: 'autore non indicato',
      via: 'via Wikimedia Commons',
      modified: 'Immagine ritagliata e ridimensionata.',
      publicDomain: 'pubblico dominio',
    },
    trademark:
      'Tutti i marchi citati appartengono ai rispettivi proprietari. Garage Master TCG è un gioco indipendente, non affiliato ai costruttori né da essi approvato.',
    removal: "Il titolare dei diritti che desidera la rimozione di un'immagine o di un contenuto può scrivere a",
  },
};
