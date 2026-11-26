import React, { useState, useMemo } from 'react';
import { Church, Member, Language } from '../../types';
import { bulkImportMembers } from '../../utils/storage';
import {
  MemberImportStrategy,
  parseMembersImportText,
  exportMembersToMigrationCsv,
  analyzeMemberMigration,
} from '../../utils/memberMigration';
import { useToast } from '../../context/ToastContext';
import {
  Upload,
  FileText,
  FileCode,
  Download,
  Check,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FileSpreadsheet,
  Search,
  ShieldCheck,
  KeyRound,
  ArrowRightLeft,
} from 'lucide-react';

interface AdminImportMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  church: Church;
  existingMembers: Member[];
  language?: Language;
  onMembersImported?: () => void;
}

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
  const isEn = language === 'en';
  const isFr = language === 'fr';
  const tr = (ht: string, es: string, fr: string, en: string) =>
    isEs ? es : isFr ? fr : isEn ? en : ht;

  const [activeTab, setActiveTab] = useState<ImportTab>('file');
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [strategy, setStrategy] = useState<MemberImportStrategy>('migrate');
  const [preserveMemberIds, setPreserveMemberIds] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIndices, setSelectedIndices] = useState<Record<number, boolean>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleReset = () => {
    setRawText('');
    setFileName('');
    setSelectedIndices({});
    setSearchTerm('');
    setStrategy('migrate');
    setPreserveMemberIds(true);
    setIsProcessing(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Lossless RFC-4180 CSV & JSON parser preserving unique MemberIDs and all member fields
  const parsedData = useMemo(
    () => parseMembersImportText(rawText, { isEs }),
    [rawText, isEs]
  );

  const membersToPreview = parsedData.members;

  // Analyze migration integrity (preserved IDs, duplicates, cross-church transfers)
  const migrationAnalysis = useMemo(
    () => analyzeMemberMigration(membersToPreview, church.id, existingMembers),
    [membersToPreview, church.id, existingMembers]
  );

  const selectedCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < membersToPreview.length; i++) {
      if (selectedIndices[i] !== false) {
        count++;
      }
    }
    return count;
  }, [membersToPreview, selectedIndices]);

  const toggleSelectAll = () => {
    if (selectedCount === membersToPreview.length) {
      const newSel: Record<number, boolean> = {};
      for (let i = 0; i < membersToPreview.length; i++) newSel[i] = false;
      setSelectedIndices(newSel);
    } else {
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
          m.memberId?.toLowerCase().includes(q) ||
          m.phone?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.department?.toLowerCase().includes(q) ||
          m.role?.toLowerCase().includes(q) ||
          m.legalDocumentNumber?.toLowerCase().includes(q)
      );
  }, [membersToPreview, searchTerm]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileContent(file);
    e.target.value = '';
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
    setSelectedIndices({});
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        setActiveTab('file');
        toast.success(
          tr('Fichye Chaje avèk Siksè!', '¡Archivo Cargado!', 'Fichier Chargé !', 'File Loaded!'),
          tr(
            `"${file.name}" li kòrèkteman.`,
            `"${file.name}" se leyó correctamente.`,
            `"${file.name}" a été lu correctement.`,
            `"${file.name}" was read successfully.`
          )
        );
      }
    };
    reader.onerror = () => {
      toast.error(
        tr('Erè Lekti', 'Error al Leer', 'Erreur de Lecture', 'Read Error'),
        tr(
          'Pa t kapab li fichye a.',
          'No se pudo leer el archivo seleccionado.',
          'Impossible de lire le fichier sélectionné.',
          'Could not read the selected file.'
        )
      );
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleLoadJsonSample = () => {
    const sample = isEs
      ? [
          {
            memberId: 'IER-JB4821',
            fullName: 'Juan Manuel Batista',
            gender: 'male',
            civilStatus: 'marie',
            dateOfBirth: '1985-04-12',
            joinedDate: '2022-03-10',
            phone: '18095551234',
            email: 'juan.batista@gmail.com',
            department: 'Escuela Bíblica',
            role: 'Maestro',
            address: 'Calle 12 #45, Bella Vista',
            city: 'Santo Domingo',
            legalDocumentType: 'cin',
            legalDocumentNumber: '001-850412-9',
            pin: '4821',
            status: 'active',
          },
          {
            memberId: 'IER-MC9312',
            fullName: 'María Esther Celestino',
            gender: 'female',
            civilStatus: 'celibataire',
            dateOfBirth: '1996-08-23',
            joinedDate: '2023-06-15',
            phone: '18295558877',
            email: 'esther.celestino@gmail.com',
            department: 'Coral',
            role: 'Salmista / Soprano',
            address: 'Av. Las Palmas #20',
            city: 'Santiago',
            legalDocumentType: 'nif',
            legalDocumentNumber: '112-998877-0',
            pin: '9312',
            status: 'active',
          },
        ]
      : [
          {
            memberId: 'IER-JB4821',
            fullName: 'Jean-Marc Baptiste',
            gender: 'male',
            civilStatus: 'marie',
            dateOfBirth: '1985-04-12',
            joinedDate: '2022-03-10',
            phone: '50937123456',
            email: 'jeanmarc.baptiste@gmail.com',
            department: 'Dominical',
            role: 'Monitè',
            address: 'Delmas 40, #12',
            city: 'Delmas',
            legalDocumentType: 'cin',
            legalDocumentNumber: '001-850-412-9',
            pin: '4821',
            status: 'active',
          },
          {
            memberId: 'IER-MC9312',
            fullName: 'Marie Esther Célestin',
            gender: 'female',
            civilStatus: 'celibataire',
            dateOfBirth: '1996-08-23',
            joinedDate: '2023-06-15',
            phone: '50948998877',
            email: 'esther.celestin@gmail.com',
            department: 'Chorale',
            role: 'Chantèz / Soprano',
            address: 'Delmas 33',
            city: 'Delmas',
            legalDocumentType: 'nif',
            legalDocumentNumber: '112-998-877-0',
            pin: '9312',
            status: 'active',
          },
        ];
    setRawText(JSON.stringify(sample, null, 2));
    setFileName(isEs ? 'ejemplo_migracion_miembros.json' : 'egzanp_migrasyon_manm.json');
    setSelectedIndices({});
    toast.success(
      tr('Egzanp JSON Chaje', 'Ejemplo JSON Cargado', 'Exemple JSON Chargé', 'JSON Sample Loaded'),
      tr(
        'Kòd egzanp ak ID inik yo pare pou preview.',
        'El código de ejemplo con IDs únicos está listo.',
        'L’exemple JSON avec IDs uniques est prêt.',
        'Sample JSON with unique IDs is ready to preview.'
      )
    );
  };

  const handleLoadCsvSample = () => {
    const csv = isEs
      ? `MemberID,Nombre Completo,Telefono,Sexo,Departamento,Rol,Email,Fecha Nacimiento,Fecha Admision,Tipo Documento,Numero Documento,PIN,Estado
IER-JB4821,Juan Manuel Batista,18095551234,Masculino,Escuela Bíblica,Maestro,juan@gmail.com,1985-04-12,2022-03-10,CIN,001-850412-9,4821,active
IER-MC9312,María Esther Celestino,18295558877,Femenino,Coral,Salmista,esther@gmail.com,1996-08-23,2023-06-15,NIF,112-998877-0,9312,active
IER-DP7721,David Pedroza,18095553344,Masculino,Recepción & Protocolo,Protocolo,david@yahoo.com,1978-11-05,2021-01-20,CIN,004-781105-3,7721,active`
      : `MemberID,Non Konple,Telefon,Seks,Depatman,Wol,Email,Dat Nesans,Dat Admisyon,Tip Dokiman,Nimewo Dokiman,PIN,Estati
IER-JB4821,Jean-Marc Baptiste,50937123456,Gason,Dominical,Monitè,jeanmarc@gmail.com,1985-04-12,2022-03-10,CIN,001-850-412-9,4821,active
IER-MC9312,Marie Esther Célestin,50948998877,Fi,Chorale,Chantèz,esther@gmail.com,1996-08-23,2023-06-15,NIF,112-998-877-0,9312,active
IER-DP7721,David Pierre-Louis,50931223344,Gason,Accueil & Protocole,Pwotokòl,david@yahoo.com,1978-11-05,2021-01-20,CIN,004-781-105-3,7721,active`;
    setRawText(csv);
    setFileName(isEs ? 'ejemplo_migracion_miembros.csv' : 'egzanp_migrasyon_manm.csv');
    setSelectedIndices({});
    toast.success(
      tr('Egzanp CSV Chaje', 'Ejemplo CSV Cargado', 'Exemple CSV Chargé', 'CSV Sample Loaded'),
      tr(
        'Egzanp CSV ak ID inik yo chaje avèk siksè.',
        'El ejemplo CSV con IDs únicos se cargó exitosamente.',
        'L’exemple CSV avec IDs uniques a été chargé.',
        'CSV sample with unique IDs loaded successfully.'
      )
    );
  };

  const handleDownloadCsvTemplate = () => {
    const codePrefix = (church.code || 'CH').toUpperCase();
    const content = isEs
      ? `\uFEFFMemberID,FullName,TitlePrefix,Gender,CivilStatus,Profession,DateOfBirth,BaptismDate,Phone,EmergencyContact,EmergencyContactName,Email,Address,City,Zone,Department,Role,MemberType,CellGroup,JoinedDate,Status,LegalDocumentType,LegalDocumentNumber,PIN,Notes\r\n` +
        `"${codePrefix}-JB1234","Juan Batista","Hno.","male","marie","Ingeniero","1990-01-01","2015-06-10","18095550000","18095559999","Ana Batista","juan@gmail.com","Av. Bolívar #40","Santo Domingo","Centro","Escuela Bíblica","Miembro","member","Célula 1","2022-05-01","active","cin","001-2345678-9","1234","Miembro activo"\r\n`
      : `\uFEFFMemberID,FullName,TitlePrefix,Gender,CivilStatus,Profession,DateOfBirth,BaptismDate,Phone,EmergencyContact,EmergencyContactName,Email,Address,City,Zone,Department,Role,MemberType,CellGroup,JoinedDate,Status,LegalDocumentType,LegalDocumentNumber,PIN,Notes\r\n` +
        `"${codePrefix}-JB1234","Jean Baptiste","Frè","male","marie","Enjenyè","1990-01-01","2015-06-10","50937000000","50937009999","Marie Baptiste","jean@gmail.com","Delmas 40","Delmas","Sant","Dominical","Manm","member","Selil 1","2022-05-01","active","cin","001-234-567-8","1234","Manm aktif"\r\n`;

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `model_migrasyon_manm_${(church.code || 'legliz').toLowerCase()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(
      tr('Modèl CSV Telechaje', 'Plantilla CSV Descargada', 'Modèle CSV Téléchargé', 'CSV Template Downloaded'),
      tr(
        'Modèl CSV konplè a (ak kolòn MemberID) pare sou aparèy ou.',
        'La plantilla CSV completa (con columna MemberID) está lista.',
        'Le modèle CSV complet (avec colonne MemberID) est prêt.',
        'Complete CSV template (including MemberID column) is ready.'
      )
    );
  };

  const handleExportJson = () => {
    const backupBundle = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      church: {
        id: church.id,
        code: church.code,
        name: church.name,
      },
      totalMembers: existingMembers.length,
      members: existingMembers,
    };
    const blob = new Blob([JSON.stringify(backupBundle, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute(
      'download',
      `migrasyon_backup_${(church.code || 'legliz').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
    toast.success(
      tr('Ekspòtasyon JSON Konplete', 'Exportación JSON Completada', 'Export JSON Terminé', 'JSON Export Complete'),
      tr(
        `${existingMembers.length} manm ekspòte ak tout ID inik yo ak foto yo an JSON.`,
        `${existingMembers.length} miembros exportados con sus IDs únicos y fotos en JSON.`,
        `${existingMembers.length} membres exportés avec leurs IDs uniques en JSON.`,
        `${existingMembers.length} members exported with unique IDs and photos as JSON.`
      )
    );
  };

  const handleExportCsv = () => {
    const csvContent = exportMembersToMigrationCsv(existingMembers, church.id);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `migrasyon_manm_${(church.code || 'legliz').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(
      tr('Fichye CSV Migrasyon Ekspòte', 'Archivo CSV de Migración Exportado', 'CSV de Migration Exporté', 'Migration CSV Exported'),
      tr(
        `${existingMembers.length} manm telechaje ak tout 31 chan done yo (MemberID, PIN, Dat, Dokiman, Nòt).`,
        `${existingMembers.length} miembros descargados con los 31 campos completos (MemberID, PIN, Fechas, Documentos, Notas).`,
        `${existingMembers.length} membres téléchargés avec tous les champs complets (MemberID, PIN, Dates, Notes).`,
        `${existingMembers.length} members downloaded with all 31 lossless migration fields.`
      )
    );
  };

  const handleExecuteImport = async () => {
    const toImport = membersToPreview.filter((_, idx) => selectedIndices[idx] !== false);
    if (toImport.length === 0) {
      toast.error(
        tr('Pa gen manm seleksyone', 'Ningún miembro seleccionado', 'Aucun membre sélectionné', 'No members selected'),
        tr(
          'Tanpri chwazi omwen yon manm pou enpòte.',
          'Por favor elija al menos un miembro para importar.',
          'Veuillez sélectionner au moins un membre à importer.',
          'Please select at least one member to import.'
        )
      );
      return;
    }

    try {
      setIsProcessing(true);
      const result = await bulkImportMembers(church.id, toImport, strategy, {
        preserveMemberIds,
      });

      if (result.cloudSynced) {
        toast.success(
          tr('Migrasyon & Enpòtasyon Reyisi!', '¡Migración e Importación Exitosa!', 'Migration & Import Réussis !', 'Migration & Import Successful!'),
          tr(
            `${result.added} ajoute, ${result.updated} mete ajou, ${result.skipped} sote • ${result.preservedIdsCount} ID inik konsève & senkronize nan Cloud.`,
            `${result.added} agregados, ${result.updated} actualizados, ${result.skipped} omitidos • ${result.preservedIdsCount} IDs únicos preservados y sincronizados.`,
            `${result.added} ajoutés, ${result.updated} mis à jour, ${result.skipped} ignorés • ${result.preservedIdsCount} IDs uniques conservés et synchronisés.`,
            `${result.added} added, ${result.updated} updated, ${result.skipped} skipped • ${result.preservedIdsCount} unique IDs preserved & synced.`
          )
        );
      } else {
        toast.warning(
          tr('Sovgade Lokalman (Senkro Cloud an Atant)', 'Guardado Localmente (Sincronización Pendiente)', 'Enregistré Localement (Synchro en Attente)', 'Saved Locally (Cloud Sync Pending)'),
          tr(
            `${result.added} ajoute, ${result.updated} mete ajou (${result.preservedIdsCount} ID inik konsève), men senkro Cloud echwe. Verifye koneksyon oswa pèmisyon admin.`,
            `${result.added} agregados, ${result.updated} actualizados (${result.preservedIdsCount} IDs preservados), pero la sincronización en la nube falló.`,
            `${result.added} ajoutés, ${result.updated} mis à jour (${result.preservedIdsCount} IDs conservés), mais la synchro Cloud a échoué.`,
            `${result.added} added, ${result.updated} updated (${result.preservedIdsCount} unique IDs preserved), but Cloud sync failed. Check permissions or connection.`
          )
        );
      }

      if (typeof onMembersImported === 'function') {
        onMembersImported();
      }

      handleClose();
    } catch (err: any) {
      console.error('Error during bulk import:', err);
      toast.error(
        tr('Erè Migrasyon / Enpòtasyon', 'Error de Migración / Importación', 'Erreur de Migration / Import', 'Migration / Import Error'),
        tr(
          'Yon pwoblèm rive pandan anrejistreman manm yo.',
          'Ocurrió un problema durante el registro de miembros.',
          'Un problème est survenu lors de l’enregistrement des membres.',
          'An error occurred while saving imported members.'
        )
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
        className="bg-slate-900 border border-slate-700/70 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* HEADER */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {tr(
                    'Migrasyon Manm & Enpòtasyon an Gwo',
                    'Migración de Miembros & Importación Masiva',
                    'Migration de Membres & Import en Masse',
                    'Member Migration & Bulk Import'
                  )}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                  {church.name} ({church.code})
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {tr(
                  'Enpòte & Migre Manm san Pèdi ID Inik yo (CSV / JSON)',
                  'Importar y Migrar Miembros sin Perder sus IDs Únicos (CSV / JSON)',
                  'Importer & Migrer sans Perdre les IDs Uniques (CSV / JSON)',
                  'Import & Migrate Members Without Losing Unique IDs (CSV / JSON)'
                )}
              </h2>
            </div>
          </div>

          <button
            type="button"
            id="close-import-modal-btn"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={tr('Fèmen', 'Cerrar', 'Fermer', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 sm:px-6 gap-2 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'file'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>
              {tr(
                'Telechaje Fichye (CSV / TXT / JSON)',
                'Subir Archivo (CSV / TXT / JSON)',
                'Importer Fichier (CSV / TXT / JSON)',
                'Upload File (CSV / TXT / JSON)'
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>
              {tr(
                'Kole Kòd oswa Tèks Dirèk',
                'Pegar Código o Texto Directo',
                'Coller Code ou Texte',
                'Paste CSV or JSON Directly'
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'export'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {tr(
                `Ekspòte pou Migrasyon (${existingMembers.length})`,
                `Exportar para Migración (${existingMembers.length})`,
                `Exporter pour Migration (${existingMembers.length})`,
                `Export for Migration (${existingMembers.length})`
              )}
            </span>
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
                    {tr(
                      'Glise fichye CSV / JSON nan la oswa chwazi l sou aparèy ou',
                      'Arrastre el archivo CSV / JSON aquí o elíjalo desde su dispositivo',
                      'Glissez le fichier CSV / JSON ici ou choisissez-le',
                      'Drag your CSV / JSON file here or browse from your device'
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mt-1">
                    {tr(
                      'Zouti Migrasyon an konsève otomatikman ID Inik (MemberID), PIN, Dat Admisyon, Dokiman Legal, ak tout lòt chan done manm yo san pèt done.',
                      'La herramienta de Migración conserva automáticamente el ID Único (MemberID), PIN, Fecha de Admisión, Documento Legal y todos los demás campos sin pérdida de datos.',
                      'L’outil de Migration préserve automatiquement l’ID Unique (MemberID), PIN, Date d’admission, Document Légal et tous les champs sans perte de données.',
                      'The Migration tool automatically preserves Unique MemberIDs, PINs, Joined Dates, Legal Documents, and all extended fields with zero data loss.'
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <label className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{tr('Chwazi Fichye', 'Elegir Archivo', 'Choisir un Fichier', 'Choose File')}</span>
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
                    <span>
                      {tr(
                        'Telechaje Modèl CSV Migrasyon',
                        'Descargar Plantilla CSV',
                        'Télécharger Modèle CSV',
                        'Download Migration CSV Template'
                      )}
                    </span>
                  </button>
                </div>

                {fileName && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{tr(`Fichye chaje: ${fileName}`, `Archivo cargado: ${fileName}`, `Fichier chargé : ${fileName}`, `Loaded: ${fileName}`)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                  <span>{tr('Vle teste migrasyon ak ID inik?', '¿Desea probar una migración con IDs únicos?', 'Tester une migration avec IDs uniques ?', 'Want to test migration with unique IDs?')}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadCsvSample}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    {tr('Chaje Egzanp CSV', 'Cargar Ejemplo CSV', 'Charger Exemple CSV', 'Load CSV Sample')}
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadJsonSample}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    {tr('Chaje Egzanp JSON', 'Cargar Ejemplo JSON', 'Charger Exemple JSON', 'Load JSON Sample')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RAW TEXT / CODE */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {tr(
                      'Kole Done Manm yo an CSV (ak MemberID) oswa Backup JSON:',
                      'Pegue los datos en CSV (con MemberID) o Backup JSON:',
                      'Collez vos données en CSV (avec MemberID) ou JSON :',
                      'Paste member data as CSV (with MemberID) or JSON Backup:'
                    )}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadJsonSample}
                    className="text-[11px] text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    {tr('Mete Egzanp JSON', 'Insertar Ejemplo JSON', 'Exemple JSON', 'Insert JSON Sample')}
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={handleLoadCsvSample}
                    className="text-[11px] text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    {tr('Mete Egzanp CSV', 'Insertar Ejemplo CSV', 'Exemple CSV', 'Insert CSV Sample')}
                  </button>
                </div>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setSelectedIndices({});
                }}
                rows={9}
                placeholder={
                  isEs
                    ? `MemberID,Nombre Completo,Telefono,Sexo,Departamento,Rol,Fecha Admision,PIN\nIER-JB4821,Juan Batista,18095551234,Masculino,Coral,Miembro,2022-03-10,4821`
                    : `MemberID,Non Konple,Telefon,Seks,Depatman,Wol,Dat Admisyon,PIN\nIER-JB4821,Jean Baptiste,50937123456,Gason,Chorale,Manm,2022-03-10,4821`
                }
                className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-amber-400 focus:outline-none leading-relaxed"
              />

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{tr(`Total karaktè: ${rawText.length}`, `Total de caracteres: ${rawText.length}`, `Caractères : ${rawText.length}`, `Characters: ${rawText.length}`)}</span>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => setRawText('')}
                    className="text-rose-400 hover:underline text-[11px] cursor-pointer"
                  >
                    {tr('Efase bwat la', 'Limpiar caja', 'Effacer', 'Clear box')}
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
                      {tr(
                        `Ekspòte Done Migrasyon Legliz ${church.name}`,
                        `Exportar Datos de Migración de ${church.name}`,
                        `Exporter les Données de Migration de ${church.name}`,
                        `Export Migration Data for ${church.name}`
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {tr(
                        `Telechaje tout ${existingMembers.length} manm yo ak ID Inik (MemberID), PIN, Dat Admisyon, Batèm, Dokiman Legal, Kont Ijans, Nòt, ak QR Token pou re-enpòte yo nan yon nouvo legliz san okenn pèt done.`,
                        `Descargue los ${existingMembers.length} miembros con ID Único (MemberID), PIN, Fecha de Admisión, Bautismo, Documento Legal, Contacto de Emergencia y Notas para re-importarlos en otra iglesia sin pérdida de datos.`,
                        `Téléchargez les ${existingMembers.length} membres avec ID Unique (MemberID), PIN, Dates, Documents et Notes pour migrer vers une autre église sans perte de données.`,
                        `Download all ${existingMembers.length} members with Unique MemberID, PIN, Joined/Baptism dates, Legal ID, Emergency contacts, and Notes for lossless migration into another church.`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={existingMembers.length === 0}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>
                      {tr(
                        'Ekspòte CSV Migrasyon Konplè (Tout Done + ID)',
                        'Exportar CSV Migración Completa (Todos los Datos + ID)',
                        'Exporter CSV Migration Complète (Tout + ID)',
                        'Export Full Migration CSV (All Fields + Unique IDs)'
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportJson}
                    disabled={existingMembers.length === 0}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {tr(
                        'Ekspòte Backup JSON Konplè (Ak Foto)',
                        'Exportar Backup JSON Completo (Con Fotos)',
                        'Exporter Backup JSON Complet (Avec Photos)',
                        'Export Full JSON Backup (Includes Photos)'
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PARSED PREVIEW & MIGRATION CONTROLS SECTION */}
          {membersToPreview.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-4">
              {/* MIGRATION INTEGRITY SUMMARY BANNER */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>
                      {tr(
                        'Verifikasyon Migrasyon ID Inik:',
                        'Verificación de Migración de IDs Únicos:',
                        'Vérification Migration IDs Uniques :',
                        'Unique ID Migration Check:'
                      )}
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={preserveMemberIds}
                      onChange={(e) => setPreserveMemberIds(e.target.checked)}
                      className="rounded border-slate-600 text-emerald-400 focus:ring-emerald-400"
                    />
                    <span className="font-semibold">
                      {tr(
                        'Konsève ID Inik (MemberID) ki nan fichye a',
                        'Conservar IDs Únicos (MemberID) del archivo',
                        'Conserver les IDs Uniques (MemberID) du fichier',
                        'Preserve Unique MemberIDs from file'
                      )}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">
                      {tr('ID Inik detekte pou konsève', 'IDs Únicos a conservar', 'IDs Uniques à conserver', 'Unique IDs to preserve')}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {preserveMemberIds ? migrationAnalysis.withExistingMemberIdCount : 0}
                    </span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">
                      {tr('Nouvo ID ap jenere', 'Nuevos IDs automáticos', 'Nouveaux IDs auto', 'Auto-generated IDs')}
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {preserveMemberIds
                        ? migrationAnalysis.autoGenerateIdCount
                        : migrationAnalysis.totalRows}
                    </span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">
                      {tr('Deja egziste nan legliz sib la', 'Ya existen en esta iglesia', 'Déjà dans cette église', 'Already in target church')}
                    </span>
                    <span className="font-mono font-bold text-sky-300">
                      {migrationAnalysis.matchingExistingInTargetCount}
                    </span>
                  </div>
                </div>

                {migrationAnalysis.crossChurchSourceIds.length > 0 && (
                  <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                    {tr(
                      `Migrasyon depi yon lòt legliz (${migrationAnalysis.crossChurchSourceIds.join(', ')}) detekte: tout ID Inik (MemberID) manm yo ap konsève epi yo ap jwenn nouvo idantifyan Firestore pou "${church.name}" (${church.id}) san konfli pèmisyon.`,
                      `Migración desde otra iglesia (${migrationAnalysis.crossChurchSourceIds.join(', ')}) detectada: se conservarán los MemberID únicos y se crearán nuevos documentos seguros para "${church.name}" (${church.id}) sin conflictos.`,
                      `Migration depuis une autre église (${migrationAnalysis.crossChurchSourceIds.join(', ')}) détectée : les MemberID uniques seront conservés et liés en toute sécurité à "${church.name}" (${church.id}).`,
                      `Cross-church migration (${migrationAnalysis.crossChurchSourceIds.join(', ')}) detected: unique MemberIDs will be preserved verbatim while generating conflict-free Firestore records for "${church.name}" (${church.id}).`
                    )}
                  </p>
                )}

                {migrationAnalysis.duplicateMemberIdsInFile.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      {tr(
                        `Atansyon: Fichye a gen ID Inik ki repete (${migrationAnalysis.duplicateMemberIdsInFile.slice(0, 5).join(', ')}). Premye ranje a ap konsève ID a, lòt doublon yo ap jwenn yon ID sekirize.`,
                        `Atención: El archivo tiene MemberIDs duplicados (${migrationAnalysis.duplicateMemberIdsInFile.slice(0, 5).join(', ')}). El primero conservará el ID y los duplicados recibirán un ID único.`,
                        `Attention : IDs dupliqués dans le fichier (${migrationAnalysis.duplicateMemberIdsInFile.slice(0, 5).join(', ')}).`,
                        `Warning: Duplicate MemberIDs found inside the file (${migrationAnalysis.duplicateMemberIdsInFile.slice(0, 5).join(', ')}). The first row preserves the ID and duplicates receive safe unique IDs.`
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* STATUS & STRATEGY BAR */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">
                    {membersToPreview.length}{' '}
                    {tr('Manm Idantifye', 'Miembros Identificados', 'Membres Identifiés', 'Members Identified')}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({selectedCount} {tr('seleksyone', 'seleccionados', 'sélectionnés', 'selected')})
                  </span>
                </div>

                {/* Conflict Resolution Strategy */}
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-slate-400 text-[11px] font-bold">
                    {tr('Mòd Enpòtasyon:', 'Estrategia:', 'Stratégie :', 'Strategy:')}
                  </label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as MemberImportStrategy)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  >
                    <option value="migrate">
                      {tr(
                        'Migrasyon Konplè (Konsève ID Inik + Mete ajou si egziste)',
                        'Migración Completa (Conservar ID Único + Actualizar si existe)',
                        'Migration Complète (Conserver ID + Mettre à jour)',
                        'Full Migration (Preserve Unique ID + Update if exists)'
                      )}
                    </option>
                    <option value="skipDuplicates">
                      {tr(
                        'Konsève ID Inik (Sote si manm nan deja nan legliz la)',
                        'Conservar ID Único (Omitir si ya existe)',
                        'Conserver ID Unique (Ignorer doublons)',
                        'Preserve Unique ID (Skip existing members)'
                      )}
                    </option>
                    <option value="update">
                      {tr(
                        'Mete ajou manm ki egziste + Ajoute nouvo yo',
                        'Actualizar si coincide ID / Tel + Agregar nuevos',
                        'Mettre à jour existants + Ajouter nouveaux',
                        'Update matching ID / Phone + Add new'
                      )}
                    </option>
                    <option value="append">
                      {tr(
                        'Ajoute tout kòm Nouvo Manm',
                        'Agregar todos como Nuevos Miembros',
                        'Ajouter tous comme Nouveaux Membres',
                        'Append all as New Members'
                      )}
                    </option>
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
                    {isAllSelected
                      ? tr('Deseleksyone Tout', 'Deseleccionar Todos', 'Tout Désélectionner', 'Unselect All')
                      : tr('Seleksyone Tout', 'Seleccionar Todos', 'Tout Sélectionner', 'Select All')}
                  </button>
                  <span className="text-xs text-slate-500">
                    {tr(
                      `${filteredPreview.length} sou ${membersToPreview.length} afiche`,
                      `${filteredPreview.length} de ${membersToPreview.length} mostrados`,
                      `${filteredPreview.length} sur ${membersToPreview.length} affichés`,
                      `${filteredPreview.length} of ${membersToPreview.length} shown`
                    )}
                  </span>
                </div>

                <div className="relative sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder={tr(
                      'Chèche pa non, MemberID, telefòn...',
                      'Buscar por nombre, MemberID, teléfono...',
                      'Rechercher par nom, MemberID, tél...',
                      'Search by name, MemberID, phone...'
                    )}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* PREVIEW TABLE */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/40">
                <div className="max-h-64 overflow-y-auto">
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
                        <th className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-emerald-400" />
                            <span>MemberID</span>
                          </span>
                        </th>
                        <th className="py-2.5 px-3">{tr('Non Konplè', 'Nombre Completo', 'Nom Complet', 'Full Name')}</th>
                        <th className="py-2.5 px-3">{tr('Telefòn', 'Teléfono', 'Téléphone', 'Phone')}</th>
                        <th className="py-2.5 px-3">{tr('Depatman & Wòl', 'Departamento & Rol', 'Département & Rôle', 'Dept & Role')}</th>
                        <th className="py-2.5 px-3">{tr('Dokiman Legal', 'Documento Legal', 'Document Légal', 'Legal ID')}</th>
                        <th className="py-2.5 px-3 text-right">PIN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {filteredPreview.map(({ m, originalIndex }) => {
                        const isSelected = selectedIndices[originalIndex] !== false;
                        const willPreserveId = Boolean(m.memberId && preserveMemberIds);
                        return (
                          <tr
                            key={originalIndex}
                            className={`transition-colors ${
                              isSelected ? 'hover:bg-slate-800/40' : 'opacity-40 bg-slate-950/30'
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
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {willPreserveId ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                                  {m.memberId}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Auto</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-white">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span>{m.fullName}</span>
                                  {m.gender && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                                      {m.gender === 'male'
                                        ? tr('Gason', 'Masc', 'H', 'M')
                                        : tr('Fi', 'Fem', 'F', 'F')}
                                    </span>
                                  )}
                                  {m.status === 'inactive' && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase">
                                      {tr('Inaktif', 'Inactivo', 'Inactif', 'Inactive')}
                                    </span>
                                  )}
                                </div>
                                {m.joinedDate && (
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    {tr('Admisyon:', 'Ingreso:', 'Admis :', 'Joined:')} {m.joinedDate}
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
                                  {m.legalDocumentType ? m.legalDocumentType.toUpperCase() : 'DOC'}:{' '}
                                  {m.legalDocumentNumber}
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
                <strong className="block font-bold">
                  {tr(
                    'Avètisman sou kèk ranje:',
                    'Advertencia en algunas filas:',
                    'Avertissement sur certaines lignes :',
                    'Warnings on some rows:'
                  )}
                </strong>
                <ul className="list-disc list-inside space-y-0.5 mt-1 text-[11px] text-rose-300/90">
                  {parsedData.errors.slice(0, 3).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {parsedData.errors.length > 3 && (
                    <li>
                      {tr(
                        `...ak ${parsedData.errors.length - 3} lòt ranje ki pa t ka trete.`,
                        `...y otras ${parsedData.errors.length - 3} filas que no pudieron procesarse.`,
                        `...et ${parsedData.errors.length - 3} autres lignes ignorées.`,
                        `...and ${parsedData.errors.length - 3} more rows could not be parsed.`
                      )}
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
            {tr('Fèmen', 'Cerrar', 'Fermer', 'Close')}
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
                    <span>{tr('N ap migre...', 'Migrando...', 'Migration...', 'Migrating...')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>
                      {tr(
                        `Migre & Enpòte ${selectedCount} Manm Kounye a`,
                        `Migrar e Importar ${selectedCount} Miembros Ahora`,
                        `Migrer & Importer ${selectedCount} Membres`,
                        `Migrate & Import ${selectedCount} Members Now`
                      )}
                    </span>
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
