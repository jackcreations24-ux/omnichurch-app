import React, { useState, useEffect, useMemo } from 'react';
import {
  Church,
  ChurchLicense,
  Member,
  Language,
  RemoteMemberVerificationConfig,
} from '../../types';
import {
  getMembersByChurch,
  getChurchById,
  getChurchByIdOrCode,
  getAllChurches,
  getMemberVerificationUrl,
} from '../../utils/storage';
import { buildCanonicalBarcodeToken } from '../../utils/qrSyncLayer';
import {
  firestoreGetMember,
  firestoreGetMemberByScanToken,
  firestoreGetChurch,
  firestoreGetChurchByIdOrCode,
  isLegacyDemoMember,
} from '../../services/firestoreService';
import {
  getDeveloperSettings,
  fetchRemoteDeveloperSettings,
  subscribeToDeveloperSettings,
  sanitizeMemberVerificationConfig,
  maskLegalDocumentNumberValue,
  parseMemberVerificationLookupInput,
  hasActiveChurchLicense,
} from '../../utils/developerStorage';
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
  X,
  AlertTriangle,
  Loader2,
  Award,
  Clock,
  ShieldAlert,
  Lock,
  BadgeCheck,
  Globe,
  Fingerprint,
  HeartPulse,
  UserCheck,
} from 'lucide-react';

interface MemberPublicVerificationPageProps {
  memberCode: string;
  churchId?: string;
  initialLanguage?: Language;
  onClose?: () => void;
  embeddedMode?: boolean;
  previewConfigOverride?: Partial<RemoteMemberVerificationConfig>;
}

const isValidImageSrc = (src?: string | null): boolean => {
  if (!src || typeof src !== 'string') return false;
  const s = src.trim();
  return (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('data:image/') ||
    s.startsWith('/')
  );
};

