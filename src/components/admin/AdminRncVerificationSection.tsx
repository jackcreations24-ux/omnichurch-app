import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Church, Language } from '../../types';
import {
  detectDocumentFormat,
  formatRnc,
  DocumentDetectionResult,
} from '../../utils/rncValidator';
import { compressImageToBase64 } from '../../utils/storage';
import {
  isDeveloperSessionActive,
  revokeDeveloperSession,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  Eye,
  Trash2,
  FileText,
  Building2,
  Check,
  Info,
  Download,
  Calendar,
  Sparkles,
  HelpCircle,
  FileCheck,
  FileWarning,
  X,
  RefreshCw,
  ExternalLink,
  Shield,
  CheckCheck,
  Lock,
  Unlock,
  Globe2,
  Sliders,
  BadgeAlert,
  ArrowRight,
  MessageCircle,
  Copy,
  Phone,
  Send,
  KeyRound,
} from 'lucide-react';
import { DeveloperAuthModal } from '../developer/DeveloperAuthModal';

interface AdminRncVerificationSectionProps {
  church: Church;
  language?: Language;
  onSaveChurch: (updatedChurch: Church) => void;
}

export const AdminRncVerificationSection: React.FC<AdminRncVerificationSectionProps> = ({
  church,
  language = 'ht',
  onSaveChurch,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  // Form State
  const [rncNumber, setRncNumber] = useState<string>(church.rnc || church.rncNumber || '');
  const [legalName, setLegalName] = useState<string>(church.rncLegalName || church.name || '');
  const [documentPhoto, setDocumentPhoto] = useState<string>(church.rncDocumentPhoto || '');
  const [uploadedAt, setUploadedAt] = useState<string>(church.rncDocumentUploadedAt || '');
  const [documentType, setDocumentType] = useState<NonNullable<Church['rncDocumentType']>>(
    church.rncDocumentType || 'rnc_cert'
  );
  const [verificationStatus, setVerificationStatus] = useState<NonNullable<Church['rncVerificationStatus']>>(
    church.rncVerificationStatus || (church.rncDocumentPhoto && rncNumber.trim() ? 'pending' : 'not_submitted')
  );
  const [verifiedAt, setVerifiedAt] = useState<string>(church.rncVerifiedAt || '');
  const [rncNotes, setRncNotes] = useState<string>(church.rncNotes || '');

  // Developer Mode & Privileges
  const [isDev, setIsDev] = useState<boolean>(() => isDeveloperSessionActive());
  const [isDevAuthModalOpen, setIsDevAuthModalOpen] = useState<boolean>(false);

  // UI Interactive States
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [showAdminControls, setShowAdminControls] = useState<boolean>(false);
  const [showInstructionsGuide, setShowInstructionsGuide] = useState<boolean>(true);
  const [isContactSupportModalOpen, setIsContactSupportModalOpen] = useState<boolean>(false);
  const [isPhoneCopied, setIsPhoneCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Official Developer Support Constants
  const SUPPORT_PHONE_RAW = '+18296211349';
  const SUPPORT_PHONE_DISPLAY = '+1 (829) 621-1349';

  const whatsappMessage = encodeURIComponent(
    `Bonjou Asistans OmniChurch, mwen soumèt dokiman legal RNC pou legliz "${church.name || ''}" (${church.code || church.id}). Nimewo RNC: ${rncNumber.trim() || 'Nan dosye a'}. Tanpri verifye epi sètifye dokiman an sou sistèm nan.`
  );
  const whatsappUrl = `https://wa.me/18296211349?text=${whatsappMessage}`;
  const telegramUrl = `https://t.me/+18296211349`;

  const handleCopyPhone = () => {
    try {
      navigator.clipboard.writeText(SUPPORT_PHONE_RAW);
      setIsPhoneCopied(true);
      toast.success('Nimewo Kopye!', `${SUPPORT_PHONE_DISPLAY} kopye nan memwa ou.`);
      setTimeout(() => setIsPhoneCopied(false), 2500);
    } catch (_) {
      setIsPhoneCopied(true);
      setTimeout(() => setIsPhoneCopied(false), 2500);
    }
  };

  // Synchronize developer session changes
  useEffect(() => {
    const handleDevSessionCheck = () => {
      setIsDev(isDeveloperSessionActive());
    };
    window.addEventListener('omnichurch_dev_settings_updated', handleDevSessionCheck);
    window.addEventListener('focus', handleDevSessionCheck);
    return () => {
      window.removeEventListener('omnichurch_dev_settings_updated', handleDevSessionCheck);
      window.removeEventListener('focus', handleDevSessionCheck);
    };
  }, []);

  // Multi-Country Intelligent Document Detection
  const detection: DocumentDetectionResult = useMemo(() => {
    return detectDocumentFormat(rncNumber);
  }, [rncNumber]);

  // Real-time format validity
  const isFormatValid = detection.isValid;
  const hasDocument = Boolean(documentPhoto && documentPhoto.trim().length > 0);

  // Status computation for display
  const currentStatus = useMemo(() => {
    return verificationStatus;
  }, [verificationStatus]);

  // Handle file input
  const processUploadedFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error(
        isEs ? 'Formato No Válido' : isFr ? 'Format Non Valide' : isEn ? 'Invalid Format' : 'Fòma Fichye Envalid',
        isEs
          ? 'Por favor suba una imagen (JPG, PNG, WEBP).'
          : isFr
          ? 'Veuillez télécharger une image (JPG, PNG, WEBP).'
          : isEn
          ? 'Please upload an image file (JPG, PNG, WEBP).'
          : 'Tanpri telechaje yon foto (JPG, PNG, WEBP).'
      );
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error(
        isEs ? 'Archivo Muy Grande' : isFr ? 'Fichier Trop Volumineux' : isEn ? 'File Too Large' : 'Fichye a Twò Gwo',
        isEs ? 'El tamaño máximo permitido es 15MB.' : isFr ? 'Taille maximale 15 Mo.' : isEn ? 'Maximum size is 15MB.' : 'Fichye a pa dwe depase 15MB.'
      );
      return;
    }

    try {
      setIsUploading(true);
      const base64 = await compressImageToBase64(file, 1600, 0.85);
      const nowIso = new Date().toISOString();
      setDocumentPhoto(base64);
      setUploadedAt(nowIso);

      // Auto-update status to pending if not already verified
      if (verificationStatus !== 'verified') {
        setVerificationStatus('pending');
      }

      toast.success(
        isEs ? 'Documento Cargado' : isFr ? 'Document Téléchargé' : isEn ? 'Document Uploaded' : 'Dokiman an Chaje ak Siksè',
        isEs
          ? 'La foto del documento legal está lista para revisión.'
          : isFr
          ? 'La photo du document légal est prête pour vérification.'
          : isEn
          ? 'The legal document photo is ready for verification.'
          : 'Foto dokiman legal la pare pou verifye.'
      );
    } catch (err: any) {
      toast.error(
        isEs ? 'Error al procesar archivo' : isFr ? 'Erreur lors du traitement' : isEn ? 'Error processing file' : 'Erè nan trete fichye a',
        err?.message || (isEs ? 'No se pudo leer la imagen.' : 'Pa t ka li imaj la.')
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Reinitialize / Reset (User action)
  const handleReinitialize = () => {
    if (
      window.confirm(
        isEs
          ? '¿Desea reiniciar el documento y restablecer el formulario de verificación?'
          : isFr
          ? 'Voulez-vous réinitialiser le document et recommencer ?'
          : isEn
          ? 'Do you want to reset the document photo and reinitialize?'
          : 'Èske w vle reyinisyalize dokiman an epi kòmanse sou nouvo baz?'
      )
    ) {
      setDocumentPhoto('');
      setUploadedAt('');
      // Regular user cannot alter verified status without dev auth
      if (!isDev && verificationStatus === 'verified') {
        toast.warning(
          isEs ? 'Estado Protegido' : 'Estati Pwoteje',
          isEs
            ? 'El estado verificado está protegido por el desarrollador.'
            : 'Estati verifye sa a pwoteje. Kontakte devlopè a pou nenpòt modifikasyon ofisyèl.'
        );
        return;
      }
      setVerificationStatus('not_submitted');
      setVerifiedAt('');

      const updatedChurch: Church = {
        ...church,
        rncDocumentPhoto: undefined,
        rncDocumentUploadedAt: undefined,
        rncVerificationStatus: 'not_submitted',
        rncVerifiedAt: undefined,
      };
      onSaveChurch(updatedChurch);

      toast.info(
        isEs ? 'Reinicio Completado' : 'Reyinisyalize ak Siksè',
        isEs ? 'El formulario ha sido reiniciado.' : 'Fòmilè a reyinisyalize kòrèkteman.'
      );
    }
  };

  // Save changes (User action)
  const handleSave = (forcedStatus?: Church['rncVerificationStatus']) => {
    // If user is not developer, they cannot upgrade or change verified / rejected statuses directly
    const statusToSave = isDev && forcedStatus ? forcedStatus : currentStatus;
    const nowIso = new Date().toISOString();

    const updatedChurch: Church = {
      ...church,
      rnc: rncNumber.trim() || undefined,
      rncNumber: rncNumber.trim() || undefined,
      rncLegalName: legalName.trim() || undefined,
      rncDocumentPhoto: documentPhoto.trim() || undefined,
      rncDocumentUploadedAt: documentPhoto.trim() ? (uploadedAt || nowIso) : undefined,
      rncDocumentType: documentType,
      rncVerificationStatus: statusToSave,
      rncVerifiedAt: statusToSave === 'verified' ? (verifiedAt || nowIso) : undefined,
      rncNotes: rncNotes.trim() || undefined,
    };

    onSaveChurch(updatedChurch);

    toast.success(
      isEs ? 'Ajustes RNC Guardados' : isFr ? 'Paramètres RNC Enregistrés' : isEn ? 'RNC Settings Saved' : 'Paramèt RNC Anrejistre',
      isEs
        ? 'La información y modificaciones del RNC se han guardado exitosamente.'
        : isFr
        ? 'Les informations et modifications du RNC sont enregistrées.'
        : isEn
        ? 'RNC registration details have been successfully saved.'
        : 'Enfòmasyon ak modifikasyon RNC yo anrejistre avèk siksè.'
    );
  };

  // Submit for Verification (User action -> sets to 'pending' for developer review)
  const handleSubmitForReview = () => {
    if (!rncNumber.trim()) {
      toast.error(
        isEs ? 'Número Oficial Requerido' : isFr ? 'Numéro Officiel Requis' : isEn ? 'Official Number Required' : 'Nimewo Ofisyèl Obligatwa',
        isEs ? 'Por favor ingrese el número RNC, NIF o EIN oficial.' : 'Tanpri mete nimewo RNC, NIF, oswa EIN ofisyèl la.'
      );
      return;
    }

    if (!detection.isValid) {
      toast.error(
        isEs ? 'Formato Inválido' : 'Fòma Nimewo Envalid',
        isEs
          ? 'El sistema no acepta este número. Verifique que no contenga secuencias de prueba (ej: 01234567) o dígitos repetidos.'
          : 'Sistèm lan pa asepte nimewo sa a. Asire w li pa yon sekans tès (eg: 01234567) oswa chif repete.'
      );
      return;
    }

    if (!documentPhoto) {
      toast.error(
        isEs ? 'Foto del Documento Requerida' : isFr ? 'Photo du Document Requise' : isEn ? 'Document Photo Required' : 'Foto Dokiman Obligatwa',
        isEs ? 'Debe cargar una foto clara del documento legal.' : 'Fòk ou founi yon foto klè dokiman legal la anvan ou soumèt.'
      );
      return;
    }

    const nowIso = new Date().toISOString();
    setVerificationStatus('pending');
    setUploadedAt(uploadedAt || nowIso);

    const updatedChurch: Church = {
      ...church,
      rnc: rncNumber.trim(),
      rncNumber: rncNumber.trim(),
      rncLegalName: legalName.trim() || church.name,
      rncDocumentPhoto: documentPhoto.trim(),
      rncDocumentUploadedAt: uploadedAt || nowIso,
      rncDocumentType: documentType,
      rncVerificationStatus: 'pending',
      rncNotes: rncNotes.trim() || undefined,
    };
    onSaveChurch(updatedChurch);

    // Open Contact Support modal immediately with luminous WhatsApp & Telegram options
    setIsContactSupportModalOpen(true);

    toast.success(
      isEs ? '¡Enviado para Revisión del Desarrollador!' : isFr ? 'Soumis pour Revue Développeur !' : isEn ? 'Submitted to Developer Review!' : 'Soumèt pou Verifikasyon Devlopè a!',
      isEs
        ? 'El expediente ha sido enviado. Por favor confirme vía WhatsApp o Telegram al desarrollador (+1 829 621 1349).'
        : isFr
        ? 'Le dossier est soumis. Veuillez confirmer par WhatsApp ou Telegram au développeur (+1 829 621 1349).'
        : isEn
        ? 'The documentation is submitted. Please confirm via WhatsApp or Telegram to the developer (+1 829 621 1349).'
        : 'Dosye a soumèt ak siksè. Tanpri klike sou WhatsApp oswa Telegram pou konfime ak Devlopè a (+1 829 621 1349).'
    );
  };

  // DEVELOPER-ONLY: Approve and Certify RNC
  const handleDevApprove = () => {
    if (!isDev) {
      toast.warning(
        isEs ? 'Acceso Restringido' : 'Aksè Rezève pou Devlopè',
        isEs
          ? 'Solo el desarrollador oficial puede certificar el documento. Contacte asistencia técnica.'
          : 'Sèlman devlopè ofisyèl platfòm lan ki gen dwa pou apwouve oswa sètifye dokiman sa a.'
      );
      setIsContactSupportModalOpen(true);
      return;
    }

    if (!documentPhoto) {
      toast.error(
        isEs ? 'Documento Faltante' : isFr ? 'Document Manquant' : isEn ? 'Missing Document' : 'Dokiman Manke',
        isEs ? 'Debe haber una foto del documento para certificar.' : 'Fòk gen foto dokiman an pou w ka apwouve li.'
      );
      return;
    }

    const nowIso = new Date().toISOString();
    setVerificationStatus('verified');
    setVerifiedAt(nowIso);

    const updatedChurch: Church = {
      ...church,
      rnc: rncNumber.trim() || undefined,
      rncNumber: rncNumber.trim() || undefined,
      rncLegalName: legalName.trim() || undefined,
      rncDocumentPhoto: documentPhoto.trim(),
      rncDocumentUploadedAt: uploadedAt || nowIso,
      rncDocumentType: documentType,
      rncVerificationStatus: 'verified',
      rncVerifiedAt: nowIso,
      rncNotes: rncNotes.trim() || 'Verifié et certifié par le Développeur de la plateforme.',
    };
    onSaveChurch(updatedChurch);

    try {
      confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
    } catch (_) {}

    toast.success(
      isEs ? '¡RNC Aprobado y Certificado por el Desarrollador!' : 'RNC Verifye & Sètifye pa Devlopè a!',
      isEs
        ? 'Se ha aprobado y certificado el RNC. El sello oficial aparecerá en todas las tarjetas.'
        : 'Ou apwouve ak sètifye RNC legliz la kòm Devlopè. Sele verifikasyon an aktif sou tout kat manm yo.'
    );
  };

  // DEVELOPER-ONLY: Reject / Request Correction
  const handleDevReject = () => {
    if (!isDev) {
      toast.warning(
        isEs ? 'Acceso Restringido' : 'Aksè Rezève pou Devlopè',
        isEs
          ? 'Solo el desarrollador oficial puede rechazar o auditar el documento.'
          : 'Sèlman devlopè ofisyèl platfòm lan ki gen dwa pou fè modifikasyon sa a.'
      );
      setIsContactSupportModalOpen(true);
      return;
    }

    const notePrompt = window.prompt(
      isEs
        ? 'Indique el motivo del rechazo o corrección requerida para la iglesia:'
        : 'Endike rezon rejè a oswa sa ki dwe korije nan dosye legliz la:',
      rncNotes || (isEs ? 'Foto borrosa o número no coincide con el documento.' : 'Foto a pa klè oswa nimewo a pa kowenside ak dokiman an.')
    );

    if (notePrompt === null) return; // User cancelled prompt

    const updatedNotes = notePrompt.trim();
    setVerificationStatus('rejected');
    setRncNotes(updatedNotes);

    const updatedChurch: Church = {
      ...church,
      rnc: rncNumber.trim() || undefined,
      rncNumber: rncNumber.trim() || undefined,
      rncLegalName: legalName.trim() || undefined,
      rncDocumentPhoto: documentPhoto.trim() || undefined,
      rncDocumentUploadedAt: uploadedAt || undefined,
      rncDocumentType: documentType,
      rncVerificationStatus: 'rejected',
      rncVerifiedAt: undefined,
      rncNotes: updatedNotes,
    };
    onSaveChurch(updatedChurch);

    toast.warning(
      isEs ? 'Estado: Requiere Corrección / Rechazado' : 'Estati: Bezwen Koreksyon / Rejte',
      isEs
        ? 'Se ha marcado como rechazado con observaciones para la congregación.'
        : 'Dosye a make kòm bezwen koreksyon ak nòt pou legliz la korije li.'
    );
  };

  // DEVELOPER-ONLY: Set to Pending
  const handleDevSetPending = () => {
    if (!isDev) {
      toast.warning(
        isEs ? 'Acceso Restringido' : 'Aksè Rezève pou Devlopè',
        isEs
          ? 'Solo el desarrollador oficial puede auditar el documento.'
          : 'Sèlman devlopè ofisyèl platfòm lan ki gen dwa pou fè modifikasyon sa a.'
      );
      setIsContactSupportModalOpen(true);
      return;
    }

    setVerificationStatus('pending');
    const updatedChurch: Church = {
      ...church,
      rncVerificationStatus: 'pending',
      rncVerifiedAt: undefined,
    };
    onSaveChurch(updatedChurch);
    toast.info('Estati Mete kòm An Atant', 'Dosye a tounen nan lis revizyon an atant.');
  };

  // DEVELOPER-ONLY: Revoke Developer Session
  const handleDevLogout = async () => {
    await revokeDeveloperSession();
    setIsDev(false);
    toast.info('Sesyon Devlopè Fèmen', 'Sesyon devlopè a bloke an sekirite.');
  };

  // Document Type Labels
  const docTypeLabels: Record<NonNullable<Church['rncDocumentType']>, { ht: string; es: string; fr: string; en: string }> = {
    rnc_cert: {
      ht: 'Sètifika RNC / Patant DGI / DGII',
      es: 'Certificado RNC / Patente DGII',
      fr: 'Certificat RNC / Patente DGI',
      en: 'RNC Certificate / Tax Registry Form',
    },
    dgii_act: {
      ht: 'Batistè Eklezyastik / Konstitisyon Legal',
      es: 'Acta Constitutiva / Registro Notarial',
      fr: 'Acte Constitutif / Enregistrement Légal',
      en: 'Articles of Incorporation / Charter',
    },
    ministry_decree: {
      ht: 'Dekrè Ofisyèl Ministè Kilt / Leta',
      es: 'Decreto Oficial del Ministerio de Cultos',
      fr: 'Décret Officiel du Ministère des Cultes',
      en: 'Official Ministry Decree / Recognition',
    },
    statutes: {
      ht: 'Règleman ak Stati Jirik Eklezyastik',
      es: 'Estatutos Jurídicos de la Congregación',
      fr: 'Statuts Juridiques de l’Assemblée',
      en: 'Church By-Laws and Legal Statutes',
    },
    other: {
      ht: 'Lòt Dokiman Legal Otorize',
      es: 'Otro Documento Legal Autorizado',
      fr: 'Autre Document Légal Autorisé',
      en: 'Other Authorized Legal Document',
    },
  };

  return (
    <div id="admin-rnc-verification-container" className="space-y-6">
      {/* SECTION HEADER & STATUS BANNER */}
      <div className="p-5 sm:p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
        {/* Glow Accent */}
        <div
          className={`absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
            currentStatus === 'verified'
              ? 'bg-emerald-500'
              : currentStatus === 'pending'
              ? 'bg-amber-500'
              : currentStatus === 'rejected'
              ? 'bg-rose-500'
              : 'bg-indigo-500'
          }`}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
                currentStatus === 'verified'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : currentStatus === 'pending'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : currentStatus === 'rejected'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400'
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {isEs
                    ? 'Verificación Oficial de RNC y Documentos Legales'
                    : isFr
                    ? 'Vérification Officielle RNC & Documents Légaux'
                    : isEn
                    ? 'Official RNC Verification & Legal Documents'
                    : 'Verifikasyon Ofisyèl RNC & Dokiman Legal'}
                </h3>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {church.code || church.id}
                </span>

                {/* DEVELOPER ACTIVE BADGE */}
                {isDev && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-xs">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>Dev Authority</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEs
                  ? 'Registro Nacional de Contribuyentes (RNC), patente fiscal y certificación oficial de la iglesia.'
                  : isFr
                  ? 'Registre National des Contribuables (RNC), patente fiscale et certification officielle.'
                  : isEn
                  ? 'Official National Taxpayer Registry (RNC/NIF/EIN) and legal charter verification.'
                  : 'Rejis Nasyonal Kontribiyab (RNC/NIF/EIN), patant fiskal ak rekonesans legal legliz la.'}
              </p>
            </div>
          </div>

          {/* DYNAMIC STATUS BADGE */}
          <div className="self-start md:self-center">
            {currentStatus === 'verified' && (
              <div className="px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 shadow-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{isEs ? 'RNC VERIFICADO Y OFICIAL' : 'RNC VERIFYE & OFISYÈL'}</span>
                  </div>
                  {verifiedAt && (
                    <div className="text-[10px] text-emerald-400/80 font-mono">
                      {isEs ? 'Validado el: ' : 'Sètifye: '}
                      {new Date(verifiedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStatus === 'pending' && (
              <div className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center gap-2 shadow-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <div>
                  <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{isEs ? 'EN ESPERA DE REVISIÓN' : 'AN ATANT VERIFIKASYON'}</span>
                  </div>
                  <div className="text-[10px] text-amber-300/80">
                    {isEs ? 'En revisión por el desarrollador' : 'Nan revizyon pa devlopè a'}
                  </div>
                </div>
              </div>
            )}

            {currentStatus === 'rejected' && (
              <div className="px-4 py-2 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center gap-2 shadow-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <div>
                  <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>{isEs ? 'REQUIERE CORRECCIÓN' : 'BEZWEN KOREKSYON'}</span>
                  </div>
                  <div className="text-[10px] text-rose-300/80">
                    {isEs ? 'Revise las observaciones abajo' : 'Gade nòt devlopè a anba'}
                  </div>
                </div>
              </div>
            )}

            {currentStatus === 'not_submitted' && (
              <div className="px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {isEs ? 'NO ENVIADO AÚN' : 'POKO SOUMÈT'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEs ? 'Cargue foto y número RNC' : 'Mete foto ak nimewo RNC'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DEVELOPER AUTHORITY SECURITY BANNER */}
        <div className="mt-2 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            {isDev ? (
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Unlock className="w-4 h-4 text-emerald-400" />
                <span>
                  {isEs
                    ? 'Acceso de Desarrollador Activo (Privilegios de Certificación Desbloqueados)'
                    : 'Aksè Devlopè Aktif (Ou gen dwa legal pou sètifye oswa rejte dokiman sa a)'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isEs
                    ? 'Verificación restringida: Solo el desarrollador central tiene autoridad para aprobar o certificar.'
                    : 'Sèlman devlopè a ki gen dwa pou sètifye, apwouve, oswa rejte estati RNC a.'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDev ? (
              <button
                type="button"
                id="btn-dev-lock-session"
                onClick={handleDevLogout}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors cursor-pointer border border-slate-700 flex items-center gap-1.5"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>{isEs ? 'Bloquear Acceso Dev' : 'Fèmen Sesyon Dev'}</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-trigger-contact-support-banner"
                onClick={() => setIsContactSupportModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-sky-500/20 hover:from-emerald-500/30 hover:via-teal-500/30 hover:to-sky-500/30 text-emerald-300 text-[11px] font-bold transition-all cursor-pointer border border-emerald-500/40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_25px_rgba(16,185,129,0.45)]"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isEs ? 'Contactar Asistencia (+1 829 621 1349)' : 'Kontakte Asistans (+1 829 621 1349)'}</span>
              </button>
            )}

            {isDev && (
              <button
                type="button"
                id="btn-toggle-admin-controls"
                onClick={() => setShowAdminControls(!showAdminControls)}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer border border-slate-700 flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {showAdminControls
                    ? (isEs ? 'Ocultar Opciones Dev' : 'Kache Panèl Dev')
                    : (isEs ? 'Panel de Control Dev' : 'Panèl Kontwòl Dev')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* DEVELOPER FULL GOVERNANCE CONTROLS (VISIBLE WHEN DEV MODE ACTIVE) */}
        {isDev && (showAdminControls || currentStatus === 'pending') && (
          <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>
                  {isEs
                    ? 'Panel de Autoridad del Desarrollador (Certificación y Auditoría)'
                    : 'Panèl Otorite Devlopè a (Sètifikasyon & Odisyon)'}
                </span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Lead Architect Security Engine
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                id="btn-dev-action-approve"
                onClick={handleDevApprove}
                className="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEs ? 'Aprobar y Certificar RNC' : 'Apwouve & Sètifye RNC'}</span>
              </button>

              <button
                type="button"
                id="btn-dev-action-reject"
                onClick={handleDevReject}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 active:scale-98"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{isEs ? 'Rechazar / Pedir Corrección' : 'Mande Koreksyon / Rejte'}</span>
              </button>

              <button
                type="button"
                id="btn-dev-action-pending"
                onClick={handleDevSetPending}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isEs ? 'Marcar Pendiente' : 'Mete An Atant'}</span>
              </button>

              <button
                type="button"
                id="btn-dev-action-reset"
                onClick={() => {
                  setVerificationStatus('not_submitted');
                  setVerifiedAt('');
                  handleSave('not_submitted');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isEs ? 'Reiniciar Estado' : 'Reyinisyalize Estati'}</span>
              </button>
            </div>
          </div>
        )}

        {/* NOTES / OBSERVATIONS BANNER (IF REJECTED OR HAS DEVELOPER NOTES) */}
        {rncNotes && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-300">
                {currentStatus === 'rejected'
                  ? (isEs ? 'Correcciones Requeridas por el Desarrollador:' : 'Koreksyon Devlopè a Mande:')
                  : (isEs ? 'Notas de Verificación:' : 'Nòt Verifikasyon:')}
              </span>
              <p className="text-slate-300 mt-0.5">{rncNotes}</p>
            </div>
          </div>
        )}
      </div>

      {/* CLEAR INSTRUCTION SET FOR THE USER */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">
                {isEs
                  ? 'Guía de Verificación: Proceso de Certificación Oficial'
                  : 'Gid & Enstriksyon Klè pou Verifikasyon RNC Legal'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {isEs
                  ? 'El usuario carga y envía el documento. El desarrollador audita y emite la certificación oficial.'
                  : 'Itilizatè a founi enfòmasyon yo epi soumèt li. Se devlopè a sèlman ki gen dwa sètifye ak apwouve.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowInstructionsGuide(!showInstructionsGuide)}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
          >
            {showInstructionsGuide ? (isEs ? 'Ocultar' : 'Fèmen Gid') : (isEs ? 'Ver Guía' : 'Wè Gid la')}
          </button>
        </div>

        {showInstructionsGuide && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                  1
                </span>
                {isFormatValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold">ETAP 1</span>
                )}
              </div>
              <h5 className="text-xs font-bold text-white">
                {isEs ? 'Número Oficial Válido' : 'Nimewo Ofisyèl Valab'}
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isEs
                  ? 'Ingrese el número oficial emitido por el Estado (RNC, NIF, EIN, RNA). El detector lo valida en tiempo real.'
                  : 'Antre nimewo ofisyèl leta bay la (RNC, NIF, EIN, RNA). Detektè a rekonèt li otomatikman.'}
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                  2
                </span>
                {hasDocument ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold">ETAP 2</span>
                )}
              </div>
              <h5 className="text-xs font-bold text-white">
                {isEs ? 'Foto Clara del Documento' : 'Foto Dokiman Klè'}
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isEs
                  ? 'Suba una foto bien iluminada de la Patente DGI/DGII, Decreto Ministerial o Certificado.'
                  : 'Telechaje yon foto klè sou yon tab plat, kote tout 4 kwen dokiman an parèt nèt san lonbray.'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                  3
                </span>
                {currentStatus === 'pending' ? (
                  <Clock className="w-4 h-4 text-amber-400" />
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold">ETAP 3</span>
                )}
              </div>
              <h5 className="text-xs font-bold text-white">
                {isEs ? 'Envío para Revisión' : 'Soumèt pou Revizyon'}
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isEs
                  ? 'Haga clic en "Enviar para Verificación". El expediente pasa a estado Pendiente para el desarrollador.'
                  : 'Klike sou "Soumèt pou Verifikasyon". Dosye a pase kòm An Atant pou devlopè a fè odisyon an.'}
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                  4
                </span>
                {currentStatus === 'verified' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold">ETAP 4</span>
                )}
              </div>
              <h5 className="text-xs font-bold text-white">
                {isEs ? 'Certificación del Desarrollador' : 'Sètifikasyon Devlopè a'}
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isEs
                  ? 'El desarrollador aprueba el expediente y el sello oficial de RNC Verificado protege todos los carnets.'
                  : 'Devlopè a apwouve dosye a epi tout kat manm yo ap resevwa sele sekirite ofisyèl la.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: LEGAL DOCUMENT PHOTO UPLOAD & PREVIEW (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 sm:p-6 bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>
                    {isEs
                      ? 'Foto del Documento Legal de la Iglesia'
                      : 'Foto Dokiman Legal Legliz la'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isEs
                    ? 'Patente DGI/DGII, Certificado RNC, Decreto Presidencial o Carta Constitutiva.'
                    : 'Patant DGI / DGII, Sètifika RNC, Dekrè Ministè Kilt oswa Batistè Eklezyastik.'}
                </p>
              </div>

              {documentPhoto && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>{isEs ? 'Foto Cargada' : 'Foto Disponib ✓'}</span>
                </span>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
            />

            {/* Document Photo Preview or Upload Dropzone */}
            {documentPhoto ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 group">
                  <img
                    src={documentPhoto}
                    alt="Legal Document"
                    className="w-full h-64 sm:h-80 object-contain bg-black/40"
                  />

                  {/* Overlay Action Bar */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
                    <button
                      type="button"
                      id="btn-rnc-view-large"
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer transition-transform hover:scale-105"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{isEs ? 'Ver en Grande' : 'Gade an Gwo'}</span>
                    </button>

                    <button
                      type="button"
                      id="btn-rnc-change-photo"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-600 shadow-lg cursor-pointer transition-transform hover:scale-105"
                    >
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>{isEs ? 'Reemplazar' : 'Chanje Foto'}</span>
                    </button>
                  </div>

                  {/* Bottom info strip */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 flex items-center justify-between text-[11px] text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold">{docTypeLabels[documentType]?.[language] || docTypeLabels[documentType]?.ht}</span>
                    </div>
                    {uploadedAt && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(uploadedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Auxiliary buttons */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    id="btn-rnc-open-modal-preview"
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Inspeccionar documento en detalle' : 'Enspekte dokiman an an gwo'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-rnc-remove-document"
                    onClick={handleReinitialize}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Eliminar / Reiniciar' : 'Retire Dokiman'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Dropzone */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 sm:p-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-400 bg-amber-500/10 scale-99'
                    : 'border-slate-700 bg-slate-950/50 hover:border-slate-600 hover:bg-slate-950'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                  {isUploading ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-black text-white">
                    {isEs
                      ? 'Haga clic para seleccionar o arrastre el documento aquí'
                      : 'Klike pou chwazi oswa glise dokiman an la a'}
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    {isEs
                      ? 'Formatos aceptados: JPG, PNG o WEBP. Máximo 15MB. Asegúrese que el número RNC y el nombre de la iglesia sean legibles.'
                      : 'Fòma aksepte: JPG, PNG oswa WEBP. Maks 15MB. Asire w tout tèks, sele ak nimewo RNC a lizib.'}
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-rnc-upload-clicker"
                  className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-transform hover:scale-105 shadow-md flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Seleccionar Foto' : 'Chwazi Fichye Foto'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RNC FIELDS, AUTOMATIC FORMAT DETECTION & ACTIONS (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 sm:p-6 bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>
                {isEs ? 'Datos Oficiales del Registro Legal' : 'Enfòmasyon Ofisyèl Rejis Legal la'}
              </span>
            </h4>

            {/* Official Number Input with Multi-Country Detection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 block">
                  {isEs ? 'Número Oficial (RNC / NIF / EIN) *' : 'Nimewo Ofisyèl (RNC / NIF / EIN) *'}
                </label>
                {rncNumber.trim() && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      isFormatValid
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {isFormatValid ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>{isEs ? 'Válido' : 'Valab ✓'}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>{isEs ? 'No Válido' : 'Envalid'}</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* Text input with cleaned, professional placeholder without 01234567 */}
              <input
                type="text"
                id="input-official-rnc-number"
                value={rncNumber}
                onChange={(e) => setRncNumber(e.target.value)}
                placeholder={
                  isEs
                    ? 'ej: 1-32-45678-9 o 004-582-193-4'
                    : isFr
                    ? 'ex: 1-32-45678-9 ou 004-582-193-4'
                    : isEn
                    ? 'e.g. 1-32-45678-9 or 004-582-193-4'
                    : 'eg: 1-32-45678-9 oswa 004-582-193-4'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-sm font-bold focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              />

              {/* AUTOMATIC MULTI-COUNTRY DETECTOR CARD */}
              {rncNumber.trim() && (
                <div
                  className={`p-3 rounded-2xl border transition-all space-y-2 ${
                    isFormatValid
                      ? 'bg-slate-950 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none" title={detection.countryName[language] || detection.countryName.ht}>
                        {detection.countryFlag}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>{detection.typeName[language] || detection.typeName.ht}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {detection.countryName[language] || detection.countryName.ht}
                        </div>
                      </div>
                    </div>

                    {isFormatValid && detection.formatted !== rncNumber && (
                      <button
                        type="button"
                        id="btn-apply-formatted-rnc"
                        onClick={() => setRncNumber(detection.formatted)}
                        className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 cursor-pointer flex items-center gap-1"
                        title="Aplike fòma estanda ak tirè"
                      >
                        <span>Fòma: {detection.formatted}</span>
                      </button>
                    )}
                  </div>

                  {/* Validation message feedback */}
                  <div
                    className={`text-[11px] leading-tight flex items-start gap-1.5 ${
                      isFormatValid ? 'text-emerald-300' : 'text-amber-300/90'
                    }`}
                  >
                    {isFormatValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <span>{detection.validationMessage[language] || detection.validationMessage.ht}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Church Legal Corporate Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 block">
                {isEs ? 'Razón Social / Nombre Jurídico Registrado *' : 'Non Legal Konplè devan Leta *'}
              </label>
              <input
                type="text"
                id="input-church-legal-name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="eg: Église Évangélique Baptiste de la Grâce Inc."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs font-bold focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Document Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 block">
                {isEs ? 'Tipo de Documento Legal Adjunto' : 'Kalite Dokiman Legal ki Founi a'}
              </label>
              <select
                id="select-church-doc-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as NonNullable<Church['rncDocumentType']>)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs font-semibold focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none cursor-pointer"
              >
                <option value="rnc_cert">{docTypeLabels.rnc_cert[language] || docTypeLabels.rnc_cert.ht}</option>
                <option value="dgii_act">{docTypeLabels.dgii_act[language] || docTypeLabels.dgii_act.ht}</option>
                <option value="ministry_decree">{docTypeLabels.ministry_decree[language] || docTypeLabels.ministry_decree.ht}</option>
                <option value="statutes">{docTypeLabels.statutes[language] || docTypeLabels.statutes.ht}</option>
                <option value="other">{docTypeLabels.other[language] || docTypeLabels.other.ht}</option>
              </select>
            </div>

            {/* Verification Notes / Observations */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 block">
                {isEs ? 'Notas u Observaciones' : 'Nòt oswa Obsèvasyon'}
              </label>
              <textarea
                id="textarea-rnc-notes"
                rows={2}
                value={rncNotes}
                onChange={(e) => setRncNotes(e.target.value)}
                placeholder={
                  isEs
                    ? 'ej: Registrado en la oficina tributaria central...'
                    : 'eg: Anrejistre nan biwo santral DGI, dosye #49281...'
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 text-xs focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* ACTION BUTTONS (STRICT ROLE BOUNDARY: USER vs DEVELOPER) */}
            <div className="pt-2 space-y-2.5">
              {/* If Church is ALREADY verified */}
              {currentStatus === 'verified' && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 shadow-inner">
                  <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-xs uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{isEs ? 'RNC Certificado y Protegido' : 'RNC Sètifye & Pwoteje'}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {isEs
                      ? 'El sello oficial de RNC Verificado está activo en todas las tarjetas de miembros emitidas.'
                      : 'Sele ofisyèl RNC Verifye a aktif sou tout kat manm legliz sa a.'}
                  </p>
                </div>
              )}

              {/* USER ACTION 1: SUBMIT FOR VERIFICATION */}
              {currentStatus !== 'verified' && (
                <button
                  type="button"
                  id="btn-user-submit-verification"
                  onClick={handleSubmitForReview}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {currentStatus === 'pending'
                      ? (isEs ? 'Actualizar Envío para Revisión' : 'Mete Ajou Dosye Soumèt la')
                      : (isEs ? 'Enviar Documento para Verificación' : 'Soumèt pou Verifikasyon')}
                  </span>
                </button>
              )}

              {/* USER ACTION 2: SAVE CHANGES */}
              <button
                type="button"
                id="btn-user-save-rnc-changes"
                onClick={() => handleSave()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-colors border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-amber-400" />
                <span>
                  {isEs ? 'Guardar Cambios' : isFr ? 'Enregistrer les Modifications' : isEn ? 'Save Changes' : 'Anrejistre Modifikasyon'}
                </span>
              </button>

              {/* USER ACTION 3: REINITIALIZE / RESET */}
              {documentPhoto && (
                <button
                  type="button"
                  id="btn-user-reinitialize-rnc"
                  onClick={handleReinitialize}
                  className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-rose-300 font-semibold text-[11px] transition-colors border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isEs ? 'Reiniciar Formulario' : 'Reyinisyalize Dokiman an'}</span>
                </button>
              )}
            </div>

            {/* ULTRA-PRO SUPPORT & CONFIRMATION BOX */}
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0B1120] to-slate-900 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="text-xs font-black text-white tracking-wide">
                    {isEs ? 'Línea de Asistencia y Certificación' : 'Liy Asistans & Sètifikasyon Ofisyèl'}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                  Dev Line 24/7
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isEs
                  ? 'Para acelerar la auditoría y recibir el sello oficial en sus credenciales, confirme directamente con el desarrollador por WhatsApp o Telegram:'
                  : 'Pou akselere odit la epi resevwa sele ofisyèl la sou tout kat manm yo, konfime dirèkteman ak devlopè a sou WhatsApp oswa Telegram:'}
              </p>

              {/* ACTION PLATFORMS WITH LUMINOUS GLOW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* WHATSAPP WITH LUMINOUS GLOW */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="link-whatsapp-support-inline"
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-extrabold text-xs flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(37,211,102,0.45)] hover:shadow-[0_0_35px_rgba(37,211,102,0.75)] transition-all hover:scale-[1.02] cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.79 14.07c-.24.68-1.2 1.25-1.68 1.3-.46.05-1.04.08-3.32-.86-2.92-1.2-4.81-4.18-4.96-4.38-.14-.2-1.19-1.58-1.19-3.02 0-1.44.75-2.15 1.02-2.44.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.33.02.53-.1.2-.15.33-.3.51-.15.18-.31.4-.44.54-.15.15-.31.31-.13.62.18.31.8 1.32 1.72 2.14 1.18 1.05 2.18 1.37 2.49 1.52.31.15.49.13.67-.08.18-.21.78-.91.99-1.22.21-.31.42-.26.71-.15.29.11 1.83.86 2.14 1.02.31.15.52.23.6.36.08.13.08.76-.16 1.44z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-black text-xs leading-tight">WhatsApp</div>
                      <div className="text-[10px] text-emerald-100 font-mono">+1 829 621 1349</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-white/90 group-hover:text-white" />
                </a>

                {/* TELEGRAM WITH LUMINOUS GLOW */}
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="link-telegram-support-inline"
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#0088cc] via-[#0099e6] to-[#00b0ff] hover:from-[#0099e6] hover:to-[#26baff] text-white font-extrabold text-xs flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(0,136,204,0.45)] hover:shadow-[0_0_35px_rgba(0,136,204,0.75)] transition-all hover:scale-[1.02] cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-black text-xs leading-tight">Telegram</div>
                      <div className="text-[10px] text-sky-100 font-mono">+1 829 621 1349</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-white/90 group-hover:text-white" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN IMAGE PREVIEW MODAL */}
      {isPreviewModalOpen && documentPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-black text-white">
                    {isEs ? 'Foto del Documento Legal RNC' : 'Foto Dokiman Legal RNC'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {church.name} • {rncNumber || church.code}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={documentPhoto}
                  download={`RNC_${church.code || church.id}.png`}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Telechaje"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Large Image */}
            <div className="p-4 overflow-auto flex items-center justify-center bg-black/40 min-h-[300px]">
              <img
                src={documentPhoto}
                alt="Full preview"
                className="max-h-[70vh] object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-400 flex items-center gap-2">
                <span className="font-bold text-white">{docTypeLabels[documentType]?.[language] || docTypeLabels[documentType]?.ht}</span>
                {uploadedAt && <span>• Chaje le {new Date(uploadedAt).toLocaleDateString()}</span>}
              </div>

              {isDev && currentStatus !== 'verified' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    handleDevApprove();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-transform hover:scale-105 shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEs ? 'Aprobar Documento' : 'Apwouve Dokiman Sa a'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEVELOPER AUTH MODAL */}
      <DeveloperAuthModal
        isOpen={isDevAuthModalOpen}
        onClose={() => setIsDevAuthModalOpen(false)}
        onSuccess={() => {
          setIsDev(true);
          setIsDevAuthModalOpen(false);
          toast.success(
            'Otorizasyon Devlopè Valide!',
            'Ou gen aksè konplè kounye a pou verifye, apwouve oswa mande koreksyon sou RNC legliz la.'
          );
        }}
        language={language}
      />
    </div>
  );
};
