import React, { useState } from 'react';
import { Church, Member, Language } from '../../types';
import { deleteMember, updateMemberNotes, getMemberAttendanceHistory } from '../../utils/storage';
import { DigitalIdCard } from '../DigitalIdCard';
import { PrintMemberCardModal } from '../PrintMemberCardModal';
import { AdminAddMemberModal } from './AdminAddMemberModal';
import { AdminEditMemberModal } from './AdminEditMemberModal';
import { AdminChangeRoleModal } from './AdminChangeRoleModal';
import { AdminImportMembersModal } from './AdminImportMembersModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { exportMembersListToPdf, exportSingleMemberAttendanceToPdf } from '../../utils/pdfReportExporter';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit,
  Edit3,
  Eye,
  EyeOff,
  QrCode,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  X,
  Printer,
  Plus,
  CheckCircle2,
  FileText,
  Lock,
  Save,
  Tag,
  Bookmark,
  Check,
  Clock,
  ChevronDown,
  SlidersHorizontal,
  ArrowRight,
  Upload,
  Download,
  Crown,
  RefreshCw,
  BadgeCheck,
} from 'lucide-react';
import { hasActiveChurchLicense } from '../../utils/developerStorage';

interface AdminMembersProps {
  church: Church;
  members: Member[];
  onMembersChange?: () => void;
  language?: Language;
  onNavigateToCards?: (member?: Member) => void;
}

