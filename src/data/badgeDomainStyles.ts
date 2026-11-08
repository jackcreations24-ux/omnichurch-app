import { Language } from '../types';

export type BadgeDomainStyleId =
  | 'classic_pill'
  | 'ribbon_banner'
  | 'tag_code'
  | 'crest_shield'
  | 'gold_luxury';

export interface BadgeDomainStyleOption {
  id: BadgeDomainStyleId;
  name: Record<Language, string>;
  description: Record<Language, string>;
  icon: string;
}

export const BADGE_DOMAIN_STYLES: BadgeDomainStyleOption[] = [
  {
    id: 'classic_pill',
    name: {
      ht: 'Pil Klasik (Awondi Tradisyonèl)',
      fr: 'Pilule Classique (Arrondi Traditionnel)',
      en: 'Classic Pill (Rounded Traditional)',
      es: 'Píldora Clásica (Redondeado Tradicional)',
    },
    description: {
      ht: 'Badj awondi ak pwen separasyon klè, style pwòp epi fasil pou li.',
      fr: 'Badge arrondi avec séparateur épuré, style clair et net.',
      en: 'Clean rounded pill badge with bullet separator, crisp and readable.',
      es: 'Insignia redondeada con punto separador, diseño limpio y legible.',
    },
    icon: '🏷️',
  },
  {
    id: 'ribbon_banner',
    name: {
      ht: 'Riban Elegans (Banyè Wayal)',
      fr: 'Bannière Royale (Ruban Élégance)',
      en: 'Royal Banner (Ribbon Elegance)',
      es: 'Cinta Real (Estandarte Ejecutivo)',
    },
    description: {
      ht: 'Bannière orizontal ak etwal ak lèt majiskil pou gwo vizibilite.',
      fr: 'Bannière horizontale avec étoiles et lettres capitales élégantes.',
      en: 'Horizontal ribbon banner with stars and uppercase typography.',
      es: 'Estandarte horizontal con estrellas y tipografía en mayúsculas.',
    },
    icon: '✦',
  },
  {
    id: 'tag_code',
    name: {
      ht: 'Tikè Kòd Modèn (Monospace Tech)',
      fr: 'Tag Monospace Moderne (Format Code)',
      en: 'Modern Tech Tag (Monospace Code)',
      es: 'Etiqueta Técnica (Monospace Moderno)',
    },
    description: {
      ht: 'Format fiti ak kòd domèn, liy dwat ak tipografi monospace pou kontwòl.',
      fr: 'Format futuriste avec code domaine et police monospace haute précision.',
      en: 'Futuristic badge tag with department prefix and monospace precision.',
      es: 'Formato vanguardista con código de área y fuente monoespaciada.',
    },
    icon: '❯',
  },
  {
    id: 'crest_shield',
    name: {
      ht: 'Boukliye Sakre (Emblèm Ministè)',
      fr: 'Écusson Sacré (Emblème Ministère)',
      en: 'Sacred Crest (Ministry Shield)',
      es: 'Escudo Sagrado (Emblema Ministerial)',
    },
    description: {
      ht: 'Ensiny boukliye sakre ak ankadreman an lò pou otorite ak sèvis legliz.',
      fr: 'Écusson spirituel avec liseré doré pour une haute distinction ecclésiale.',
      en: 'Spiritual ministry crest with golden trim and formal church emblem.',
      es: 'Escudo ministerial con ribete dorado para distinción eclesiástica.',
    },
    icon: '🛡️',
  },
  {
    id: 'gold_luxury',
    name: {
      ht: 'Liksye Doré (Or Prestige & Étwal)',
      fr: 'Or Prestige (Luxe Métallique)',
      en: 'Prestige Gold (Luxury Metallic)',
      es: 'Oro Prestigio (Lujo Metálico)',
    },
    description: {
      ht: 'Gradyan metalik liksye ak de etwal pou manm donè ak lidèchip.',
      fr: 'Dégradé or luxueux avec étoiles pour membres d’honneur et responsables.',
      en: 'Shimmering metallic gold gradient with stars for honor members and leaders.',
      es: 'Degradado metálico dorado con estrellas para miembros de honor y líderes.',
    },
    icon: '★',
  },
];

export const BADGE_DOMAIN_STORAGE_KEY = 'omnichurch_badge_domain_style_v1';

export function getSavedBadgeDomainStyle(): BadgeDomainStyleId {
  try {
    const saved = localStorage.getItem(BADGE_DOMAIN_STORAGE_KEY);
    if (
      saved === 'classic_pill' ||
      saved === 'ribbon_banner' ||
      saved === 'tag_code' ||
      saved === 'crest_shield' ||
      saved === 'gold_luxury'
    ) {
      return saved as BadgeDomainStyleId;
    }
  } catch (err) {
    console.warn('Error reading badge domain style from storage', err);
  }
  return 'classic_pill';
}

export function saveBadgeDomainStyle(styleId: BadgeDomainStyleId): void {
  try {
    localStorage.setItem(BADGE_DOMAIN_STORAGE_KEY, styleId);
  } catch (err) {
    console.error('Error saving badge domain style', err);
  }
}

/**
 * Translations for labels used inside the domain badge rendering
 */
export const DOMAIN_LABEL_TRANSLATIONS = {
  general: {
    ht: 'Jeneral',
    fr: 'Général',
    en: 'General',
    es: 'General',
  },
  member: {
    ht: 'Manm',
    fr: 'Membre',
    en: 'Member',
    es: 'Miembro',
  },
  domain: {
    ht: 'DOMÈN',
    fr: 'DOMAINE',
    en: 'DOMAIN',
    es: 'DOMINIO',
  },
  dept: {
    ht: 'DEPT',
    fr: 'DÉPT',
    en: 'DEPT',
    es: 'DPTO',
  },
  ministry: {
    ht: 'Ministè Sakre',
    fr: 'Ministère Sacré',
    en: 'Sacred Ministry',
    es: 'Ministerio Sagrado',
  },
  prestige: {
    ht: 'PRESTIJ',
    fr: 'PRESTIGE',
    en: 'PRESTIGE',
    es: 'PRESTIGIO',
  },
  official: {
    ht: 'OFISYÈL',
    fr: 'OFFICIEL',
    en: 'OFFICIAL',
    es: 'OFICIAL',
  },
};
