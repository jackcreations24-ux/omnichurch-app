import { Member } from '../types';

export type MemberImportStrategy = 'migrate' | 'update' | 'skipDuplicates' | 'append';

export interface ParsedMigrationMember extends Partial<Member> {
  sourceChurchId?: string;
}

export interface ParseMembersResult {
  members: ParsedMigrationMember[];
  errors: string[];
  format: 'json' | 'csv' | 'empty';
}

export interface MigrationPreviewAnalysis {
  totalRows: number;
  withExistingMemberIdCount: number;
  autoGenerateIdCount: number;
  matchingExistingInTargetCount: number;
  duplicateMemberIdsInFile: string[];
  crossChurchSourceIds: string[];
}

export const MEMBER_MIGRATION_CSV_HEADERS = [
  'MemberID',
  'FullName',
  'TitlePrefix',
  'Gender',
  'CivilStatus',
  'Profession',
  'DateOfBirth',
  'BaptismDate',
  'Phone',
  'EmergencyContact',
  'EmergencyContactName',
  'Email',
  'GoogleEmail',
  'Address',
  'City',
  'Zone',
  'Department',
  'Role',
  'MemberType',
  'CellGroup',
  'JoinedDate',
  'Status',
  'LegalDocumentType',
  'LegalDocumentNumber',
  'PIN',
  'SecurityPin',
  'Notes',
  'SourceChurchID',
  'DocID',
  'BarcodeToken',
  'AvatarUrl',
] as const;

/**
 * Normalizes a header or JSON key to ASCII lowercase alphanumeric for reliable alias matching.
 */
export function normalizeMigrationHeaderKey(key: string): string {
  return String(key || '')
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Safely normalizes gender strings across HT/FR/ES/EN without mistaking "female"/"femenino"/"femme" for "male".
 */
export function normalizeGenderValue(raw: unknown): 'male' | 'female' | undefined {
  const clean = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!clean) return undefined;

  // Check female indicators FIRST (because "female", "femme", "femenino", "mujer", "fanm" all contain "m")
  if (
    clean === 'f' ||
    clean === 'fi' ||
    clean === 'female' ||
    clean === 'femme' ||
    clean === 'feminin' ||
    clean === 'feminine' ||
    clean === 'femenino' ||
    clean === 'femenina' ||
    clean === 'mujer' ||
    clean === 'fanm' ||
    clean.startsWith('fem') ||
    clean.startsWith('muj') ||
    clean.startsWith('fil')
  ) {
    return 'female';
  }

  if (
    clean === 'm' ||
    clean === 'h' ||
    clean === 'g' ||
    clean === 'male' ||
    clean === 'homme' ||
    clean === 'hombre' ||
    clean === 'masculin' ||
    clean === 'masculino' ||
    clean === 'masculina' ||
    clean === 'gason' ||
    clean === 'garcon' ||
    clean.startsWith('masc') ||
    clean.startsWith('hom') ||
    clean.startsWith('gas')
  ) {
    return 'male';
  }

  return undefined;
}

export function normalizeCivilStatusValue(
  raw: unknown
): 'celibataire' | 'marie' | 'veuf' | 'divorce' | undefined {
  const clean = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!clean) return undefined;

  if (clean.includes('mar') || clean.includes('cas')) return 'marie';
  if (clean.includes('veu') || clean.includes('viu') || clean.includes('wid')) return 'veuf';
  if (clean.includes('div')) return 'divorce';
  if (
    clean.includes('cel') ||
    clean.includes('sel') ||
    clean.includes('sol') ||
    clean.includes('sing')
  ) {
    return 'celibataire';
  }
  return undefined;
}

