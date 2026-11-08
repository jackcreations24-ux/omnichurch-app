import React, { useState, useMemo } from 'react';
import { Church, Member, Language } from '../../types';
import { bulkImportMembers } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import {
  Upload,
  FileText,
  FileCode,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  ArrowRight,
  X,
  FileSpreadsheet,
  Layers,
  Search,
  HelpCircle,
} from 'lucide-react';

interface AdminImportMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  church: Church;
  existingMembers: Member[];
  language?: Language;
  onMembersImported?: () => void;
}

type ImportStrategy = 'append' | 'update' | 'skipDuplicates';
type ImportTab = 'file' | 'code' | 'export';

export const AdminImportMembersModal: React.FC<AdminImportMembersModalProps> = ({
  isOpen,
  onClose,
  church,
  existingMembers,
  language = 'ht',
  onMembersImported,
}) => {
  const toast = useToast();
  const isEs = language === 'es';

  const [activeTab, setActiveTab] = useState<ImportTab>('file');
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [strategy, setStrategy] = useState<ImportStrategy>('append');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIndices, setSelectedIndices] = useState<Record<number, boolean>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedSample, setCopiedSample] = useState<boolean>(false);

  // Clean state when modal opens/closes
  const handleReset = () => {
    setRawText('');
    setFileName('');
    setSelectedIndices({});
    setSearchTerm('');
    setIsProcessing(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Helper to normalize field keys from JSON or CSV objects
  const normalizeKey = (key: string): string => {
    return String(key || '')
      .toLowerCase()
      .trim()
      .replace(/[\s_\-]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Parse raw text into candidate Member objects
  const parsedData = useMemo(() => {
    if (!rawText.trim()) return { members: [] as Partial<Member>[], errors: [] as string[] };

    const text = rawText.trim();
    const errors: string[] = [];
    const members: Partial<Member>[] = [];

    // Attempt 1: Try JSON Parsing
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        let array: any[] = [];
        if (Array.isArray(parsed)) {
          array = parsed;
        } else if (Array.isArray(parsed.members)) {
          array = parsed.members;
        } else if (Array.isArray(parsed.data)) {
          array = parsed.data;
        } else if (typeof parsed === 'object') {
          array = [parsed];
        }

        for (let i = 0; i < array.length; i++) {
          const item = array[i];
          if (!item || typeof item !== 'object') continue;

          // Normalize object keys
          const normalized: Record<string, any> = {};
          for (const [k, v] of Object.entries(item)) {
            normalized[normalizeKey(k)] = v;
          }

          const fullName =
            normalized['fullname'] ||
            normalized['name'] ||
            normalized['nom'] ||
            normalized['non'] ||
            normalized['nombre'] ||
            normalized['nombrecompleto'] ||
            normalized['nomcomplet'] ||
            '';

          if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
            errors.push(
              isEs
                ? `Fila #${i + 1} en el JSON no tiene un nombre válido.`
                : `Ranje #${i + 1} nan JSON la pa gen yon non valab.`
            );
            continue;
          }

          const rawGender = String(
            normalized['gender'] ||
            normalized['sexe'] ||
            normalized['seks'] ||
            normalized['sexo'] ||
            ''
          ).toLowerCase();
          const gender: 'male' | 'female' | undefined =
            rawGender.includes('m') || rawGender.includes('g') || rawGender.includes('h') || rawGender.includes('masc')
              ? 'male'
              : rawGender.includes('f') || rawGender.includes('fem') || rawGender.includes('muj')
              ? 'female'
              : undefined;

          const rawCivil = String(
            normalized['civilstatus'] ||
            normalized['statutcivil'] ||
            normalized['etatcivil'] ||
            normalized['estadocivil'] ||
            normalized['sivil'] ||
            ''
          ).toLowerCase();
          const civilStatus: 'celibataire' | 'marie' | 'veuf' | 'divorce' | undefined =
            rawCivil.includes('mar') || rawCivil.includes('cas')
              ? 'marie'
              : rawCivil.includes('veu') || rawCivil.includes('viu')
              ? 'veuf'
              : rawCivil.includes('div')
              ? 'divorce'
              : rawCivil.includes('cel') || rawCivil.includes('sel') || rawCivil.includes('sol')
              ? 'celibataire'
              : undefined;

          const rawDocType = String(
            normalized['legaldocumenttype'] ||
            normalized['documenttype'] ||
            normalized['tipodocumento'] ||
            normalized['tipdokiman'] ||
            normalized['typedocument'] ||
            ''
          ).toLowerCase();
          const legalDocumentType: 'cin' | 'nif' | 'passeport' | 'autre' | undefined =
            rawDocType.includes('nif') || rawDocType.includes('rnc')
              ? 'nif'
              : rawDocType.includes('pass') || rawDocType.includes('pasip')
              ? 'passeport'
              : rawDocType.includes('cin') || rawDocType.includes('ced') || rawDocType.includes('kat')
              ? 'cin'
              : rawDocType
              ? 'autre'
              : undefined;

          members.push({
            id: normalized['id'] || undefined,
            memberId: normalized['memberid'] || normalized['nimewo'] || normalized['matricula'] || undefined,
            titlePrefix: normalized['titleprefix'] || normalized['titre'] || normalized['titulo'] || undefined,
            fullName: fullName.trim(),
            gender,
            civilStatus,
            profession: normalized['profession'] || normalized['metier'] || normalized['profesion'] || undefined,
            dateOfBirth:
              normalized['dateofbirth'] ||
              normalized['datnesans'] ||
              normalized['fechanacimiento'] ||
              normalized['dob'] ||
              '1990-01-01',
            baptismDate:
              normalized['baptismdate'] || normalized['datbatem'] || normalized['fechabautismo'] || undefined,
            phone: String(
              normalized['phone'] ||
                normalized['telephone'] ||
                normalized['telefon'] ||
                normalized['telefono'] ||
                ''
            ).trim(),
            emergencyContact: String(
              normalized['emergencycontact'] ||
                normalized['ijans'] ||
                normalized['contactoemergencia'] ||
                normalized['contacturgence'] ||
                ''
            ).trim() || undefined,
            emergencyContactName:
              normalized['emergencycontactname'] ||
              normalized['nonijans'] ||
              normalized['nombreemergencia'] ||
              undefined,
            email: String(normalized['email'] || normalized['imel'] || normalized['correo'] || '').trim(),
            address: normalized['address'] || normalized['adres'] || normalized['direccion'] || '',
            city: normalized['city'] || normalized['vil'] || normalized['ciudad'] || undefined,
            zone: normalized['zone'] || normalized['sektè'] || normalized['zona'] || undefined,
            department:
              normalized['department'] ||
              normalized['depatman'] ||
              normalized['departamento'] ||
              (isEs ? 'Servicio General' : 'Service Général'),
            role: normalized['role'] || normalized['wòl'] || normalized['wol'] || normalized['rol'] || (isEs ? 'Miembro' : 'Manm'),
            cellGroup:
              normalized['cellgroup'] ||
              normalized['gwoup'] ||
              normalized['selil'] ||
              normalized['celula'] ||
              undefined,
            joinedDate:
              normalized['joineddate'] ||
              normalized['datadmisyon'] ||
              normalized['fechaingreso'] ||
              new Date().toISOString().split('T')[0],
            status:
              normalized['status'] === 'inactive' || normalized['estati'] === 'inaktif' || normalized['estado'] === 'inactivo'
                ? 'inactive'
                : 'active',
            avatarUrl: normalized['avatarurl'] || normalized['foto'] || normalized['photo'] || undefined,
            legalDocumentType,
            legalDocumentNumber:
              normalized['legaldocumentnumber'] ||
              normalized['nimewodokiman'] ||
              normalized['numerodocumento'] ||
              normalized['cedula'] ||
              normalized['cin'] ||
              normalized['nif'] ||
              undefined,
            pin: String(normalized['pin'] || normalized['kod'] || normalized['clave'] || '').trim() || undefined,
            notes: normalized['notes'] || normalized['not'] || normalized['notas'] || '',
          });
        }

        return { members, errors };
      } catch (jsonErr: any) {
        // Not valid JSON, fall through to CSV / line parsing
      }
    }

    // Attempt 2: CSV / Delimited Table Parsing
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return { members: [], errors: [] };

    // Detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t')
      ? '\t'
      : firstLine.includes(';')
      ? ';'
      : firstLine.includes('|')
      ? '|'
      : ',';

    // Helper to split CSV row handling quoted commas
    const parseCsvLine = (line: string, delim: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          insideQuotes = !insideQuotes;
        } else if (char === delim && !insideQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const firstRowCols = parseCsvLine(firstLine, delimiter).map(normalizeKey);
    const hasHeader =
      firstRowCols.some(
        (c) =>
          c.includes('nom') ||
          c.includes('name') ||
          c.includes('non') ||
          c.includes('nombre') ||
          c.includes('fullname') ||
          c.includes('phone') ||
          c.includes('telefon') ||
          c.includes('telefono')
      );

    const dataStartIdx = hasHeader ? 1 : 0;
    const headerMap: Record<string, number> = {};

    if (hasHeader) {
      firstRowCols.forEach((col, idx) => {
        headerMap[col] = idx;
      });
    }

    for (let i = dataStartIdx; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i], delimiter);
      if (cols.length === 0 || !cols.some((c) => c.length > 0)) continue;

      let fullName = '';
      let phone = '';
      let email = '';
      let department = isEs ? 'Servicio General' : 'Service Général';
      let role = isEs ? 'Miembro' : 'Manm';
      let gender: 'male' | 'female' | undefined = undefined;
      let dateOfBirth = '1990-01-01';
      let address = '';
      let docNumber = '';
      let docType: 'cin' | 'nif' | 'passeport' | 'autre' | undefined = undefined;
      let pin = '';
      let memberId = '';

      if (hasHeader) {
        // Find indices from header
        const getVal = (...keys: string[]) => {
          for (const k of keys) {
            const normalizedTarget = normalizeKey(k);
            for (const [hKey, idx] of Object.entries(headerMap)) {
              if (hKey === normalizedTarget || hKey.includes(normalizedTarget)) {
                return cols[idx] || '';
              }
            }
          }
          return '';
        };

        fullName = getVal('fullName', 'nom', 'nomComplet', 'non', 'name', 'nombre', 'nombreCompleto');
        phone = getVal('phone', 'telephone', 'telefon', 'telefono', 'tel', 'mobile', 'celular');
        email = getVal('email', 'imel', 'courriel', 'correo');
        department = getVal('department', 'depatman', 'departement', 'departamento') || (isEs ? 'Servicio General' : 'Service Général');
        role = getVal('role', 'wòl', 'wol', 'rol', 'cargo', 'fonction', 'titre') || (isEs ? 'Miembro' : 'Manm');
        const gRaw = getVal('gender', 'sexe', 'seks', 'sexo', 'genero').toLowerCase();
        if (gRaw.startsWith('m') || gRaw.startsWith('g') || gRaw.startsWith('h')) gender = 'male';
        if (gRaw.startsWith('f') || gRaw.startsWith('m') && gRaw.includes('muj')) gender = 'female';
        dateOfBirth = getVal('dateOfBirth', 'datNesans', 'dob', 'dateNaissance', 'fechaNacimiento') || '1990-01-01';
        address = getVal('address', 'adres', 'adresse', 'direccion');
        docNumber = getVal('legalDocumentNumber', 'cin', 'nif', 'cedula', 'rnc', 'passeport', 'dokiman', 'nimewoDokiman', 'documento');
        pin = getVal('pin', 'kod', 'password', 'clave');
        memberId = getVal('memberId', 'id', 'nimewoManm', 'matricula');
      } else {
        // Position-based or plain text format: Col 0: Name, Col 1: Phone, Col 2: Gender/Role, Col 3: Dept, etc.
        fullName = cols[0] || '';
        phone = cols[1] || '';
        if (cols[2]) {
          const g = cols[2].toLowerCase();
          if (g.includes('m') || g.includes('g') || g.includes('h')) gender = 'male';
          if (g.includes('f') || g.includes('muj')) gender = 'female';
        }
        if (cols[3]) department = cols[3];
        if (cols[4]) role = cols[4];
        if (cols[5]) email = cols[5];
        if (cols[6]) dateOfBirth = cols[6];
        if (cols[7]) address = cols[7];
        if (cols[8]) docNumber = cols[8];
        if (cols[9]) pin = cols[9];
      }

      if (!fullName.trim()) {
        errors.push(
          isEs
            ? `Línea #${i + 1} ignorada: falta el nombre del miembro.`
            : `Liy #${i + 1} inyore: manke non manm nan.`
        );
        continue;
      }

      if (docNumber) {
        const cleanDoc = docNumber.toLowerCase();
        if (cleanDoc.includes('pass') || cleanDoc.includes('pasip')) docType = 'passeport';
        else if (cleanDoc.includes('nif') || cleanDoc.includes('rnc')) docType = 'nif';
        else docType = 'cin';
      }

      members.push({
        memberId: memberId.trim() || undefined,
        fullName: fullName.trim(),
        gender,
        dateOfBirth: dateOfBirth.trim() || '1990-01-01',
        phone: phone.trim(),
        email: email.trim(),
        department: department.trim(),
        role: role.trim(),
        address: address.trim(),
        legalDocumentType: docType,
        legalDocumentNumber: docNumber.trim() || undefined,
        pin: pin.trim() || undefined,
        joinedDate: new Date().toISOString().split('T')[0],
        status: 'active',
      });
    }

    return { members, errors };
  }, [rawText, isEs]);

  const membersToPreview = parsedData.members;

  // Selected Count
  const selectedCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < membersToPreview.length; i++) {
      if (selectedIndices[i] !== false) {
        count++;
      }
    }
    return count;
  }, [membersToPreview, selectedIndices]);

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedCount === membersToPreview.length) {
      // Unselect all
      const newSel: Record<number, boolean> = {};
      for (let i = 0; i < membersToPreview.length; i++) newSel[i] = false;
      setSelectedIndices(newSel);
    } else {
      // Select all
      setSelectedIndices({});
    }
  };

  const toggleSelectIndex = (idx: number) => {
    setSelectedIndices((prev) => ({
      ...prev,
      [idx]: prev[idx] === false ? true : false,
    }));
  };

  const isAllSelected = selectedCount === membersToPreview.length && membersToPreview.length > 0;

  // Filter preview by search
  const filteredPreview = useMemo(() => {
    if (!searchTerm.trim()) {
      return membersToPreview.map((m, idx) => ({ m, originalIndex: idx }));
    }
    const q = searchTerm.toLowerCase();
    return membersToPreview
      .map((m, idx) => ({ m, originalIndex: idx }))
      .filter(
        ({ m }) =>
          m.fullName?.toLowerCase().includes(q) ||
          m.phone?.toLowerCase().includes(q) ||
          m.department?.toLowerCase().includes(q) ||
          m.role?.toLowerCase().includes(q) ||
          m.legalDocumentNumber?.toLowerCase().includes(q)
      );
  }, [membersToPreview, searchTerm]);

  // Handle File Drag / Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileContent(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFileContent(file);
    }
  };

  const readFileContent = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        setActiveTab('file');
        toast.success(
          isEs ? '¡Archivo Cargado!' : 'Fichye Chaje avèk Siksè!',
          isEs ? `"${file.name}" se leyó correctamente.` : `"${file.name}" li kòrèkteman.`
        );
      }
    };
    reader.onerror = () => {
      toast.error(
        isEs ? 'Error al Leer' : 'Erè Lekti',
        isEs ? 'No se pudo leer el archivo seleccionado.' : 'Pa t kapab li fichye a.'
      );
    };
    reader.readAsText(file);
  };

  // Load JSON Sample
  const handleLoadJsonSample = () => {
    const sample = isEs
      ? [
          {
            fullName: 'Juan Manuel Batista',
            gender: 'male',
            civilStatus: 'marie',
            dateOfBirth: '1985-04-12',
            phone: '18095551234',
            email: 'juan.batista@gmail.com',
            department: 'Escuela Bíblica',
            role: 'Maestro',
            address: 'Calle 12 #45, Bella Vista',
            city: 'Santo Domingo',
            legalDocumentType: 'cin',
            legalDocumentNumber: '001-850412-9',
            pin: '4821',
          },
          {
            fullName: 'María Esther Celestino',
            gender: 'female',
            civilStatus: 'celibataire',
            dateOfBirth: '1996-08-23',
            phone: '18295558877',
            email: 'esther.celestino@gmail.com',
            department: 'Coral',
            role: 'Salmista / Soprano',
            address: 'Av. Las Palmas #20',
            city: 'Santiago',
            legalDocumentType: 'nif',
            legalDocumentNumber: '112-998877-0',
            pin: '9312',
          },
          {
            fullName: 'Hno. David Pedroza',
            gender: 'male',
            civilStatus: 'marie',
            dateOfBirth: '1978-11-05',
            phone: '18095553344',
            email: 'david.pedroza@yahoo.com',
            department: 'Recepción & Protocolo',
            role: 'Jefe de Protocolo',
            address: 'Residencial San Jerónimo',
            city: 'Santo Domingo',
            legalDocumentType: 'cin',
            legalDocumentNumber: '004-781105-3',
            pin: '7721',
          },
        ]
      : [
          {
            fullName: 'Jean-Marc Baptiste',
            gender: 'male',
            civilStatus: 'marie',
            dateOfBirth: '1985-04-12',
            phone: '50937123456',
            email: 'jeanmarc.baptiste@gmail.com',
            department: 'Dominical',
            role: 'Monitè',
            address: 'Delmas 40, #12',
            city: 'Delmas',
            legalDocumentType: 'cin',
            legalDocumentNumber: '001-850-412-9',
            pin: '4821',
          },
          {
            fullName: 'Marie Esther Célestin',
            gender: 'female',
            civilStatus: 'celibataire',
            dateOfBirth: '1996-08-23',
            phone: '50948998877',
            email: 'esther.celestin@gmail.com',
            department: 'Chorale',
            role: 'Chantèz / Soprano',
            address: 'Delmas 33',
            city: 'Delmas',
            legalDocumentType: 'nif',
            legalDocumentNumber: '112-998-877-0',
            pin: '9312',
          },
          {
            fullName: 'Frè David Pierre-Louis',
            gender: 'male',
            civilStatus: 'marie',
            dateOfBirth: '1978-11-05',
            phone: '50931223344',
            email: 'david.plouis@yahoo.com',
            department: 'Accueil & Protocole',
            role: 'Chèf Pwotokòl',
            address: 'Pétion-Ville',
            city: 'Pétion-Ville',
            legalDocumentType: 'cin',
            legalDocumentNumber: '004-781-105-3',
            pin: '7721',
          },
        ];
    setRawText(JSON.stringify(sample, null, 2));
    setFileName(isEs ? 'ejemplo_miembros_iglesia.json' : 'egzanp_manm_legiz.json');
    toast.success(
      isEs ? 'Ejemplo JSON Cargado' : 'Egzanp JSON Chaje',
      isEs ? 'El código de ejemplo está disponible en la caja.' : 'Kòd egzanp lan disponib nan bwat la.'
    );
  };

  // Load CSV Sample
  const handleLoadCsvSample = () => {
    const csv = isEs
      ? `Nombre Completo,Telefono,Sexo,Departamento,Rol,Email,Fecha Nacimiento,Documento Legal,PIN
Juan Manuel Batista,18095551234,Masculino,Escuela Bíblica,Maestro,juan@gmail.com,1985-04-12,001-850412-9,4821
María Esther Celestino,18295558877,Femenino,Coral,Salmista,esther@gmail.com,1996-08-23,112-998877-0,9312
David Pedroza,18095553344,Masculino,Recepción & Protocolo,Protocolo,david@yahoo.com,1978-11-05,004-781105-3,7721
Nathalie Moquete,18295551122,Femenino,Intercesión,Intercesora,nathalie@gmail.com,1992-03-15,003-920315-8,3014`
      : `Non Konple,Telefon,Seks,Depatman,Wol,Email,Dat Nesans,Dokiman Legal,PIN
Jean-Marc Baptiste,50937123456,Gason,Dominical,Monitè,jeanmarc@gmail.com,1985-04-12,001-850-412-9,4821
Marie Esther Célestin,50948998877,Fi,Chorale,Chantèz,esther@gmail.com,1996-08-23,112-998-877-0,9312
David Pierre-Louis,50931223344,Gason,Accueil & Protocole,Pwotokòl,david@yahoo.com,1978-11-05,004-781-105-3,7721
Nathalie Moïse,50942001122,Fi,Intercession,Entèsesè,nathalie@gmail.com,1992-03-15,003-920-315-8,3014`;
    setRawText(csv);
    setFileName(isEs ? 'ejemplo_miembros_iglesia.csv' : 'egzanp_manm_legiz.csv');
    toast.success(
      isEs ? 'Ejemplo CSV Cargado' : 'Egzanp CSV Chaje',
      isEs ? 'El ejemplo CSV se cargó exitosamente.' : 'Egzanp CSV a chaje avèk siksè.'
    );
  };

  // Download Blank CSV Template
  const handleDownloadCsvTemplate = () => {
    const headers = isEs
      ? 'Nombre Completo,Telefono,Sexo (Masculino/Femenino),Departamento,Rol,Email,Fecha Nacimiento (AAAA-MM-DD),Direccion,Tipo Documento (CIN/NIF/Passeport),Numero Documento,PIN (4 digitos)\n' +
        'Ex: Juan Batista,18095550000,Masculino,Escuela Bíblica,Miembro,juan@gmail.com,1990-01-01,Av. Bolívar #40,CIN,001-2345678-9,1234\n'
      : 'Non Konple,Telefon,Seks (Gason/Fi),Depatman,Wol,Email,Dat Nesans (AAAA-MM-JJ),Adrès,Tip Dokiman (CIN/NIF/Passeport),Nimewo Dokiman,PIN (4 chif)\n' +
        'Ex: Jean Baptiste,50937000000,Gason,Dominical,Manm,jean@gmail.com,1990-01-01,Delmas 40,CIN,001-234-567-8,1234\n';
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `plantilla_importar_miembros_${(church.code || 'iglesia').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(
      isEs ? 'Plantilla CSV Descargada' : 'Modèl CSV Telechaje',
      isEs ? 'El archivo de plantilla está listo en su dispositivo.' : 'Fichye modèl la pare sou aparèy ou an.'
    );
  };

  // Export Current Church Members as JSON Backup
  const handleExportJson = () => {
    const backupBundle = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      church: {
        id: church.id,
        code: church.code,
        name: church.name,
      },
      totalMembers: existingMembers.length,
      members: existingMembers,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `exportacion_miembros_${(church.code || 'iglesia').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(
      isEs ? 'Exportación Completada' : 'Ekspòtasyon Konplete',
      isEs
        ? `${existingMembers.length} miembros exportados como archivo JSON.`
        : `${existingMembers.length} manm ekspòte kòm fichye JSON.`
    );
  };

  // Export Current Church Members as CSV
  const handleExportCsv = () => {
    const headers = isEs
      ? [
          'MemberID',
          'Nombre Completo',
          'Titulo',
          'Sexo',
          'Estado Civil',
          'Telefono',
          'Email',
          'Departamento',
          'Rol',
          'Fecha Nacimiento',
          'Fecha Admision',
          'Tipo Documento',
          'Numero Documento',
          'Direccion',
          'PIN',
          'Estado',
        ]
      : [
          'MemberID',
          'Non Konple',
          'Tit',
          'Seks',
          'Eta Sivil',
          'Telefon',
          'Email',
          'Depatman',
          'Wol',
          'Dat Nesans',
          'Dat Admisyon',
          'Tip Dokiman',
          'Nimewo Dokiman',
          'Adres',
          'PIN',
          'Estati',
        ];

    const rows = existingMembers.map((m) => [
      `"${m.memberId || ''}"`,
      `"${m.fullName || ''}"`,
      `"${m.titlePrefix || ''}"`,
      `"${m.gender || ''}"`,
      `"${m.civilStatus || ''}"`,
      `"${m.phone || ''}"`,
      `"${m.email || ''}"`,
      `"${m.department || ''}"`,
      `"${m.role || ''}"`,
      `"${m.dateOfBirth || ''}"`,
      `"${m.joinedDate || ''}"`,
      `"${m.legalDocumentType || ''}"`,
      `"${m.legalDocumentNumber || ''}"`,
      `"${m.address || ''}"`,
      `"${m.pin || ''}"`,
      `"${m.status || 'active'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `lista_miembros_${(church.code || 'iglesia').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(
      isEs ? 'Archivo CSV Exportado' : 'Fichye CSV Ekspòte',
      isEs ? `${existingMembers.length} miembros descargados en formato CSV.` : `${existingMembers.length} manm telechaje sou fòma CSV.`
    );
  };

  // Execute Bulk Import
  const handleExecuteImport = async () => {
    const toImport = membersToPreview.filter((_, idx) => selectedIndices[idx] !== false);
    if (toImport.length === 0) {
      toast.error(
        isEs ? 'Ningún miembro seleccionado' : 'Pa gen manm seleksyone',
        isEs ? 'Por favor elija al menos un miembro para importar.' : 'Tanpri chwazi omwen yon manm pou enpòte.'
      );
      return;
    }

    try {
      setIsProcessing(true);
      const result = await bulkImportMembers(church.id, toImport, strategy);

      toast.success(
        isEs ? '¡Importación Exitosa!' : 'Enpòtasyon Reyisi!',
        isEs
          ? `${result.added} miembros agregados, ${result.updated} actualizados, ${result.skipped} omitidos.`
          : `${result.added} manm ajoute, ${result.updated} mete ajou, ${result.skipped} sote.`
      );

      if (typeof onMembersImported === 'function') {
        onMembersImported();
      }

      handleClose();
    } catch (err: any) {
      console.error('Error during bulk import:', err);
      toast.error(
        isEs ? 'Error de Importación' : 'Erè Enpòtasyon',
        isEs ? 'Ocurrió un problema durante el registro de miembros.' : 'Yon pwoblèm rive pandan anrejistreman an.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="admin-import-members-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="admin-import-members-modal-content"
        className="bg-slate-900 border border-slate-700/70 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* HEADER */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {isEs ? 'Migración & Importación Masiva' : 'Migrasyon & Enpòtasyon an Gwo'}
                </span>
                <span className="px-2 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                  {church.name} ({church.code})
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isEs ? 'Importar Lista de Miembros (Archivo CSV, TXT o JSON)' : 'Enpòte Lis Manm yo (Fichye Tèks, CSV oswa Kòd JSON)'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            id="close-import-modal-btn"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isEs ? 'Cerrar' : 'Fèmen'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 sm:px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'file'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isEs ? 'Subir Archivo (CSV / TXT / JSON)' : 'Telechaje Fichye (CSV / TXT / JSON)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'code'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{isEs ? 'Pegar Código o Texto Directo' : 'Kole Kòd oswa Tèks Dirèk'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'export'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isEs ? `Exportar Datos Actuales (${existingMembers.length})` : `Ekspòte Done Aktyèl (${existingMembers.length})`}</span>
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-200">
          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-3xl p-6 sm:p-8 bg-slate-950/50 hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    {isEs ? 'Arrastre el archivo aquí o elíjalo desde su dispositivo' : 'Glise fichye a la oswa chwazi l sou aparèy ou'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    {isEs
                      ? 'Admite archivos .csv, .json o .txt con listas de miembros exportadas de otra iglesia o Excel.'
                      : 'Sipòte fichye .csv, .json, oswa .txt ki gen lis manm yo ekspòte soti nan yon lòt legliz oswa Excel.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <label className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Elegir Archivo' : 'Chwazi Fichye'}</span>
                    <input
                      type="file"
                      accept=".csv,.json,.txt,text/plain,application/json,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Descargar Plantilla CSV' : 'Telechaje Modèl CSV'}</span>
                  </button>
                </div>

                {fileName && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isEs ? `Archivo cargado: ${fileName}` : `Fichye chaje: ${fileName}`}</span>
                  </div>
                )}
              </div>

              {/* QUICK SAMPLE BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? '¿Desea hacer una prueba rápida?' : 'Vle fè yon tès rapid?'}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadCsvSample}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    {isEs ? 'Cargar Ejemplo CSV' : 'Chaje Egzanp CSV'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadJsonSample}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    {isEs ? 'Cargar Ejemplo JSON' : 'Chaje Egzanp JSON'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RAW TEXT / CODE */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? 'Pegue los datos en formato JSON, CSV o Texto línea por línea:' : 'Kole Done Manm yo an JSON, CSV oswa Tèks liy pa liy:'}</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadJsonSample}
                    className="text-[11px] text-amber-400 hover:underline font-bold"
                  >
                    {isEs ? 'Insertar Ejemplo JSON' : 'Mete Egzanp JSON'}
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={handleLoadCsvSample}
                    className="text-[11px] text-amber-400 hover:underline font-bold"
                  >
                    {isEs ? 'Insertar Ejemplo CSV' : 'Mete Egzanp CSV'}
                  </button>
                </div>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={9}
                placeholder={
                  isEs
                    ? `Ejemplo JSON:\n[\n  {\n    "fullName": "Juan Batista",\n    "phone": "18095551234",\n    "gender": "male",\n    "department": "Coral",\n    "role": "Miembro",\n    "legalDocumentType": "cin",\n    "legalDocumentNumber": "001-2345678-9"\n  }\n]\n\nO CSV:\nNombre, Telefono, Sexo, Departamento\nMaría Perez, 18095559876, Femenino, Escuela Bíblica`
                    : `Egzanp JSON:\n[\n  {\n    "fullName": "Jean Baptiste",\n    "phone": "50937123456",\n    "gender": "male",\n    "department": "Chorale",\n    "role": "Manm",\n    "legalDocumentType": "cin",\n    "legalDocumentNumber": "001-234-567-8"\n  }\n]\n\nOswa CSV:\nNon, Telefòn, Sèks, Depatman\nMarie Pierre, 50948123456, Fi, Dominical`
                }
                className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-amber-400 focus:outline-none leading-relaxed"
              />

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{isEs ? `Total de caracteres: ${rawText.length}` : `Total karaktè: ${rawText.length}`}</span>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => setRawText('')}
                    className="text-rose-400 hover:underline text-[11px]"
                  >
                    {isEs ? 'Limpiar caja' : 'Efase bwat la'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EXPORT BACKUP */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isEs ? `Exportar Lista de Miembros de ${church.name}` : `Ekspòte Lis Manm Legliz ${church.name}`}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {isEs
                        ? `Descargue una copia de seguridad completa con los ${existingMembers.length} miembros de esta iglesia. Puede usar este archivo para migrar o guardar respaldo seguro.`
                        : `Telechaje yon kopi backup konplè ki gen tout ${existingMembers.length} manm legliz sa a. Ou ka itilize fichye sa a pou transfere done nan yon lòt legliz oswa fè backup an sekirite.`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    disabled={existingMembers.length === 0}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Exportar Backup JSON' : 'Ekspòte Backup JSON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={existingMembers.length === 0}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isEs ? 'Exportar Tabla CSV (Excel)' : 'Ekspòte sou Tablo CSV (Excel)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PARSED PREVIEW & IMPORT CONTROLS SECTION */}
          {membersToPreview.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-4">
              {/* STATUS & STRATEGY BAR */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">
                    {membersToPreview.length} {isEs ? 'Miembros Identificados' : 'Manm Idantifye'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({selectedCount} {isEs ? 'seleccionados para importar' : 'seleksyone pou enpòte'})
                  </span>
                </div>

                {/* Conflict Resolution Strategy */}
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-slate-400 text-[11px] font-bold">{isEs ? 'Estrategia:' : 'Estrateji:'}</label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as ImportStrategy)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  >
                    <option value="append">{isEs ? 'Agregar como Nuevos Miembros (Nuevo ID)' : 'Ajoute kòm Nouvo Manm (Nouvo ID)'}</option>
                    <option value="update">{isEs ? 'Actualizar si coincide ID / Tel' : 'Mete ajou si ID / Tel matche'}</option>
                    <option value="skipDuplicates">{isEs ? 'Omitir si ya está registrado en la iglesia' : 'Sote si li deja nan legliz la'}</option>
                  </select>
                </div>
              </div>

              {/* SEARCH & SELECT ALL IN PREVIEW */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isAllSelected ? (isEs ? 'Deseleccionar Todos' : 'Deseleksyone Tout') : (isEs ? 'Seleccionar Todos' : 'Seleksyone Tout')}
                  </button>
                  <span className="text-xs text-slate-500">
                    {isEs
                      ? `${filteredPreview.length} de ${membersToPreview.length} mostrados`
                      : `${filteredPreview.length} sou ${membersToPreview.length} afiche`}
                  </span>
                </div>

                <div className="relative sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder={isEs ? 'Buscar en la lista de vista previa...' : 'Chèche nan lis previzyalizasyon an...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* PREVIEW TABLE */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/40">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="sticky top-0 bg-slate-900 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={toggleSelectAll}
                            className="rounded border-slate-700 text-amber-400 focus:ring-amber-400"
                          />
                        </th>
                        <th className="py-2.5 px-3">{isEs ? 'Nombre Completo' : 'Non Konplè'}</th>
                        <th className="py-2.5 px-3">{isEs ? 'Teléfono' : 'Telefòn'}</th>
                        <th className="py-2.5 px-3">{isEs ? 'Departamento & Rol' : 'Depatman & Wòl'}</th>
                        <th className="py-2.5 px-3">{isEs ? 'Documento Legal' : 'Dokiman Legal'}</th>
                        <th className="py-2.5 px-3 text-right">PIN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {filteredPreview.map(({ m, originalIndex }) => {
                        const isSelected = selectedIndices[originalIndex] !== false;
                        return (
                          <tr
                            key={originalIndex}
                            className={`transition-colors ${
                              isSelected
                                ? 'hover:bg-slate-800/40'
                                : 'opacity-40 bg-slate-950/30'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectIndex(originalIndex)}
                                className="rounded border-slate-700 text-amber-400 focus:ring-amber-400"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-white">
                              <div className="flex items-center gap-1.5">
                                <span>{m.fullName}</span>
                                {m.gender && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                                    {m.gender === 'male' ? (isEs ? 'Masc' : 'Gason') : (isEs ? 'Fem' : 'Fi')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                              {m.phone || <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col">
                                <span className="text-amber-300/90 font-medium">
                                  {m.department || (isEs ? 'Servicio General' : 'Service Général')}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {m.role || (isEs ? 'Miembro' : 'Manm')}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {m.legalDocumentNumber ? (
                                <span className="text-emerald-400">
                                  {m.legalDocumentType ? m.legalDocumentType.toUpperCase() : 'DOC'}: {m.legalDocumentNumber}
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[11px] text-amber-400 font-bold">
                              {m.pin || 'Auto'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* WARNINGS IF ANY */}
          {parsedData.errors.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">{isEs ? 'Advertencia en algunas filas:' : 'Avètisman sou kèk ranje:'}</strong>
                <ul className="list-disc list-inside space-y-0.5 mt-1 text-[11px] text-rose-300/90">
                  {parsedData.errors.slice(0, 3).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {parsedData.errors.length > 3 && (
                    <li>
                      {isEs
                        ? `...y otras ${parsedData.errors.length - 3} filas que no pudieron procesarse.`
                        : `...ak ${parsedData.errors.length - 3} lòt ranje ki pa t ka trete.`}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            {isEs ? 'Cerrar' : 'Fèmen'}
          </button>

          <div className="flex items-center gap-2">
            {membersToPreview.length > 0 && (
              <button
                type="button"
                id="btn-confirm-execute-import"
                disabled={isProcessing || selectedCount === 0}
                onClick={handleExecuteImport}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{isEs ? 'Importando...' : 'N ap enpòte...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>{isEs ? `Importar ${selectedCount} Miembros Ahora` : `Enpòte ${selectedCount} Manm Kounye a`}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
