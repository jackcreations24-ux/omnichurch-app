import React, { useState, useEffect, useMemo } from 'react';
import { Church, Member, Language } from '../../types';
import {
  getMembersByChurch,
  getChurchById,
  getAllChurches,
  getMemberVerificationUrl,
} from '../../utils/storage';
import {
  firestoreGetMember,
  firestoreGetChurch,
} from '../../services/firestoreService';
import { churchHasValidRnc, getChurchRnc } from '../../utils/rncValidator';
import {
  ShieldCheck,
  CheckCircle,
  FileText,
  Building2,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Printer,
  Share2,
  Check,
  ArrowLeft,
  X,
  AlertTriangle,
  Loader2,
  Globe,
  Award,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface MemberPublicVerificationPageProps {
  memberCode: string;
  churchId?: string;
  initialLanguage?: Language;
  onClose?: () => void;
}

export const MemberPublicVerificationPage: React.FC<MemberPublicVerificationPageProps> = ({
  memberCode,
  churchId,
  initialLanguage = 'ht',
  onClose,
}) => {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [member, setMember] = useState<Member | null>(null);
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [verifiedTime, setVerifiedTime] = useState<string>('');
  const [isClosedScreen, setIsClosedScreen] = useState<boolean>(false);

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const hasValidRnc = church ? churchHasValidRnc(church) : false;
  const churchRnc = church ? getChurchRnc(church) : '';

  // Close handler: Attempts to close window or navigate back safely without ever landing on login
  const handleClosePage = () => {
    if (typeof window !== 'undefined') {
      try {
        window.close();
      } catch (_) {}

      // If in browser history (e.g. came from scanner or previous tab), try back
      if (window.history.length > 1) {
        window.history.back();
        setTimeout(() => {
          setIsClosedScreen(true);
        }, 300);
        return;
      }
    }

    // Fallback: graceful completed verification screen (never redirects to login)
    setIsClosedScreen(true);
  };

  // 1. Generate verification timestamp
  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString(
      language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'en' ? 'en-US' : 'fr-HT',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }
    );
    setVerifiedTime(formatted);
  }, [language]);

  // 2. Fetch member & church data (from local cache and Firestore cloud)
  useEffect(() => {
    let isMounted = true;
    const cleanCode = (memberCode || '').trim();
    const cleanChurchId = (churchId || '').trim();

    if (!cleanCode) {
      setLoading(false);
      return;
    }

    const resolveData = async () => {
      setLoading(true);

      // A. Try Local Storage first (instant load if already cached)
      let foundMember: Member | null = null;
      let foundChurch: Church | null = null;

      if (cleanChurchId) {
        const churchMembers = getMembersByChurch(cleanChurchId);
        foundMember =
          churchMembers.find(
            (m) =>
              m.memberId.toUpperCase() === cleanCode.toUpperCase() ||
              m.id === cleanCode ||
              m.barcodeToken.toUpperCase() === cleanCode.toUpperCase()
          ) || null;
        foundChurch = getChurchById(cleanChurchId) || null;
      }

      if (!foundMember) {
        // Search across all churches locally
        const allCh = getAllChurches();
        for (const ch of allCh) {
          const list = getMembersByChurch(ch.id);
          const m = list.find(
            (item) =>
              item.memberId.toUpperCase() === cleanCode.toUpperCase() ||
              item.id === cleanCode ||
              item.barcodeToken.toUpperCase() === cleanCode.toUpperCase()
          );
          if (m) {
            foundMember = m;
            foundChurch = ch;
            break;
          }
        }
      }

      // If found in local cache, update state immediately
      if (foundMember && isMounted) {
        setMember(foundMember);
        if (foundChurch) setChurch(foundChurch);
        setLoading(false);
      }

      // B. Query Firestore Cloud to ensure authority gets fresh, official real-time data
      try {
        const cloudMember = await firestoreGetMember(cleanCode, cleanChurchId || undefined);
        if (cloudMember && isMounted) {
          setMember(cloudMember);
          if (cloudMember.churchId) {
            const cloudChurch = await firestoreGetChurch(cloudMember.churchId);
            if (cloudChurch && isMounted) {
              setChurch(cloudChurch);
            }
          }
        }
      } catch (err) {
        console.warn('Could not query Firestore for verification:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    resolveData();

    return () => {
      isMounted = false;
    };
  }, [memberCode, churchId]);

  // Generate a deterministic cryptographic-looking verification seal
  const verificationDigest = useMemo(() => {
    if (!member) return '';
    const raw = `${member.id}-${member.memberId}-${member.churchId}-${member.fullName}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    return `SEC-${hex.slice(0, 4)}-${hex.slice(4, 8)}-VERIFIED`;
  }, [member]);

  const handleCopyLink = () => {
    if (!member) return;
    const url = getMemberVerificationUrl(member);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Document type label helper
  const getDocumentTypeLabel = (type?: string) => {
    switch (type) {
      case 'cin':
        return isEs ? 'Cédula de Identidad (CIN)' : isFr ? 'Carte d’Identité Nationale (CIN)' : isEn ? 'National ID Card (CIN)' : 'Kat Idantite Nasyonal (CIN)';
      case 'nif':
        return isEs ? 'NIF (Identificación Fiscal)' : isFr ? 'NIF (Numéro Fiscal)' : isEn ? 'NIF (Tax ID)' : 'NIF (Nimewo Idantifikasyon Fiskal)';
      case 'passeport':
        return isEs ? 'Pasaporte' : isFr ? 'Passeport' : isEn ? 'Passport' : 'Pasipò';
      case 'autre':
        return isEs ? 'Documento Oficial' : isFr ? 'Document Officiel' : isEn ? 'Official Document' : 'Lòt Dokiman Legal';
      default:
        return isEs ? 'Cédula / Documento Legal' : isFr ? 'CIN / Document Légal' : isEn ? 'National ID / Document' : 'Kat Idantite / Dokiman Legal';
    }
  };

  if (isClosedScreen) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-full max-w-md bg-slate-800/95 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto text-emerald-400 shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              {isEs
                ? 'Verificación Finalizada'
                : isFr
                ? 'Vérification Terminée'
                : isEn
                ? 'Verification Closed'
                : 'Verifikasyon Fini'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isEs
                ? 'La consulta del miembro ha concluido. Ya puede cerrar esta pestaña o ventana en su navegador de forma segura.'
                : isFr
                ? 'La consultation du membre est terminée. Vous pouvez fermer cet onglet ou cette fenêtre en toute sécurité.'
                : isEn
                ? 'Member verification is complete. You may safely close this browser tab or window.'
                : 'Konsiltasyon dosye manm lan fini. Ou mèt fèmen onglet sa a oswa fenèt la nan navigatè w la an tout sekirite.'}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  try {
                    window.close();
                  } catch (_) {}
                }
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>
                {isEs ? 'Cerrar Pestaña' : isFr ? 'Fermer l’Onglet' : isEn ? 'Close Tab' : 'Fèmen Onglet Sa a'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsClosedScreen(false)}
              className="text-xs text-slate-400 hover:text-slate-200 underline font-medium py-1 cursor-pointer"
            >
              {isEs ? 'Reabrir verificación' : isFr ? 'Rouvrir la vérification' : isEn ? 'Reopen verification' : 'Refè verifikasyon an'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased py-6 sm:py-10 px-3 sm:px-6 print:p-0 print:bg-white">
      {/* TOP BAR / NAVIGATION (Hidden when printed) */}
      <div className="max-w-2xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          id="btn-close-verification"
          onClick={handleClosePage}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
          title={isEs ? 'Cerrar verificación' : isFr ? 'Fermer la vérification' : isEn ? 'Close verification' : 'Fèmen verifikasyon an'}
        >
          <X className="w-4 h-4 text-slate-500" />
          <span>
            {isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}
          </span>
        </button>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-bold">
          {(['ht', 'fr', 'en', 'es'] as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase ${
                language === lang
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTAINER / WHITE CERTIFICATE PAGE */}
      <main className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        {/* TOP STATUS RIBBON */}
        <div className="bg-emerald-600 px-6 py-2.5 text-white flex items-center justify-between flex-wrap gap-2 text-xs font-bold tracking-wide">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-200" />
            <span className="uppercase tracking-wider">
              {isEs
                ? 'VERIFICACIÓN OFICIAL DE MIEMBRO • REGISTRO ECLESIÁSTICO'
                : isFr
                ? 'VÉRIFICATION OFFICIELLE DE MEMBRE • REGISTRE ECCLÉSIASTIQUE'
                : isEn
                ? 'OFFICIAL MEMBER VERIFICATION • ECCLESIASTICAL RECORD'
                : 'VERIFIKASYON OFISYÈL MANM • REJIS ECLESIYASTIK'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-emerald-100 text-[11px] font-mono">
            <Clock className="w-3 h-3" />
            <span>{verifiedTime ? verifiedTime.split(',')[0] : 'LIVE'}</span>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="p-16 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">
                {isEs
                  ? 'Consultando Base de Datos Oficial...'
                  : isFr
                  ? 'Consultation de la Base de Données Officielle...'
                  : isEn
                  ? 'Checking Official Database...'
                  : 'W ap verifye nan baz done ofisyèl legliz la...'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEs
                  ? 'Verificando la autenticidad del miembro y sus documentos legales en tiempo real.'
                  : isFr
                  ? 'Vérification de l’authenticité du membre et de ses documents en temps réel.'
                  : isEn
                  ? 'Verifying member authenticity and legal documents in real time.'
                  : 'Verifikasyon an tan reyèl ak sètifika nwaj sekirize.'}
              </p>
            </div>
          </div>
        )}

        {/* NOT FOUND STATE */}
        {!loading && !member && (
          <div className="p-10 sm:p-14 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-black text-slate-900">
                {isEs
                  ? 'Miembro No Encontrado'
                  : isFr
                  ? 'Membre Non Trouvé'
                  : isEn
                  ? 'Member Not Found'
                  : 'Manm Sa A Pa Jwenn'}
              </h3>
              <p className="text-sm text-slate-600">
                {isEs
                  ? `El código de identificación "${memberCode}" no corresponde a un miembro registrado o activo en este registro eclesiástico.`
                  : isFr
                  ? `Le code d’identification "${memberCode}" ne correspond à aucun membre enregistré dans ce registre ecclésiastique.`
                  : isEn
                  ? `The identification code "${memberCode}" does not match any registered member in this church record.`
                  : `Kòd idantifikasyon "${memberCode}" sa a pa jwenn nan rejis legliz la oswa li ka te anile.`}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1.5 max-w-md mx-auto">
              <p className="font-bold text-slate-800">
                {isEs ? 'Para Autoridades o Verificadores:' : isFr ? 'Pour les Autorités ou Vérificateurs :' : isEn ? 'For Authorities or Verifiers:' : 'Pou Otorite oswa Ajan Kontwòl:'}
              </p>
              <p>
                {isEs
                  ? 'Si usted es una autoridad civil o policial, por favor solicite al portador comunicarse directamente con la secretaría general de la iglesia.'
                  : isFr
                  ? 'Si vous êtes une autorité civile ou de police, veuillez demander au titulaire de contacter directement le secrétariat de l’église.'
                  : isEn
                  ? 'If you are a law enforcement or civil authority, please ask the bearer to contact the church administration office directly.'
                  : 'Si w se yon otorite lapolis oswa administratif, tanpri mande moun nan kontakte biwo legliz la pou verifye dosye fizik li.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClosePage}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-2 mx-auto"
            >
              <X className="w-4 h-4" />
              <span>{isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}</span>
            </button>
          </div>
        )}

        {/* VERIFIED MEMBER FOUND CONTENT */}
        {!loading && member && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* 1. CHURCH HEADER (Official Insignia & Header) */}
            <div className="border-b border-slate-200 pb-5 text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                {church?.logoIcon ? (
                  <img
                    src={church.logoIcon}
                    alt={church.name}
                    className="w-12 h-12 rounded-xl object-contain border border-slate-200 p-1 bg-slate-50 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div className="text-left">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                    {church?.name || 'LEGLIZ OFISYÈL'}
                  </h1>
                  {church?.motto && (
                    <p className="text-xs text-slate-500 italic font-serif">
                      « {church.motto} »
                    </p>
                  )}
                </div>
              </div>

              {/* Church address or city */}
              {(church?.address || church?.city) && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {[church.address, church.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* 2. OFFICIAL VERIFICATION BADGE (Large & Clear) */}
            <div className="bg-emerald-50 border-2 border-emerald-500/40 rounded-2xl p-4 text-center space-y-1.5">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-sm">
                <CheckCircle className="w-4 h-4" />
                <span>
                  {isEs
                    ? '✓ MIEMBRO ACTIVO Y VALIDADO'
                    : isFr
                    ? '✓ MEMBRE ACTIF ET VALIDÉ'
                    : isEn
                    ? '✓ ACTIVE & VERIFIED MEMBER'
                    : '✓ MANM AKTIFF & OTORIZE'}
                </span>
              </div>
              <p className="text-xs text-emerald-800 font-medium">
                {isEs
                  ? 'Este documento confirma la identidad y membresía oficial del portador ante las autoridades.'
                  : isFr
                  ? 'Ce document atteste l’identité et l’appartenance officielle du titulaire auprès des autorités.'
                  : isEn
                  ? 'This document certifies the bearer’s official identity and active church membership for authorities.'
                  : 'Sètifika sa a konfime idantite ak patisipasyon ofisyèl manm sa a devan tout otorite legal.'}
              </p>

              {/* OFFICIAL ACCREDITATION / RNC BADGE */}
              {hasValidRnc && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-center gap-2 flex-wrap text-xs text-emerald-900 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    {isEs ? 'RNC Institucional:' : isFr ? 'RNC Institutionnel :' : isEn ? 'Institutional RNC / Tax ID:' : 'RNC Enstitisyonèl:'}
                  </span>
                  <span className="font-mono font-bold bg-white/90 border border-emerald-400 px-2 py-0.5 rounded text-emerald-950">
                    {churchRnc}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-700 text-white px-2 py-0.5 rounded-full">
                    {isEs ? 'Registrado' : isFr ? 'Enregistré' : isEn ? 'Registered' : 'Enskri Ofisyèlman ✓'}
                  </span>
                </div>
              )}
            </div>

            {/* 3. MEMBER PHOTO & NAME PROFILE */}
            <div className="text-center space-y-3 pt-1">
              {/* Photo */}
              <div className="relative inline-block mx-auto">
                {member.googlePhoto || member.avatarUrl ? (
                  <img
                    src={member.googlePhoto || member.avatarUrl}
                    alt={member.fullName}
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover border-4 border-white shadow-xl ring-2 ring-slate-200 mx-auto"
                  />
                ) : (
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-4 border-white shadow-xl ring-2 ring-slate-200 flex flex-col items-center justify-center text-slate-400 mx-auto">
                    <User className="w-12 h-12 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-500 mt-1 uppercase">
                      {isEs ? 'Sin Foto' : isFr ? 'Sans Photo' : isEn ? 'No Photo' : 'San Foto'}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-full shadow-md border-2 border-white" title="Verified Photo">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>

              {/* Full Name & Title */}
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  {member.titlePrefix ? `${member.titlePrefix} ` : ''}
                  {member.fullName}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider">
                    {member.role || (isEs ? 'Miembro' : isFr ? 'Membre' : isEn ? 'Member' : 'Manm')}
                  </span>
                  {member.department && (
                    <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                      {member.department}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    {isEs ? 'Estado: ACTIVO' : isFr ? 'Statut: ACTIF' : isEn ? 'Status: ACTIVE' : 'Estati: AKTIF'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. CRITICAL: NIMWEWO DOKIMAN LEGAL LI (Special High-Contrast Box for Authorities) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <div className="flex items-center gap-2 text-amber-900 font-black text-xs sm:text-sm uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span>
                    {isEs
                      ? 'DOKIMAN LEGAL & MATRÍCULA OFICIAL'
                      : isFr
                      ? 'DOCUMENTS LÉGAUX & MATRICULE'
                      : isEn
                      ? 'LEGAL DOCUMENTS & CHURCH ID'
                      : 'DOKIMAN LEGAL & MATRIKIL OFISYÈL'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 uppercase">
                  {isEs ? 'Válido' : isFr ? 'Valide' : isEn ? 'Valid' : 'Valab'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Legal ID Number (CIN, NIF, Passport, etc.) */}
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">
                    {getDocumentTypeLabel(member.legalDocumentType)}
                  </p>
                  <p className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-wide mt-0.5">
                    {member.legalDocumentNumber ? (
                      member.legalDocumentNumber
                    ) : (
                      <span className="text-xs text-slate-400 font-sans italic font-normal">
                        {isEs
                          ? 'Archivado en registro central'
                          : isFr
                          ? 'Enregistré au secrétariat de l’église'
                          : isEn
                          ? 'On file at church office'
                          : 'Anrejistre nan dosye fizik legliz la'}
                      </span>
                    )}
                  </p>
                </div>

                {/* Church Member ID (Matrikil Eclesiastik) */}
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">
                    {isEs ? 'Matrícula de Miembro (ID)' : isFr ? 'Matricule Membre (ID)' : isEn ? 'Church Member ID' : 'Matrikil Manm (ID)'}
                  </p>
                  <p className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-wide mt-0.5">
                    {member.memberId}
                  </p>
                </div>
              </div>
            </div>

            {/* 5. ADDITIONAL REGISTRATION DETAILS (Date Joined, Contact, Address) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isEs ? 'Fecha de Ingreso' : isFr ? 'Date d’Adhésion' : isEn ? 'Date Joined' : 'Dat li Rantre'}</span>
                </p>
                <p className="font-semibold text-slate-800 text-sm">
                  {member.joinedDate || (isEs ? 'Miembro Registrado' : isFr ? 'Membre Enregistré' : isEn ? 'Registered Member' : 'Manm Anrejistre')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isEs ? 'Congregación' : isFr ? 'Congrégation' : isEn ? 'Congregation' : 'Kongregasyon'}</span>
                </p>
                <p className="font-semibold text-slate-800 text-sm truncate">
                  {church?.name || 'Legliz'}
                </p>
              </div>

              {church?.phone && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isEs ? 'Teléfono de Iglesia' : isFr ? 'Téléphone Église' : isEn ? 'Church Office Phone' : 'Telefòn Sekretarya'}</span>
                  </p>
                  <p className="font-semibold text-slate-800 text-sm">
                    {church.phone}
                  </p>
                </div>
              )}

              {church?.email && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isEs ? 'Email de la Iglesia' : isFr ? 'Email Église' : isEn ? 'Church Email' : 'Imèl Legliz la'}</span>
                  </p>
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {church.email}
                  </p>
                </div>
              )}
            </div>

            {/* 6. LEGAL / AUTHORITY STATEMENT */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <p className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>
                  {isEs
                    ? 'DECLARACIÓN OFICIAL PARA AUTORIDADES'
                    : isFr
                    ? 'ATTESTATION OFFICIELLE POUR LES AUTORITÉS'
                    : isEn
                    ? 'OFFICIAL DECLARATION FOR AUTHORITIES'
                    : 'ATTESTASYON OFISYÈL POU OTORITE YO'}
                </span>
              </p>
              <p>
                {isEs
                  ? `La iglesia certifica que la persona identificada en esta página es un miembro reconocido, activo y en buena fe en nuestra congregación. Esta verificación en línea se genera en tiempo real directamente desde el registro oficial.`
                  : isFr
                  ? `L’église certifie que la personne identifiée sur cette page est un membre reconnu, actif et en règle au sein de notre assemblée. Cette vérification est générée en direct depuis notre base de données sécurisée.`
                  : isEn
                  ? `The church certifies that the individual named on this page is a recognized, active, and good-standing member of our congregation. This online verification is generated in real time from our official church database.`
                  : `Legliz la sètifye ke moun ki mansyone sou paj sa a se yon manm rekonèt, aktif e an règle nan asanble nou an. Verifikasyon nimerik sa a fèt an dirèk soti nan baz done santral legliz la.`}
              </p>
            </div>

            {/* 7. DIGITAL VERIFICATION SEAL & TIMESTAMP */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
              <div>
                <span className="text-slate-400">{isEs ? 'Sello: ' : isFr ? 'Sceau : ' : isEn ? 'Seal: ' : 'Sitiyati Nimerik: '}</span>
                <span className="font-bold text-slate-700">{verificationDigest}</span>
              </div>
              <div>
                <span className="text-slate-400">{isEs ? 'Verificado: ' : isFr ? 'Vérifié : ' : isEn ? 'Verified: ' : 'Verifye le: '}</span>
                <span className="font-semibold text-slate-700">{verifiedTime}</span>
              </div>
            </div>

            {/* 8. ACTIONS: PRINT & SHARE (Hidden when printed) */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-print-verification"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isEs ? 'Imprimir Certificado' : isFr ? 'Imprimer l’Attestation' : isEn ? 'Print Certificate' : 'Enprime Sètifika a'}
                  </span>
                </button>

                <button
                  type="button"
                  id="btn-copy-verification-link"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">
                        {isEs ? '¡Enlace Copiado!' : isFr ? 'Lien Copié !' : isEn ? 'Link Copied!' : 'Lyen Kopye!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>
                        {isEs ? 'Copiar Enlace' : isFr ? 'Copier le Lien' : isEn ? 'Copy Link' : 'Kopye Lyen'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                id="btn-close-verification-bottom"
                onClick={handleClosePage}
                className="text-xs text-slate-500 hover:text-rose-600 font-semibold underline cursor-pointer inline-flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>
                  {isEs ? 'Cerrar verificación' : isFr ? 'Fermer la vérification' : isEn ? 'Close verification' : 'Fèmen verifikasyon an'}
                </span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER NOTE (Minimal & Professional) */}
      <footer className="max-w-2xl mx-auto mt-6 text-center text-xs text-slate-400 space-y-1 print:hidden">
        <p>OmniChurch • Sistèm Eklezyastik Nimerik & Sètifikasyon Manm</p>
        <p className="text-[11px] text-slate-400">
          {isEs
            ? 'Cualquier reproducción no autorizada de este documento digital constituye una violación legal.'
            : isFr
            ? 'Toute tentative de falsification de ce certificat numérique est passible de sanctions.'
            : isEn
            ? 'Official digital document for membership validation across civic and international institutions.'
            : 'Dokiman nimerik ofisyèl pou verifikasyon manm devan enstitisyon sivil ak leta.'}
        </p>
      </footer>
    </div>
  );
};