export const MemberPublicVerificationPage: React.FC<MemberPublicVerificationPageProps> = ({
  memberCode,
  churchId,
  initialLanguage = 'ht',
  onClose,
  embeddedMode = false,
  previewConfigOverride,
}) => {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [member, setMember] = useState<Member | null>(null);
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cloudVerified, setCloudVerified] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [verifiedTime, setVerifiedTime] = useState<string>('');
  const [isClosedScreen, setIsClosedScreen] = useState<boolean>(false);
  const [logoLoadError, setLogoLoadError] = useState<boolean>(false);
  const [remoteVerifConfig, setRemoteVerifConfig] = useState<RemoteMemberVerificationConfig>(() =>
    sanitizeMemberVerificationConfig(getDeveloperSettings().memberVerification)
  );
  const [remoteLicenses, setRemoteLicenses] = useState<ChurchLicense[]>(
    () => getDeveloperSettings().licenses || []
  );

  // Sync language prop changes when embedded in Developer Panel
  useEffect(() => {
    setLanguage(initialLanguage);
  }, [initialLanguage]);

  // Keep verification policy & church licenses synced in real time with app_config/developer_engine
  useEffect(() => {
    let mounted = true;
    fetchRemoteDeveloperSettings().then((remote) => {
      if (!mounted || !remote) return;
      if (remote.memberVerification) {
        setRemoteVerifConfig(sanitizeMemberVerificationConfig(remote.memberVerification));
      }
      if (Array.isArray(remote.licenses)) {
        setRemoteLicenses(remote.licenses);
      }
    });

    const unsubFirestore = subscribeToDeveloperSettings((settings) => {
      if (!mounted) return;
      setRemoteVerifConfig(sanitizeMemberVerificationConfig(settings.memberVerification));
      if (Array.isArray(settings.licenses)) {
        setRemoteLicenses(settings.licenses);
      }
    });

    const handleLocalSync = () => {
      if (!mounted) return;
      const latest = getDeveloperSettings();
      setRemoteVerifConfig(sanitizeMemberVerificationConfig(latest.memberVerification));
      setRemoteLicenses(latest.licenses || []);
    };
    window.addEventListener('omnichurch_dev_settings_updated', handleLocalSync);

    return () => {
      mounted = false;
      unsubFirestore();
      window.removeEventListener('omnichurch_dev_settings_updated', handleLocalSync);
    };
  }, []);

  const activeConfig: RemoteMemberVerificationConfig = useMemo(() => {
    if (previewConfigOverride) {
      return sanitizeMemberVerificationConfig({
        ...remoteVerifConfig,
        ...previewConfigOverride,
      });
    }
    return remoteVerifConfig;
  }, [remoteVerifConfig, previewConfigOverride]);

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const hasValidRnc = church ? churchHasValidRnc(church) : false;
  const churchRnc = church ? getChurchRnc(church) : '';

  // Close handler: prioritizes parent onClose prop first, then safely closes tab / goes back
  const handleClosePage = () => {
    if (onClose) {
      onClose();
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        window.close();
      } catch (_) {}

      if (window.history.length > 1) {
        window.history.back();
        setTimeout(() => {
          setIsClosedScreen(true);
        }, 300);
        return;
      }
    }

    setIsClosedScreen(true);
  };

  // 1. Generate live verification timestamp
  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString(
      language === 'fr'
        ? 'fr-FR'
        : language === 'es'
        ? 'es-ES'
        : language === 'en'
        ? 'en-US'
        : 'fr-HT',
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
  }, [language, memberCode, churchId]);

  // 2. Fetch member & church data (local instant cache + live authoritative Cloud Firestore)
  useEffect(() => {
    let isMounted = true;
    const parsedLookup = parseMemberVerificationLookupInput(memberCode, churchId);
    const cleanCode = parsedLookup.memberCode.trim();
    const cleanChurchId = (parsedLookup.churchId || '').trim();

    if (!cleanCode) {
      setMember(null);
      setChurch(null);
      setCloudVerified(false);
      setLoading(false);
      return;
    }

    const matchesMemberToken = (m: Member, codeUpper: string) =>
      (m.memberId || '').trim().toUpperCase() === codeUpper ||
      (m.id || '').trim().toUpperCase() === codeUpper ||
      (m.barcodeToken || '').trim().toUpperCase() === codeUpper;

    const resolveData = async () => {
      setLoading(true);
      setCloudVerified(false);
      const codeUpper = cleanCode.toUpperCase();

      // A. Try Local Storage first (instant render if admin/member device already cached it)
      let foundMember: Member | null = null;
      let foundChurch: Church | null = null;

      if (cleanChurchId) {
        foundChurch = getChurchByIdOrCode(cleanChurchId) || getChurchById(cleanChurchId) || null;
        const targetLocalChurchId = foundChurch?.id || cleanChurchId;
        const churchMembers = getMembersByChurch(targetLocalChurchId);
        foundMember = churchMembers.find((m) => matchesMemberToken(m, codeUpper)) || null;
      }

      if (!foundMember) {
        const allCh = getAllChurches();
        for (const ch of allCh) {
          const list = getMembersByChurch(ch.id);
          const m = list.find((item) => matchesMemberToken(item, codeUpper));
          if (m) {
            foundMember = m;
            foundChurch = ch;
            break;
          }
        }
      }

      if (foundMember && isMounted) {
        setMember(foundMember);
        if (foundChurch) setChurch(foundChurch);
        setLoading(false);
      } else if (!foundMember && isMounted) {
        setMember(null);
        setChurch(foundChurch);
      }

      // B. Authoritative Live Cloud Firestore resolution (works on any external unauthenticated device)
      try {
        let resolvedCloudChurch: Church | null = null;
        if (cleanChurchId) {
          resolvedCloudChurch = await firestoreGetChurchByIdOrCode(cleanChurchId, { fromServer: true });
          if (resolvedCloudChurch && isMounted) {
            setChurch((prev) => ({
              ...(prev || foundChurch || {}),
              ...resolvedCloudChurch!,
              logoUrl:
                resolvedCloudChurch!.logoUrl ||
                prev?.logoUrl ||
                foundChurch?.logoUrl ||
                undefined,
            }));
          }
        }

        const canonicalChurchId = resolvedCloudChurch?.id || cleanChurchId || undefined;
        let cloudMember = await firestoreGetMember(cleanCode, canonicalChurchId, { fromServer: true });
        if (!cloudMember || isLegacyDemoMember(cloudMember)) {
          cloudMember = await firestoreGetMemberByScanToken(cleanCode, canonicalChurchId);
        }

        if (cloudMember && !isLegacyDemoMember(cloudMember) && isMounted) {
          setMember(cloudMember);
          setCloudVerified(true);

          const memberChurchId = (cloudMember.churchId || canonicalChurchId || '').trim();
          if (memberChurchId) {
            let finalChurch =
              resolvedCloudChurch &&
              resolvedCloudChurch.id.toUpperCase() === memberChurchId.toUpperCase()
                ? resolvedCloudChurch
                : await firestoreGetChurchByIdOrCode(memberChurchId, { fromServer: true });

            if (!finalChurch) {
              finalChurch = await firestoreGetChurch(memberChurchId, { fromServer: true });
            }

            if (finalChurch && isMounted) {
              setChurch((prev) => ({
                ...(prev || foundChurch || {}),
                ...finalChurch!,
                logoUrl:
                  finalChurch!.logoUrl ||
                  prev?.logoUrl ||
                  foundChurch?.logoUrl ||
                  undefined,
              }));
            } else if (isMounted) {
              const localFallbackChurch =
                getChurchByIdOrCode(memberChurchId) || getChurchById(memberChurchId);
              if (localFallbackChurch) setChurch(localFallbackChurch);
            }
          }
        } else if (!cloudMember && foundMember && isMounted) {
          const fallbackChId = (foundMember.churchId || canonicalChurchId || '').trim();
          if (fallbackChId) {
            const latestCloudChurch =
              (await firestoreGetChurchByIdOrCode(fallbackChId, { fromServer: true })) ||
              (await firestoreGetChurch(fallbackChId, { fromServer: true }));
            if (latestCloudChurch && isMounted) {
              setChurch((prev) => ({
                ...(prev || foundChurch || {}),
                ...latestCloudChurch,
                logoUrl:
                  latestCloudChurch.logoUrl ||
                  prev?.logoUrl ||
                  foundChurch?.logoUrl ||
                  undefined,
              }));
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

    const refreshFromLocalEvents = (e?: Event) => {
      if (!isMounted) return;
      const customMember = (e as CustomEvent<Member> | undefined)?.detail;
      if (customMember && matchesMemberToken(customMember, cleanCode.toUpperCase())) {
        setMember(customMember);
      }
      const targetChId = (cleanChurchId || customMember?.churchId || '').trim();
      if (targetChId) {
        const refreshedCh = getChurchByIdOrCode(targetChId) || getChurchById(targetChId);
        if (refreshedCh) {
          setChurch((prev) => ({
            ...(prev || {}),
            ...refreshedCh,
            logoUrl: refreshedCh.logoUrl || prev?.logoUrl || undefined,
          }));
        }
      }
    };

    window.addEventListener('church_data_updated', refreshFromLocalEvents as EventListener);
    window.addEventListener('omnichurch_member_updated', refreshFromLocalEvents as EventListener);

    return () => {
      isMounted = false;
      window.removeEventListener('church_data_updated', refreshFromLocalEvents as EventListener);
      window.removeEventListener('omnichurch_member_updated', refreshFromLocalEvents as EventListener);
    };
  }, [memberCode, churchId]);

  const effectiveChurchId = (church?.id || member?.churchId || churchId || '').trim();
  const isChurchBlockedRemotely =
    Boolean(effectiveChurchId) &&
    activeConfig.disabledChurchIds.some(
      (cid) => cid.trim().toUpperCase() === effectiveChurchId.toUpperCase()
    );
  const isVerificationPaused = !activeConfig.enabled || isChurchBlockedRemotely;

  const isChurchOfficiallyLicensed = useMemo(() => {
    if (!effectiveChurchId) return false;
    const upperTarget = effectiveChurchId.toUpperCase();
    const remoteMatch = remoteLicenses.find(
      (lic) => (lic.churchId || '').trim().toUpperCase() === upperTarget
    );
    if (remoteMatch) {
      if (remoteMatch.status !== 'active') return false;
      if (remoteMatch.expiresAt && remoteMatch.expiresAt !== 'never') {
        const expMs = new Date(remoteMatch.expiresAt).getTime();
        if (!Number.isNaN(expMs) && expMs < Date.now()) return false;
      }
      return true;
    }
    return hasActiveChurchLicense(effectiveChurchId);
  }, [effectiveChurchId, remoteLicenses]);

  const isMemberInactive = Boolean(member && member.status === 'inactive');
  const isChurchArchived = Boolean(church && church.status === 'archived');
  const isFlaggedInactive =
    activeConfig.enforceActiveStatusCheck && (isMemberInactive || isChurchArchived);

  const canonicalBarcodeSerial = useMemo(() => {
    if (!member) return '';
    if (member.barcodeToken && member.barcodeToken.trim()) {
      return member.barcodeToken.trim();
    }
    return buildCanonicalBarcodeToken(effectiveChurchId || member.churchId || '', member.memberId || member.id);
  }, [member, effectiveChurchId]);

  // Deterministic verification digest
  const verificationDigest = useMemo(() => {
    if (!member) return '';
    const raw = `${member.id}-${member.memberId}-${member.churchId}-${member.fullName}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    const suffix = isFlaggedInactive ? 'INACTIVE' : 'VERIFIED';
    return `SEC-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${suffix}`;
  }, [member, isFlaggedInactive]);

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

  const getDocumentTypeLabel = (type?: string) => {
    switch (type) {
      case 'cin':
        return isEs
          ? 'Cédula de Identidad (CIN)'
          : isFr
          ? 'Carte d’Identité Nationale (CIN)'
          : isEn
          ? 'National ID Card (CIN)'
          : 'Kat Idantite Nasyonal (CIN)';
      case 'nif':
        return isEs
          ? 'NIF (Identificación Fiscal)'
          : isFr
          ? 'NIF (Numéro Fiscal)'
          : isEn
          ? 'NIF (Tax ID)'
          : 'NIF (Nimewo Idantifikasyon Fiskal)';
      case 'passeport':
        return isEs
          ? 'Pasaporte'
          : isFr
          ? 'Passeport'
          : isEn
          ? 'Passport'
          : 'Pasipò';
      case 'autre':
        return isEs
          ? 'Documento Oficial'
          : isFr
          ? 'Document Officiel'
          : isEn
          ? 'Official Document'
          : 'Lòt Dokiman Legal';
      default:
        return isEs
          ? 'Cédula / Documento Legal'
          : isFr
          ? 'CIN / Document Légal'
          : isEn
          ? 'National ID / Document'
          : 'Kat Idantite / Dokiman Legal';
    }
  };

  if (isClosedScreen && !embeddedMode) {
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
                {isEs
                  ? 'Cerrar Pestaña'
                  : isFr
                  ? 'Fermer l’Onglet'
                  : isEn
                  ? 'Close Tab'
                  : 'Fèmen Onglet Sa a'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsClosedScreen(false)}
              className="text-xs text-slate-400 hover:text-slate-200 underline font-medium py-1 cursor-pointer"
            >
              {isEs
                ? 'Reabrir verificación'
                : isFr
                ? 'Rouvrir la vérification'
                : isEn
                ? 'Reopen verification'
                : 'Refè verifikasyon an'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const resolvedChurchLogo = useMemo(() => {
    const candidates = [
      church?.logoUrl,
      (church as any)?.churchLogoUrl,
      (member as any)?.churchLogoUrl,
    ];
    return candidates.find((src) => isValidImageSrc(src)) || '';
  }, [church, member]);

  useEffect(() => {
    setLogoLoadError(false);
  }, [resolvedChurchLogo]);

  const memberPhoto =
    member?.avatarUrl || member?.photoUrl || member?.googlePhoto || '';
  const displayedLegalDocNumber = member?.legalDocumentNumber
    ? activeConfig.maskLegalDocumentNumber
      ? maskLegalDocumentNumberValue(member.legalDocumentNumber)
      : member.legalDocumentNumber
    : '';

  return (
    <div
      className={
        embeddedMode
          ? 'bg-white text-slate-800 font-sans antialiased p-0 rounded-none print:p-0 print:bg-white w-full'
          : 'min-h-screen bg-slate-50 text-slate-800 font-sans antialiased py-0 sm:py-4 px-0 print:p-0 print:bg-white w-full'
      }
    >
      {/* TOP BAR / NAVIGATION (Hidden when printed or when embedded in Developer Panel) */}
      {!embeddedMode && (
        <div className="w-full px-3 sm:px-6 pt-3 mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            id="btn-close-verification"
            onClick={handleClosePage}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
            title={
              isEs
                ? 'Cerrar verificación'
                : isFr
                ? 'Fermer la vérification'
                : isEn
                ? 'Close verification'
                : 'Fèmen verifikasyon an'
            }
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
      )}

      {/* MAIN CONTAINER / WHITE CERTIFICATE PAGE */}
      <main className="w-full max-w-none bg-white rounded-none shadow-sm border-y border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        {/* TOP STATUS RIBBON */}
        <div
          className={`px-6 py-2.5 text-white flex items-center justify-between flex-wrap gap-2 text-xs font-bold tracking-wide ${
            isVerificationPaused
              ? 'bg-slate-700'
              : isFlaggedInactive
              ? 'bg-rose-600'
              : 'bg-emerald-600'
          }`}
        >
          <div className="flex items-center gap-2">
            {isVerificationPaused ? (
              <Lock className="w-4 h-4 text-amber-300" />
            ) : isFlaggedInactive ? (
              <ShieldAlert className="w-4 h-4 text-rose-200" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
            )}
            <span className="uppercase tracking-wider">
              {isVerificationPaused
                ? isEs
                  ? 'VERIFICACIÓN EN LÍNEA PAUSADA • SISTEMA'
                  : isFr
                  ? 'VÉRIFICATION EN LIGNE SUSPENDUE • SYSTÈME'
                  : isEn
                  ? 'ONLINE VERIFICATION PAUSED • SYSTEM'
                  : 'VERIFIKASYON AN LIY DEZAKTIVE TANPORÈMAN'
                : isEs
                ? 'VERIFICACIÓN OFICIAL DE MIEMBRO • REGISTRO ECLESIÁSTICO'
                : isFr
                ? 'VÉRIFICATION OFFICIELLE DE MEMBRE • REGISTRE ECCLÉSIASTIQUE'
                : isEn
                ? 'OFFICIAL MEMBER VERIFICATION • ECCLESIASTICAL RECORD'
                : 'VERIFIKASYON OFISYÈL MANM • REJIS EKLEZYASTIK'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-white/85 text-[11px] font-mono">
            <Clock className="w-3 h-3" />
            <span>{verifiedTime ? verifiedTime.split(',')[0] : 'LIVE'}</span>
          </div>
        </div>

        {/* REMOTELY DISABLED STATE */}
        {isVerificationPaused && (
          <div className="p-10 sm:p-14 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center mx-auto text-slate-600 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-black text-slate-900">
                {isEs
                  ? 'Verificación Pública Pausada'
                  : isFr
                  ? 'Vérification Publique Suspendue'
                  : isEn
                  ? 'Public Verification Temporarily Paused'
                  : 'Verifikasyon Piblik Dezaktive Tanporèman'}
              </h3>
              <p className="text-sm text-slate-600">
                {isChurchBlockedRemotely
                  ? isEs
                    ? 'La verificación pública en línea para esta iglesia ha sido pausada temporalmente por la administración del sistema.'
                    : isFr
                    ? 'La vérification publique en ligne pour cette église a été temporairement suspendue par l’administration du système.'
                    : isEn
                    ? 'Online public verification for this church has been temporarily paused by system administration.'
                    : 'Verifikasyon piblik an liy pou legliz sa a pran yon poz tanporè sou kontwòl administrasyon sistèm nan.'
                  : isEs
                  ? 'El portal público de verificación de miembros está temporalmente desactivado por la administración.'
                  : isFr
                  ? 'Le portail public de vérification des membres est temporairement désactivé par l’administration.'
                  : isEn
                  ? 'The public member verification portal is temporarily disabled by system administration.'
                  : 'Pòtay verifikasyon piblik manm yo dezaktive tanporèman pa administrasyon sistèm nan.'}
              </p>
            </div>
            {!embeddedMode && (
              <button
                type="button"
                onClick={handleClosePage}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-2 mx-auto"
              >
                <X className="w-4 h-4" />
                <span>{isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}</span>
              </button>
            )}
          </div>
        )}

        {/* LOADING STATE */}
        {!isVerificationPaused && loading && (
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
        {!isVerificationPaused && !loading && !member && (
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
                {isEs
                  ? 'Para Autoridades o Verificadores:'
                  : isFr
                  ? 'Pour les Autorités ou Vérificateurs :'
                  : isEn
                  ? 'For Authorities or Verifiers:'
                  : 'Pou Otorite oswa Ajan Kontwòl:'}
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
            {!embeddedMode && (
              <button
                type="button"
                onClick={handleClosePage}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-2 mx-auto"
              >
                <X className="w-4 h-4" />
                <span>{isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}</span>
              </button>
            )}
          </div>
        )}

        {/* VERIFIED MEMBER FOUND CONTENT */}
        {!isVerificationPaused && !loading && member && (
          <div className="w-full px-3 py-4 sm:px-5 sm:py-6 space-y-6">
            {/* 1. CHURCH HEADER (Official Insignia, Official License Badge & Pastoral Oversight) */}
            <div className="border-b border-slate-200 pb-5 text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                {resolvedChurchLogo && !logoLoadError ? (
                  <img
                    src={resolvedChurchLogo}
                    alt={church?.name || 'Legliz'}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoLoadError(true)}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/30 bg-white shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm shrink-0">
                    <Building2 className="w-7 h-7" />
                  </div>
                )}
                <div className="text-left">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                      {church?.name || 'LEGLIZ OFISYÈL'}
                    </h1>
                    {isChurchOfficiallyLicensed && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold uppercase tracking-wide"
                        title={
                          isEs
                            ? 'Congregación con Licencia Oficial Verificada'
                            : isFr
                            ? 'Congrégation sous Licence Officielle Vérifiée'
                            : isEn
                            ? 'Officially Licensed Congregation'
                            : 'Legliz Verifye ak Lisans Ofisyèl'
                        }
                      >
                        <BadgeCheck className="w-3.5 h-3.5 text-sky-600" />
                        <span>
                          {isEs
                            ? 'Licencia Oficial'
                            : isFr
                            ? 'Licence Officielle'
                            : isEn
                            ? 'Licensed'
                            : 'Lisans Ofisyèl'}
                        </span>
                      </span>
                    )}
                  </div>
                  {church?.motto && (
                    <p className="text-xs text-slate-500 italic font-serif">
                      « {church.motto} »
                    </p>
                  )}
                </div>
              </div>

              {(church?.address || church?.city || church?.code) && (
                <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-500 pt-1">
                  {(church?.address || church?.city) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {[church.address, church.city, church.country].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  )}
                  {church?.code && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px] font-bold">
                      {church.code}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 2. OFFICIAL VERIFICATION BADGE (Respects Active / Inactive / Archived status) */}
            <div
              className={`border-2 rounded-2xl p-4 text-center space-y-1.5 ${
                isFlaggedInactive
                  ? 'bg-rose-50 border-rose-400/60'
                  : 'bg-emerald-50 border-emerald-500/40'
              }`}
            >
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-sm ${
                  isFlaggedInactive ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                {isFlaggedInactive ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>
                  {isFlaggedInactive
                    ? isChurchArchived
                      ? isEs
                        ? '⚠ IGLESIA ARCHIVADA • VERIFICAR EN SECRETARÍA'
                        : isFr
                        ? '⚠ ÉGLISE ARCHIVÉE • VÉRIFICATION REQUISE'
                        : isEn
                        ? '⚠ ARCHIVED CHURCH • VERIFY WITH OFFICE'
                        : '⚠ LEGLIZ ACHIVE • KONTAKTE SEKRETARIA'
                      : isEs
                      ? '⚠ MIEMBRO INACTIVO O SUSPENDIDO'
                      : isFr
                      ? '⚠ MEMBRE INACTIF OU SUSPENDU'
                      : isEn
                      ? '⚠ INACTIVE OR SUSPENDED MEMBER'
                      : '⚠ MANM INAKTIF OSWA SISPANN'
                    : isEs
                    ? '✓ MIEMBRO ACTIVO Y VALIDADO'
                    : isFr
                    ? '✓ MEMBRE ACTIF ET VALIDÉ'
                    : isEn
                    ? '✓ ACTIVE & VERIFIED MEMBER'
                    : '✓ MANM AKTIF & OTORIZE'}
                </span>
              </div>
              <p
                className={`text-xs font-medium ${
                  isFlaggedInactive ? 'text-rose-800' : 'text-emerald-800'
                }`}
              >
                {isFlaggedInactive
                  ? isEs
                    ? 'El registro de este miembro figura actualmente como INACTIVO o la congregación está archivada. Comuníquese con la oficina pastoral.'
                    : isFr
                    ? 'Ce dossier figure actuellement comme INACTIF ou la congrégation est archivée. Veuillez contacter le secrétariat pastoral.'
                    : isEn
                    ? 'This member record is currently marked INACTIVE or the congregation is archived. Contact the church office.'
                    : 'Dosye manm sa a make INAKTIF kounye a oswa legliz la achive. Tanpri kontakte biwo pastoral la.'
                  : isEs
                  ? 'Este documento confirma la identidad y membresía oficial del portador ante las autoridades.'
                  : isFr
                  ? 'Ce document atteste l’identité et l’appartenance officielle du titulaire auprès des autorités.'
                  : isEn
                  ? 'This document certifies the bearer’s official identity and active church membership for authorities.'
                  : 'Sètifika sa a konfime idantite ak patisipasyon ofisyèl manm sa a devan tout otorite legal.'}
              </p>

              {/* OFFICIAL ACCREDITATION / RNC BADGE */}
              {activeConfig.showChurchRncBadge && hasValidRnc && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-center gap-2 flex-wrap text-xs text-emerald-900 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    {isEs
                      ? 'RNC Institucional:'
                      : isFr
                      ? 'RNC Institutionnel :'
                      : isEn
                      ? 'Institutional RNC / Tax ID:'
                      : 'RNC Enstitisyonèl:'}
                  </span>
                  <span className="font-mono font-bold bg-white/90 border border-emerald-400 px-2 py-0.5 rounded text-emerald-950">
                    {churchRnc}
                  </span>
                  {church?.rncLegalName && (
                    <span className="text-[11px] font-semibold text-emerald-900/90">
                      ({church.rncLegalName})
                    </span>
                  )}
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-700 text-white px-2 py-0.5 rounded-full">
                    {church?.rncVerificationStatus === 'verified'
                      ? isEs
                        ? 'RNC Verificado ✓'
                        : isFr
                        ? 'RNC Vérifié ✓'
                        : isEn
                        ? 'RNC Verified ✓'
                        : 'RNC Verifye ✓'
                      : isEs
                      ? 'Registrado'
                      : isFr
                      ? 'Enregistré'
                      : isEn
                      ? 'Registered'
                      : 'Enskri Ofisyèlman ✓'}
                  </span>
                </div>
              )}
            </div>

            {/* 3. MEMBER PHOTO & NAME PROFILE */}
            <div className="text-center space-y-3 pt-1">
              {activeConfig.showMemberPhoto && (
                <div className="relative inline-block mx-auto">
                  {isValidImageSrc(memberPhoto) ? (
                    <img
                      src={memberPhoto}
                      alt={member.fullName}
                      referrerPolicy="no-referrer"
                      className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover border-4 border-white shadow-xl ring-2 ring-slate-200 mx-auto"
                    />
                  ) : (
                    <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-4 border-white shadow-xl ring-2 ring-slate-200 flex flex-col items-center justify-center text-slate-400 mx-auto">
                      <User className="w-12 h-12 text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-500 mt-1 uppercase">
                        {isEs
                          ? 'Sin Foto'
                          : isFr
                          ? 'Sans Photo'
                          : isEn
                          ? 'No Photo'
                          : 'San Foto'}
                      </span>
                    </div>
                  )}
                  <div
                    className={`absolute -bottom-2 -right-2 text-white p-1.5 rounded-full shadow-md border-2 border-white ${
                      isFlaggedInactive ? 'bg-rose-600' : 'bg-emerald-600'
                    }`}
                    title={isFlaggedInactive ? 'Inactive Record' : 'Verified Photo'}
                  >
                    {isFlaggedInactive ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </div>
                </div>
              )}

              {/* Full Name & Title */}
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  {member.titlePrefix ? `${member.titlePrefix} ` : ''}
                  {member.fullName}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider">
                    {member.memberType === 'visitor'
                      ? isEs
                        ? 'Visitante Registrado'
                        : isFr
                        ? 'Visiteur Enregistré'
                        : isEn
                        ? 'Registered Visitor'
                        : 'Vizitè Anrejistre'
                      : member.role ||
                        (isEs
                          ? 'Miembro'
                          : isFr
                          ? 'Membre'
                          : isEn
                          ? 'Member'
                          : 'Manm')}
                  </span>
                  {member.department && (
                    <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                      {member.department}
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full border text-xs font-bold ${
                      isFlaggedInactive
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    {isFlaggedInactive
                      ? isEs
                        ? 'Estado: INACTIVO'
                        : isFr
                        ? 'Statut : INACTIF'
                        : isEn
                        ? 'Status: INACTIVE'
                        : 'Estati: INAKTIF'
                      : isEs
                      ? 'Estado: ACTIVO'
                      : isFr
                      ? 'Statut : ACTIF'
                      : isEn
                      ? 'Status: ACTIVE'
                      : 'Estati: AKTIF'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. CRITICAL: LEGAL DOCUMENT & MEMBER ID BOX */}
            {activeConfig.showLegalDocuments && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs sm:text-sm uppercase tracking-wide">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>
                      {isEs
                        ? 'DOCUMENTO LEGAL Y MATRÍCULA OFICIAL'
                        : isFr
                        ? 'DOCUMENTS LÉGAUX & MATRICULE'
                        : isEn
                        ? 'LEGAL DOCUMENTS & CHURCH ID'
                        : 'DOKIMAN LEGAL & MATRIKIL OFISYÈL'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      isFlaggedInactive
                        ? 'bg-rose-200/80 text-rose-900'
                        : 'bg-amber-200/70 text-amber-900'
                    }`}
                  >
                    {isFlaggedInactive
                      ? isEs
                        ? 'Suspendido'
                        : isFr
                        ? 'Suspendu'
                        : isEn
                        ? 'Suspended'
                        : 'Sispann'
                      : isEs
                      ? 'Válido'
                      : isFr
                      ? 'Valide'
                      : isEn
                      ? 'Valid'
                      : 'Valab'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Legal ID Number (CIN, NIF, Passport, etc.) */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">
                      {getDocumentTypeLabel(member.legalDocumentType)}
                    </p>
                    <p className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-wide mt-0.5">
                      {displayedLegalDocNumber ? (
                        displayedLegalDocNumber
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

                  {/* Church Member ID */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">
                      {isEs
                        ? 'Matrícula de Miembro (ID)'
                        : isFr
                        ? 'Matricule Membre (ID)'
                        : isEn
                        ? 'Church Member ID'
                        : 'Matrikil Manm (ID)'}
                    </p>
                    <p className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-wide mt-0.5">
                      {member.memberId}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ADDITIONAL REGISTRATION, PASTORAL OVERSIGHT & EMERGENCY DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {isEs
                      ? 'Fecha de Ingreso'
                      : isFr
                      ? 'Date d’Adhésion'
                      : isEn
                      ? 'Date Joined'
                      : 'Dat li Rantre'}
                  </span>
                </p>
                <p className="font-semibold text-slate-800 text-sm">
                  {member.joinedDate ||
                    (isEs
                      ? 'Miembro Registrado'
                      : isFr
                      ? 'Membre Enregistré'
                      : isEn
                      ? 'Registered Member'
                      : 'Manm Anrejistre')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {isEs
                      ? 'Congregación'
                      : isFr
                      ? 'Congrégation'
                      : isEn
                      ? 'Congregation'
                      : 'Kongregasyon'}
                  </span>
                </p>
                <div className="flex items-center gap-2 min-w-0">
                  {resolvedChurchLogo && !logoLoadError && (
                    <img
                      src={resolvedChurchLogo}
                      alt={church?.name || 'Legliz'}
                      referrerPolicy="no-referrer"
                      onError={() => setLogoLoadError(true)}
                      className="w-6 h-6 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                    />
                  )}
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {church?.name || 'Legliz'}
                  </p>
                </div>
              </div>

              {member.dateOfBirth && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {isEs
                        ? 'Fecha de Nacimiento'
                        : isFr
                        ? 'Date de Naissance'
                        : isEn
                        ? 'Date of Birth'
                        : 'Dat Nesans'}
                    </span>
                  </p>
                  <p className="font-semibold text-slate-800 text-sm">
                    {member.dateOfBirth}
                    {member.gender ? ` • ${member.gender === 'M' ? (isEn ? 'Male' : isEs ? 'Masculino' : isFr ? 'Masculin' : 'Gason') : member.gender === 'F' ? (isEn ? 'Female' : isEs ? 'Femenino' : isFr ? 'Féminin' : 'Fi') : member.gender}` : ''}
                  </p>
                </div>
              )}

              {member.baptismDate && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {isEs
                        ? 'Fecha de Bautismo'
                        : isFr
                        ? 'Date de Baptême'
                        : isEn
                        ? 'Baptism Date'
                        : 'Dat Batèm'}
                    </span>
                  </p>
                  <p className="font-semibold text-slate-800 text-sm">
                    {member.baptismDate}
                  </p>
                </div>
              )}

              {church?.pastor && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {isEs
                        ? 'Autoridad Pastoral'
                        : isFr
                        ? 'Autorité Pastorale'
                        : isEn
                        ? 'Pastoral Oversight'
                        : 'Pastè Responsab'}
                    </span>
                  </p>
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {church.pastor}
                  </p>
                </div>
              )}

              {(member.emergencyContactName || member.emergencyContact) && (
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                  <p className="font-bold text-rose-700 uppercase text-[10px] flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                    <span>
                      {isEs
                        ? 'Contacto de Emergencia'
                        : isFr
                        ? 'Contact d’Urgence'
                        : isEn
                        ? 'Emergency Contact'
                        : 'Kontak pou Ijans'}
                    </span>
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {[member.emergencyContactName, member.emergencyContact]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                </div>
              )}

              {activeConfig.showChurchContactInfo && church?.phone && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {isEs
                        ? 'Teléfono de Iglesia'
                        : isFr
                        ? 'Téléphone Église'
                        : isEn
                        ? 'Church Office Phone'
                        : 'Telefòn Sekretarya'}
                    </span>
                  </p>
                  <p className="font-semibold text-slate-800 text-sm">{church.phone}</p>
                </div>
              )}

              {activeConfig.showChurchContactInfo && church?.email && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {isEs
                        ? 'Email de la Iglesia'
                        : isFr
                        ? 'Email Église'
                        : isEn
                        ? 'Church Email'
                        : 'Imèl Legliz la'}
                    </span>
                  </p>
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {church.email}
                  </p>
                </div>
              )}

              {activeConfig.showChurchContactInfo && church?.website && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
                  <p className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {isEs
                        ? 'Sitio Web Oficial'
                        : isFr
                        ? 'Site Web Officiel'
                        : isEn
                        ? 'Official Website'
                        : 'Sit Wèb Ofisyèl'}
                    </span>
                  </p>
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {church.website}
                  </p>
                </div>
              )}
            </div>

            {/* 6. LEGAL / AUTHORITY STATEMENT & ELECTRONIC SIGNATURE */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-3 leading-relaxed">
              <div className="space-y-1.5">
                <p className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Award
                    className={`w-4 h-4 ${
                      isFlaggedInactive ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  />
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
                  {isFlaggedInactive
                    ? isEs
                      ? 'Este registro se encuentra actualmente INACTIVO o ARCHIVADO en la base de datos eclesiástica. Para validar la situación actual de la persona, comuníquese directamente con la administración de la congregación.'
                      : isFr
                      ? 'Ce dossier est actuellement marqué INACTIF ou ARCHIVÉ dans notre base de données. Veuillez contacter directement le secrétariat de la congrégation.'
                      : isEn
                      ? 'This record is currently marked INACTIVE or ARCHIVED in our database. Please contact the congregation office directly for clarification.'
                      : 'Dosye sa a make INAKTIF oswa ACHIVE nan baz done ofisyèl legliz la kounye a. Pou konfime sitiyasyon moun nan, tanpri kontakte biwo sekretarya legliz la dirèkteman.'
                    : isEs
                    ? 'La iglesia certifica que la persona identificada en esta página es un miembro reconocido, activo y en buena fe en nuestra congregación. Esta verificación en línea se genera en tiempo real directamente desde el registro oficial.'
                    : isFr
                    ? 'L’église certifie que la personne identifiée sur cette page est un membre reconnu, actif et en règle au sein de notre assemblée. Cette vérification est générée en direct depuis notre base de données sécurisée.'
                    : isEn
                    ? 'The church certifies that the individual named on this page is a recognized, active, and good-standing member of our congregation. This online verification is generated in real time from our official church database.'
                    : 'Legliz la sètifye ke moun ki mansyone sou paj sa a se yon manm rekonèt, aktif e an règ nan asanble nou an. Verifikasyon nimerik sa a fèt an dirèk soti nan baz done santral legliz la.'}
                </p>
                {activeConfig.customAuthorityNotice && (
                  <p className="pt-1.5 border-t border-slate-200 font-semibold text-slate-700">
                    {activeConfig.customAuthorityNotice}
                  </p>
                )}
              </div>

              {(isValidImageSrc(church?.signatureUrl) || church?.pastor) && (
                <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {isEs
                        ? 'Autorizado por'
                        : isFr
                        ? 'Autorisé par'
                        : isEn
                        ? 'Authorized By'
                        : 'Otorize pa'}
                    </p>
                    <p className="text-xs font-bold text-slate-800">
                      {church?.pastor || church?.name || 'Direction Générale'}
                    </p>
                  </div>
                  {isValidImageSrc(church?.signatureUrl) && (
                    <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                      <img
                        src={church!.signatureUrl}
                        alt="Signature"
                        referrerPolicy="no-referrer"
                        className="h-9 max-w-[140px] object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 7. DIGITAL VERIFICATION SEAL, CANONICAL QR SERIAL & TIMESTAMP */}
            <div className="pt-2.5 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-500 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400">
                    {isEs ? 'Sello: ' : isFr ? 'Sceau : ' : isEn ? 'Seal: ' : 'Siyati Nimerik: '}
                  </span>
                  <span className="font-bold text-slate-700">{verificationDigest}</span>
                </div>
                <div className="flex items-center gap-2">
                  {cloudVerified && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-sans font-bold">
                      {isEs
                        ? 'Registro Oficial ✓'
                        : isFr
                        ? 'Registre Officiel ✓'
                        : isEn
                        ? 'Official Record ✓'
                        : 'Rejis Ofisyèl ✓'}
                    </span>
                  )}
                  <span>
                    <span className="text-slate-400">
                      {isEs ? 'Verificado: ' : isFr ? 'Vérifié : ' : isEn ? 'Verified: ' : 'Verifye le: '}
                    </span>
                    <span className="font-semibold text-slate-700">{verifiedTime}</span>
                  </span>
                </div>
              </div>
              {canonicalBarcodeSerial && (
                <div className="text-[10px] text-slate-400 truncate">
                  QR ID: <span className="text-slate-600 font-semibold">{canonicalBarcodeSerial}</span>
                </div>
              )}
            </div>

            {/* 8. ACTIONS: PRINT & SHARE (Hidden when printed) */}
            {activeConfig.allowPrintAndShare && (
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
                      {isEs
                        ? 'Imprimir Certificado'
                        : isFr
                        ? 'Imprimer l’Attestation'
                        : isEn
                        ? 'Print Certificate'
                        : 'Enprime Sètifika a'}
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
                          {isEs
                            ? '¡Enlace Copiado!'
                            : isFr
                            ? 'Lien Copié !'
                            : isEn
                            ? 'Link Copied!'
                            : 'Lyen Kopye!'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>
                          {isEs
                            ? 'Copiar Enlace'
                            : isFr
                            ? 'Copier le Lien'
                            : isEn
                            ? 'Copy Link'
                            : 'Kopye Lyen'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {!embeddedMode && (
                  <button
                    type="button"
                    id="btn-close-verification-bottom"
                    onClick={handleClosePage}
                    className="text-xs text-slate-500 hover:text-rose-600 font-semibold underline cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>
                      {isEs
                        ? 'Cerrar verificación'
                        : isFr
                        ? 'Fermer la vérification'
                        : isEn
                        ? 'Close verification'
                        : 'Fèmen verifikasyon an'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER NOTE */}
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
