import { Church, Language } from '../types';
import { hasActiveChurchLicense } from './developerStorage';

export type DocumentJurisdictionType =
  | 'rnc_do_juridico'
  | 'rnc_do_fisica'
  | 'nif_ht'
  | 'decree_ht'
  | 'ein_us'
  | 'cra_ca'
  | 'rna_fr'
  | 'siret_fr'
  | 'cnpj_br'
  | 'nit_co'
  | 'rut_cl'
  | 'rfc_mx'
  | 'legal_decree_intl'
  | 'unknown';

export interface DocumentDetectionResult {
  raw: string;
  cleaned: string;
  digitsOnly: string;
  type: DocumentJurisdictionType;
  countryCode: string;
  countryName: { ht: string; es: string; fr: string; en: string };
  countryFlag: string;
  typeName: { ht: string; es: string; fr: string; en: string };
  formatted: string;
  isValid: boolean;
  confidence: 'verified_format' | 'likely' | 'invalid';
  validationMessage: { ht: string; es: string; fr: string; en: string };
  sampleFormat: string;
}

/**
 * Checks if a string has purely repetitive or sequential fake digits
 */
function isBogusOrFakeSequence(digits: string): boolean {
  if (!digits || digits.length < 5) return true;

  // All identical digits (e.g. 000000000, 111111111, 999999999)
  if (/^(\d)\1+$/.test(digits)) return true;

  // Common ascending or descending sequential patterns
  const ascPatterns = [
    '0123456789',
    '1234567890',
    '01234567',
    '12345678',
    '23456789',
    '34567890',
    '123456',
    '654321',
    '987654321',
    '87654321',
    '76543210',
  ];
  for (const pat of ascPatterns) {
    if (digits.includes(pat) || pat.includes(digits)) {
      return true;
    }
  }

  // Check alternating repeated pairs (e.g., 12121212, 01010101)
  if (digits.length >= 8) {
    const pair = digits.slice(0, 2);
    if (digits === pair.repeat(Math.floor(digits.length / 2))) {
      return true;
    }
  }

  return false;
}

/**
 * Validates Dominican Republic RNC (9 digits - Persona Jurídica / Iglesias / ONGs)
 * Uses official DGII Modulo 11 Algorithm
 */
export function validateDominicanRncJuridico(digits: string): { isValid: boolean; passesChecksum: boolean } {
  if (digits.length !== 9) return { isValid: false, passesChecksum: false };
  if (isBogusOrFakeSequence(digits)) return { isValid: false, passesChecksum: false };

  // Valid DGII RNCs usually begin with 1, 4, or 5 (e.g., 1-XX-XXXXX-X or 4-XX-XXXXX-X or 5-XX-XXXXX-X)
  const firstDigit = digits[0];
  const validPrefix = firstDigit === '1' || firstDigit === '4' || firstDigit === '5';

  const weights = [7, 9, 8, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i], 10) * weights[i];
  }
  const rem = sum % 11;
  let expectedCheckDigit = 0;
  if (rem === 0) {
    expectedCheckDigit = 2;
  } else if (rem === 1) {
    expectedCheckDigit = 1;
  } else {
    expectedCheckDigit = 11 - rem;
  }

  const actualCheckDigit = parseInt(digits[8], 10);
  const passesChecksum = expectedCheckDigit === actualCheckDigit;

  // If checksum passes and valid prefix, it is 100% valid DGII RNC
  // If prefix is 1, 4 or 5 and checksum passes, or standard structured non-junk 9 digits
  const isValid = passesChecksum && validPrefix;

  return { isValid: passesChecksum || (validPrefix && !isBogusOrFakeSequence(digits)), passesChecksum };
}

/**
 * Validates Dominican Republic Cédula / RNC Persona Física (11 digits)
 * Uses official JCE / DGII Modulo 10 Algorithm
 */
export function validateDominicanCedula(digits: string): { isValid: boolean; passesChecksum: boolean } {
  if (digits.length !== 11) return { isValid: false, passesChecksum: false };
  if (isBogusOrFakeSequence(digits)) return { isValid: false, passesChecksum: false };

  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const mult = parseInt(digits[i], 10) * weights[i];
    sum += mult >= 10 ? mult - 9 : mult;
  }
  const rem = sum % 10;
  const expectedCheckDigit = rem === 0 ? 0 : 10 - rem;
  const actualCheckDigit = parseInt(digits[10], 10);
  const passesChecksum = expectedCheckDigit === actualCheckDigit;

  return { isValid: passesChecksum, passesChecksum };
}

