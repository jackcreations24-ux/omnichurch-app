import React, { useState, useEffect, useMemo } from 'react';
import { Church, Member, Language } from '../../types';
import { updateMember, compressImageToBase64, generateSecureMemberPin } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import {
  Edit3,
  X,
  Save,
  Check,
  User,
  Phone,
  Mail,
  Calendar,
  Building2,
  ShieldCheck,
  QrCode,
  Printer,
  Copy,
  Heart,
  Briefcase,
  MapPin,
  Clock,
  KeyRound,
  FileText,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Tag,
  Upload,
  Camera,
  Trash2,
  FileCheck,
} from 'lucide-react';

interface AdminEditMemberModalProps {
  church: Church;
  member: Member | null;
  existingMembers: Member[];
  isOpen: boolean;
  language?: Language;
  onClose: () => void;
  onMemberUpdated: (updatedMember: Member) => void;
  onOpenPrintModal?: (member: Member) => void;
  onViewDigitalCard?: (member: Member) => void;
}

export const AdminEditMemberModal: React.FC<AdminEditMemberModalProps> = ({
  church,
  member,
  existingMembers,
  isOpen,
  language = 'ht',
  onClose,
  onMemberUpdated,
  onOpenPrintModal,
  onViewDigitalCard,
}) => {
  const toast = useToast();
  const isEs = language === 'es';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'identity' | 'contact' | 'church' | 'security'>('identity');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);

  // Form State
  const [titlePrefix, setTitlePrefix] = useState<string>(isEs ? 'Hno.' : 'Frè');
  const [fullName, setFullName] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [civilStatus, setCivilStatus] = useState<'celibataire' | 'marie' | 'veuf' | 'divorce'>('celibataire');
  const [profession, setProfession] = useState<string>('');
  const [dob, setDob] = useState<string>('');

  // Photo & Legal Document
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [legalDocumentType, setLegalDocumentType] = useState<'cin' | 'nif' | 'passeport' | 'autre'>('cin');
  const [legalDocumentNumber, setLegalDocumentNumber] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  const [phone, setPhone] = useState<string>('');
  const [emergencyPhone, setEmergencyPhone] = useState<string>('');
  const [emergencyContactName, setEmergencyContactName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>(isEs ? 'Santo Domingo' : 'Pòtoprens');
  const [zone, setZone] = useState<string>('');

  const [department, setDepartment] = useState<string>(isEs ? 'Servicio General' : 'Service Général');
  const [role, setRole] = useState<string>(isEs ? 'Miembro' : 'Manm');
  const [baptismDate, setBaptismDate] = useState<string>('');
  const [joinedDate, setJoinedDate] = useState<string>('');
  const [cellGroup, setCellGroup] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [pin, setPin] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Synchronize initial data when modal opens with a member
  useEffect(() => {
    if (member) {
      setTitlePrefix(member.titlePrefix || (isEs ? 'Hno.' : 'Frè'));
      setFullName(member.fullName || '');
      setGender(member.gender || 'male');
      setCivilStatus(member.civilStatus || 'celibataire');
      setProfession(member.profession || '');
      setDob(member.dateOfBirth || '');

      setAvatarUrl(member.avatarUrl || member.googlePhoto || '');
      setLegalDocumentType(member.legalDocumentType || 'cin');
      setLegalDocumentNumber(member.legalDocumentNumber || '');

      setPhone(member.phone || '');
      setEmergencyPhone(member.emergencyContact || '');
      setEmergencyContactName(member.emergencyContactName || '');
      setEmail(member.email || '');
      setAddress(member.address || '');
      setCity(member.city || (isEs ? 'Santo Domingo' : 'Pòtoprens'));
      setZone(member.zone || '');

      setDepartment(member.department || (isEs ? 'Servicio General' : 'Service Général'));
      setRole(member.role || (isEs ? 'Miembro' : 'Manm'));
      setBaptismDate(member.baptismDate || '');
      setJoinedDate(member.joinedDate || new Date().toISOString().split('T')[0]);
      setCellGroup(member.cellGroup || '');
      setStatus(member.status || 'active');

      setPin(member.pin || '');
      setNotes(member.notes || '');
      setFormError(null);
      setActiveTab('identity');
    }
  }, [member, isOpen, isEs]);

  // Duplicate Check Warnings (excluding this member itself)
  const duplicateWarnings = useMemo(() => {
    if (!member) return [];
    const warnings: string[] = [];
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 8) {
      const matchPhone = existingMembers.find(
        (m) => m.id !== member.id && m.phone.replace(/[^0-9]/g, '').includes(cleanPhone)
      );
      if (matchPhone) {
        warnings.push(
          isEs
            ? `Otro miembro llamado "${matchPhone.fullName}" (${matchPhone.memberId}) tiene este mismo número de teléfono.`
            : `Yon lòt manm ki rele "${matchPhone.fullName}" (${matchPhone.memberId}) gen menm nimewo telefòn sa a.`
        );
      }
    }

    const cleanName = fullName.trim().toLowerCase();
    if (cleanName.length >= 4) {
      const matchName = existingMembers.find(
        (m) => m.id !== member.id && (m.fullName || '').toLowerCase() === cleanName
      );
      if (matchName) {
        warnings.push(
          isEs
            ? `Otro miembro llamado "${matchName.fullName}" (${matchName.memberId}) ya está registrado en la iglesia.`
            : `Yon lòt manm ki rele "${matchName.fullName}" (${matchName.memberId}) deja anrejistre.`
        );
      }
    }

    return warnings;
  }, [phone, fullName, existingMembers, member, isEs]);

  // Age calculation
  const calculatedAge = useMemo(() => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [dob]);

  if (!isOpen || !member) return null;

  // Handle Photo Upload
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(
        isEs ? 'Archivo Inválido' : 'Fichye Envalid',
        isEs ? 'Por favor elija una imagen válida (PNG, JPG, JPEG, WebP).' : 'Tanpri chwazi yon imaj (PNG, JPG, JPEG, WebP).'
      );
      return;
    }
    try {
      setIsUploadingPhoto(true);
      const base64 = await compressImageToBase64(file, 400, 0.85);
      setAvatarUrl(base64);
      toast.success(
        isEs ? 'Foto Lista' : 'Foto Chaje',
        isEs ? '¡La foto del miembro está lista para guardar!' : 'Foto manm nan pare pou mete sou kat la!'
      );
    } catch (err) {
      toast.error(
        isEs ? 'Error de Carga' : 'Erè Chajman',
        isEs ? 'No se pudo procesar la imagen seleccionada.' : 'Pa t kapab trete imaj la.'
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Generate secure random PIN
  const handleGenerateRandomPin = () => {
    const random = generateSecureMemberPin();
    setPin(random);
    toast.info(
      isEs ? 'Nuevo PIN Confidencial Generado' : 'Nouvo PIN Sekirite Jenere',
      isEs ? `Código secreto: ${random}` : `Nouvo kòd PIN sekrè: ${random}`
    );
  };

  const handleCopyMemberId = () => {
    if (!member) return;
    navigator.clipboard.writeText(member.memberId);
    setIsCopied(true);
    toast.info(
      isEs ? 'Copiado' : 'Kopye',
      isEs ? `ID de Miembro ${member.memberId} copiado al portapapeles.` : `Member ID ${member.memberId} kopye nan clipboard.`
    );
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleInsertTag = (tag: string) => {
    const today = new Date().toLocaleDateString(isEs ? 'es-ES' : 'fr-FR');
    const addition = `\n• [${today} - ${tag}]: `;
    setNotes((prev) => (prev ? `${prev.trim()}${addition}` : `• [${today} - ${tag}]: `));
  };

  const handleInsertCurrentDate = () => {
    const now = new Date();
    const dateStr = `${now.toLocaleDateString(isEs ? 'es-ES' : 'fr-FR')} ${now.toLocaleTimeString(isEs ? 'es-ES' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const addition = `\n📅 [${dateStr}]: `;
    setNotes((prev) => (prev ? `${prev.trim()}${addition}` : `📅 [${dateStr}]: `));
  };

  // Handle Update Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      const errMsg = isEs
        ? 'Por favor ingrese al menos el Nombre completo y el Teléfono del miembro.'
        : 'Tanpri antre omwen Non konplè ak Nimewo telefòn manm nan.';
      setFormError(errMsg);
      toast.error(isEs ? 'Información Incompleta' : 'Enfòmasyon Manke', errMsg);
      setActiveTab('identity');
      return;
    }

    try {
      setIsSaving(true);
      const updatedMember: Member = {
        ...member,
        churchId: church.id,
        titlePrefix: titlePrefix.trim() || undefined,
        fullName: fullName.trim(),
        gender,
        civilStatus,
        profession: profession.trim() || undefined,
        dateOfBirth: dob,
        baptismDate: baptismDate || undefined,
        phone: phone.trim(),
        emergencyContact: emergencyPhone.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        email: email.trim() || `${fullName.trim().toLowerCase().replace(/\s+/g, '.')}@${church.slug || 'iglesia'}.org`,
        address: address.trim(),
        city: city.trim() || (isEs ? 'Santo Domingo' : 'Ayiti'),
        zone: zone.trim() || undefined,
        department,
        role,
        cellGroup: cellGroup.trim() || undefined,
        joinedDate: joinedDate || member.joinedDate,
        status,
        avatarUrl: avatarUrl.trim() || undefined,
        legalDocumentType: legalDocumentType || undefined,
        legalDocumentNumber: legalDocumentNumber.trim() || undefined,
        pin: pin.trim() || member.pin || generateSecureMemberPin(),
        notes: notes.trim(),
      };

      updateMember(church.id, updatedMember);
      onMemberUpdated(updatedMember);
      setIsSaving(false);

      toast.success(
        isEs ? '¡Datos Actualizados!' : 'Done Manm lan Mete Ajou!',
        isEs
          ? `La ficha de ${updatedMember.fullName} (${updatedMember.memberId}) se modificó con éxito en ${church.name}.`
          : `Fich ${updatedMember.fullName} (${updatedMember.memberId}) modifye avèk siksè nan ${church.name}.`
      );

      onClose();
    } catch (err) {
      setIsSaving(false);
      const errTxt = isEs ? 'Error al actualizar el miembro.' : 'Erè pandan mizajou manm nan.';
      setFormError(errTxt);
      toast.error(isEs ? 'Error' : 'Erè', errTxt);
    }
  };

  const departmentsList = isEs
    ? [
        'Servicio General',
        'Dominical',
        'Estudio Bíblico',
        'Intercesión',
        'Jóvenes',
        'Ministerio Infantil',
        'Coral & Alabanza',
        'Recepción & Protocolo',
        'Sonido & Medios',
        'Damas',
        'Caballeros',
        'Evangelismo & Misiones',
      ]
    : [
        'Service Général',
        'Dominical',
        'Étude Biblique',
        'Intercession',
        'Jeunesse',
        'Club des Enfants',
        'Chorale',
        'Accueil & Protocole',
        'Son & Média',
        'Dames',
        'Hommes',
        'Evangélisation & Misyon',
      ];

  const rolesList = isEs
    ? [
        'Miembro',
        'Pastor',
        'Pastor Asociado',
        'Diácono',
        'Diaconisa',
        'Evangelista',
        'Líder de Jóvenes',
        'Salmista / Músico',
        'Maestro(a) de Niños',
        'Protocolo / Recepción',
        'Técnico de Sonido & Medios',
        'Secretario(a) / Administrador',
      ]
    : [
        'Manm',
        'Pastè',
        'Pastè Asosye',
        'Dyak',
        'Dyakonès',
        'Evanjelis',
        'Lidè Jeunesse',
        'Chantre / Mizisyen',
        'Monitè Timoun',
        'Pwotokòl / Akèy',
        'Teknisyen Son & Média',
        'Sekretè / Administratè',
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden my-auto text-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-700/80 bg-gradient-to-r from-slate-900 via-[#182234] to-slate-900 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-extrabold text-lg shadow-inner shrink-0">
              {fullName?.[0] || 'M'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  {isEs ? 'Modificar Datos del Miembro' : 'Mete Done Manm lan Ajou'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold">
                  {member.memberId}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {status === 'active' ? (isEs ? 'Activo' : 'Aktif') : (isEs ? 'Inactivo' : 'Inaktif')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEs
                  ? `Modifique la información personal, contacto, rol y seguridad de ${member.fullName}.`
                  : `Modifye enfòmasyon pèsonèl, kontak, wòl ak sekirite pou ${member.fullName}.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-edit-member-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QUICK SHORTCUT BAR */}
        <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-700/60 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">{isEs ? 'Accesos directos:' : 'Raccourcis:'}</span>
            <button
              type="button"
              onClick={handleCopyMemberId}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-mono font-bold cursor-pointer transition-colors"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? (isEs ? '¡Copiado!' : 'Kopye!') : member.memberId}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onViewDigitalCard && (
              <button
                type="button"
                onClick={() => onViewDigitalCard(member)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold cursor-pointer transition-colors"
              >
                <QrCode className="w-3 h-3" />
                <span>{isEs ? 'Ver Carnet & QR' : 'Wè Kat & QR'}</span>
              </button>
            )}
            {onOpenPrintModal && (
              <button
                type="button"
                onClick={() => onOpenPrintModal(member)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold cursor-pointer transition-colors"
              >
                <Printer className="w-3 h-3" />
                <span>{isEs ? 'Imprimir Carnet' : 'Enprime Kat'}</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-700/80 bg-slate-900/60 px-4 sm:px-6 overflow-x-auto no-scrollbar">
          {[
            { id: 'identity', label: isEs ? '1. Identidad & Personal' : '1. Idantite & Pèsonèl', icon: User },
            { id: 'contact', label: isEs ? '2. Contacto & Dirección' : '2. Kontak & Adrès', icon: Phone },
            { id: 'church', label: isEs ? '3. Vida Eclesial & Rol' : '3. Lavi Legliz & Wòl', icon: Building2 },
            { id: 'security', label: isEs ? '4. Seguridad & Notas' : '4. Sekirite & Nòt Prive', icon: ShieldCheck },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                id={`tab-edit-member-${t.id}`}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-xs flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-400/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* FORM CONTAINER */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[68vh] overflow-y-auto">
          {/* DUPLICATE WARNINGS */}
          {duplicateWarnings.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{isEs ? 'Atención Posible Duplicado:' : 'Atansyon Posib Doublon:'}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-200/90">
                {duplicateWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* TAB 1: IDENTITE & PERSONAL */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              {/* PHOTO UPLOAD / EDIT SECTION */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-20 h-24 sm:w-22 sm:h-26 rounded-2xl bg-slate-800 border-2 border-amber-400/60 overflow-hidden shrink-0 flex items-center justify-center shadow-lg">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Foto Manm"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Camera className="w-6 h-6 text-amber-400 mb-1" />
                      <span className="text-[9px] font-bold">{isEs ? 'SIN FOTO' : 'PA GEN FOTO'}</span>
                    </div>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="text-xs font-bold text-amber-300">
                      {isEs ? 'Foto del Miembro para el Carnet (Tipo Pasaporte)' : 'Foto Manm pou Kat la (Passport Photo)'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-bold">
                      {isEs ? 'Opcional' : 'Opsyonèl'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isEs
                      ? 'Cambie o agregue una foto nítida (JPG, PNG, WebP). Aparecerá en el carnet digital y en el badge para imprimir.'
                      : 'Chanje oswa ajoute yon foto nèt (JPG, PNG, WebP). Li parèt sou kat dijital la ak kat enprime PVC / PDF la.'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <label className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{avatarUrl ? (isEs ? 'Cambiar Foto' : 'Chanje Foto') : (isEs ? 'Cargar Foto' : 'Telechaje Foto')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoFileChange}
                      />
                    </label>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isEs ? 'Eliminar Foto' : 'Retire Foto'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                {/* Title Prefix */}
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">{isEs ? 'Título / Prefijo' : 'Tit / Prefiks'}</label>
                  <select
                    id="edit-member-title-prefix"
                    value={titlePrefix}
                    onChange={(e) => setTitlePrefix(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  >
                    <option value={isEs ? 'Hno.' : 'Frè'}>{isEs ? 'Hermano (Hno.)' : 'Frè (Frère)'}</option>
                    <option value={isEs ? 'Hna.' : 'Sè'}>{isEs ? 'Hermana (Hna.)' : 'Sè (Sœur)'}</option>
                    <option value={isEs ? 'Pastor' : 'Pastè'}>{isEs ? 'Pastor (Pst.)' : 'Pastè (Pasteur)'}</option>
                    <option value={isEs ? 'Diácono' : 'Dyak'}>{isEs ? 'Diácono' : 'Dyak (Diacre)'}</option>
                    <option value={isEs ? 'Diaconisa' : 'Dyakonès'}>{isEs ? 'Diaconisa' : 'Dyakonès (Diaconesse)'}</option>
                    <option value={isEs ? 'Evangelista' : 'Evanjelis'}>{isEs ? 'Evangelista' : 'Evanjelis (Évangéliste)'}</option>
                    <option value={isEs ? 'Líder' : 'Lidè'}>{isEs ? 'Líder' : 'Lidè (Leader)'}</option>
                    <option value={isEs ? 'Dr.' : 'Doktè'}>{isEs ? 'Dr. (Doctor)' : 'Doktè (Dr.)'}</option>
                    <option value={isEs ? 'Ing.' : 'Enjenyè'}>{isEs ? 'Ing. (Ingeniero)' : 'Enjenyè (Ing.)'}</option>
                  </select>
                </div>

                {/* Full Name */}
                <div className="sm:col-span-8 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>{isEs ? 'Nombre Completo (Nombres y Apellidos) *' : 'Non Konplè (Prenon & Siyati) *'}</span>
                    <span className="text-[10px] text-amber-400 font-normal">{isEs ? 'Obligatorio' : 'Obligatwa'}</span>
                  </label>
                  <input
                    type="text"
                    id="edit-member-fullname"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isEs ? 'ej: Carlos Manuel Rodríguez' : 'eg: Jean-Baptiste Pierre'}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* LEGAL DOCUMENT SECTION (CIN / NIF / PASSPORT) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60">
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Tipo de Documento Legal' : 'Tip Dokiman Legal'}</span>
                  </label>
                  <select
                    value={legalDocumentType}
                    onChange={(e) => setLegalDocumentType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  >
                    <option value="cin">{isEs ? 'Cédula de Identidad' : 'CIN (Kat Idantite Nasyonal)'}</option>
                    <option value="nif">{isEs ? 'RNC / Matrícula Fiscal' : 'NIF (Matrikil Fiskal)'}</option>
                    <option value="passeport">{isEs ? 'Pasaporte' : 'Pasipò (Passport)'}</option>
                    <option value="autre">{isEs ? 'Otro Documento Oficial' : 'Lòt Dokiman Ofisyèl'}</option>
                  </select>
                </div>

                <div className="sm:col-span-8 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {isEs ? 'Número de Documento Legal (Cédula / Pasaporte)' : 'Nimewo Dokiman Legal (NIF / CIN / Pasipò)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isEs ? 'ej: 001-2345678-9 o 12345678' : 'eg: 001-234-567-8 oswa 1234567890'}
                    value={legalDocumentNumber}
                    onChange={(e) => setLegalDocumentNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Gender & Civil Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Sexo' : 'Sèks'}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        gender === 'male'
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400 ring-1 ring-amber-400/30'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {isEs ? 'Masculino' : 'Gason'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        gender === 'female'
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400 ring-1 ring-amber-400/30'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {isEs ? 'Femenino' : 'Fi'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Estado Civil' : 'Eta Sivil'}</span>
                  </label>
                  <select
                    id="edit-member-civil-status"
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  >
                    <option value="celibataire">{isEs ? 'Soltero(a)' : 'Selibatè (Célibataire)'}</option>
                    <option value="marie">{isEs ? 'Casado(a)' : 'Marye (Marié / Mariée)'}</option>
                    <option value="veuf">{isEs ? 'Viudo(a)' : 'Vèf / Vèv (Veuf / Veuve)'}</option>
                    <option value="divorce">{isEs ? 'Divorciado(a)' : 'Divòse (Divorcé / Divorcée)'}</option>
                  </select>
                </div>
              </div>

              {/* DOB & Profession */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isEs ? 'Fecha de Nacimiento' : 'Dat Nesans'}</span>
                    </span>
                    {calculatedAge !== null && (
                      <span className="text-[11px] font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {calculatedAge} {isEs ? 'años' : 'ane'}
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    id="edit-member-dob"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Profesión / Ocupación' : 'Pwofesyon / Metye'}</span>
                  </label>
                  <input
                    type="text"
                    id="edit-member-profession"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder={isEs ? 'ej: Profesor, Enfermera, Comerciante...' : 'eg: Pwofesè, Enfimyè, Machann...'}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Member Status */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">{isEs ? 'Estado del Miembro' : 'Estati Manm lan'}</span>
                  <span className="text-[11px] text-slate-400">
                    {isEs
                      ? 'Indique si el miembro está activo o inactivo en las actividades de la iglesia.'
                      : 'Mete si manm lan aktif oswa inaktif nan aktivite legliz la.'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-400/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isEs ? 'Activo' : 'Aktif'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('inactive')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      status === 'inactive'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 ring-1 ring-rose-400/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isEs ? 'Inactivo' : 'Inaktif'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT & ADDRESS */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Primary Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isEs ? 'Teléfono Principal (WhatsApp) *' : 'Telefòn Prensipal (WhatsApp) *'}</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-normal">{isEs ? 'Obligatorio' : 'Obligatwa'}</span>
                  </label>
                  <input
                    type="tel"
                    id="edit-member-phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={isEs ? '+1 809-000-0000' : '+509 3700-0000'}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Correo Electrónico (Email)' : 'Adrès Imèl'}</span>
                  </label>
                  <input
                    type="email"
                    id="edit-member-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre.apellido@gmail.com"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 space-y-3">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? 'Contacto de Emergencia' : 'Kontak Ijans (Emergency Contact)'}</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">{isEs ? 'Nombre de la Persona:' : 'Non Moun pou Kontakte:'}</label>
                    <input
                      type="text"
                      id="edit-member-emergency-name"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder={isEs ? 'ej: María Rodríguez (Esposa)' : 'eg: Marie Pierre (Madanm)'}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">{isEs ? 'Teléfono de Emergencia:' : 'Telefòn Ijans:'}</label>
                    <input
                      type="tel"
                      id="edit-member-emergency-phone"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder={isEs ? '+1 829-000-0000' : '+509 3800-0000'}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? 'Dirección de Residencia' : 'Adrès Fizik (Lari, Nimewo, Repè)'}</span>
                </label>
                <input
                  type="text"
                  id="edit-member-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={isEs ? 'ej: Calle 5 #12, Los Prados' : 'eg: #24, Rue Lamarre, Petyonvil'}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">{isEs ? 'Ciudad / Municipio' : 'Vil / Komin'}</label>
                  <input
                    type="text"
                    id="edit-member-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={isEs ? 'Santo Domingo, Santiago, La Vega...' : 'Pòtoprens, Dèlma, Petyonvil...'}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">{isEs ? 'Zona / Sector / Comunidad' : 'Zòn / Sektè / Kominote'}</label>
                  <input
                    type="text"
                    id="edit-member-zone"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder={isEs ? 'ej: Sector Norte, Bella Vista...' : 'eg: Sektè Nò, Nazon, Silo...'}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHURCH & ROLE */}
          {activeTab === 'church' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Departamento Principal' : 'Depatman Prensipal'}</span>
                  </label>
                  <select
                    id="edit-member-department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 focus:outline-none font-medium"
                  >
                    {departmentsList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Rol en la Iglesia' : 'Wòl nan Legliz la'}</span>
                  </label>
                  <select
                    id="edit-member-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 focus:outline-none font-medium"
                  >
                    {rolesList.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cell Group */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? 'Grupo Celular / Sector de Oración' : 'Gwoup Selil / Branch Lapriyè'}</span>
                </label>
                <input
                  type="text"
                  id="edit-member-cellgroup"
                  value={cellGroup}
                  onChange={(e) => setCellGroup(e.target.value)}
                  placeholder={isEs ? 'ej: Célula Betel, Sector Norte...' : 'eg: Selil Betèl, Gwoup Lapriyè Sektè A...'}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Baptism Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Fecha de Bautismo' : 'Dat Batèm (si l batize)'}</span>
                  </label>
                  <input
                    type="date"
                    id="edit-member-baptism-date"
                    value={baptismDate}
                    onChange={(e) => setBaptismDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                {/* Joined Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Fecha de Admisión / Integración' : 'Dat Entegrasyon / Admisyon'}</span>
                  </label>
                  <input
                    type="date"
                    id="edit-member-joined-date"
                    value={joinedDate}
                    onChange={(e) => setJoinedDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & NOTES */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* Member ID display */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">{isEs ? 'ID Único de Miembro' : 'Member ID Inik'}</span>
                  <span className="text-[11px] text-slate-400">
                    {isEs
                      ? 'Identificador principal de la iglesia para carnet digital, QR y código de barras.'
                      : 'Idantifyan prensipal legliz la pou kat dijital, QR & Barcode.'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-extrabold">
                    {member.memberId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMemberId}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                    title={isEs ? 'Copiar ID de Miembro' : 'Kopye Member ID'}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Security PIN for Member Portal */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span>{isEs ? 'PIN de Seguridad Confidencial (4 a 8 Dígitos)' : 'Kòd PIN Sekirite Konfidansyèl (4 a 8 Chif)'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isEs ? 'Generar Nuevo PIN Secreto' : 'Jenere Nouvo PIN Sekrè (6 chif)'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isEs
                    ? 'Código de seguridad secreto e independiente del carnet físico (no se deriva del ID) para que el miembro ingrese a su portal privado.'
                    : 'Kòd sekirite sekrè ki separe de ID a (li pa parèt sou kat la) pou manm lan konekte nan espas prive li.'}
                </p>
                <div className="relative max-w-xs">
                  <input
                    type={showPin ? 'text' : 'password'}
                    id="edit-member-pin"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="eg: 739415"
                    className="w-full p-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-sm text-emerald-400 font-mono font-bold tracking-widest focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              </div>

              {/* Pastoral Private Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Notas Privadas Pastorales (Solo Admin)' : 'Nòt Prive Pastoral (Admin Sèlman)'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleInsertCurrentDate}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Insertar Fecha & Hora' : 'Ajoute Dat & Lè'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(isEs
                    ? ['Visita Pastoral', 'Motivo de Oración', 'Seguimiento Bautismal', 'Ayuda Social', 'Familia & Matrimonio']
                    : ['Vizit Pastoral', 'Sijè Lapriyè', 'Swivi Batèm', 'Èd Sosyal', 'Maryaj & Fanmi']
                  ).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  id="edit-member-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isEs ? 'Escriba observaciones confidenciales sobre el miembro (visita, entrevista, asistencia...)' : 'Ekri obsèvasyon konfidansyèl sou manm nan (vizit, entèvyou, asistans...)'}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none resize-y"
                />
              </div>
            </div>
          )}

          {/* ACTIONS FOOTER */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700/80 gap-3">
            <button
              type="button"
              id="btn-cancel-edit-member"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs cursor-pointer transition-colors"
            >
              {isEs ? 'Cancelar' : 'Anile'}
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'security' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'identity') setActiveTab('contact');
                    else if (activeTab === 'contact') setActiveTab('church');
                    else if (activeTab === 'church') setActiveTab('security');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  {isEs ? 'Siguiente Paso →' : 'Pwochen Etap →'}
                </button>
              ) : null}

              <button
                type="submit"
                id="btn-submit-edit-member"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>{isSaving ? (isEs ? 'Guardando...' : 'N ap sove...') : (isEs ? 'Guardar Cambios' : 'Mete Done Ajou (Save)')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