export const AdminMembers: React.FC<AdminMembersProps> = ({
  church,
  members,
  onMembersChange,
  language = 'ht',
  onNavigateToCards,
}) => {
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  // Verification privilege: only licensed churches and their members show official verified badge
  const isChurchLicensed = hasActiveChurchLicense(church.id);

  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printingMember, setPrintingMember] = useState<Member | null>(null);
  const [isRefreshingMembers, setIsRefreshingMembers] = useState<boolean>(false);

  const handleRefreshMembers = () => {
    setIsRefreshingMembers(true);
    if (onMembersChange) {
      onMembersChange();
    }
    setTimeout(() => {
      setIsRefreshingMembers(false);
      toast.success(
        isEs ? 'Lista de Miembros Actualizada' : isEn ? 'Members List Refreshed' : isFr ? 'Liste des Membres Actualisée' : 'Lis Manm Rafrechi',
        isEs
          ? 'Los datos de los miembros se han actualizado con éxito.'
          : isEn
          ? 'Members data has been refreshed successfully.'
          : isFr
          ? 'Les données des membres ont été actualisées avec succès.'
          : 'Lis manm yo ak tout enfòmasyon yo mete ajou.'
      );
    }, 450);
  };

  const handleOpenPrintCards = (targetMember?: Member | null) => {
    if (onNavigateToCards) {
      onNavigateToCards(targetMember || undefined);
    } else {
      setPrintingMember(targetMember || null);
      setIsPrintModalOpen(true);
    }
  };
  const [roleChangingMember, setRoleChangingMember] = useState<Member | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  const toggleFocusMode = () => {
    const nextMode = !isFocusMode;
    setIsFocusMode(nextMode);
    if (nextMode) {
      toast.info(
        isEs ? 'Modo Focus Activo' : isEn ? 'Focus Mode Active' : isFr ? 'Mode Focus Actif' : 'Mòd Focus Aktif',
        isEs
          ? 'Información confidencial (notas pastorales, PIN, contactos) oculta para presentaciones.'
          : isEn
          ? 'Confidential information (pastoral notes, PIN, contacts) masked for presentations.'
          : isFr
          ? 'Informations confidentielles (notes pastorales, PIN, contacts) masquées pour les présentations.'
          : 'Enfòmasyon konfidansyèl (nòt pastoral, PIN, kontak) maske pou prezantasyon.'
      );
    } else {
      toast.success(
        isEs ? 'Modo Focus Desactivado' : isEn ? 'Focus Mode Disabled' : isFr ? 'Mode Focus Désactivé' : 'Mòd Focus Dezaktive',
        isEs
          ? 'La información está disponible nuevamente para la administración.'
          : isEn
          ? 'Information is available again for administration.'
          : isFr
          ? 'Les informations sont à nouveau visibles pour l’administration.'
          : 'Enfòmasyon yo disponib ankò pou administrasyon.'
      );
    }
  };

  const handleDisableFocusMode = () => {
    setIsFocusMode(false);
    toast.info(
      isEs ? 'Modo Focus Desactivado' : isEn ? 'Focus Mode Disabled' : isFr ? 'Mode Focus Désactivé' : 'Mòd Focus Dezaktive',
      isEs
        ? 'La información está disponible nuevamente para la administración.'
        : isEn
        ? 'Information is available again for administration.'
        : isFr
        ? 'Les informations sont à nouveau visibles pour l’administration.'
        : 'Enfòmasyon yo disponib ankò pou administrasyon.'
    );
  };

  // Focus Mode helpers to sanitize displayed private information
  const maskPhone = (phone: string) => {
    if (!phone) return '';
    const clean = phone.trim();
    if (clean.length <= 4) return '••••••';
    return clean.slice(0, 4) + ' ••••-••' + clean.slice(-2);
  };

  const maskEmail = (email?: string) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return '••••••••@••••';
    const [name, domain] = parts;
    const maskedName = name.length > 2 ? `${name.slice(0, 2)}••••` : '••••';
    return `${maskedName}@${domain}`;
  };

  // Pastoral Private Notes State
  const [notingMember, setNotingMember] = useState<Member | null>(null);
  const [pastoralNoteText, setPastoralNoteText] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [noteSaveSuccess, setNoteSaveSuccess] = useState<boolean>(false);

  const handleOpenPastoralNotes = (member: Member) => {
    setNotingMember(member);
    setPastoralNoteText(member.notes || '');
    setNoteSaveSuccess(false);
  };

  const handleSavePastoralNotes = () => {
    if (!notingMember) return;
    setIsSavingNote(true);
    updateMemberNotes(church.id, notingMember.id, pastoralNoteText);
    setIsSavingNote(false);
    setNoteSaveSuccess(true);
    if (typeof onMembersChange === 'function') {
      onMembersChange();
    }
    toast.success(
      isEs ? 'Nota Pastoral Guardada' : isEn ? 'Pastoral Note Saved' : isFr ? 'Note Pastorale Enregistrée' : 'Nòt Pastoral Anrejistre',
      isEs
        ? `Nota privada para ${notingMember.fullName} guardada exitosamente.`
        : isEn
        ? `Private note for ${notingMember.fullName} saved successfully.`
        : isFr
        ? `Note privée pour ${notingMember.fullName} enregistrée avec succès.`
        : `Nòt prive pou ${notingMember.fullName} anrejistre avèk siksè.`
    );
    setTimeout(() => {
      setNoteSaveSuccess(false);
    }, 2500);
  };

  const handleInsertTag = (tag: string) => {
    const today = new Date().toLocaleDateString(isEs ? 'es-ES' : isEn ? 'en-US' : 'fr-FR');
    const addition = `\n• [${today} - ${tag}]: `;
    setPastoralNoteText((prev) => (prev ? `${prev.trim()}${addition}` : `• [${today} - ${tag}]: `));
  };

  const handleInsertCurrentDate = () => {
    const now = new Date();
    const dateLocale = isEs ? 'es-ES' : isEn ? 'en-US' : 'fr-FR';
    const dateStr = `${now.toLocaleDateString(dateLocale)} ${now.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}`;
    const addition = `\n📅 [${dateStr}]: `;
    setPastoralNoteText((prev) => (prev ? `${prev.trim()}${addition}` : `📅 [${dateStr}]: `));
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const sTerm = (searchTerm || '').trim().toLowerCase();
    const matchesSearch =
      !sTerm ||
      (m.fullName || '').toLowerCase().includes(sTerm) ||
      (m.memberId || '').toLowerCase().includes(sTerm) ||
      (m.phone || '').includes(searchTerm || '') ||
      (m.email || '').toLowerCase().includes(sTerm) ||
      (m.role && m.role.toLowerCase().includes(sTerm));

    const matchesDept =
      departmentFilter === 'all' || m.department === departmentFilter;

    return matchesSearch && matchesDept;
  });

  const handleDelete = (member: Member) => {
    setMemberToDelete(member);
  };

  const handleConfirmDelete = () => {
    if (!memberToDelete) return;
    deleteMember(church.id, memberToDelete.id);
    if (typeof onMembersChange === 'function') {
      onMembersChange();
    }
    toast.info(
      isEs ? 'Miembro Eliminado' : isEn ? 'Member Deleted' : isFr ? 'Membre Supprimé' : 'Manm Efase',
      isEs
        ? `${memberToDelete.fullName} (${memberToDelete.memberId}) eliminado de la base de datos.`
        : isEn
        ? `${memberToDelete.fullName} (${memberToDelete.memberId}) removed from the database.`
        : isFr
        ? `${memberToDelete.fullName} (${memberToDelete.memberId}) retiré de la base de données.`
        : `${memberToDelete.fullName} (${memberToDelete.memberId}) retire nan baz done a.`
    );
    if (viewingMember?.id === memberToDelete.id) {
      setViewingMember(null);
    }
    setMemberToDelete(null);
  };

  const handleExportMembersPdf = async () => {
    if (filteredMembers.length === 0) {
      toast.info(
        isEs ? 'Sin miembros' : isEn ? 'No members' : isFr ? 'Aucun membre' : 'Pa gen manm',
        isEs ? 'No hay miembros en la lista para exportar.' : isEn ? 'There are no members in the list to export.' : isFr ? 'Il n’y a aucun membre dans la liste à exporter.' : 'Pa gen okenn manm nan lis la pou ekspòte.'
      );
      return;
    }
    try {
      const filterLabel =
        departmentFilter !== 'all' || searchTerm
          ? [
              searchTerm ? (isEs ? `Búsqueda: "${searchTerm}"` : isEn ? `Search: "${searchTerm}"` : isFr ? `Recherche : "${searchTerm}"` : `Rechèch: "${searchTerm}"`) : '',
              departmentFilter !== 'all' ? (isEs ? `Departamento: ${departmentFilter}` : isEn ? `Department: ${departmentFilter}` : isFr ? `Département : ${departmentFilter}` : `Depatman: ${departmentFilter}`) : '',
            ]
              .filter(Boolean)
              .join(' | ')
          : undefined;

      await exportMembersListToPdf({
        church,
        members: filteredMembers,
        filterLabel,
      });

      toast.success(
        isEs ? '¡Lista de Miembros PDF Descargada!' : isEn ? 'Members List PDF Downloaded!' : isFr ? 'Liste des Membres PDF Téléchargée !' : 'Lis Manm PDF Telechaje!',
        isEs
          ? `Archivo PDF con ${filteredMembers.length} miembros generado exitosamente.`
          : isEn
          ? `PDF file with ${filteredMembers.length} members generated successfully.`
          : isFr
          ? `Fichier PDF avec ${filteredMembers.length} membres généré avec succès.`
          : `Fichye PDF ak ${filteredMembers.length} manm yo jenere avèk siksè.`
      );
    } catch (err) {
      toast.error(
        isEs ? 'Error de Exportación' : isEn ? 'Export Error' : isFr ? 'Erreur d’Exportation' : 'Erè Ekspòtasyon',
        isEs ? 'Ocurrió un problema al generar el PDF.' : isEn ? 'A problem occurred while generating the PDF.' : isFr ? 'Un problème est survenu lors de la génération du PDF.' : 'Gen yon pwoblèm ki rive pandan jenerasyon PDF la.'
      );
    }
  };

  const handleExportSingleMemberPdf = async (member: Member) => {
    try {
      const memberRecords = getMemberAttendanceHistory(church.id, member.memberId);
      await exportSingleMemberAttendanceToPdf({
        church,
        member,
        records: memberRecords,
      });
      toast.success(
        isEs ? '¡Registro de Asistencia PDF Descargado!' : isEn ? 'Attendance PDF Downloaded!' : isFr ? 'Fiche de Présence PDF Téléchargée !' : 'Dosye Prezans PDF Telechaje!',
        isEs
          ? `Historial de asistencia de ${member.fullName} (${memberRecords.length} asistencias) exportado a un archivo PDF.`
          : isEn
          ? `Attendance history of ${member.fullName} (${memberRecords.length} check-ins) exported to PDF.`
          : isFr
          ? `Historique de présence de ${member.fullName} (${memberRecords.length} présences) exporté en PDF.`
          : `Istwa prezans ${member.fullName} (${memberRecords.length} prezans) ekspòte nan yon dosye PDF.`
      );
    } catch (err) {
      toast.error(
        isEs ? 'Error de Exportación' : isEn ? 'Export Error' : isFr ? 'Erreur d’Exportation' : 'Erè Ekspòtasyon',
        isEs ? 'Ocurrió un problema al generar el PDF.' : isEn ? 'A problem occurred while generating the PDF.' : isFr ? 'Un problème est survenu lors de la génération du PDF.' : 'Gen yon pwoblèm ki rive pandan jenerasyon PDF la.'
      );
    }
  };

  const departmentsList = [
    'Service Général',
    'Dominical',
    'Étude Biblique',
    'Intercession',
    'Jeunesse',
    'Club des Enfants',
    'Chorale',
    'Accueil & Protocole',
    'Son & Média',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER & ADD BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {isEs ? 'Sistema de Gestión de Miembros' : isEn ? 'Member Management System' : isFr ? 'Système de Gestion des Membres' : 'Sistèm Jesyon Manm yo'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold font-mono">
              {members.length} {isEs ? 'Miembros' : isEn ? 'Members' : isFr ? 'Membres' : 'Manm'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            {isEs
              ? `Creación automática de Member ID, código QR y código de barras personalizado para ${church.name}.`
              : isEn
              ? `Automatic generation of Member ID, QR code, and barcode customized for ${church.name}.`
              : isFr
              ? `Création automatique de l'identifiant membre, du code QR et du code-barres pour ${church.name}.`
              : `Kreyasyon otomatik Member ID, kòd QR & Barcode pèsonalize pou ${church.name}.`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            id="btn-admin-members-refresh"
            onClick={handleRefreshMembers}
            disabled={isRefreshingMembers}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#182234] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title={isEs ? 'Refrescar Lista de Miembros' : isEn ? 'Refresh Members List' : isFr ? 'Rafraîchir la Liste des Membres' : 'Rafrechi Lis Manm yo'}
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshingMembers ? 'animate-spin' : ''}`} />
            <span>{isEs ? 'Refrescar' : isEn ? 'Refresh' : isFr ? 'Rafraîchir' : 'Rafrechi'}</span>
          </button>

          {/* FOCUS MODE TOGGLE (ULTRA PRO MAX) */}
          <button
            type="button"
            id="btn-toggle-focus-mode"
            onClick={toggleFocusMode}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
              isFocusMode
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 hover:bg-emerald-500/30 ring-1 ring-emerald-400/30'
                : 'bg-[#182234] hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
            }`}
            title={
              isFocusMode
                ? (isEs ? 'Desactivar Modo Focus' : isEn ? 'Disable Focus Mode' : isFr ? 'Désactiver le Mode Focus' : 'Dezaktive Mòd Focus')
                : (isEs
                    ? 'Activar Modo Focus para ocultar información privada al proyectar o compartir pantalla'
                    : isEn
                    ? 'Enable Focus Mode to mask confidential data during presentations or screen sharing'
                    : isFr
                    ? 'Activer le Mode Focus pour masquer les données confidentielles lors des projections'
                    : 'Aktive Mòd Focus pou maske enfòmasyon prive lè w ap montre ekran an')
            }
          >
            {isFocusMode ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>{isEs ? 'Modo Focus (Activo)' : isEn ? 'Focus Mode (Active)' : isFr ? 'Mode Focus (Actif)' : 'Focus Mode (Aktif)'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-slate-400" />
                <span>{isEs ? 'Modo Focus' : isEn ? 'Focus Mode' : isFr ? 'Mode Focus' : 'Focus Mode'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="btn-export-members-pdf"
            onClick={handleExportMembersPdf}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#182234] hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 font-bold text-xs shadow-sm transition-all cursor-pointer"
            title={isEs ? 'Exportar toda la lista de miembros o los resultados de búsqueda a un PDF oficial' : isEn ? 'Export member list or search results to an official PDF' : isFr ? 'Exporter toute la liste des membres ou les résultats de recherche en PDF officiel' : 'Ekspòte tout lis manm yo oswa rezilta rechèch aktyèl la nan yon dokiman PDF ofisyèl'}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isEs ? 'Exportar Lista PDF' : isEn ? 'Export Members PDF' : isFr ? 'Exporter Liste PDF' : 'Ekspòte Lis PDF'}</span>
          </button>

          <button
            type="button"
            id="btn-open-import-members-modal"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#182234] hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-400 font-bold text-xs shadow-sm transition-all cursor-pointer"
            title={isEs ? 'Importar lista masiva de miembros (texto, CSV o código JSON)' : isEn ? 'Bulk import members (text, CSV or JSON code)' : isFr ? 'Importer une liste massive de membres (texte, CSV ou code JSON)' : 'Enpòte yon lis manm an gwo (fichye tèks, CSV oswa kòd JSON)'}
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>{isEs ? 'Importar Miembros (Masivo)' : isEn ? 'Import Members (Bulk)' : isFr ? 'Importer Membres (En Masse)' : 'Enpòte Manm (An Gwo / Kòd)'}</span>
          </button>

          <button
            type="button"
            id="btn-open-batch-print-modal"
            onClick={() => handleOpenPrintCards(null)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#182234] hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>{isEs ? 'Imprimir Carnets (Lote)' : isEn ? 'Print Badges (Batch)' : isFr ? 'Imprimer Cartes (Lot)' : 'Enprime Kat Fizik (Batch)'}</span>
          </button>
          <button
            type="button"
            id="btn-open-add-member-modal"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02]"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>{isEs ? 'Agregar Nuevo Miembro' : isEn ? 'Add New Member' : isFr ? 'Ajouter Nouveau Membre' : 'Ajoute Nouvo Manm'}</span>
          </button>
        </div>
      </div>

      {/* FOCUS MODE ACTIVE BANNER */}
      {isFocusMode && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <strong className="block font-bold text-white text-xs">
                {isEs ? 'Modo Focus Activo — Protección de Datos Privados' : isEn ? 'Focus Mode Active — Private Data Protection' : isFr ? 'Mode Focus Actif — Protection des Données Confidentielles' : 'Mòd Focus Aktif — Pwoteksyon Done Prive'}
              </strong>
              <span className="text-[11px] text-emerald-300/90">
                {isEs
                  ? 'Notas pastorales privadas, códigos PIN y contactos sensibles ocultos para proteger la privacidad.'
                  : isEn
                  ? 'Private pastoral notes, PIN codes, and sensitive contacts masked for privacy.'
                  : isFr
                  ? 'Notes pastorales privées, codes PIN et contacts sensibles masqués pour protéger la confidentialité.'
                  : 'Nòt pastoral prive, kòd PIN ak kontak sansib maske pou anpeche lòt moun wè yo pandan w ap montre ekran an.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            id="btn-disable-focus-mode-banner"
            onClick={handleDisableFocusMode}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
          >
            {isEs ? 'Desactivar' : isEn ? 'Disable' : isFr ? 'Désactiver' : 'Dezaktive'}
          </button>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            id="input-search-members"
            placeholder={isEs ? 'Buscar por nombre, ID de miembro (ej: CH001-JD4827), teléfono o correo...' : isEn ? 'Search by name, Member ID (e.g. CH001-JD4827), phone, or email...' : isFr ? 'Rechercher par nom, Identifiant Membre (ex: CH001-JD4827), téléphone ou email...' : 'Chèche pa non, Member ID (eg: CH001-JD4827), telefòn, oswa imèl...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#1E293B] text-slate-100 placeholder:text-slate-500 rounded-xl border border-slate-700/80 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 shadow-sm"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            id="select-filter-department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full py-2.5 px-3 text-xs bg-[#1E293B] text-slate-200 rounded-xl border border-slate-700/80 font-medium focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 shadow-sm cursor-pointer"
          >
            <option value="all">{isEs ? 'Todos los Departamentos' : isEn ? 'All Departments' : isFr ? 'Tous les Départements' : 'Tout Depatman Yo'}</option>
            {departmentsList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MEMBERS TABLE */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-700/80 shadow-sm overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-4">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            {members.length === 0 ? (
              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-sm font-semibold text-white">
                  {isEs ? 'Esta iglesia aún no tiene ningún miembro registrado.' : isEn ? 'This church does not have any registered members yet.' : isFr ? 'Cette église n’a encore aucun membre enregistré.' : 'Legliz sa a poko gen okenn manm anrejistre.'}
                </p>
                <p className="text-xs text-slate-400">
                  {isEs
                    ? 'Puede agregar un primer miembro manualmente o importar una lista masiva desde Excel / CSV / JSON.'
                    : isEn
                    ? 'You can add a first member manually or import a bulk list from Excel / CSV / JSON.'
                    : isFr
                    ? 'Vous pouvez ajouter un premier membre manuellement ou importer une liste massive depuis Excel / CSV / JSON.'
                    : 'Ou ka ajoute yon premye manm alamen oswa enpòte yon gwo lis manm soti nan yon fichye Excel / CSV / JSON.'}
                </p>
                <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Importar Lista Masiva' : isEn ? 'Import Bulk List' : isFr ? 'Importer Liste En Masse' : 'Enpòte Lis Manm an Gwo'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Agregar Primer Miembro' : isEn ? 'Add First Member' : isFr ? 'Ajouter Premier Membre' : 'Ajoute Premye Manm'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isEs ? 'Ningún miembro coincide con su búsqueda.' : isEn ? 'No members match your search.' : isFr ? 'Aucun membre ne correspond à votre recherche.' : 'Pa gen okenn manm ki koresponn ak rechèch ou a.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setDepartmentFilter('all');
                  }}
                  className="text-xs text-amber-400 font-semibold underline cursor-pointer"
                >
                  {isEs ? 'Limpiar filtros' : isEn ? 'Clear filters' : isFr ? 'Effacer les filtres' : 'Efase filtè yo'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700/80">
                <tr>
                  <th className="py-3.5 px-4">{isEs ? 'Miembro / Nombre' : isEn ? 'Member / Name' : isFr ? 'Membre / Nom' : 'Manm / Non'}</th>
                  <th className="py-3.5 px-4">{isEs ? 'Member ID (Único)' : isEn ? 'Member ID (Unique)' : isFr ? 'ID Membre (Unique)' : 'Member ID (Inik)'}</th>
                  <th className="py-3.5 px-4">{isEs ? 'Departamento' : isEn ? 'Department' : isFr ? 'Département' : 'Depatman'}</th>
                  <th className="py-3.5 px-4">{isEs ? 'Contacto' : isEn ? 'Contact' : isFr ? 'Contact' : 'Kontak'}</th>
                  <th className="py-3.5 px-4">{isEs ? 'Rol' : isEn ? 'Role' : isFr ? 'Rôle' : 'Wòl'}</th>
                  <th className="py-3.5 px-4 text-right">{isEs ? 'Acciones' : isEn ? 'Actions' : isFr ? 'Actions' : 'Aksyon'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-medium">
                {filteredMembers.map((m) => (
                  <React.Fragment key={m.id}>
                    <tr
                      id={`member-row-${m.id}`}
                      className={`hover:bg-slate-800/80 transition-colors ${
                        expandedMemberId === m.id ? 'bg-slate-800/60 border-l-2 border-amber-400' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {m.avatarUrl || m.googlePhoto ? (
                              <img
                                src={m.avatarUrl || m.googlePhoto}
                                alt={m.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              m.fullName?.[0] || 'M'
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white block">
                                {m.fullName}
                              </span>
                              {isChurchLicensed && (
                                <BadgeCheck
                                  className="w-3.5 h-3.5 text-sky-400 shrink-0"
                                  title={isEs ? 'Miembro de Iglesia con Licencia Verificada' : 'Manm legliz verifye ak lisans ofisyèl'}
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <span>{isEs ? 'Ingreso:' : isEn ? 'Joined:' : isFr ? 'Admis :' : 'Admisyon:'} {m.joinedDate}</span>
                              {m.legalDocumentNumber && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-400/80 font-mono">
                                    {m.legalDocumentType ? m.legalDocumentType.toUpperCase() : 'DOC'}: {m.legalDocumentNumber}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-extrabold text-[11px] block w-fit">
                          {m.memberId}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1">
                          <span>PIN:</span>
                          {isFocusMode ? (
                            <span className="text-slate-500 font-bold tracking-widest" title={isEs ? 'Código PIN oculto en Modo Focus' : isEn ? 'PIN code masked in Focus Mode' : isFr ? 'Code PIN masqué en Mode Focus' : 'Kòd PIN maske nan Mòd Focus'}>
                              •••• <span className="text-[9px] text-emerald-400 font-normal">[{isEs ? 'Oculto' : isEn ? 'Hidden' : isFr ? 'Masqué' : 'Maske'}]</span>
                            </span>
                          ) : (
                            <>
                              <strong className="text-emerald-400">
                                {revealedPins[m.id] ? (m.pin || (isEs ? 'No definido' : isEn ? 'Not set' : isFr ? 'Non défini' : 'Pa defini')) : '••••'}
                              </strong>
                              <button
                                type="button"
                                onClick={() => setRevealedPins(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                title={revealedPins[m.id] ? (isEs ? 'Ocultar PIN' : isEn ? 'Hide PIN' : isFr ? 'Masquer le PIN' : 'Kache PIN') : (isEs ? 'Ver PIN' : isEn ? 'View PIN' : isFr ? 'Afficher le PIN' : 'Gade PIN')}
                                className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                              >
                                {revealedPins[m.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold">
                          {m.department}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] space-y-0.5 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{isFocusMode ? maskPhone(m.phone) : m.phone}</span>
                        </div>
                        {m.email && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span className="truncate max-w-[140px]">
                              {isFocusMode ? maskEmail(m.email) : m.email}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                        <button
                          type="button"
                          id={`btn-role-badge-${m.id}`}
                          onClick={() => setRoleChangingMember(m)}
                          title={
                            isEs
                              ? `Cambiar rol de ${m.fullName} (actual: ${m.role || 'Miembro'})`
                              : isFr
                              ? `Changer le rôle de ${m.fullName} (actuel: ${m.role || 'Membre'})`
                              : isEn
                              ? `Change role for ${m.fullName} (current: ${m.role || 'Member'})`
                              : `Klike pou chanje wòl ${m.fullName} (kounye a: ${m.role || 'Manm'} - Dirijan, Predikatè, Lektè, elatriye)`
                          }
                          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-amber-400/20 text-indigo-300 hover:text-amber-300 border border-indigo-500/30 hover:border-amber-400/50 text-[11px] font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                        >
                          <Crown className="w-3 h-3 text-amber-400 group-hover:rotate-12 transition-transform" />
                          <span>{m.role || (isEs ? 'Miembro' : isFr ? 'Membre' : isEn ? 'Member' : 'Manm')}</span>
                          <span className="text-[9px] opacity-60 text-slate-400 group-hover:text-amber-300">✎</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Accordion Menu Trigger */}
                          <button
                            type="button"
                            id={`btn-toggle-member-accordion-${m.id}`}
                            onClick={() => setExpandedMemberId(prev => prev === m.id ? null : m.id)}
                            title={isEs ? 'Abrir / Cerrar Menú de Acciones' : isEn ? 'Open / Close Action Menu' : isFr ? 'Ouvrir / Fermer Menu d’Actions' : 'Ouvri / Fèmen Menu Akòdeyon Aksyon'}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              expandedMemberId === m.id
                                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-amber-400/50 hover:text-amber-300'
                            }`}
                          >
                            <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                            <span>{isEs ? 'Acciones' : isEn ? 'Actions' : isFr ? 'Actions' : 'Aksyon'}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                expandedMemberId === m.id ? 'rotate-180 text-slate-950' : 'text-slate-400'
                              }`}
                            />
                          </button>

                          {/* Quick Icon: Change Role & Title (👑) */}
                          <button
                            type="button"
                            id={`btn-quick-change-role-${m.id}`}
                            onClick={() => setRoleChangingMember(m)}
                            title={isEs ? 'Cambiar Rol & Título (Dirigente, Predicador, Lector...)' : isEn ? 'Change Role & Title (Leader, Preacher, Reader...)' : isFr ? 'Changer Rôle & Titre (Dirigeant, Prédicateur, Lecteur...)' : 'Chanje Wòl & Tit (Dirijan, Predikatè, Lektè, elatriye)'}
                            className="p-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 transition-colors cursor-pointer"
                          >
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                          </button>

                          {/* Quick Icon: Pastoral Notes */}
                          <button
                            type="button"
                            id={`btn-pastoral-notes-${m.id}`}
                            onClick={() => handleOpenPastoralNotes(m)}
                            title={
                              isFocusMode
                                ? (isEs ? '🔒 Modo Focus Activo (Notas Pastorales Ocultas)' : isEn ? '🔒 Focus Mode Active (Pastoral Notes Masked)' : isFr ? '🔒 Mode Focus Actif (Notes Pastorales Masquées)' : '🔒 Mòd Focus Aktif (Nòt Pastoral Konfidansyèl Maske)')
                                : m.notes?.trim()
                                ? (isEs ? `Ver / Editar Nota Pastoral (${m.notes.slice(0, 30)}...)` : isEn ? `View / Edit Pastoral Note (${m.notes.slice(0, 30)}...)` : isFr ? `Voir / Modifier Note Pastorale (${m.notes.slice(0, 30)}...)` : `Wè / Modifye Nòt Pastoral Prive (${m.notes.slice(0, 30)}...)`)
                                : (isEs ? 'Agregar Nota Pastoral Privada (Confidencial)' : isEn ? 'Add Private Pastoral Note (Confidential)' : isFr ? 'Ajouter Note Pastorale Privée (Confidentiel)' : 'Ajoute Nòt Pastoral Prive (Konfidansyèl)')
                            }
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer relative ${
                              isFocusMode
                                ? 'bg-slate-900/90 text-slate-500 border-slate-800 hover:text-amber-300 hover:border-slate-700'
                                : m.notes?.trim()
                                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 hover:bg-amber-400/30 ring-1 ring-amber-400/30 shadow-sm'
                                : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-amber-300 hover:border-slate-600'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {!isFocusMode && m.notes?.trim() && (
                              <span
                                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900 shadow-sm"
                                title={isEs ? 'Hay una nota pastoral guardada' : isEn ? 'Pastoral note saved' : isFr ? 'Note pastorale enregistrée' : 'Gen yon nòt pastoral ki deja anrejistre'}
                              />
                            )}
                            {isFocusMode && (
                              <span
                                className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 shadow-sm"
                                title={isEs ? 'Modo Focus Activo' : isEn ? 'Focus Mode Active' : isFr ? 'Mode Focus Actif' : 'Mòd Focus Aktif'}
                              />
                            )}
                          </button>

                          {/* Quick Icon: Edit Member (Mete Done Ajou) */}
                          <button
                            type="button"
                            id={`btn-edit-member-${m.id}`}
                            onClick={() => setEditingMember(m)}
                            title={isEs ? 'Actualizar Datos del Miembro (Editar Ficha)' : isEn ? 'Update Member Profile (Edit)' : isFr ? 'Mettre à Jour le Membre (Modifier Fiche)' : 'Mete Done Manm lan Ajou (Modifye Fich)'}
                            className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Icon: Print Card */}
                          <button
                            type="button"
                            id={`btn-print-card-row-${m.id}`}
                            onClick={() => handleOpenPrintCards(m)}
                            title={isEs ? 'Imprimir Carnet Físico' : isEn ? 'Print Physical Badge' : isFr ? 'Imprimer Carte Physique' : 'Enprime Kat Fizik (Print Card)'}
                            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Icon: View Card */}
                          <button
                            type="button"
                            id={`btn-view-card-${m.id}`}
                            onClick={() => setViewingMember(m)}
                            title={isEs ? 'Ver Carnet & QR' : isEn ? 'View Card & QR' : isFr ? 'Voir Carte & QR' : 'Wè Kat Manm & QR'}
                            className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Icon: Delete */}
                          <button
                            type="button"
                            id={`btn-delete-member-${m.id}`}
                            onClick={() => handleDelete(m)}
                            title={isEs ? 'Eliminar Miembro' : isEn ? 'Delete Member' : isFr ? 'Supprimer Membre' : 'Efase Manm'}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED ACCORDION ACTION DRAWER */}
                    {expandedMemberId === m.id && (
                      <tr className="bg-slate-950/70 border-b border-slate-700/80">
                        <td colSpan={6} className="p-4">
                          <div className="bg-[#182234] rounded-2xl border border-slate-700 p-3.5 shadow-inner">
                            <div className="flex items-center justify-between border-b border-slate-700/70 pb-2 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-extrabold text-white">
                                  {isEs ? 'Menú de Acciones' : isEn ? 'Action Menu' : isFr ? 'Menu d’Actions' : 'Menu Akòdeyon Aksyon'} — {m.fullName}
                                </span>
                                <span className="text-[10px] font-mono text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                  {m.memberId}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setExpandedMemberId(null)}
                                className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 cursor-pointer"
                              >
                                {isEs ? 'Cerrar Menú' : isEn ? 'Close Menu' : isFr ? 'Fermer Menu' : 'Fèmen Menu'}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-2.5">
                              {/* Action 0: Chanje Wòl & Tit (👑) */}
                              <button
                                type="button"
                                id={`accordion-act-role-${m.id}`}
                                onClick={() => setRoleChangingMember(m)}
                                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 text-left transition-all group cursor-pointer flex items-start gap-2.5"
                              >
                                <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                  <Crown className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                                    {isEs ? 'Cambiar Rol / Título' : isEn ? 'Change Role / Title' : isFr ? 'Changer Rôle / Titre' : 'Chanje Wòl & Tit'}
                                  </h5>
                                  <p className="text-[10px] text-slate-400">
                                    {isEs ? 'Dirigente, predicador...' : isEn ? 'Leader, preacher...' : isFr ? 'Dirigeant, prédicateur...' : 'Dirijan, predikatè...'}
                                  </p>
                                </div>
                              </button>

                              {/* Action 1: Mete Done Ajou (Modifye) */}
                              <button
                                type="button"
                                id={`accordion-act-edit-${m.id}`}
                                onClick={() => setEditingMember(m)}
                                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-sky-400/60 text-left transition-all group cursor-pointer flex items-start gap-2.5"
                              >
                                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                  <Edit3 className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-100 group-hover:text-sky-300">
                                    {isEs ? 'Actualizar Datos' : isEn ? 'Update Info' : isFr ? 'Mettre à Jour' : 'Mete Done Ajou'}
                                  </h5>
                                  <p className="text-[10px] text-slate-400">
                                    {isEs ? 'Identidad, contacto y rol' : isEn ? 'Identity, contact & role' : isFr ? 'Identité, contact & rôle' : 'Idantite, kontak & wòl'}
                                  </p>
                                </div>
                              </button>

                              {/* Action 2: Nòt Pastoral */}
                              <button
                                type="button"
                                id={`accordion-act-notes-${m.id}`}
                                onClick={() => handleOpenPastoralNotes(m)}
                                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 text-left transition-all group cursor-pointer flex items-start gap-2.5"
                              >
                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                                  isFocusMode
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                                }`}>
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 flex items-center gap-1.5">
                                    {isEs ? 'Nota Pastoral' : isEn ? 'Pastoral Note' : isFr ? 'Note Pastorale' : 'Nòt Pastoral'}
                                    {!isFocusMode && m.notes?.trim() && (
                                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                                    )}
                                    {isFocusMode && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal">
                                        Focus
                                      </span>
                                    )}
                                  </h5>
                                  <p className="text-[10px] text-slate-400 line-clamp-1">
                                    {isFocusMode
                                      ? (isEs ? 'Protección activa' : isEn ? 'Protection active' : isFr ? 'Protection active' : 'Pwoteksyon aktif')
                                      : m.notes?.trim()
                                      ? (isEs ? 'Editar nota' : isEn ? 'Edit note' : isFr ? 'Modifier note' : 'Modifye nòt')
                                      : (isEs ? 'Agregar nota' : isEn ? 'Add note' : isFr ? 'Ajouter note' : 'Ajoute nòt')}
                                  </p>
                                </div>
                              </button>

                              {/* Action 3: Dosye Prezans PDF */}
                              <button
                                type="button"
                                id={`accordion-act-pdf-${m.id}`}
                                onClick={() => handleExportSingleMemberPdf(m)}
                                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-400/60 text-left transition-all group cursor-pointer flex items-start gap-2.5"
                                title={isEs ? 'Exportar todo el historial de asistencia en PDF oficial' : isEn ? 'Export attendance history to official PDF' : isFr ? 'Exporter l’historique de présence en PDF officiel' : 'Ekspòte tout istwa prezans manm sa a nan yon dosye PDF ofisyèl'}
                              >
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                  <Download className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300">
                                    {isEs ? 'Registro de Asistencia PDF' : isEn ? 'Attendance Records PDF' : isFr ? 'Fiche de Présence PDF' : 'Dosye Prezans PDF'}
                                  </h5>
                                  <p className="text-[10px] text-slate-400">
                                    {isEs ? 'Exportar historial de escaneos' : isEn ? 'Export scan history' : isFr ? 'Exporter historique scan' : 'Ekspòte istwa scan manm'}
                                  </p>
                                </div>
                              </button>

                              {/* Action 4: Enprime Kat */}
                              <button
                                type="button"
                                id={`accordion-act-print-${m.id}`}
                                onClick={() => handleOpenPrintCards(m)}
                                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 text-left transition-all group cursor-pointer flex items-start gap-2.5"
                              >
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                  <Printer className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                                    {isEs ? 'Imprimir Carnet Físico' : isEn ? 'Print Physical Badge' : isFr ? 'Imprimer Carte Physique' : 'Enprime Kat Fizik'}
                                  </h5>
                                  <p className="text-[10px] text-slate-400">
                                    {isEs ? 'Carnet ID, QR & Barcode' : isEn ? 'ID Card, QR & Barcode' : isFr ? 'Carte ID, QR & Code-barres' : 'Kat ID, QR & Barcode'}
                                  </p>
                                </div>
                              </button>

                              {/* Action 5: Wè Kat & QR */}
                              <button
                                type="button"
                                id={`accordion-act-view-${m.id}`}
                                onClick={() => setViewingMember(m)}
                                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 text-left transition-all group cursor-pointer flex items-start gap-2.5"
                              >
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                  <QrCode className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                                    {isEs ? 'Ver Carnet & QR' : isEn ? 'View Card & QR' : isFr ? 'Voir Carte & QR' : 'Wè Kat & QR'}
                                  </h5>
                                  <p className="text-[10px] text-slate-400">
                                    {isEs ? 'Carnet digital & PIN' : isEn ? 'Digital card & PIN' : isFr ? 'Carte digitale & PIN' : 'Kat dijital & PIN'}
                                  </p>
                                </div>
                              </button>

                              {/* Action 6: Efase Manm */}
                              <button
                                type="button"
                                id={`accordion-act-delete-${m.id}`}
                                onClick={() => handleDelete(m)}
                                className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-rose-400/60 text-left transition-all group cursor-pointer flex items-start gap-2.5"
                              >
                                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                  <Trash2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-100 group-hover:text-rose-300">
                                    {isEs ? 'Eliminar Miembro' : isEn ? 'Delete Member' : isFr ? 'Supprimer Membre' : 'Efase Manm'}
                                  </h5>
                                  <p className="text-[10px] text-slate-400">
                                    {isEs ? 'Quitar del sistema' : isEn ? 'Remove from system' : isFr ? 'Retirer du système' : 'Retire nan sistèm nan'}
                                  </p>
                                </div>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ULTRA PRO ADD MEMBER MODAL */}
      <AdminAddMemberModal
        church={church}
        existingMembers={members}
        isOpen={isAddModalOpen}
        language={language}
        onClose={() => {
          setIsAddModalOpen(false);
          if (typeof onMembersChange === 'function') {
            onMembersChange();
          }
        }}
        onMemberAdded={(newMember) => {
          setDepartmentFilter('all');
          setSearchTerm('');
          if (typeof onMembersChange === 'function') {
            onMembersChange();
          }
        }}
        onOpenPrintModal={(member) => handleOpenPrintCards(member)}
        onViewDigitalCard={(member) => {
          setViewingMember(member);
        }}
      />

      {/* ULTRA PRO EDIT MEMBER MODAL (METE DONE AJOU) */}
      <AdminEditMemberModal
        church={church}
        member={editingMember}
        existingMembers={members}
        isOpen={!!editingMember}
        language={language}
        onClose={() => setEditingMember(null)}
        onMemberUpdated={(updatedMember) => {
          if (typeof onMembersChange === 'function') {
            onMembersChange();
          }
          if (viewingMember?.id === updatedMember.id) {
            setViewingMember(updatedMember);
          }
        }}
        onOpenPrintModal={(member) => handleOpenPrintCards(member)}
        onViewDigitalCard={(member) => {
          setViewingMember(member);
        }}
      />

      {/* ULTRA PRO CHANGE MEMBER ROLE MODAL */}
      <AdminChangeRoleModal
        church={church}
        member={roleChangingMember}
        isOpen={!!roleChangingMember}
        language={language}
        onClose={() => setRoleChangingMember(null)}
        onMemberUpdated={(updatedMember) => {
          if (typeof onMembersChange === 'function') {
            onMembersChange();
          }
          if (viewingMember?.id === updatedMember.id) {
            setViewingMember(updatedMember);
          }
        }}
      />

      {/* VIEW MEMBER CARD MODAL */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden my-auto p-5 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-sm text-white">
                {isEs ? 'Carnet de Miembro & Código QR' : isFr ? 'Carte de Membre & Code QR' : isEn ? 'Member Card & QR Code' : 'Kat Manm & Kòd QR'} — {viewingMember.fullName}
              </h3>
              <button
                type="button"
                id="btn-close-view-card"
                onClick={() => setViewingMember(null)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <DigitalIdCard member={viewingMember} church={church} showPrintButton={true} language={language} />

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs cursor-pointer"
              >
                {isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT MEMBER CARD MODAL (SINGLE OR BATCH) */}
      {isPrintModalOpen && (
        <PrintMemberCardModal
          church={church}
          initialMember={printingMember || undefined}
          allMembers={members}
          language={language}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPrintingMember(null);
          }}
        />
      )}

      {/* CONFIDENTIAL PASTORAL NOTES MODAL */}
      {notingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden my-auto p-5 sm:p-6 space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between border-b border-slate-700/80 pb-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-white">
                      {isEs ? 'Notas Pastorales Privadas' : isFr ? 'Notes Pastorales Privées' : isEn ? 'Private Pastoral Notes' : 'Nòt Prive Pastoral'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold">
                      {notingMember.memberId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isEs
                      ? `Seguimiento pastoral, intercesión y notas confidenciales para `
                      : isFr
                      ? `Suivi pastoral, intercession et observations confidentielles pour `
                      : isEn
                      ? `Pastoral follow-up, intercession, and confidential notes for `
                      : `Swivi pastoral, entècesyon & obsèvasyon konfidansyèl pou `}
                    <strong className="text-white">{notingMember.fullName}</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-pastoral-notes"
                onClick={() => setNotingMember(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONFIDENTIALITY BANNER & FOCUS MODE ALERT */}
            {isFocusMode ? (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-[11px]">
                    <strong className="block font-bold text-white">
                      {isEs ? 'Modo Focus Activo (Nota Oculta)' : isFr ? 'Mode Focus Actif (Note Masquée)' : isEn ? 'Focus Mode Active (Note Masked)' : 'Mòd Focus Aktif (Nòt la Maske)'}
                    </strong>
                    <span className="text-emerald-200/90">
                      {isEs
                        ? 'El texto de la nota está oculto para evitar lecturas no autorizadas durante presentaciones.'
                        : isFr
                        ? 'Le texte de la note est masqué pour empêcher les lectures non autorisées lors des présentations.'
                        : isEn
                        ? 'Note content is masked to prevent unauthorized viewing during presentations.'
                        : 'Tèks nòt sa a maske pou anpeche moun bò kote w oswa sou ekran prezantasyon an li l.'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-reveal-notes-in-modal"
                  onClick={() => setIsFocusMode(false)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
                >
                  {isEs ? 'Revelar Nota' : isFr ? 'Révéler Note' : isEn ? 'Reveal Note' : 'Revele Nòt'}
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-[11px]">
                  <strong className="block font-bold">
                    {isEs ? 'Confidencialidad Garantizada (Solo Admin y Pastores)' : isFr ? 'Confidentialité Garantie (Admin & Pasteurs Uniquement)' : isEn ? 'Confidentiality Guaranteed (Admin & Pastors Only)' : 'Konfidansyalite Garanti (Admin & Pastè Sèlman)'}
                  </strong>
                  <span>
                    {isEs
                      ? 'Esta nota NUNCA aparecerá en el portal del miembro ni en su carnet digital. Solo el liderazgo tiene acceso.'
                      : isFr
                      ? 'Cette note n’apparaîtra JAMAIS sur le portail du membre ni sur sa carte digitale. Seuls les dirigeants y ont accès.'
                      : isEn
                      ? 'This note will NEVER appear on the member’s portal or digital card. Only leadership has access.'
                      : 'Nòt sa a PAP JANM parèt nan pòtay manm lan ni sou kat dijital la. Se sèlman lidèchip legliz la ki gen aksè a li.'}
                  </span>
                </div>
              </div>
            )}

            {/* MEMBER CONTEXT CHIP */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center border border-slate-700">
                  {notingMember.fullName?.[0] || 'M'}
                </div>
                <div>
                  <span className="font-bold text-white block">{notingMember.fullName}</span>
                  <span className="text-[10px] text-slate-400">{notingMember.department} • {notingMember.role}</span>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <span>Tel: {notingMember.phone}</span>
              </div>
            </div>

            {/* QUICK PASTORAL TAGS & TIMESTAMP */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? 'Categorías y Accesos Rápidos:' : isFr ? 'Catégories & Raccourcis Suivi :' : isEn ? 'Categories & Quick Tags:' : 'Kategori & Raccourcis Swivi:'}</span>
                </label>
                <button
                  type="button"
                  onClick={handleInsertCurrentDate}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <Clock className="w-3 h-3" />
                  <span>{isEs ? 'Insertar Fecha y Hora Actual' : isFr ? 'Insérer Date et Heure Actuelle' : isEn ? 'Insert Current Date & Time' : 'Mete Dat & Lè Jounen an'}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(isEs
                  ? [
                      'Visita Pastoral',
                      'Motivo de Oración',
                      'Seguimiento de Bautismo',
                      'Ayuda Social / Necesidad',
                      'Matrimonio y Familia',
                      'Liderazgo y Compromiso',
                    ]
                  : isFr
                  ? [
                      'Visite Pastorale',
                      'Sujet de Prière',
                      'Suivi de Baptême',
                      'Aide Sociale / Besoin',
                      'Mariage & Famille',
                      'Leadership & Engagement',
                    ]
                  : isEn
                  ? [
                      'Pastoral Visit',
                      'Prayer Request',
                      'Baptism Follow-up',
                      'Social Aid / Need',
                      'Marriage & Family',
                      'Leadership & Commitment',
                    ]
                  : [
                      'Vizit Pastoral',
                      'Sijè Lapriyè',
                      'Swivi Batèm',
                      'Èd Sosyal / Bezwen',
                      'Maryaj & Fanmi',
                      'Lidèchip & Angajman',
                    ]
                ).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertTag(tag)}
                    className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>+ {tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TEXTAREA FOR NOTES */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? 'Contenido de la Nota Pastoral:' : isFr ? 'Contenu de la Note Pastorale :' : isEn ? 'Pastoral Note Content:' : 'Kontni Nòt Pastoral la:'}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {pastoralNoteText.length} {isEs ? 'caracteres' : isFr ? 'caractères' : isEn ? 'characters' : 'karaktè'}
                </span>
              </label>
              <div className="relative">
                <textarea
                  id="textarea-pastoral-notes"
                  rows={6}
                  value={pastoralNoteText}
                  onChange={(e) => setPastoralNoteText(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Escriba observaciones pastorales, necesidades de oración, notas de visitas a hogares, entrevistas o peticiones de ayuda...'
                      : isFr
                      ? 'Saisissez vos observations pastorales, sujets de prière, comptes rendus de visites à domicile, entretiens...'
                      : isEn
                      ? 'Write pastoral observations, prayer requests, home visit notes, interviews, or assistance requests...'
                      : 'Ekri tout obsèvasyon pastoral, bezwen entècesyon, nòt sou vizit lakay, entèvyou oswa demand èd...'
                  }
                  disabled={isFocusMode}
                  className={`w-full p-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 text-xs sm:text-sm font-normal focus:ring-2 focus:ring-amber-400 focus:outline-none resize-y leading-relaxed transition-all ${
                    isFocusMode ? 'filter blur-sm select-none opacity-30 cursor-not-allowed' : ''
                  }`}
                />
                {isFocusMode && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px] rounded-2xl p-4 text-center space-y-2 border border-slate-700/60">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-white max-w-xs">
                      {isEs
                        ? 'Contenido de la Nota Pastoral Oculto por Modo Focus'
                        : isFr
                        ? 'Contenu de la Note Pastorale Masqué par le Mode Focus'
                        : isEn
                        ? 'Pastoral Note Content Masked by Focus Mode'
                        : 'Kontni Nòt Pastoral la Maske pou Prezantasyon'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsFocusMode(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs shadow cursor-pointer transition-colors"
                    >
                      {isEs ? 'Desactivar Modo Focus para Editar' : isFr ? 'Désactiver le Mode Focus pour Modifier' : isEn ? 'Disable Focus Mode to Edit' : 'Dezaktive Mòd Focus pou Modifye'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/80">
              <button
                type="button"
                onClick={() => setNotingMember(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer border border-slate-700"
              >
                {isEs ? 'Cancelar' : isFr ? 'Annuler' : isEn ? 'Cancel' : 'Anile'}
              </button>

              <div className="flex items-center gap-2">
                {noteSaveSuccess && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-fadeIn">
                    <Check className="w-4 h-4" />
                    <span>{isEs ? '¡Nota guardada!' : isFr ? 'Note enregistrée !' : isEn ? 'Note saved!' : 'Nòt anrejistre!'}</span>
                  </span>
                )}
                <button
                  type="button"
                  id="btn-save-pastoral-notes"
                  disabled={isSavingNote}
                  onClick={handleSavePastoralNotes}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>
                    {isSavingNote
                      ? (isEs ? 'Guardando...' : isFr ? 'Enregistrement...' : isEn ? 'Saving...' : 'N ap sove...')
                      : (isEs ? 'Guardar Nota Pastoral' : isFr ? 'Enregistrer Note Pastorale' : isEn ? 'Save Pastoral Note' : 'Anrejistre Nòt Pastoral')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!memberToDelete}
        title={isEs ? 'Confirmar Eliminación de Miembro' : isFr ? 'Confirmer la Suppression du Membre' : isEn ? 'Confirm Member Deletion' : 'Konfime Sipresyon Manm'}
        message={
          isEs
            ? `¿Está seguro de que desea eliminar este miembro de la base de datos de ${church.name}?`
            : isFr
            ? `Êtes-vous sûr de vouloir supprimer ce membre de la base de données de ${church.name} ?`
            : isEn
            ? `Are you sure you want to delete this member from the database of ${church.name}?`
            : `Èske w sèten ou vle efase manm sa a nan baz done legliz ${church.name}?`
        }
        itemName={memberToDelete ? `${memberToDelete.fullName} (${memberToDelete.memberId})` : ''}
        confirmButtonText={isEs ? 'Sí, Eliminar Este Miembro' : isFr ? 'Oui, Supprimer ce Membre' : isEn ? 'Yes, Delete this Member' : 'Wi, Efase Manm Sa a'}
        cancelButtonText={isEs ? 'Cancelar' : isFr ? 'Annuler' : isEn ? 'Cancel' : 'Anile'}
        onConfirm={handleConfirmDelete}
        onClose={() => setMemberToDelete(null)}
      />

      {/* BULK IMPORT MEMBERS MODAL */}
      <AdminImportMembersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        church={church}
        existingMembers={members}
        language={language}
        onMembersImported={() => {
          if (typeof onMembersChange === 'function') {
            onMembersChange();
          }
        }}
      />
    </div>
  );
};