export function normalizeLegalDocTypeValue(
  raw: unknown
): 'cin' | 'nif' | 'passeport' | 'autre' | undefined {
  const clean = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!clean) return undefined;

  if (clean.includes('nif') || clean.includes('rnc')) return 'nif';
  if (clean.includes('pass') || clean.includes('pasip')) return 'passeport';
  if (clean.includes('cin') || clean.includes('ced') || clean.includes('kat') || clean.includes('id')) {
    return 'cin';
  }
  return 'autre';
}

export function normalizeMemberStatusValue(raw: unknown): 'active' | 'inactive' {
  const clean = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (
    clean === 'inactive' ||
    clean === 'inaktif' ||
    clean === 'inactivo' ||
    clean === 'inactiva' ||
    clean === 'inactif' ||
    clean === 'inaktive' ||
    clean === 'disabled' ||
    clean === 'false'
  ) {
    return 'inactive';
  }
  return 'active';
}

export function normalizeMemberTypeValue(raw: unknown): 'member' | 'visitor' {
  const clean = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (
    clean === 'visitor' ||
    clean === 'vizite' ||
    clean === 'visitante' ||
    clean === 'visiteur' ||
    clean === 'guest'
  ) {
    return 'visitor';
  }
  return 'member';
}

/**
 * Escapes a value according to RFC 4180 CSV rules (doubling internal double quotes).
 */
export function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports a church's member roster into a lossless, UTF-8 BOM RFC-4180 CSV suitable for
 * Excel inspection and zero-data-loss migration into another church while preserving unique MemberIDs.
 */
export function exportMembersToMigrationCsv(
  members: Member[],
  sourceChurchId?: string
): string {
  const rows = members.map((m) => {
    // Only include short HTTP(S) avatar URLs in CSV so Excel never chokes on 150KB base64 blobs
    const safeCsvAvatar =
      typeof m.avatarUrl === 'string' &&
      /^https?:\/\//i.test(m.avatarUrl.trim()) &&
      m.avatarUrl.trim().length <= 500
        ? m.avatarUrl.trim()
        : '';

    const cells: unknown[] = [
      m.memberId || '',
      m.fullName || '',
      m.titlePrefix || '',
      m.gender || '',
      m.civilStatus || '',
      m.profession || '',
      m.dateOfBirth || '',
      m.baptismDate || '',
      m.phone || '',
      m.emergencyContact || '',
      m.emergencyContactName || '',
      m.email || '',
      m.googleEmail || '',
      m.address || '',
      m.city || '',
      m.zone || '',
      m.department || '',
      m.role || '',
      m.memberType || 'member',
      m.cellGroup || '',
      m.joinedDate || '',
      m.status || 'active',
      m.legalDocumentType || '',
      m.legalDocumentNumber || '',
      m.pin || '',
      m.securityPin || '',
      m.notes || '',
      m.churchId || sourceChurchId || '',
      m.id || '',
      m.barcodeToken || '',
      safeCsvAvatar,
    ];
    return cells.map(escapeCsvCell).join(',');
  });

  // UTF-8 BOM ensures Excel preserves Creole/French/Spanish accents cleanly
  return `\uFEFF${[MEMBER_MIGRATION_CSV_HEADERS.join(','), ...rows].join('\r\n')}`;
}

/**
 * Detects CSV delimiter from the first logical row while ignoring quoted segments.
 */
function detectCsvDelimiter(text: string): string {
  let inQuotes = false;
  let firstLine = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      break;
    }
    firstLine += ch;
  }

  const countOutsideQuotes = (delim: string): number => {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < firstLine.length; i++) {
      const c = firstLine[i];
      if (c === '"') quoted = !quoted;
      else if (c === delim && !quoted) count++;
    }
    return count;
  };

  const candidates: Array<{ delim: string; count: number }> = [
    { delim: ',', count: countOutsideQuotes(',') },
    { delim: ';', count: countOutsideQuotes(';') },
    { delim: '\t', count: countOutsideQuotes('\t') },
    { delim: '|', count: countOutsideQuotes('|') },
  ];
  candidates.sort((a, b) => b.count - a.count);
  return candidates[0].count > 0 ? candidates[0].delim : ',';
}

