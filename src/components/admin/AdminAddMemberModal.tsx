import React, { useState, useMemo } from 'react';
import { Church, Member, Language } from '../../types';
import { addMember, generateMemberId, compressImageToBase64, generateSecureMemberPin } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import {
  UserPlus,
  X,
  CheckCircle2,
  Phone,
  Mail,
  Calendar,
  Building2,
  ShieldCheck,
  QrCode,
  Printer,
  Copy,
  Check,
  User,
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
  Share2,
  Upload,
  Camera,
  Trash2,
  Image as ImageIcon,
  FileCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminAddMemberModalProps {
  church: Church;
  existingMembers: Member[];
  isOpen: boolean;
  language?: Language;
  onClose: () => void;
  onMemberAdded: (newMember: Member) => void;
  onOpenPrintModal?: (member: Member) => void;
  onViewDigitalCard?: (member: Member) => void;
}

export const AdminAddMemberModal: React.FC<AdminAddMemberModalProps> = ({
  church,
  existingMembers,
  isOpen,
  language = 'ht',
  onClose,
  onMemberAdded,
  onOpenPrintModal,
  onViewDigitalCard,
}) => {
  const toast = useToast();
  const isEs = language === 'es';

  // Active Tab: 'identity' | 'contact' | 'church' | 'security'
  const [activeTab, setActiveTab] = useState<'identity' | 'contact' | 'church' | 'security'>('identity');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);

  // Form State
  const [titlePrefix, setTitlePrefix] = useState<string>(isEs ? 'Hno.' : 'Frè');
  const [fullName, setFullName] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [civilStatus, setCivilStatus] = useState<'celibataire' | 'marie' | 'veuf' | 'divorce'>('celibataire');
  const [profession, setProfession] = useState<string>('');
  const [dob, setDob] = useState<string>('1998-05-15');

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
  const [joinedDate, setJoinedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cellGroup, setCellGroup] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [pin, setPin] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [createdSuccessMember, setCreatedSuccessMember] = useState<Member | null>(null);

  // Auto-calculated live ID
  const previewGeneratedId = useMemo(() => {
    if (!fullName.trim()) return `${church.code}-MB0000`;
    return generateMemberId(church.code, fullName);
  }, [church.code, fullName]);

  // Duplicate Check Warnings
  const duplicateWarnings = useMemo(() => {
    const warnings: string[] = [];
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 8) {
      const matchPhone = existingMembers.find((m) =>
        m.phone.replace(/[^0-9]/g, '').includes(cleanPhone)
      );
      if (matchPhone) {
        warnings.push(
          isEs
            ? `Un miembro llamado "${matchPhone.fullName}" (${matchPhone.memberId}) ya tiene este número de teléfono.`
            : `Yon manm ki rele "${matchPhone.fullName}" (${matchPhone.memberId}) gen nimewo telefòn sa a deja.`
        );
      }
    }

    const cleanName = fullName.trim().toLowerCase();
    if (cleanName.length >= 4) {
      const matchName = existingMembers.find(
        (m) => (m.fullName || '').toLowerCase() === cleanName
      );
      if (matchName) {
        warnings.push(
          isEs
            ? `Un miembro llamado "${matchName.fullName}" (${matchName.memberId}) ya está registrado en la iglesia.`
            : `Yon manm ki rele "${matchName.fullName}" (${matchName.memberId}) deja anrejistre nan legliz la.`
        );
      }
    }

    return warnings;
  }, [phone, fullName, existingMembers, isEs]);

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

  if (!isOpen) return null;

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
        isEs ? 'Foto Cargada' : 'Foto Chaje',
        isEs ? '¡La foto del miembro está lista para la tarjeta!' : 'Foto manm nan pare pou mete sou kat la!'
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
      isEs ? 'PIN Confidencial Generado' : 'PIN Sekirite Jenere',
      isEs ? `Nuevo código secreto: ${random}` : `Nouvo kòd PIN sekrè: ${random}`
    );
  };

  // Quick Demo Auto-Fill
  const handleQuickDemoFill = () => {
    const sampleNames = isEs
      ? [
          'Carlos Mendoza Batista',
          'Rosalía Estevez Santos',
          'Emmanuel Rosario Peña',
          'María Celeste Valdés',
          'Samuel Benítez Gómez',
        ]
      : [
          'Jean-Baptiste Pierre',
          'Roseline Estimé',
          'Emmanuel Dorvilus',
          'Marie-Claude Voltaire',
          'Samuel Bien-Aimé',
        ];
    const pickedName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const randomPin = generateSecureMemberPin();

    setFullName(pickedName);
    setTitlePrefix(isEs ? 'Hno.' : 'Frè');
    setGender('male');
    setCivilStatus('marie');
    setProfession(isEs ? 'Ingeniero en Sistemas' : 'Enjenyè Enfòmatik');
    setDob('1994-06-20');
    setLegalDocumentType('cin');
    setLegalDocumentNumber(`001-234-567-${randomSuffix.toString().slice(0, 1)}`);
    setPhone(`+509 37${randomSuffix.toString().slice(0, 2)}-${randomSuffix.toString().slice(2, 4)}88`);
    setEmail(`${pickedName.toLowerCase().replace(/[^a-z]/g, '.')}@gmail.com`);
    setAddress(isEs ? 'Calle Principal #45, Edif. Los Pinos' : 'Delmas 75, Rue Clercine');
    setCity(isEs ? 'Santo Domingo' : 'Delmas');
    setZone(isEs ? 'Sector Norte' : 'Sektè Nò');
    setDepartment(isEs ? 'Jóvenes' : 'Jeunesse');
    setRole(isEs ? 'Salmista' : 'Chantre');
    setBaptismDate('2018-04-12');
    setPin(randomPin);
    setNotes(isEs ? 'Miembro muy fiel y activo en el ministerio de alabanza.' : 'Manm trè fidèl ak angaje nan ministè louwanj la.');
    setFormError(null);
    toast.info(
      isEs ? 'Llenado Rápido' : 'Ranpli Rapid',
      isEs ? '¡Formulario llenado con datos de demostración!' : 'Fòmilè a ranpli ak done egzanp pou tès rapid!'
    );
  };

  // Handle Form Submission
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
      const newMember = addMember(church.id, {
        titlePrefix,
        fullName: fullName.trim(),
        gender,
        civilStatus,
        profession: profession.trim() || undefined,
        dateOfBirth: dob,
        baptismDate: baptismDate || undefined,
        phone: phone.trim(),
        emergencyContact: emergencyPhone.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        email: email.trim() || `${fullName.trim().toLowerCase().replace(/\s+/g, '.')}@legiz.ht`,
        address: address.trim(),
        city: city.trim() || (isEs ? 'República Dominicana' : 'Ayiti'),
        zone: zone.trim() || undefined,
        department,
        role,
        cellGroup: cellGroup.trim() || undefined,
        joinedDate,
        status,
        avatarUrl: avatarUrl.trim() || undefined,
        legalDocumentType: legalDocumentType || undefined,
        legalDocumentNumber: legalDocumentNumber.trim() || undefined,
        pin: pin.trim() || undefined,
        notes: notes.trim(),
      });

      onMemberAdded(newMember);
      setCreatedSuccessMember(newMember);
      toast.success(
        isEs ? '¡Miembro Agregado con Éxito!' : 'Manm Ajoute avèk Siksè!',
        isEs
          ? `${newMember.fullName} (${newMember.memberId}) registrado en ${church.name}.`
          : `${newMember.fullName} (${newMember.memberId}) anrejistre nan ${church.name}.`
      );

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {
        // ignore
      }
    } catch (err) {
      setFormError(isEs ? 'Error al guardar el miembro.' : 'Erè pandan anrejistreman manm nan.');
      toast.error(isEs ? 'Error' : 'Erè', isEs ? 'No se pudo crear el registro del miembro.' : 'Pa t kapab kreye manm nan.');
    }
  };

  // Reset Form for next member
  const handleResetForNext = () => {
    setFullName('');
    setAvatarUrl('');
    setLegalDocumentNumber('');
    setLegalDocumentType('cin');
    setPhone('');
    setEmergencyPhone('');
    setEmergencyContactName('');
    setEmail('');
    setAddress('');
    setProfession('');
    setPin('');
    setNotes('');
    setBaptismDate('');
    setCellGroup('');
    setCreatedSuccessMember(null);
    setFormError(null);
    setActiveTab('identity');
  };

  // Copy Welcome SMS / WhatsApp Text
  const handleCopyWelcomeMessage = () => {
    if (!createdSuccessMember) return;
    const memberPin = createdSuccessMember.pin || 'Pa defini';
    const welcomeMsg = isEs
      ? `¡Bienvenido(a) a la iglesia ${church.name}!\n\nAquí están sus datos privados de acceso:\n• Nombre: ${createdSuccessMember.fullName}\n• ID de Miembro: ${createdSuccessMember.memberId}\n• Código PIN Secreto: ${memberPin}\n• Departamento: ${createdSuccessMember.department}\n\n🔒 Seguridad: Este código PIN es estrictamente personal y confidencial. Úselo para ingresar a su espacio de miembro y consultar su carnet digital.\n¡Que Dios le bendiga!`
      : `Byenvini nan legliz ${church.name}!\n\nMen enfòmasyon sekrè pou w ouvri espas manm ou:\n• Non: ${createdSuccessMember.fullName}\n• ID Manm: ${createdSuccessMember.memberId}\n• Kòd PIN Sekrè: ${memberPin}\n• Depatman: ${createdSuccessMember.department}\n\n🔒 Sekirite: Kòd PIN sa a se prive pou ou sèlman. Pa pataje l. Itilize l pou w konekte nan espas manm ou sou aplikasyon an epi wè kat dijital ou.\nBondye beni w!`;

    navigator.clipboard.writeText(welcomeMsg);
    setIsCopied(true);
    toast.success(
      isEs ? '¡Copiado!' : 'Kopye!',
      isEs ? 'Mensaje de bienvenida copiado para WhatsApp o SMS.' : 'Mesaj byenvini an kopye pou WhatsApp oswa SMS.'
    );
    setTimeout(() => setIsCopied(false), 2500);
  };

  const departmentsList = isEs
    ? [
        'Servicio General',
        'Jóvenes',
        'Coral',
        'Damas',
        'Caballeros',
        'Recepción & Protocolo',
        'Intercesión & Oración',
        'Escuela Dominical & Niños',
        'Medios & Sonido',
        'Diaconado',
        'Evangelización & Misiones',
      ]
    : [
        'Service Général',
        'Jeunesse',
        'Chorale',
        'Dames',
        'Hommes',
        'Accueil & Protocole',
        'Intercession & Lapriyè',
        'ECODIM & Enfants',
        'Média & Sonorisation',
        'Diaconat',
        'Evangélisation & Misyon',
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-700/90 overflow-hidden my-auto text-slate-200 flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="bg-[#0F172A] p-4 sm:p-5 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  {isEs ? 'Registrar Nuevo Miembro en la Iglesia' : 'Ajoute Nouvo Manm nan Legliz la'}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold">
                  {church.code}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {church.name} • {isEs ? 'Generar ID, Código QR y Carnet Digital Automático' : 'Jenere ID, QR Kòd ak Kat Dijital Otomatikman'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!createdSuccessMember && (
              <button
                type="button"
                id="btn-demo-quick-fill"
                onClick={handleQuickDemoFill}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title={isEs ? 'Llenar formulario con datos de prueba' : 'Ranpli fòmilè a ak done egzanp pou tès'}
              >
                <span>{isEs ? 'Ejemplo Rápido' : 'Egzanp Rapid'}</span>
              </button>
            )}
            <button
              type="button"
              id="btn-close-add-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* IF MEMBER WAS CREATED SUCCESSFULLY */}
        {createdSuccessMember ? (
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-center custom-scrollbar">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                {isEs ? 'Registro Completo' : 'Anrejistreman Konplè'}
              </span>
              <h4 className="text-xl sm:text-2xl font-black text-white mt-2">
                {isEs ? '¡Miembro Creado con Éxito!' : 'Manm nan Kreye avèk Siksè!'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
                {isEs
                  ? `Todos los datos del miembro y el carnet digital QR están listos para la iglesia ${church.name}.`
                  : `Tout done manm nan ak kat idantite dijital QR la pare pou legliz ${church.name}.`}
              </p>
            </div>

            {/* MEMBER RECAP CARD */}
            <div className="max-w-lg mx-auto p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700 shadow-xl text-left space-y-3">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
                    {isEs ? 'Carnet de Identidad' : 'Kat Idantite Manm'}
                  </span>
                  <h5 className="text-base font-bold text-white">
                    {createdSuccessMember.titlePrefix ? `${createdSuccessMember.titlePrefix} ` : ''}
                    {createdSuccessMember.fullName}
                  </h5>
                  <p className="text-xs text-slate-400">
                    {createdSuccessMember.role} • {createdSuccessMember.department}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-mono">ID de Miembro:</span>
                  <span className="font-mono font-extrabold text-sm text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-lg inline-block">
                    {createdSuccessMember.memberId}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEs ? 'Teléfono:' : 'Telefòn:'}</span>
                  <span className="font-semibold text-slate-200">{createdSuccessMember.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEs ? 'Código PIN Secreto:' : 'Kòd PIN Sekrè:'}</span>
                  <span className="font-mono font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded inline-block tracking-wider">
                    {createdSuccessMember.pin || '••••••'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEs ? 'Fecha de Ingreso:' : 'Dat Enskripsyon:'}</span>
                  <span className="text-slate-300">{createdSuccessMember.joinedDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEs ? 'Token Código QR:' : 'Kòd Bar/QR Token:'}</span>
                  <span className="text-[10px] font-mono text-slate-400 truncate block">
                    {createdSuccessMember.barcodeToken}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 max-w-xl mx-auto">
              <button
                type="button"
                id="btn-copy-welcome-msg"
                onClick={handleCopyWelcomeMessage}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>
                  {isCopied
                    ? (isEs ? '¡Copiado al Portapapeles!' : 'Kopye nan Clipboard!')
                    : (isEs ? 'Copiar Mensaje de Bienvenida' : 'Kopi Mesaj Byenvini (WhatsApp/SMS)')}
                </span>
              </button>

              {onOpenPrintModal && (
                <button
                  type="button"
                  id="btn-print-from-success"
                  onClick={() => {
                    onOpenPrintModal(createdSuccessMember);
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
                >
                  <Printer className="w-4 h-4 text-slate-950" />
                  <span>{isEs ? 'Imprimir Carnet / Badge PDF' : 'Enprime Kat / Badge PDF'}</span>
                </button>
              )}

              {onViewDigitalCard && (
                <button
                  type="button"
                  id="btn-view-card-from-success"
                  onClick={() => {
                    onViewDigitalCard(createdSuccessMember);
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{isEs ? 'Ver Carnet y Código QR' : 'Wè Kat & Kòd QR'}</span>
                </button>
              )}

              <button
                type="button"
                id="btn-add-another-member"
                onClick={handleResetForNext}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isEs ? 'Registrar Otro Miembro' : 'Ajoute yon Lòt Manm'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM WITH TABS & LIVE PREVIEW */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            {formError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {duplicateWarnings.length > 0 && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{isEs ? `Atención — Verificación de Duplicados en ${church.name}:` : `Atansyon — Verifikasyon Doublon nan ${church.name}:`}</span>
                </div>
                {duplicateWarnings.map((w, idx) => (
                  <p key={idx} className="pl-6 text-[11px] text-amber-200/90">
                    • {w}
                  </p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT / MAIN COLUMN: FORM TABS */}
              <div className="lg:col-span-8 space-y-4">
                {/* NAVIGATION TABS */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('identity')}
                    className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'identity'
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{isEs ? '1. Identidad' : '1. Idantite'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                    className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'contact'
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{isEs ? '2. Contacto' : '2. Kontak'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('church')}
                    className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'church'
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{isEs ? '3. Iglesia' : '3. Legliz'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('security')}
                    className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'security'
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isEs ? '4. PIN & Notas' : '4. PIN & Nòt'}</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} id="form-ultra-add-member" className="space-y-4">
                  {/* TAB 1: IDENTITY */}
                  {activeTab === 'identity' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* PHOTO UPLOAD SECTION */}
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
                              ? 'Cargue una foto nítida (JPG, PNG, WebP). Se mostrará automáticamente en el carnet digital y en el badge para imprimir.'
                              : 'Chaje yon foto nèt (JPG, PNG, WebP). Li pral parèt otomatikman sou kat dijital la ak kat enprime a.'}
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
                                <span>{isEs ? 'Eliminar' : 'Retire'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Título / Tratamiento' : 'Tit / Sivilite'}
                          </label>
                          <select
                            value={titlePrefix}
                            onChange={(e) => setTitlePrefix(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          >
                            <option value={isEs ? 'Hno.' : 'Frè'}>{isEs ? 'Hermano (Hno.)' : 'Frè (Fr.)'}</option>
                            <option value={isEs ? 'Hna.' : 'Sè'}>{isEs ? 'Hermana (Hna.)' : 'Sè (Sr.)'}</option>
                            <option value={isEs ? 'Pastor' : 'Pastè'}>{isEs ? 'Pastor (Pst.)' : 'Pastè (Pst.)'}</option>
                            <option value={isEs ? 'Apóstol' : 'Apot'}>{isEs ? 'Apóstol' : 'Apot (Apôtre)'}</option>
                            <option value={isEs ? 'Diácono' : 'Diacre'}>{isEs ? 'Diácono' : 'Diacre'}</option>
                            <option value={isEs ? 'Diaconisa' : 'Diaconesse'}>{isEs ? 'Diaconisa' : 'Diaconesse'}</option>
                            <option value={isEs ? 'Evangelista' : 'Evangelis'}>{isEs ? 'Evangelista' : 'Evangelis (Ev.)'}</option>
                            <option value={isEs ? 'Maestro' : 'Monitè'}>{isEs ? 'Maestro(a)' : 'Monitè / Monitris'}</option>
                            <option value={isEs ? 'Recepción' : 'Manm akèy'}>{isEs ? 'Servidor de Recepción' : 'Manm akèy'}</option>
                            <option value="Sr.">{isEs ? 'Sr. (Señor)' : 'M. (Monsieur)'}</option>
                            <option value="Sra.">{isEs ? 'Sra. (Señora)' : 'Mme. (Madame)'}</option>
                            <option value="Srta.">{isEs ? 'Srta. (Señorita)' : 'Mlle. (Mademoiselle)'}</option>
                            <option value="Dr.">{isEs ? 'Dr. (Doctor)' : 'Doktè (Dr.)'}</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-amber-300 mb-1">
                            {isEs ? 'Nombre Completo (Nombres y Apellidos) *' : 'Nom Complet (Non konplè) *'}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={isEs ? 'ej: Carlos Manuel Rodríguez' : 'eg: Jean-Robert Dorvilus'}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold text-xs sm:text-sm placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* LEGAL DOCUMENT SECTION (CIN / NIF / PASSPORT) */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60">
                        <div className="sm:col-span-4">
                          <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isEs ? 'Tipo de Documento Legal' : 'Tip Dokiman Legal'}</span>
                          </label>
                          <select
                            value={legalDocumentType}
                            onChange={(e) => setLegalDocumentType(e.target.value as any)}
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          >
                            <option value="cin">{isEs ? 'Cédula de Identidad' : 'CIN (Kat Idantite Nasyonal)'}</option>
                            <option value="nif">{isEs ? 'RNC / Matrícula Fiscal' : 'NIF (Matrikil Fiskal)'}</option>
                            <option value="passeport">{isEs ? 'Pasaporte' : 'Pasipò (Passport)'}</option>
                            <option value="autre">{isEs ? 'Otro Documento Oficial' : 'Lòt Dokiman Ofisyèl'}</option>
                          </select>
                        </div>

                        <div className="sm:col-span-8">
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Número de Documento Legal (Cédula / Pasaporte)' : 'Nimewo Dokiman Legal (NIF / CIN / Pasipò)'}
                          </label>
                          <input
                            type="text"
                            placeholder={isEs ? 'ej: 001-2345678-9 o 12345678' : 'eg: 001-234-567-8 oswa 1234567890'}
                            value={legalDocumentNumber}
                            onChange={(e) => setLegalDocumentNumber(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Sexo' : 'Sèks'}
                          </label>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          >
                            <option value="male">{isEs ? 'Masculino (Hombre)' : 'Gason (Masculin)'}</option>
                            <option value="female">{isEs ? 'Femenino (Mujer)' : 'Fi (Féminin)'}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                            <span>{isEs ? 'Fecha de Nacimiento *' : 'Dat Nesans *'}</span>
                            {calculatedAge !== null && (
                              <span className="text-[10px] text-amber-300 font-mono">
                                ({calculatedAge} {isEs ? 'años' : 'lane'})
                              </span>
                            )}
                          </label>
                          <input
                            type="date"
                            required
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Estado Civil' : 'Eta Sivil'}
                          </label>
                          <select
                            value={civilStatus}
                            onChange={(e) => setCivilStatus(e.target.value as any)}
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          >
                            <option value="celibataire">{isEs ? 'Soltero(a)' : 'Selibatè'}</option>
                            <option value="marie">{isEs ? 'Casado(a)' : 'Marye'}</option>
                            <option value="fiance">{isEs ? 'Comprometido(a)' : 'Fiyanse'}</option>
                            <option value="veuf">{isEs ? 'Viudo(a)' : 'Vèf / Vèv'}</option>
                            <option value="divorce">{isEs ? 'Divorciado(a)' : 'Divòse'}</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          {isEs ? 'Profesión / Oficio' : 'Pwofesyon / Metye'}
                        </label>
                        <input
                          type="text"
                          placeholder={isEs ? 'ej: Enfermero(a), Profesor(a), Ingeniero(a), Comerciante, Estudiante...' : 'eg: Enfimye, Pwofesè, Enjenyè, Komesan, Etidyan...'}
                          value={profession}
                          onChange={(e) => setProfession(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('contact')}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                        >
                          {isEs ? 'Continuar a Contacto ➔' : 'Kontinye nan Kontak ➔'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CONTACT & ADDRESS */}
                  {activeTab === 'contact' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-amber-300 mb-1">
                            {isEs ? 'Teléfono Principal (WhatsApp) *' : 'Téléphone Principal (Telefòn) *'}
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder={isEs ? 'ej: +1 809-555-0123' : 'eg: +509 3712-3456'}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Correo Electrónico (Email)' : 'Email (Imèl)'}
                          </label>
                          <input
                            type="email"
                            placeholder="eg: c.mendoza@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Teléfono de Emergencia / Familiar' : 'Telefòn Ijans / WhatsApp'}
                          </label>
                          <input
                            type="tel"
                            placeholder={isEs ? 'ej: +1 829-555-4567' : 'eg: +509 3844-5566'}
                            value={emergencyPhone}
                            onChange={(e) => setEmergencyPhone(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Nombre del Contacto de Emergencia' : 'Non Moun Kontak nan Ijans'}
                          </label>
                          <input
                            type="text"
                            placeholder={isEs ? 'ej: Esposa, Padre, Hermano...' : 'eg: Madanm, Paran oswa Frè...'}
                            value={emergencyContactName}
                            onChange={(e) => setEmergencyContactName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Dirección de Residencia' : 'Adresse Résidence (Adrès)'}
                          </label>
                          <input
                            type="text"
                            placeholder={isEs ? 'ej: Calle 5 #12, Los Prados' : 'eg: 45, Rue Clercine 6'}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Ciudad / Municipio' : 'Vil / Komin'}
                          </label>
                          <input
                            type="text"
                            placeholder={isEs ? 'ej: Santo Domingo, Santiago...' : 'eg: Delmas, Pòtoprens...'}
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('identity')}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          {isEs ? '⬅ Volver' : '⬅ Retounen'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('church')}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                        >
                          {isEs ? 'Continuar a Iglesia ➔' : 'Kontinye nan Legliz ➔'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CHURCH ENGAGEMENT */}
                  {activeTab === 'church' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-amber-300 mb-1">
                            {isEs ? 'Departamento / Ministerio *' : 'Département / Ministère *'}
                          </label>
                          <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          >
                            {departmentsList.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-amber-300 mb-1">
                            {isEs ? 'Rol / Cargo en la Iglesia *' : 'Rôle / Tit nan Legliz la *'}
                          </label>
                          <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          >
                            <option value={isEs ? 'Miembro' : 'Manm'}>{isEs ? 'Miembro Regular' : 'Manm Senp'}</option>
                            <option value={isEs ? 'Recepción' : 'Manm akèy'}>{isEs ? 'Recepción / Protocolo' : 'Manm akèy'}</option>
                            <option value={isEs ? 'Apóstol' : 'Apot'}>{isEs ? 'Apóstol' : 'Apot'}</option>
                            <option value={isEs ? 'Diácono' : 'Diacre'}>{isEs ? 'Diácono / Diaconisa' : 'Diacre / Diaconesse'}</option>
                            <option value={isEs ? 'Líder' : 'Responsable'}>{isEs ? 'Líder de Ministerio' : 'Responsable Ministè'}</option>
                            <option value={isEs ? 'Salmista' : 'Chantre'}>{isEs ? 'Salmista / Músico' : 'Chantre / Mizisyen'}</option>
                            <option value={isEs ? 'Maestro' : 'Moniteur'}>{isEs ? 'Maestro(a) de Escuela Bíblica' : 'Monitè / Monitris'}</option>
                            <option value={isEs ? 'Protocolo' : 'Accueil'}>{isEs ? 'Servicio de Bienvenida' : 'Protokòl / Akèy'}</option>
                            <option value={isEs ? 'Predicador' : 'Prédicateur'}>{isEs ? 'Predicador / Anciano' : 'Predikatè / Ansyen'}</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Fecha de Bautismo' : 'Dat Batèm dlo'}
                          </label>
                          <input
                            type="date"
                            value={baptismDate}
                            onChange={(e) => setBaptismDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Fecha de Ingreso a la Iglesia' : 'Dat Antre nan Legliz la'}
                          </label>
                          <input
                            type="date"
                            value={joinedDate}
                            onChange={(e) => setJoinedDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            {isEs ? 'Estado del Miembro' : 'Estati Manm'}
                          </label>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          >
                            <option value="active">{isEs ? 'Activo (Regular)' : 'Aktif (Regilye)'}</option>
                            <option value="inactive">{isEs ? 'Inactivo / Ausente' : 'Enaktif / Absan'}</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          {isEs ? 'Grupo Celular / Sector de Oración' : 'Gwoup Selil / Sektè Lapriyè'}
                        </label>
                        <input
                          type="text"
                          placeholder={isEs ? 'ej: Célula Betel, Sector Norte...' : 'eg: Selil Bèthani, Zòn Nò...'}
                          value={cellGroup}
                          onChange={(e) => setCellGroup(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('contact')}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          {isEs ? '⬅ Volver' : '⬅ Retounen'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('security')}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 cursor-pointer"
                        >
                          {isEs ? 'Continuar a PIN & Notas ➔' : 'Kontinye nan PIN & Nòt ➔'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: PIN & PASTORAL NOTES */}
                  {activeTab === 'security' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isEs ? 'Código PIN Confidencial del Miembro (4 a 8 dígitos)' : 'Kòd PIN Sekirite & Konfidansyèl Manm (4 a 8 chif)'}</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleGenerateRandomPin}
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>{isEs ? 'Generar PIN Secreto (6 dígitos)' : 'Jenere PIN Sekrè (6 chif)'}</span>
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            type={showPin ? 'text' : 'password'}
                            maxLength={8}
                            placeholder={isEs ? 'Automático: 6 dígitos secretos generados si lo deja en blanco' : 'Otomatik: 6 chif sekrè jenere si w kite l vid'}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono text-sm tracking-widest placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-white"
                          >
                            {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-slate-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>
                            {isEs
                              ? 'Por seguridad, este PIN es secreto e independiente del carnet físico (no se deriva del ID). Si se deja en blanco, el sistema generará un PIN seguro de 6 dígitos.'
                              : 'Pou sekirite manm nan, PIN nan separe de ID a epi li pa janm parèt sou kat la. Si w kite l vid, sistèm nan ap jenere yon PIN sekrè 6 chif otomatikman.'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isEs ? 'Notas Pastorales & Observaciones Confidenciales' : 'Nòt Pastoral & Obsèvasyon Konfidansyèl'}</span>
                        </label>
                        <textarea
                          rows={3}
                          placeholder={isEs ? 'Ingrese cualquier comentario pastoral, motivos de oración o notas privadas sobre el miembro...' : 'Antre nenpòt kòmantè pastoral, bezwen priyè, oswa detay patikilye sou manm nan...'}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-400 focus:outline-none resize-none"
                        />
                      </div>

                      <div className="flex justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('church')}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          {isEs ? '⬅ Volver' : '⬅ Retounen'}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* RIGHT COLUMN: LIVE BADGE & ID PREVIEW */}
              <div className="lg:col-span-4 space-y-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-700/80 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
                      <QrCode className="w-3 h-3" />
                      {isEs ? 'Vista Previa de Carnet Digital' : 'Apèsi Kat Manm Dijital'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <div className="w-12 h-14 rounded-lg bg-slate-800 border border-amber-400/50 overflow-hidden flex items-center justify-center shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Apèsi Foto" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] uppercase text-slate-400 block font-mono">
                          {isEs ? 'ID de Miembro:' : 'Member ID:'}
                        </span>
                        <span className="font-mono font-black text-sm text-amber-300 truncate block">
                          {previewGeneratedId}
                        </span>
                        {legalDocumentNumber && (
                          <span className="text-[10px] font-mono text-emerald-400 block truncate">
                            {legalDocumentType.toUpperCase()}: {legalDocumentNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="text-white font-bold truncate">
                        {titlePrefix ? `${titlePrefix} ` : ''}
                        {fullName || (isEs ? 'Nombre del Miembro...' : 'Non Manm nan...')}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{isEs ? 'Iglesia:' : 'Legliz:'}</span>
                        <span className="text-slate-300 font-semibold truncate max-w-[140px]">
                          {church.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{isEs ? 'Departamento:' : 'Depatman:'}</span>
                        <span className="text-indigo-300 font-medium">{department}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{isEs ? 'Rol:' : 'Wòl:'}</span>
                        <span className="text-amber-300 font-semibold">{role}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{isEs ? 'Teléfono:' : 'Telefòn:'}</span>
                        <span className="text-slate-300 font-mono">{phone || '—'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{isEs ? 'Código QR:' : 'Kòd QR:'}</span>
                      <span className="text-emerald-400 font-bold">{isEs ? 'Automático' : 'Otomatik'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                  💡 <strong>{isEs ? 'Consejo Pro:' : 'Ide Pro :'}</strong> {isEs ? 'Al registrar al miembro, puede enviarle su código PIN por WhatsApp e imprimir el carnet directamente en formato PVC / PDF.' : 'Lè w fini kreye manm nan, ou ka voye kòd PIN li ba li sou WhatsApp epi enprime kat la dirèkteman an fòma PVC / PDF.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        {!createdSuccessMember && (
          <div className="p-4 bg-[#0F172A] border-t border-slate-700 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              {isEs ? 'Cancelar' : 'Anile'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                form="form-ultra-add-member"
                id="btn-submit-create-member"
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-[1.02]"
              >
                <UserPlus className="w-4 h-4 text-slate-950" />
                <span>{isEs ? 'Registrar Miembro' : 'Anrejistre Manm nan (Create Member)'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