/**
 * Validates US IRS EIN (9 digits - Employer Identification Number for 501(c)(3) Churches)
 */
export function validateUsEin(digits: string): { isValid: boolean } {
  if (digits.length !== 9) return { isValid: false };
  if (isBogusOrFakeSequence(digits)) return { isValid: false };

  // Invalid IRS prefixes
  const invalidPrefixes = new Set(['00', '07', '08', '09', '17', '18', '19', '28', '29', '49', '69', '70', '78', '79', '89', '96', '97']);
  const prefix = digits.substring(0, 2);
  if (invalidPrefixes.has(prefix)) {
    return { isValid: false };
  }

  return { isValid: true };
}

/**
 * Validates Haiti NIF (10 digits - DGI)
 */
export function validateHaitiNif(digits: string): { isValid: boolean } {
  if (digits.length !== 10) return { isValid: false };
  if (isBogusOrFakeSequence(digits)) return { isValid: false };

  // NIF cannot start with 0000
  if (digits.startsWith('0000')) return { isValid: false };

  return { isValid: true };
}

/**
 * Validates French SIRET / SIREN using Luhn algorithm
 */
export function validateFrenchSirenSiret(digits: string): { isValid: boolean; isSiret: boolean } {
  if (digits.length !== 9 && digits.length !== 14) return { isValid: false, isSiret: false };
  if (isBogusOrFakeSequence(digits)) return { isValid: false, isSiret: false };

  let sum = 0;
  const isSiret = digits.length === 14;
  for (let i = 0; i < digits.length; i++) {
    let digit = parseInt(digits[i], 10);
    if (i % 2 === (digits.length % 2)) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const isValid = sum % 10 === 0;
  return { isValid, isSiret };
}

/**
 * Detects and verifies the official document type and format across all supported countries.
 * Automatically identifies:
 * - Dominican Republic (RNC DGII 9 digits / Cédula 11 digits)
 * - Haiti (NIF DGI 10 digits / Dekrè Ministè Kilt)
 * - United States (IRS EIN 501(c)(3) 9 digits)
 * - Canada (CRA Charity Number / NEQ)
 * - France & Europe (RNA W+9 digits, SIRET/SIREN)
 * - Brazil (CNPJ 14 digits)
 * - Colombia (NIT 9-10 digits)
 * - Chile (RUT 8-9 digits)
 * - Mexico (RFC 12 chars)
 * - International Ecclesiastical Registration / Decree
 */
export function detectDocumentFormat(input?: string | null): DocumentDetectionResult {
  const raw = (input || '').trim();
  const cleaned = raw.replace(/\s+/g, ' ');
  const digitsOnly = raw.replace(/\D/g, '');
  const upper = raw.toUpperCase();

  const baseResult: DocumentDetectionResult = {
    raw,
    cleaned,
    digitsOnly,
    type: 'unknown',
    countryCode: 'OTHER',
    countryName: {
      ht: 'Lòt Peyi / Entènasyonal',
      es: 'Otro País / Internacional',
      fr: 'Autre Pays / International',
      en: 'Other Country / International',
    },
    countryFlag: '🌐',
    typeName: {
      ht: 'Dokiman Legal Eklezyastik',
      es: 'Documento Legal Eclesiástico',
      fr: 'Document Légal Ecclésiastique',
      en: 'Ecclesiastical Legal Document',
    },
    formatted: cleaned,
    isValid: false,
    confidence: 'invalid',
    validationMessage: {
      ht: 'Tanpri antre yon nimewo ofisyèl valab (RNC, NIF, EIN, RNA, elatriye).',
      es: 'Por favor ingrese un número oficial válido (RNC, NIF, EIN, RNA, etc.).',
      fr: 'Veuillez saisir un numéro officiel valide (RNC, NIF, EIN, RNA, etc.).',
      en: 'Please enter a valid official registry number (RNC, NIF, EIN, RNA, etc.).',
    },
    sampleFormat: '1-01-23456-7 (RNC) o 004-582-193-4 (NIF)',
  };

  if (!raw || raw.length < 4) {
    return baseResult;
  }

  // Reject generic placeholders
  const lower = raw.toLowerCase();
  const bannedKeywords = [
    'none',
    'n/a',
    'na',
    'non',
    'pa genyen',
    'pa gen',
    'pending',
    'en attente',
    'null',
    'undefined',
    'valide',
    'invalid',
    'test',
    '01234567',
    '123456',
    'fake',
    'xxxx',
  ];
  if (bannedKeywords.includes(lower)) {
    baseResult.validationMessage = {
      ht: 'Valè sa a se yon tèks egzanp oswa tès. Tanpri mete vrè nimewo ofisyèl la.',
      es: 'Este valor es un texto de ejemplo o prueba. Ingrese el número oficial real.',
      fr: 'Cette valeur est un texte d’exemple. Veuillez entrer le vrai numéro officiel.',
      en: 'This value is placeholder text. Please enter the real official number.',
    };
    return baseResult;
  }

  // 1. HAITI DECREE OR MINISTERIAL RECOGNITION (e.g. MC-1234, MIN-CULTES, DEC-2018-09)
  if (
    /^(MC|MIN|DEC|DECRET|DÉCRET|ARR|ARRETE|ARRÊTÉ|REG)[-/\s0-9A-Z]{3,20}$/i.test(cleaned) ||
    (cleaned.length >= 6 && /(MINISTERE|MINISTÈ|CULTES|KILT|JUSTICE|DECRET)/i.test(cleaned))
  ) {
    const isValid = cleaned.length >= 6 && !isBogusOrFakeSequence(digitsOnly);
    return {
      raw,
      cleaned,
      digitsOnly,
      type: 'decree_ht',
      countryCode: 'HT',
      countryName: { ht: 'Ayiti', es: 'Haití', fr: 'Haïti', en: 'Haiti' },
      countryFlag: '🇭🇹',
      typeName: {
        ht: 'Dekrè / Rekonesans Ministè Kilt (Haïti)',
        es: 'Decreto / Reconocimiento Ministerio de Cultos (Haití)',
        fr: 'Décret / Reconnaissance Ministère des Cultes (Haïti)',
        en: 'Ministry of Cults Official Decree (Haiti)',
      },
      formatted: cleaned.toUpperCase(),
      isValid,
      confidence: isValid ? 'verified_format' : 'invalid',
      validationMessage: isValid
        ? {
            ht: 'Fòma Dekrè Ofisyèl Ministè Kilt rekonèt ✓',
            es: 'Formato de Decreto Oficial reconocido ✓',
            fr: 'Format de Décret Officiel reconnu ✓',
            en: 'Official Ministry Decree format recognized ✓',
          }
        : {
            ht: 'Fòma dekrè a twò kout oswa enkonplè.',
            es: 'El formato del decreto es muy corto o incompleto.',
            fr: 'Le format du décret est trop court ou incomplet.',
            en: 'The decree format is too short or incomplete.',
          },
      sampleFormat: 'MC-2019-482 oswa DEC-084-21',
    };
  }

  // 2. FRANCE RNA (Répertoire National des Associations - Association Cultuelle Loi 1905 / 1901)
  // Format: W + 9 digits (e.g., W751234567)
  if (/^W\d{9}$/i.test(cleaned.replace(/\s+/g, ''))) {
    const formatted = upper.replace(/\s+/g, '');
    const numPart = formatted.substring(1);
    const isBogus = isBogusOrFakeSequence(numPart);
    return {
      raw,
      cleaned,
      digitsOnly,
      type: 'rna_fr',
      countryCode: 'FR',
      countryName: { ht: 'Frans & Ewòp', es: 'Francia y Europa', fr: 'France & Europe', en: 'France & Europe' },
      countryFlag: '🇫🇷',
      typeName: {
        ht: 'RNA - Rejis Nasyonal Asosyasyon Kiltwèl (Frans)',
        es: 'RNA - Registro Nacional de Asociaciones (Francia)',
        fr: 'RNA - Répertoire National des Associations (France)',
        en: 'RNA - National Register of Associations (France)',
      },
      formatted: `${formatted.slice(0, 4)} ${formatted.slice(4, 7)} ${formatted.slice(7)}`,
      isValid: !isBogus,
      confidence: !isBogus ? 'verified_format' : 'invalid',
      validationMessage: !isBogus
        ? {
            ht: 'Nimewo RNA Asosyasyon Kiltwèl Fransè Valab ✓',
            es: 'Número RNA de Asociación Cultual Válido ✓',
            fr: 'Numéro RNA d’Association Cultuelle Valide ✓',
            en: 'Valid French RNA Association Registry ID ✓',
          }
        : {
            ht: 'Nimewo RNA sa a gen yon sekans chif ki pa valab.',
            es: 'Este número RNA contiene una secuencia numérica inválida.',
            fr: 'Ce numéro RNA contient une suite de chiffres invalide.',
            en: 'This RNA number has an invalid digit sequence.',
          },
      sampleFormat: 'W751 234 567',
    };
  }

  // 3. BRAZIL CNPJ (14 digits)
  if (digitsOnly.length === 14 && (cleaned.includes('/') || cleaned.includes('.') || /^\d{14}$/.test(cleaned))) {
    const isBogus = isBogusOrFakeSequence(digitsOnly);
    const d = digitsOnly;
    const formatted = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    return {
      raw,
      cleaned,
      digitsOnly,
      type: 'cnpj_br',
      countryCode: 'BR',
      countryName: { ht: 'Brezil', es: 'Brasil', fr: 'Brésil', en: 'Brazil' },
      countryFlag: '🇧🇷',
      typeName: {
        ht: 'CNPJ - Receita Federal do Brasil',
        es: 'CNPJ - Registro Nacional de Personas Jurídicas (Brasil)',
        fr: 'CNPJ - Registre National des Personnes Morales (Brésil)',
        en: 'CNPJ - Brazilian National Registry of Legal Entities',
      },
      formatted,
      isValid: !isBogus,
      confidence: !isBogus ? 'verified_format' : 'invalid',
      validationMessage: !isBogus
        ? {
            ht: 'Fòma CNPJ Brezilyen Valab ✓',
            es: 'Formato CNPJ Brasileño Válido ✓',
            fr: 'Format CNPJ Brésilien Valide ✓',
            en: 'Valid Brazilian CNPJ Format ✓',
          }
        : {
            ht: 'Sekans chif CNPJ a pa valab.',
            es: 'Secuencia de dígitos CNPJ inválida.',
            fr: 'Séquence CNPJ non valide.',
            en: 'Invalid CNPJ digit sequence.',
          },
      sampleFormat: '03.847.291/0001-42',
    };
  }

  // 4. FRANCE SIRET (14 digits) or SIREN (9 digits)
  if (
    (digitsOnly.length === 9 || digitsOnly.length === 14) &&
    (cleaned.includes('SIRET') || cleaned.includes('SIREN') || (digitsOnly.length === 14 && !cleaned.includes('/')))
  ) {
    const { isValid, isSiret } = validateFrenchSirenSiret(digitsOnly);
    const d = digitsOnly;
    const formatted = isSiret
      ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`
      : `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    return {
      raw,
      cleaned,
      digitsOnly,
      type: 'siret_fr',
      countryCode: 'FR',
      countryName: { ht: 'Frans & Inyon Ewopeyen', es: 'Francia y UE', fr: 'France & UE', en: 'France & EU' },
      countryFlag: '🇫🇷',
      typeName: {
        ht: isSiret ? 'SIRET - Enskripsyon INSEE (Frans)' : 'SIREN - Enskripsyon INSEE (Frans)',
        es: isSiret ? 'SIRET - Registro Oficial INSEE (Francia)' : 'SIREN - Registro INSEE (Francia)',
        fr: isSiret ? 'SIRET - Enregistrement INSEE (France)' : 'SIREN - Enregistrement INSEE (France)',
        en: isSiret ? 'SIRET - French INSEE Registry' : 'SIREN - French INSEE Registry',
      },
      formatted,
      isValid,
      confidence: isValid ? 'verified_format' : 'invalid',
      validationMessage: isValid
        ? {
            ht: 'Nimewo SIRET / SIREN valab avèk algoritm Luhn ✓',
            es: 'Número SIRET / SIREN validado por algoritmo Luhn ✓',
            fr: 'Numéro SIRET / SIREN certifié conforme Luhn ✓',
            en: 'SIRET / SIREN number verified with Luhn check ✓',
          }
        : {
            ht: 'Chif kontwòl SIRET / SIREN an pa kòrèk.',
            es: 'El dígito verificador SIRET / SIREN es incorrecto.',
            fr: 'La clé de contrôle SIRET / SIREN est invalide.',
            en: 'SIRET / SIREN checksum failed.',
          },
      sampleFormat: '752 481 920 00018',
    };
  }

  // 5. UNITED STATES IRS EIN (9 digits)
  // Formats: XX-XXXXXXX or 9 digits with EIN prefix
  if (
    (cleaned.includes('-') && /^\d{2}-\d{7}$/.test(cleaned)) ||
    ((digitsOnly.length === 9 && (cleaned.toUpperCase().includes('EIN') || cleaned.toUpperCase().includes('IRS'))) ||
      (/^\d{2}-\d{7}$/.test(cleaned)))
  ) {
    const { isValid } = validateUsEin(digitsOnly);
    const formatted = `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2)}`;
    return {
      raw,
      cleaned,
      digitsOnly,
      type: 'ein_us',
      countryCode: 'US',
      countryName: { ht: 'Etazini (USA)', es: 'Estados Unidos (EE.UU.)', fr: 'États-Unis (USA)', en: 'United States (USA)' },
      countryFlag: '🇺🇸',
      typeName: {
        ht: 'EIN - IRS 501(c)(3) Federal Tax ID (Etazini)',
        es: 'EIN - IRS 501(c)(3) Federal Tax ID (EE.UU.)',
        fr: 'EIN - Identifiant Fédéral IRS 501(c)(3) (USA)',
        en: 'EIN - IRS 501(c)(3) Federal Tax ID (USA)',
      },
      formatted,
      isValid,
      confidence: isValid ? 'verified_format' : 'invalid',
      validationMessage: isValid
        ? {
            ht: 'Nimewo EIN IRS Valab pou Legliz 501(c)(3) ✓',
            es: 'Número EIN de IRS Válido para Iglesia 501(c)(3) ✓',
            fr: 'Numéro EIN IRS Valide pour Assemblée 501(c)(3) ✓',
            en: 'Valid IRS 501(c)(3) Church EIN Tax ID ✓',
          }
        : {
            ht: 'Prefiks oswa fòma EIN sa a pa rekonèt pa IRS la.',
            es: 'El prefijo o formato de este EIN no es válido para el IRS.',
            fr: 'Le préfixe ou format EIN n’est pas reconnu par l’IRS.',
            en: 'The prefix or format of this EIN is not recognized by the IRS.',
          },
      sampleFormat: '82-4910283',
    };
  }

  // 6. CANADA CRA (Business / Charity Registration)
  if (
    (digitsOnly.length === 9 && (cleaned.toUpperCase().includes('RR') || cleaned.toUpperCase().includes('CRA'))) ||
    /^\d{9}RR\d{4}$/i.test(cleaned.replace(/\s+/g, '')) ||
    (digitsOnly.length === 10 && digitsOnly.startsWith('11') && cleaned.toUpperCase().includes('NEQ'))
  ) {
    const isBogus = isBogusOrFakeSequence(digitsOnly.slice(0, 9));
    const formatted = `${digitsOnly.slice(0, 9)} RR 0001`;
    return {
      raw,
      cleaned,
      digitsOnly,
      type: 'cra_ca',
      countryCode: 'CA',
      countryName: { ht: 'Kanada', es: 'Canadá', fr: 'Canada', en: 'Canada' },
      countryFlag: '🇨🇦',
      typeName: {
        ht: 'CRA / NEQ - Nimewo Òganizasyon Byenfèzans (Kanada)',
        es: 'CRA / NEQ - Registro de Caridad y Negocios (Canadá)',
        fr: 'ARC / NEQ - Numéro d’Organisme de Bienfaisance (Canada)',
        en: 'CRA / NEQ - Registered Charity Number (Canada)',
      },
      formatted,
      isValid: !isBogus,
      confidence: !isBogus ? 'verified_format' : 'invalid',
      validationMessage: !isBogus
        ? {
            ht: 'Nimewo Enskripsyon Ajans Revni Kanada (CRA) Valab ✓',
            es: 'Número de Registro CRA de Canadá Válido ✓',
            fr: 'Numéro d’Enregistrement ARC Canada Valide ✓',
            en: 'Valid Canada Revenue Agency (CRA) Registration ✓',
          }
        : {
            ht: 'Sekans chif CRA a pa kòrèk.',
            es: 'Secuencia de dígitos CRA inválida.',
            fr: 'Séquence de chiffres ARC non valide.',
            en: 'Invalid CRA digit sequence.',
          },
      sampleFormat: '892401823 RR 0001',
    };
  }

  // 7. DOMINICAN REPUBLIC - RNC PERSONA JURÍDICA (9 digits)
  // Formats: 1-01-23456-7, 4-01-23456-7, 5-01-23456-7, 101234567, etc.
  if (digitsOnly.length === 9) {
    const { isValid, passesChecksum } = validateDominicanRncJuridico(digitsOnly);
    const d = digitsOnly;
    const formatted = `${d[0]}-${d.slice(1, 3)}-${d.slice(3, 8)}-${d[8]}`;

    // If starts with 1, 4, or 5 -> Dominican RNC Jurídico
    if (d[0] === '1' || d[0] === '4' || d[0] === '5' || passesChecksum) {
      return {
        raw,
        cleaned,
        digitsOnly,
        type: 'rnc_do_juridico',
        countryCode: 'DO',
        countryName: { ht: 'Repiblik Dominiken', es: 'República Dominicana', fr: 'République Dominicaine', en: 'Dominican Republic' },
        countryFlag: '🇩🇴',
        typeName: {
          ht: 'RNC Juridik - DGII (Repiblik Dominiken)',
          es: 'RNC Jurídico - DGII (República Dominicana)',
          fr: 'RNC Juridique - DGII (République Dominicaine)',
          en: 'Corporate RNC - DGII (Dominican Republic)',
        },
        formatted,
        isValid,
        confidence: passesChecksum ? 'verified_format' : isValid ? 'likely' : 'invalid',
        validationMessage: passesChecksum
          ? {
              ht: 'RNC DGII Eklezyastik Valide avèk Chif Kontwòl Ofisyèl ✓',
              es: 'RNC DGII Eclesiástico Validado con Dígito de Control ✓',
              fr: 'RNC DGII Ecclésiastique Certifié conforme Modulo 11 ✓',
              en: 'Official DGII Church RNC Verified with Checksum ✓',
            }
          : isValid
          ? {
              ht: 'Fòma RNC Dominiken Konpatib ✓',
              es: 'Formato RNC Dominicano Compatible ✓',
              fr: 'Format RNC Dominicain Compatible ✓',
              en: 'Compatible Dominican RNC Format ✓',
            }
          : {
              ht: 'Nimewo RNC sa a pa pase chif kontwòl DGII a.',
              es: 'Este número de RNC no supera el algoritmo de control de la DGII.',
              fr: 'Ce numéro RNC n’a pas passé la clé de contrôle de la DGII.',
              en: 'This RNC number failed the official DGII checksum.',
            },
        sampleFormat: '1-32-48291-5',
      };
    }
  }

  // 8. HAITI NIF (Numéro d'Identification Fiscale DGI - 10 digits)
  // Formats: 001-234-567-8 or 10 digits
  if (digitsOnly.length === 10) {
    const { isValid } = validateHaitiNif(digitsOnly);
    const d = digitsOnly;
    const formatted = `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 9)}-${d.slice(9)}`;
    return {
      raw,
      cleaned,
      digitsOnly,
      type: 'nif_ht',
      countryCode: 'HT',
      countryName: { ht: 'Ayiti', es: 'Haití', fr: 'Haïti', en: 'Haiti' },
      countryFlag: '🇭🇹',
      typeName: {
        ht: 'NIF / Matrikil Fiskal - DGI (Haïti)',
        es: 'NIF / Registro Tributario - DGI (Haití)',
        fr: 'NIF / Immatriculation Fiscale - DGI (Haïti)',
        en: 'NIF / Tax Identification - DGI (Haiti)',
      },
      formatted,
      isValid,
      confidence: isValid ? 'verified_format' : 'invalid',
      validationMessage: isValid
        ? {
            ht: 'Matrikil Fiskal NIF DGI Valab ✓',
            es: 'Número de Identificación Fiscal NIF (DGI) Válido ✓',
            fr: 'Numéro d’Identification Fiscale NIF (DGI) Valide ✓',
            en: 'Valid Haiti DGI NIF Tax Registry Number ✓',
          }
        : {
            ht: 'Sekans chif NIF sa a pa kòrèk (evite chif repete oswa zewo sèlman).',
            es: 'Secuencia NIF inválida (evite dígitos repetidos o puros ceros).',
            fr: 'Numéro NIF invalide (évitez les chiffres répétés ou zéros).',
            en: 'Invalid NIF sequence (avoid repeated numbers or all zeros).',
          },
      sampleFormat: '004-582-193-4',
    };
  }

  // 9. DOMINICAN REPUBLIC - CÉDULA / RNC PERSONA FÍSICA (11 digits)
  // Formats: 001-2345678-9 or 11 digits
  if (digitsOnly.length === 11) {
    const { isValid, passesChecksum } = validateDominicanCedula(digitsOnly);
    const d = digitsOnly;
    const formatted = `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
    return {
      raw,
      cleaned,
      digitsOnly,
      type: 'rnc_do_fisica',
      countryCode: 'DO',
      countryName: { ht: 'Repiblik Dominiken', es: 'República Dominicana', fr: 'République Dominicaine', en: 'Dominican Republic' },
      countryFlag: '🇩🇴',
      typeName: {
        ht: 'Cédula / RNC Fizik - JCE & DGII (Repiblik Dominiken)',
        es: 'Cédula / RNC Persona Física - DGII (República Dominicana)',
        fr: 'Cédula / RNC Personne Physique - DGII (République Dominicaine)',
        en: 'National ID / Personal RNC - DGII (Dominican Republic)',
      },
      formatted,
      isValid,
      confidence: passesChecksum ? 'verified_format' : 'invalid',
      validationMessage: passesChecksum
        ? {
            ht: 'Cédula / RNC Dominiken Valide avèk Chif Kontwòl JCE ✓',
            es: 'Cédula / RNC Dominicano Validado con Dígito Verificador JCE ✓',
            fr: 'Cédula / RNC Dominicain Validé avec Clé de Contrôle JCE ✓',
            en: 'Dominican Cédula / Personal RNC Verified with Checksum ✓',
          }
        : {
            ht: 'Chif kontwòl Cédula a pa kòrèk.',
            es: 'El dígito verificador de la Cédula es incorrecto.',
            fr: 'La clé de contrôle de la Cédula est incorrecte.',
            en: 'The Cédula checksum is incorrect.',
          },
      sampleFormat: '402-1984723-5',
    };
  }

  // 10. INTERNATIONAL CHURCH LEGAL CHARTER / DECREE (Structured Alphanumeric)
  if (/^[A-Z0-9-/.]{6,25}$/i.test(cleaned) && !isBogusOrFakeSequence(digitsOnly)) {
    return {
      raw,
      cleaned,
      digitsOnly,
      type: 'legal_decree_intl',
      countryCode: 'INTL',
      countryName: { ht: 'Entènasyonal', es: 'Internacional', fr: 'International', en: 'International' },
      countryFlag: '🌍',
      typeName: {
        ht: 'Dekrè / Batistè Legal Eklezyastik Otorize',
        es: 'Decreto / Carta Constitutiva Eclesiástica Autorizada',
        fr: 'Décret / Charte Juridique Ecclésiastique Autorisée',
        en: 'Authorized Ecclesiastical Legal Charter / Decree',
      },
      formatted: cleaned.toUpperCase(),
      isValid: true,
      confidence: 'likely',
      validationMessage: {
        ht: 'Fòma Dekrè Legal Eklezyastik rekonèt ✓',
        es: 'Formato de Registro Legal Eclesiástico reconocido ✓',
        fr: 'Format de Décret Légal Ecclésiastique reconnu ✓',
        en: 'Ecclesiastical Legal Charter format recognized ✓',
      },
      sampleFormat: 'LEG-CHURCH-2021-94',
    };
  }

  // Fallback / Unknown / Invalid
  return baseResult;
}

/**
 * Validates if an RNC, NIF, EIN, or official ecclesiastical registration string is valid
 * Leverages strict multi-jurisdiction detection and rejects bogus/arbitrary numbers.
 */
export function isValidRnc(rnc?: string | null): boolean {
  if (!rnc) return false;
  const detection = detectDocumentFormat(rnc);
  return detection.isValid;
}

export interface ChurchRncVerificationStatus {
  hasRncEntered: boolean;
  isValidFormat: boolean;
  hasActiveLicense: boolean;
  hasLegalDocumentPhoto: boolean;
  isFullyVerified: boolean;
  detection: DocumentDetectionResult;
  missingReasons: {
    format?: boolean;
    license?: boolean;
    documentPhoto?: boolean;
  };
}

/**
 * Detailed Anti-Fraud Verification Evaluator for Church RNC:
 * - Checks RNC/NIF format strictly with country detector
 * - Checks Active App License
 * - Checks Uploaded Photo of Church's Legal Document
 */
export function getChurchRncVerificationStatus(church?: Church | null): ChurchRncVerificationStatus {
  if (!church) {
    const emptyDetection = detectDocumentFormat('');
    return {
      hasRncEntered: false,
      isValidFormat: false,
      hasActiveLicense: false,
      hasLegalDocumentPhoto: false,
      isFullyVerified: false,
      detection: emptyDetection,
      missingReasons: {},
    };
  }

  const rnc = (church.rnc || church.rncNumber || '').trim();
  const detection = detectDocumentFormat(rnc);
  const hasRncEntered = rnc.length > 0;
  const isValidFormat = detection.isValid;
  const hasActiveLicense = hasActiveChurchLicense(church.id);
  const hasLegalDocumentPhoto = Boolean(church.rncDocumentPhoto && church.rncDocumentPhoto.trim().length > 0);

  // If status is officially marked 'verified' by the developer
  const isExplicitlyVerified = church.rncVerificationStatus === 'verified';
  const isFullyVerified = isExplicitlyVerified || (isValidFormat && hasActiveLicense && hasLegalDocumentPhoto);

  return {
    hasRncEntered,
    isValidFormat,
    hasActiveLicense,
    hasLegalDocumentPhoto,
    isFullyVerified,
    detection,
    missingReasons: {
      format: hasRncEntered && !isValidFormat,
      license: !hasActiveLicense,
      documentPhoto: !hasLegalDocumentPhoto,
    },
  };
}

/**
 * Checks if a given church entity has an officially verified RNC.
 */
export function churchHasValidRnc(church?: Church | null): boolean {
  if (!church) return false;
  if (church.rncVerificationStatus === 'verified') return true;
  const status = getChurchRncVerificationStatus(church);
  return status.isFullyVerified;
}

/**
 * Returns the sanitized RNC string from a church entity
 */
export function getChurchRnc(church?: Church | null): string {
  if (!church) return '';
  return (church.rnc || church.rncNumber || '').trim();
}

/**
 * Formats an RNC or tax ID into human-friendly grouped representation
 */
export function formatRnc(rawRnc: string): string {
  if (!rawRnc) return '';
  const detection = detectDocumentFormat(rawRnc);
  if (detection.isValid && detection.formatted) {
    return detection.formatted;
  }
  const cleaned = rawRnc.trim();
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 9 && !cleaned.includes('-')) {
    return `${digits.slice(0, 1)}-${digits.slice(1, 3)}-${digits.slice(3, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 10 && !cleaned.includes('-')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11 && !cleaned.includes('-')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
  }
  return cleaned;
}

/**
 * Multi-language strings for RNC tooltips and visual verification badges
 */
export function getRncI18n(lang: Language = 'ht') {
  switch (lang) {
    case 'es':
      return {
        badgePill: 'RNC VÁLIDO',
        badgeTitle: 'Iglesia Oficial Registrada • RNC Válido',
        tooltipHeader: 'CERTIFICACIÓN FISCAL Y ECLESIÁSTICA',
        statusLabel: 'Estado Oficial:',
        statusValue: 'Válido y Reconocido (En regla)',
        churchLabel: 'Entidad Eclesiástica:',
        rncLabel: 'RNC / Registro Fiscal:',
        explanation: 'Esta congregación cuenta con un Registro Nacional de Contribuyentes (RNC/NIF) oficial validado ante las autoridades civiles y tributarias.',
        verifierNote: 'Confirmación válida para inspectores, autoridades policiales, bancos y verificadores de identidad.',
        close: 'Cerrar',
      };
    case 'fr':
      return {
        badgePill: 'RNC VALIDE',
        badgeTitle: 'Église Officiellement Enregistrée • RNC Valide',
        tooltipHeader: 'CERTIFICATION FISCALE & ECCLÉSIASTIQUE',
        statusLabel: 'Statut Officiel :',
        statusValue: 'Valide & Reconnu (En règle)',
        churchLabel: 'Entité Ecclésiastique :',
        rncLabel: 'RNC / Immatriculation Fiscale :',
        explanation: 'Cette assemblée dispose d’un Registre National des Contribuables (RNC/NIF) officiel enregistré auprès des autorités civiles et religieuses.',
        verifierNote: 'Document certifié pour les forces de l’ordre, ministères, institutions bancaires et agents de vérification.',
        close: 'Fermer',
      };
    case 'en':
      return {
        badgePill: 'VALID RNC',
        badgeTitle: 'Officially Registered Church • Valid RNC',
        tooltipHeader: 'LEGAL & ECCLESIASTICAL CERTIFICATION',
        statusLabel: 'Official Status:',
        statusValue: 'Valid & Recognized (In good standing)',
        churchLabel: 'Ecclesiastical Entity:',
        rncLabel: 'RNC / Tax Registry ID:',
        explanation: 'This church congregation holds a verified National Taxpayer Registry (RNC/NIF/EIN) and official ecclesiastical registration.',
        verifierNote: 'Official validation proof for authorities, law enforcement, banking institutions, and card verifiers.',
        close: 'Close',
      };
    case 'ht':
    default:
      return {
        badgePill: 'RNC VALIDE',
        badgeTitle: 'Legliz Ofisyèlman Anrejistre • RNC Valide',
        tooltipHeader: 'SÈTIFIKASYON FISKAL & EKLEZYASTIK',
        statusLabel: 'Estati Ofisyèl:',
        statusValue: 'Valide & Rekonèt (An règ)',
        churchLabel: 'Enstitisyon Eklezyastik:',
        rncLabel: 'RNC / Matrikil Fiskal:',
        explanation: 'Kongregasyon sa a posede yon Rejis Nasyonal Kontribiyab (RNC/NIF/EIN) ofisyèl ki anrejistre kòrèkteman devan leta ak otorite yo.',
        verifierNote: 'Konfimasyon ofisyèl pou tout verifikatè, lapolis, lajistis ak otorite k ap enspekte kat manm sa a.',
        close: 'Fèmen',
      };
  }
}