/**
 * RFC-4180 compliant CSV parser:
 * - Handles doubled quotes `""` inside quoted cells
 * - Handles multi-line quoted cells (e.g., notes containing line breaks)
 * - NEVER treats apostrophes `'` (e.g. `Jean-Pierre d'Or`, `L'Église`) as quote delimiters
 */
export function parseCsvMatrix(rawText: string, delimiter?: string): string[][] {
  const cleanText = String(rawText || '').replace(/^\uFEFF/, '');
  if (!cleanText.trim()) return [];

  const delim = delimiter || detectCsvDelimiter(cleanText);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"' && currentField.length === 0) {
      inQuotes = true;
    } else if (ch === delim) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (ch === '\r' && next === '\n') {
      currentRow.push(currentField.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      currentRow.push(currentField.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

const HEADER_ALIASES = {
  memberId: [
    'memberid',
    'idmanm',
    'idmiembro',
    'idmembre',
    'nimewomanm',
    'numeromiembro',
    'numeromembre',
    'matricula',
    'membercode',
    'kodmanm',
    'codemembre',
    'codigomiembro',
    'uniqueid',
    'idinik',
    'idunico',
  ],
  docId: ['docid', 'documentid', 'firestoreid', 'internalid', 'recordid'],
  sourceChurchId: ['sourcechurchid', 'churchid', 'idlegliz', 'iglesiaid', 'originchurchid'],
  fullName: [
    'fullname',
    'nonkonple',
    'nombrecompleto',
    'nomcomplet',
    'non',
    'nom',
    'name',
    'nombre',
    'nonmanm',
    'nombremiembro',
  ],
  titlePrefix: ['titleprefix', 'tit', 'titre', 'titulo', 'prefix', 'prefiks'],
  gender: ['gender', 'seks', 'sexe', 'sexo', 'genero', 'sex', 'seksgasonfi', 'sexomasculinofemenino'],
  civilStatus: ['civilstatus', 'etasivil', 'statutcivil', 'etatcivil', 'estadocivil', 'sivil'],
  profession: ['profession', 'pwofesyon', 'metier', 'profesion', 'okipasyon', 'ocupacion'],
  dateOfBirth: [
    'dateofbirth',
    'datnesans',
    'fechanacimiento',
    'datenaissance',
    'dob',
    'datnesansaaaammjj',
    'fechanacimientoaaaammdd',
  ],
  baptismDate: ['baptismdate', 'datbatem', 'fechabautismo', 'datebapteme', 'batem', 'bautismo'],
  phone: ['phone', 'telefon', 'telephone', 'telefono', 'tel', 'mobile', 'celular', 'whatsapp'],
  emergencyContact: [
    'emergencycontact',
    'kontakijans',
    'ijans',
    'contactoemergencia',
    'contacturgence',
    'telefonoemergencia',
  ],
  emergencyContactName: [
    'emergencycontactname',
    'nonijans',
    'nombreemergencia',
    'nomurgence',
  ],
  email: ['email', 'imel', 'courriel', 'correo', 'correoelectronico', 'mail'],
  googleEmail: ['googleemail', 'imelgoogle', 'correogoogle'],
  googleUid: ['googleuid', 'uidgoogle'],
  userId: ['userid'],
  address: ['address', 'adres', 'adresse', 'direccion'],
  city: ['city', 'vil', 'ville', 'ciudad'],
  zone: ['zone', 'zon', 'sekte', 'secteur', 'zona', 'sector', 'barrio'],
  department: ['department', 'depatman', 'departement', 'departamento', 'ministe', 'ministerio'],
  role: ['role', 'wol', 'rol', 'cargo', 'fonction', 'fonksyon'],
  memberType: ['membertype', 'tipmanm', 'tipomiembro', 'typemembre'],
  cellGroup: ['cellgroup', 'selil', 'gwoup', 'celula', 'cellule', 'groupe'],
  joinedDate: [
    'joineddate',
    'datadmisyon',
    'fechaadmision',
    'fechaingreso',
    'dateadmission',
    'dateadhesion',
  ],
  status: ['status', 'estati', 'estado', 'statut'],
  legalDocumentType: [
    'legaldocumenttype',
    'tipdokiman',
    'tipodocumento',
    'typedocument',
    'documenttype',
    'tipdokimancinnifpasseport',
    'tipodocumentocinnifpasseport',
  ],
  legalDocumentNumber: [
    'legaldocumentnumber',
    'nimewodokiman',
    'numerodocumento',
    'dokimanlegal',
    'documentolegal',
    'cin',
    'nif',
    'cedula',
    'rnc',
    'passeport',
    'pasipo',
    'documento',
  ],
  pin: ['pin', 'kod', 'clave', 'codepin', 'pin4chif', 'pin4digitos'],
  securityPin: ['securitypin', 'pinsekirite', 'pinseguridad'],
  barcodeToken: ['barcodetoken', 'qrtoken', 'kodqr', 'barcode'],
  avatarUrl: ['avatarurl', 'photourl', 'foto', 'photo', 'avatar'],
  notes: ['notes', 'not', 'notas', 'observaciones', 'remarques', 'komante'],
};

function readNormalizedRecordField(
  normalized: Record<string, any>,
  aliases: string[],
  allowFallbackContains: boolean = false
): string {
  // Pass 1: exact normalized header match (highest precision — eliminates all false substring matches!)
  for (const alias of aliases) {
    if (alias in normalized && normalized[alias] !== undefined && normalized[alias] !== null) {
      const val = String(normalized[alias]).trim();
      if (val !== '') return val;
    }
  }
  // Pass 2: optional safe prefix match for decorated headers like "Seks (Gason/Fi)" -> "seksgasonfi"
  if (allowFallbackContains) {
    const keys = Object.keys(normalized);
    for (const alias of aliases) {
      if (alias.length < 4) continue;
      for (const key of keys) {
        if (key.startsWith(alias) && normalized[key] !== undefined && normalized[key] !== null) {
          const val = String(normalized[key]).trim();
          if (val !== '') return val;
        }
      }
    }
  }
  return '';
}

function buildParsedMemberFromNormalizedMap(
  normalized: Record<string, any>,
  defaultDepartment: string,
  defaultRole: string
): ParsedMigrationMember | null {
  const fullName = readNormalizedRecordField(normalized, HEADER_ALIASES.fullName, true);
  if (!fullName) return null;

  let memberId = readNormalizedRecordField(normalized, HEADER_ALIASES.memberId, true);
  let docId = readNormalizedRecordField(normalized, HEADER_ALIASES.docId, false);

  // Handle plain `id` column carefully:
  // - In JSON backups, `id` is the Firestore DocID and `memberId` is the MemberID.
  // - In custom Excel CSVs where ONLY `ID` exists (no `MemberID`), treat `ID` as `memberId` unless it's an internal timestamp doc ID `m-...`.
  const plainId =
    'id' in normalized && normalized['id'] !== undefined && normalized['id'] !== null
      ? String(normalized['id']).trim()
      : '';
  if (plainId) {
    if (!memberId && !/^m-\d{10,}-/i.test(plainId) && !/^mig-/i.test(plainId)) {
      memberId = plainId;
    } else if (!docId) {
      docId = plainId;
    }
  }

  const sourceChurchId = readNormalizedRecordField(normalized, HEADER_ALIASES.sourceChurchId, false);
  const rawGender = readNormalizedRecordField(normalized, HEADER_ALIASES.gender, true);
  const rawCivil = readNormalizedRecordField(normalized, HEADER_ALIASES.civilStatus, true);
  const rawDocType = readNormalizedRecordField(normalized, HEADER_ALIASES.legalDocumentType, true);
  const docNumber = readNormalizedRecordField(normalized, HEADER_ALIASES.legalDocumentNumber, true);
  const rawStatus = readNormalizedRecordField(normalized, HEADER_ALIASES.status, false);
  const rawMemberType = readNormalizedRecordField(normalized, HEADER_ALIASES.memberType, false);

  let legalDocumentType = normalizeLegalDocTypeValue(rawDocType);
  if (!legalDocumentType && docNumber) {
    const lowerDoc = docNumber.toLowerCase();
    if (lowerDoc.includes('pass') || lowerDoc.includes('pasip')) legalDocumentType = 'passeport';
    else if (lowerDoc.includes('nif') || lowerDoc.includes('rnc')) legalDocumentType = 'nif';
    else legalDocumentType = 'cin';
  }

  const email = readNormalizedRecordField(normalized, HEADER_ALIASES.email, false).toLowerCase();
  const googleEmail = readNormalizedRecordField(
    normalized,
    HEADER_ALIASES.googleEmail,
    false
  ).toLowerCase();
  const googleUid = readNormalizedRecordField(normalized, HEADER_ALIASES.googleUid, false);
  const userId = readNormalizedRecordField(normalized, HEADER_ALIASES.userId, false);

  const pin = readNormalizedRecordField(normalized, HEADER_ALIASES.pin, true);
  const securityPin = readNormalizedRecordField(normalized, HEADER_ALIASES.securityPin, false);
  const joinedDate = readNormalizedRecordField(normalized, HEADER_ALIASES.joinedDate, true);
  const dateOfBirth = readNormalizedRecordField(normalized, HEADER_ALIASES.dateOfBirth, true);
  const baptismDate = readNormalizedRecordField(normalized, HEADER_ALIASES.baptismDate, true);
  const barcodeToken = readNormalizedRecordField(normalized, HEADER_ALIASES.barcodeToken, false);
  const avatarUrl = readNormalizedRecordField(normalized, HEADER_ALIASES.avatarUrl, false);
  const googlePhoto =
    typeof normalized['googlephoto'] === 'string' && normalized['googlephoto'].trim()
      ? normalized['googlephoto'].trim()
      : undefined;

  return {
    id: docId || undefined,
    userId: userId || undefined,
    sourceChurchId: sourceChurchId || undefined,
    memberId: memberId ? memberId.trim().toUpperCase() : undefined,
    titlePrefix: readNormalizedRecordField(normalized, HEADER_ALIASES.titlePrefix, false) || undefined,
    fullName,
    gender: normalizeGenderValue(rawGender),
    civilStatus: normalizeCivilStatusValue(rawCivil),
    profession: readNormalizedRecordField(normalized, HEADER_ALIASES.profession, false) || undefined,
    dateOfBirth: dateOfBirth || '1990-01-01',
    baptismDate: baptismDate || undefined,
    phone: readNormalizedRecordField(normalized, HEADER_ALIASES.phone, true),
    emergencyContact:
      readNormalizedRecordField(normalized, HEADER_ALIASES.emergencyContact, false) || undefined,
    emergencyContactName:
      readNormalizedRecordField(normalized, HEADER_ALIASES.emergencyContactName, false) || undefined,
    email,
    googleEmail: googleEmail || undefined,
    googleUid: googleUid || undefined,
    googlePhoto,
    address: readNormalizedRecordField(normalized, HEADER_ALIASES.address, true),
    city: readNormalizedRecordField(normalized, HEADER_ALIASES.city, false) || undefined,
    zone: readNormalizedRecordField(normalized, HEADER_ALIASES.zone, false) || undefined,
    department:
      readNormalizedRecordField(normalized, HEADER_ALIASES.department, true) || defaultDepartment,
    role: readNormalizedRecordField(normalized, HEADER_ALIASES.role, false) || defaultRole,
    memberType: rawMemberType ? normalizeMemberTypeValue(rawMemberType) : 'member',
    cellGroup: readNormalizedRecordField(normalized, HEADER_ALIASES.cellGroup, false) || undefined,
    joinedDate: joinedDate || new Date().toISOString().split('T')[0],
    status: rawStatus ? normalizeMemberStatusValue(rawStatus) : 'active',
    avatarUrl: avatarUrl || undefined,
    legalDocumentType,
    legalDocumentNumber: docNumber || undefined,
    pin: pin || undefined,
    securityPin: securityPin || undefined,
    barcodeToken: barcodeToken || undefined,
    notes: readNormalizedRecordField(normalized, HEADER_ALIASES.notes, false),
  };
}

/**
 * Parses CSV, TSV, semicolon-delimited, pipe-delimited, or JSON backup text into normalized member records
 * preserving unique `memberId`, `joinedDate`, `status`, `pin`, `legalDocument*`, and all extended profile fields.
 */
export function parseMembersImportText(
  rawText: string,
  options?: { isEs?: boolean }
): ParseMembersResult {
  const isEs = Boolean(options?.isEs);
  const text = String(rawText || '').replace(/^\uFEFF/, '').trim();
  if (!text) return { members: [], errors: [], format: 'empty' };

  const defaultDepartment = isEs ? 'Servicio General' : 'Service Général';
  const defaultRole = isEs ? 'Miembro' : 'Manm';
  const errors: string[] = [];
  const members: ParsedMigrationMember[] = [];

  // Attempt 1: JSON Backup or JSON Array
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      const bundleChurchId =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.church?.id
          ? String(parsed.church.id).trim()
          : undefined;

      let array: any[] = [];
      if (Array.isArray(parsed)) {
        array = parsed;
      } else if (Array.isArray(parsed.members)) {
        array = parsed.members;
      } else if (Array.isArray(parsed.data)) {
        array = parsed.data;
      } else if (typeof parsed === 'object' && parsed !== null) {
        array = [parsed];
      }

      for (let i = 0; i < array.length; i++) {
        const item = array[i];
        if (!item || typeof item !== 'object') continue;

        const normalized: Record<string, any> = {};
        for (const [k, v] of Object.entries(item)) {
          normalized[normalizeMigrationHeaderKey(k)] = v;
        }
        if (!normalized['sourcechurchid'] && !normalized['churchid'] && bundleChurchId) {
          normalized['sourcechurchid'] = bundleChurchId;
        }

        const parsedMember = buildParsedMemberFromNormalizedMap(
          normalized,
          defaultDepartment,
          defaultRole
        );
        if (!parsedMember) {
          errors.push(
            isEs
              ? `Fila #${i + 1} en el JSON no tiene un nombre válido.`
              : `Ranje #${i + 1} nan JSON la pa gen yon non valab.`
          );
          continue;
        }
        members.push(parsedMember);
      }

      return { members, errors, format: 'json' };
    } catch {
      // Fall through to CSV parser
    }
  }

  // Attempt 2: RFC-4180 CSV / Delimited Table
  const matrix = parseCsvMatrix(text);
  if (matrix.length === 0) return { members: [], errors: [], format: 'empty' };

  const firstRowNormalized = matrix[0].map(normalizeMigrationHeaderKey);
  const knownHeaderTokens = new Set<string>([
    ...HEADER_ALIASES.memberId,
    ...HEADER_ALIASES.fullName,
    ...HEADER_ALIASES.phone,
    ...HEADER_ALIASES.email,
    ...HEADER_ALIASES.department,
    ...HEADER_ALIASES.role,
    ...HEADER_ALIASES.gender,
    ...HEADER_ALIASES.dateOfBirth,
    ...HEADER_ALIASES.joinedDate,
    ...HEADER_ALIASES.legalDocumentNumber,
    ...HEADER_ALIASES.pin,
    ...HEADER_ALIASES.sourceChurchId,
    ...HEADER_ALIASES.docId,
  ]);

  const hasHeader = firstRowNormalized.some(
    (col) =>
      knownHeaderTokens.has(col) ||
      col.startsWith('nonkonple') ||
      col.startsWith('nombrecompleto') ||
      col.startsWith('fullname') ||
      col.startsWith('memberid') ||
      col.startsWith('datnesans') ||
      col.startsWith('fechanacimiento') ||
      col.startsWith('seks') ||
      col.startsWith('sexo')
  );

  const dataStartIdx = hasHeader ? 1 : 0;

  for (let i = dataStartIdx; i < matrix.length; i++) {
    const cols = matrix[i];
    if (!cols || !cols.some((c) => c.length > 0)) continue;

    if (hasHeader) {
      const normalizedRow: Record<string, string> = {};
      firstRowNormalized.forEach((hKey, idx) => {
        if (hKey && idx < cols.length && !(hKey in normalizedRow)) {
          normalizedRow[hKey] = cols[idx] ?? '';
        }
      });

      const parsedMember = buildParsedMemberFromNormalizedMap(
        normalizedRow,
        defaultDepartment,
        defaultRole
      );
      if (!parsedMember) {
        errors.push(
          isEs
            ? `Línea #${i + 1} ignorada: falta el nombre del miembro.`
            : `Liy #${i + 1} inyore: manke non manm nan.`
        );
        continue;
      }
      members.push(parsedMember);
    } else {
      // Headerless positional fallback: Name, Phone, Gender, Department, Role, Email, DOB, Address, DocNum, PIN, MemberID
      const fullName = (cols[0] || '').trim();
      if (!fullName) {
        errors.push(
          isEs
            ? `Línea #${i + 1} ignorada: falta el nombre del miembro.`
            : `Liy #${i + 1} inyore: manke non manm nan.`
        );
        continue;
      }
      const docNumber = (cols[8] || '').trim();
      members.push({
        fullName,
        phone: (cols[1] || '').trim(),
        gender: normalizeGenderValue(cols[2]),
        department: (cols[3] || '').trim() || defaultDepartment,
        role: (cols[4] || '').trim() || defaultRole,
        email: (cols[5] || '').trim().toLowerCase(),
        dateOfBirth: (cols[6] || '').trim() || '1990-01-01',
        address: (cols[7] || '').trim(),
        legalDocumentType: docNumber ? 'cin' : undefined,
        legalDocumentNumber: docNumber || undefined,
        pin: (cols[9] || '').trim() || undefined,
        memberId: (cols[10] || '').trim().toUpperCase() || undefined,
        memberType: 'member',
        joinedDate: new Date().toISOString().split('T')[0],
        status: 'active',
      });
    }
  }

  return { members, errors, format: 'csv' };
}

/**
 * Analyzes parsed migration rows against the target church roster before execution
 * so the administrator can verify preserved IDs, duplicates, and cross-church transfers.
 */
export function analyzeMemberMigration(
  parsedMembers: ParsedMigrationMember[],
  targetChurchId: string,
  existingTargetChurchMembers: Member[]
): MigrationPreviewAnalysis {
  const cleanTargetChurchId = (targetChurchId || '').trim().toUpperCase();
  const existingMemberIds = new Set(
    existingTargetChurchMembers
      .map((m) => (m.memberId || '').trim().toUpperCase())
      .filter(Boolean)
  );
  const existingPhones = new Set(
    existingTargetChurchMembers
      .map((m) => (m.phone || '').trim())
      .filter((p) => p.length >= 8)
  );
  const existingEmails = new Set(
    existingTargetChurchMembers
      .map((m) => (m.email || '').trim().toLowerCase())
      .filter(Boolean)
  );

  let withExistingMemberIdCount = 0;
  let autoGenerateIdCount = 0;
  let matchingExistingInTargetCount = 0;
  const seenFileMemberIds = new Set<string>();
  const duplicateMemberIdsSet = new Set<string>();
  const crossChurchSourcesSet = new Set<string>();

  for (const m of parsedMembers) {
    const cleanMid = (m.memberId || '').trim().toUpperCase();
    if (cleanMid) {
      withExistingMemberIdCount++;
      if (seenFileMemberIds.has(cleanMid)) {
        duplicateMemberIdsSet.add(cleanMid);
      } else {
        seenFileMemberIds.add(cleanMid);
      }
    } else {
      autoGenerateIdCount++;
    }

    const cleanPhone = (m.phone || '').trim();
    const cleanEmail = (m.email || '').trim().toLowerCase();
    const matchesTarget =
      (Boolean(cleanMid) && existingMemberIds.has(cleanMid)) ||
      (cleanPhone.length >= 8 && existingPhones.has(cleanPhone)) ||
      (Boolean(cleanEmail) && existingEmails.has(cleanEmail));
    if (matchesTarget) {
      matchingExistingInTargetCount++;
    }

    const srcCid = (m.sourceChurchId || m.churchId || '').trim();
    if (srcCid && srcCid.toUpperCase() !== cleanTargetChurchId) {
      crossChurchSourcesSet.add(srcCid);
    }
  }

  return {
    totalRows: parsedMembers.length,
    withExistingMemberIdCount,
    autoGenerateIdCount,
    matchingExistingInTargetCount,
    duplicateMemberIdsInFile: Array.from(duplicateMemberIdsSet),
    crossChurchSourceIds: Array.from(crossChurchSourcesSet),
  };
}

/**
 * Generates a target-church-scoped Firestore document ID for migrated members so that:
 * 1. It NEVER collides with an existing member document owned by another church in Firestore
 *    (which would violate the immutable `churchId` rule on `members/{memberId}`).
 * 2. It stays deterministic for the same `(targetChurchId, memberId)` pair so re-importing the same
 *    CSV into the new church is idempotent and never creates duplicates.
 */
export function resolveSafeMigrationDocId(
  canonicalChurchId: string,
  resolvedMemberId: string,
  existingItemDocId: string | undefined,
  sourceChurchId: string | undefined,
  occupiedDocIdsInAllChurches: Set<string>,
  existingDocOwnerById: Map<string, string>
): string {
  const cleanItemId =
    typeof existingItemDocId === 'string'
      ? existingItemDocId.trim().replace(/[^a-zA-Z0-9_-]/g, '')
      : '';
  const isCrossChurchMigration = Boolean(
    sourceChurchId &&
      sourceChurchId.trim() &&
      sourceChurchId.trim().toUpperCase() !== canonicalChurchId.trim().toUpperCase()
  );

  // Only reuse the original Firestore DocID when restoring/updating within the SAME church
  // and no other church owns that DocID.
  if (cleanItemId && !isCrossChurchMigration) {
    const existingOwner = existingDocOwnerById.get(cleanItemId);
    if (!existingOwner || existingOwner.toUpperCase() === canonicalChurchId.toUpperCase()) {
      return cleanItemId.slice(0, 128);
    }
  }

  // Cross-church migration or CSV without DocID -> deterministic target-church-scoped DocID
  const safeChurchPart = canonicalChurchId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  const safeMemberPart = resolvedMemberId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (safeChurchPart && safeMemberPart) {
    const deterministicId = `mig-${safeChurchPart}-${safeMemberPart}`.slice(0, 128);
    const owner = existingDocOwnerById.get(deterministicId);
    if (
      !occupiedDocIdsInAllChurches.has(deterministicId) ||
      (owner && owner.toUpperCase() === canonicalChurchId.toUpperCase())
    ) {
      return deterministicId;
    }
  }

  let fallbackId = `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  while (occupiedDocIdsInAllChurches.has(fallbackId)) {
    fallbackId = `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return fallbackId;
}
