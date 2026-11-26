import React, { useState, useEffect, useMemo } from 'react';
import {
  Church,
  Member,
  Language,
  DeveloperSettings,
  RemoteMemberVerificationConfig,
} from '../../types';
import {
  getAllChurches,
  getAllMembers,
  updateMember,
  cacheMemberLocally,
  getMemberVerificationUrl,
} from '../../utils/storage';
import {
  sanitizeMemberVerificationConfig,
  verifyAndPushMemberVerificationToCloud,
  parseMemberVerificationLookupInput,
} from '../../utils/developerStorage';
import {
  firestoreGetChurchMembersList,
  firestoreUpdateMember,
} from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';
import { MemberPublicVerificationPage } from '../public/MemberPublicVerificationPage';
import {
  BadgeCheck,
  ShieldCheck,
  CloudUpload,
  CheckCircle2,
  Search,
  Building2,
  UserCheck,
  UserX,
  FileText,
  Camera,
  Copy,
  Check,
  RefreshCw,
  Maximize2,
  Eye,
  EyeOff,
  Printer,
  ShieldAlert,
  QrCode,
  Phone,
  X,
} from 'lucide-react';

export interface DevVerificationTabProps {
  settings: DeveloperSettings;
  allChurches?: Church[];
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  language?: Language;
}

export const DevVerificationTab: React.FC<DevVerificationTabProps> = ({
  settings,
  allChurches,
  onUpdateSettings,
  language = 'ht',
}) => {
  const toast = useToast();

  // Remote verification config state
  const [verifConfig, setVerifConfig] = useState<RemoteMemberVerificationConfig>(() =>
    sanitizeMemberVerificationConfig(settings.memberVerification)
  );
  const [isPushingCloud, setIsPushingCloud] = useState(false);
  const [lastPushVerified, setLastPushVerified] = useState<boolean | null>(null);

  // Members dataset & live preview lookup
  const [members, setMembers] = useState<Member[]>(() => getAllMembers());
  const [isLoadingCloudMembers, setIsLoadingCloudMembers] = useState(false);
  const [selectedChurchFilter, setSelectedChurchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'with_legal' | 'missing_legal' | 'missing_photo'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Direct lookup input (Member Code, QR Payload, or Full Verification URL)
  const [directLookupInput, setDirectLookupInput] = useState('');
  const [inspectedTarget, setInspectedTarget] = useState<{
    memberCode: string;
    churchId?: string;
  } | null>(() => {
    const initialList = getAllMembers();
    if (initialList.length > 0) {
      const first = initialList[0];
      return {
        memberCode: first.memberId || first.id,
        churchId: first.churchId,
      };
    }
    return null;
  });

  const [previewLang, setPreviewLang] = useState<Language>(language);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingBaseUrl, setIsEditingBaseUrl] = useState(false);
  const [baseUrlDraft, setBaseUrlDraft] = useState<string>(
    () => verifConfig.verificationBaseUrl || 'https://verify.omnichurch.download'
  );
  const [isFullScreenPreviewOpen, setIsFullScreenPreviewOpen] = useState(false);
  const [isTogglingMemberStatus, setIsTogglingMemberStatus] = useState(false);

  // Sync local config when parent settings update
  useEffect(() => {
    setVerifConfig(sanitizeMemberVerificationConfig(settings.memberVerification));
  }, [settings.memberVerification]);

  // Reload cached members if church list updates
  const churchesPool = useMemo<Church[]>(() => {
    return allChurches && allChurches.length > 0 ? allChurches : getAllChurches();
  }, [allChurches]);

  const churchMap = useMemo(() => {
    const map = new Map<string, Church>();
    churchesPool.forEach((ch) => {
      if (ch?.id) map.set(ch.id.toUpperCase(), ch);
      if (ch?.code) map.set(ch.code.toUpperCase(), ch);
    });
    return map;
  }, [churchesPool]);

  const reloadLocalMembers = () => {
    const fresh = getAllMembers();
    setMembers(fresh);
    if (!inspectedTarget && fresh.length > 0) {
      setInspectedTarget({
        memberCode: fresh[0].memberId || fresh[0].id,
        churchId: fresh[0].churchId,
      });
    }
  };

  useEffect(() => {
    reloadLocalMembers();
  }, [churchesPool.length]);

  const handleSyncCloudMembers = async () => {
    setIsLoadingCloudMembers(true);
    try {
      const targetChurches =
        selectedChurchFilter !== 'ALL'
          ? churchesPool.filter((c) => c.id.toUpperCase() === selectedChurchFilter.toUpperCase())
          : churchesPool.slice(0, 15);

      let syncedTotal = 0;
      for (const ch of targetChurches) {
        const remoteList = await firestoreGetChurchMembersList(ch.id);
        remoteList.forEach((rm) => {
          cacheMemberLocally(rm);
          syncedTotal++;
        });
      }
      reloadLocalMembers();
      toast.success(
        'Dosye Manm Senkronize',
        `${syncedTotal} dosye manm verifye e rafrechi soti nan baz done santral la.`
      );
    } catch (err: any) {
      toast.error('Echèk Senkro', err?.message || 'Pa t ka rale dosye manm yo nan sèvè a.');
    } finally {
      setIsLoadingCloudMembers(false);
    }
  };

  // Apply & persist policy updates
  const applyVerificationUpdate = async (
    patch: Partial<RemoteMemberVerificationConfig>,
    toastMsg?: string
  ) => {
    const updated = sanitizeMemberVerificationConfig({
      ...verifConfig,
      ...patch,
    });
    setVerifConfig(updated);
    setLastPushVerified(null);
    await onUpdateSettings({ memberVerification: updated });
    if (toastMsg) {
      toast.info('Paramèt Verifikasyon Ajou', toastMsg);
    }
  };

  const handlePushVerificationToCloud = async () => {
    setIsPushingCloud(true);
    try {
      const res = await verifyAndPushMemberVerificationToCloud(settings, verifConfig);
      if (res.remoteMemberVerification) {
        setVerifConfig(res.remoteMemberVerification);
      }
      await onUpdateSettings({
        memberVerification: res.remoteMemberVerification || verifConfig,
      });
      setLastPushVerified(res.remoteVerified);

      if (res.syncedToCloud && res.remoteVerified) {
        toast.success(
          'Paj Verifye Manm Senkronize ✓',
          'Tout règ ak kontwòl verifikasyon piblik yo pouse epi verifye sou sèvè santral la.'
        );
      } else if (res.syncedToCloud) {
        toast.info(
          'Sove ak Pouse sou Sèvè',
          'Konfigirasyon an anrejistre sou sèvè a.'
        );
      } else {
        toast.warning(
          'Sove Lokalman Sèlman',
          'Konekte kont administratè jeneral la pou pouse chanjman yo sou sèvè santral la.'
        );
      }
    } catch (err: any) {
      toast.error('Erè Senkronizasyon', err?.message || 'Pa t ka pouse konfigirasyon an.');
    } finally {
      setIsPushingCloud(false);
    }
  };

  const handleToggleChurchVerification = async (churchId: string, churchName: string) => {
    const cleanCid = churchId.trim();
    const isCurrentlyDisabled = verifConfig.disabledChurchIds.some(
      (cid) => cid.trim().toUpperCase() === cleanCid.toUpperCase()
    );
    const nextDisabled = isCurrentlyDisabled
      ? verifConfig.disabledChurchIds.filter(
          (cid) => cid.trim().toUpperCase() !== cleanCid.toUpperCase()
        )
      : [...verifConfig.disabledChurchIds, cleanCid];

    await applyVerificationUpdate(
      { disabledChurchIds: nextDisabled },
      isCurrentlyDisabled
        ? `Verifikasyon piblik re-aktive pou ${churchName}.`
        : `Verifikasyon piblik pran yon poz pou ${churchName}.`
    );
  };

  // Metrics
  const stats = useMemo(() => {
    const total = members.length;
    const activeCount = members.filter((m) => m.status !== 'inactive').length;
    const inactiveCount = members.filter((m) => m.status === 'inactive').length;
    const withLegalDoc = members.filter((m) => Boolean(m.legalDocumentNumber?.trim())).length;
    const missingPhoto = members.filter(
      (m) => !(m.avatarUrl || m.photoUrl || m.googlePhoto)?.trim()
    ).length;
    return { total, activeCount, inactiveCount, withLegalDoc, missingPhoto };
  }, [members]);

  // Filtered member list
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (
        selectedChurchFilter !== 'ALL' &&
        (m.churchId || '').toUpperCase() !== selectedChurchFilter.toUpperCase()
      ) {
        return false;
      }

      if (statusFilter === 'active' && m.status === 'inactive') return false;
      if (statusFilter === 'inactive' && m.status !== 'inactive') return false;
      if (statusFilter === 'with_legal' && !m.legalDocumentNumber?.trim()) return false;
      if (statusFilter === 'missing_legal' && Boolean(m.legalDocumentNumber?.trim())) return false;
      if (
        statusFilter === 'missing_photo' &&
        Boolean((m.avatarUrl || m.photoUrl || m.googlePhoto)?.trim())
      ) {
        return false;
      }

      if (!q) return true;
      return (
        (m.fullName || '').toLowerCase().includes(q) ||
        (m.memberId || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q) ||
        (m.legalDocumentNumber || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.churchId || '').toLowerCase().includes(q)
      );
    });
  }, [members, selectedChurchFilter, statusFilter, searchQuery]);

  // Currently selected/inspected member object (if in directory)
  const inspectedMemberObj = useMemo(() => {
    if (!inspectedTarget?.memberCode) return null;
    const targetUpper = inspectedTarget.memberCode.trim().toUpperCase();
    return (
      members.find((m) => {
        const matchesCode =
          (m.memberId || '').toUpperCase() === targetUpper ||
          (m.id || '').toUpperCase() === targetUpper ||
          (m.barcodeToken || '').toUpperCase() === targetUpper;
        if (!matchesCode) return false;
        if (inspectedTarget.churchId) {
          return (m.churchId || '').toUpperCase() === inspectedTarget.churchId.toUpperCase();
        }
        return true;
      }) || null
    );
  }, [members, inspectedTarget]);

  const activeVerifyUrl = useMemo(() => {
    const activeBaseUrl = verifConfig.verificationBaseUrl || 'https://verify.omnichurch.download';
    if (inspectedMemberObj) {
      return getMemberVerificationUrl(inspectedMemberObj, activeBaseUrl);
    }
    if (inspectedTarget?.memberCode) {
      return getMemberVerificationUrl(
        {
          id: inspectedTarget.memberCode,
          memberId: inspectedTarget.memberCode,
          churchId: inspectedTarget.churchId || '',
        },
        activeBaseUrl
      );
    }
    return '';
  }, [inspectedMemberObj, inspectedTarget, verifConfig.verificationBaseUrl]);

  const handleDirectLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = directLookupInput.trim();
    if (!raw) return;
    const parsed = parseMemberVerificationLookupInput(
      raw,
      selectedChurchFilter !== 'ALL' ? selectedChurchFilter : undefined
    );
    if (!parsed.memberCode) {
      toast.warning('Kòd Pa Valab', 'Antre yon kòd manm, payload QR, oswa lyen verifikasyon valab.');
      return;
    }
    setInspectedTarget({
      memberCode: parsed.memberCode,
      churchId: parsed.churchId,
    });
  };

  const handleToggleInspectedMemberStatus = async () => {
    if (!inspectedMemberObj) return;
    setIsTogglingMemberStatus(true);
    try {
      const nextStatus: 'active' | 'inactive' =
        inspectedMemberObj.status === 'inactive' ? 'active' : 'inactive';
      const updatedMember: Member = {
        ...inspectedMemberObj,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      updateMember(inspectedMemberObj.churchId, updatedMember);
      await firestoreUpdateMember(updatedMember);
      reloadLocalMembers();
      toast.success(
        nextStatus === 'active' ? 'Manm Re-Aktive ✓' : 'Manm Mete Inaktif / Sispann',
        `${updatedMember.fullName} kounye a gen estati "${nextStatus.toUpperCase()}" sou paj verifikasyon piblik la.`
      );
    } catch (err: any) {
      toast.error('Erè Mizajou Estati', err?.message || 'Pa t ka chanje estati manm lan.');
    } finally {
      setIsTogglingMemberStatus(false);
    }
  };

  const handleCopyVerifyUrl = () => {
    if (!activeVerifyUrl) return;
    navigator.clipboard.writeText(activeVerifyUrl);
    setCopiedLink(true);
    toast.info('Lyen Verifikasyon Kopye', activeVerifyUrl);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. HEADER & CLOUD CONTROL BAR (`app_config/developer_engine -> memberVerification`)
          ========================================================================= */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0B1D3D] via-[#07142B] to-[#0B1120] border border-cyan-500/30 shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/90 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00AEEF]/25 to-[#22ACFF]/10 border border-[#00AEEF]/40 flex items-center justify-center text-[#00AEEF] shrink-0 shadow-lg shadow-cyan-500/10">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                  Enspektè & Kontwòl Paj Verifye Manm lan
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  MemberPublicVerificationPage
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Li sètifika verifikasyon ofisyèl la an dirèk, teste nenpòt kòd QR oswa manm, epi kontwole sa otorite ak piblik la gen dwa wè an tan reyèl.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {lastPushVerified === true && (
              <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verifye sou Sèvè ✓</span>
              </span>
            )}
            {verifConfig.lastVerificationPushAt && (
              <span className="text-[11px] text-slate-400 font-mono bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800">
                Dènye Senkro:{' '}
                <strong className="text-cyan-300">
                  {new Date(verifConfig.lastVerificationPushAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </span>
            )}
            <button
              type="button"
              id="btn-push-verification-cloud"
              onClick={handlePushVerificationToCloud}
              disabled={isPushingCloud}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00AEEF] to-[#22ACFF] hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CloudUpload className={`w-4 h-4 ${isPushingCloud ? 'animate-bounce' : ''}`} />
              <span>
                {isPushingCloud ? 'Ap Senkronize...' : 'Sove & Pouse sou Sèvè a'}
              </span>
            </button>
          </div>
        </div>

        {/* 8 REAL-TIME POLICY TOGGLES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Toggle 1: enabled */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00AEEF] shrink-0" />
                <span>Pòtay Verifikasyon Aktif</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Kill-switch global (`enabled`)
              </p>
            </div>
            <button
              type="button"
              id="toggle-verif-enabled"
              onClick={() =>
                applyVerificationUpdate(
                  { enabled: !verifConfig.enabled },
                  !verifConfig.enabled
                    ? 'Paj verifikasyon piblik la aktive.'
                    : 'Paj verifikasyon piblik la pran yon poz.'
                )
              }
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                verifConfig.enabled ? 'bg-emerald-500' : 'bg-rose-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  verifConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: enforceActiveStatusCheck */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Siyale Manm Inaktif</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Montre avètisman si manm inaktif/achive
              </p>
            </div>
            <button
              type="button"
              id="toggle-verif-enforce-status"
              onClick={() =>
                applyVerificationUpdate({
                  enforceActiveStatusCheck: !verifConfig.enforceActiveStatusCheck,
                })
              }
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                verifConfig.enforceActiveStatusCheck ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  verifConfig.enforceActiveStatusCheck ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: showMemberPhoto */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Afiche Foto Pwofil</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Montre foto manm lan sou sètifika a
              </p>
            </div>
            <button
              type="button"
              id="toggle-verif-show-photo"
              onClick={() =>
                applyVerificationUpdate({
                  showMemberPhoto: !verifConfig.showMemberPhoto,
                })
              }
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                verifConfig.showMemberPhoto ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  verifConfig.showMemberPhoto ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 4: showLegalDocuments */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Afiche Dokiman Legal</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                CIN / NIF / Pasipò ak Matrikil
              </p>
            </div>
            <button
              type="button"
              id="toggle-verif-show-legal"
              onClick={() =>
                applyVerificationUpdate({
                  showLegalDocuments: !verifConfig.showLegalDocuments,
                })
              }
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                verifConfig.showLegalDocuments ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  verifConfig.showLegalDocuments ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 5: maskLegalDocumentNumber */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Maske Nimewo Legal</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Kache premye chif yo (••••4821)
              </p>
            </div>
            <button
              type="button"
              id="toggle-verif-mask-legal"
              onClick={() =>
                applyVerificationUpdate({
                  maskLegalDocumentNumber: !verifConfig.maskLegalDocumentNumber,
                })
              }
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                verifConfig.maskLegalDocumentNumber ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  verifConfig.maskLegalDocumentNumber ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 6: showChurchContactInfo */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Kontak Legliz la</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Afiche telefòn & imèl sekretarya
              </p>
            </div>
            <button
              type="button"
              id="toggle-verif-show-contact"
              onClick={() =>
                applyVerificationUpdate({
                  showChurchContactInfo: !verifConfig.showChurchContactInfo,
                })
              }
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                verifConfig.showChurchContactInfo ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  verifConfig.showChurchContactInfo ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 7: showChurchRncBadge */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Badj RNC Legliz</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Afiche nimewo fiskal ofisyèl
              </p>
            </div>
            <button
              type="button"
              id="toggle-verif-show-rnc"
              onClick={() =>
                applyVerificationUpdate({
                  showChurchRncBadge: !verifConfig.showChurchRncBadge,
                })
              }
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                verifConfig.showChurchRncBadge ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  verifConfig.showChurchRncBadge ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 8: allowPrintAndShare */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Enprime & Pataje</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Bouton enpresyon & kopye lyen
              </p>
            </div>
            <button
              type="button"
              id="toggle-verif-print-share"
              onClick={() =>
                applyVerificationUpdate({
                  allowPrintAndShare: !verifConfig.allowPrintAndShare,
                })
              }
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                verifConfig.allowPrintAndShare ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  verifConfig.allowPrintAndShare ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Custom Authority Notice + Per-Church Disable Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-2">
            <label
              htmlFor="input-verif-custom-notice"
              className="text-xs font-extrabold text-white block"
            >
              Nòt Ofisyèl Siplemantè pou Otorite yo (Opsyonèl)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="input-verif-custom-notice"
                type="text"
                maxLength={600}
                value={verifConfig.customAuthorityNotice || ''}
                onChange={(e) =>
                  setVerifConfig((prev) => ({
                    ...prev,
                    customAuthorityNotice: e.target.value,
                  }))
                }
                onBlur={() =>
                  applyVerificationUpdate({
                    customAuthorityNotice: (verifConfig.customAuthorityNotice || '').trim(),
                  })
                }
                placeholder="Ex: Pou verifikasyon siplemantè, rele biwo santral la oswa scannen kòd QR la..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#00AEEF]"
              />
              <button
                type="button"
                onClick={() =>
                  applyVerificationUpdate(
                    { customAuthorityNotice: (verifConfig.customAuthorityNotice || '').trim() },
                    'Nòt ofisyèl la anrejistre.'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold cursor-pointer shrink-0"
              >
                Aplike
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Verifikasyon pa Legliz</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {verifConfig.disabledChurchIds.length} dezaktive
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {churchesPool.length === 0 ? (
                <span className="text-[11px] text-slate-500">Okenn legliz anrejistre</span>
              ) : (
                churchesPool.map((ch) => {
                  const isDisabled = verifConfig.disabledChurchIds.some(
                    (cid) => cid.trim().toUpperCase() === ch.id.toUpperCase()
                  );
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleToggleChurchVerification(ch.id, ch.name)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                        isDisabled
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {isDisabled ? '🚫 ' : '✓ '}
                      {ch.name.slice(0, 18)}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. READINESS & INTEGRITY METRICS STRIP
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#0B1120] border border-slate-800">
          <span className="text-[11px] text-slate-400 font-semibold block">Total Manm</span>
          <span className="text-2xl font-black font-mono text-white mt-1 block">{stats.total}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0B1120] border border-emerald-500/25">
          <span className="text-[11px] text-emerald-300 font-semibold block">Manm Aktif</span>
          <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {stats.activeCount}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0B1120] border border-rose-500/25">
          <span className="text-[11px] text-rose-300 font-semibold block">Inaktif / Sispann</span>
          <span className="text-2xl font-black font-mono text-rose-400 mt-1 block">
            {stats.inactiveCount}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0B1120] border border-amber-500/25">
          <span className="text-[11px] text-amber-300 font-semibold block">Ak Dokiman Legal</span>
          <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
            {stats.withLegalDoc}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0B1120] border border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-400 font-semibold block">San Foto Pwofil</span>
          <span className="text-2xl font-black font-mono text-slate-300 mt-1 block">
            {stats.missingPhoto}
          </span>
        </div>
      </div>

      {/* =========================================================================
          3. SPLIT INSPECTOR: MEMBER SELECTOR & DIRECT LOOKUP | LIVE CERTIFICATE
          ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 cols): Direct Code/QR Lookup + Member Roster Picker */}
        <div className="xl:col-span-5 space-y-4">
          {/* Direct QR / URL / Member ID Inspector */}
          <form
            onSubmit={handleDirectLookupSubmit}
            className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-[#00AEEF]" />
                <span>Teste Nenpòt Kòd, QR oswa Lyen Verifikasyon</span>
              </span>
              <button
                type="button"
                onClick={handleSyncCloudMembers}
                disabled={isLoadingCloudMembers}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Rale dènye lis manm yo dirèkteman nan sèvè santral la"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isLoadingCloudMembers ? 'animate-spin' : ''}`}
                />
                <span>Senkro Sèvè</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                id="input-dev-direct-verify-lookup"
                value={directLookupInput}
                onChange={(e) => setDirectLookupInput(e.target.value)}
                placeholder="Ex: CH001-1234, CHURCH:...|MEMBER:..., oswa https://verify..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-[#00AEEF]"
              />
              <button
                type="submit"
                id="btn-dev-direct-verify-lookup"
                disabled={!directLookupInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#00AEEF] hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-40"
              >
                Verifye
              </button>
            </div>
          </form>

          {/* Directory Filter & Selector List */}
          <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Lis Manm pou Enspekte ({filteredMembers.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedChurchFilter}
                onChange={(e) => setSelectedChurchFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-[#00AEEF]"
              >
                <option value="ALL">Tout Legliz yo ({churchesPool.length})</option>
                {churchesPool.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name} ({ch.id})
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-[#00AEEF]"
              >
                <option value="all">Tout Estati yo</option>
                <option value="active">Aktif Sèlman</option>
                <option value="inactive">Inaktif / Sispann</option>
                <option value="with_legal">Ak Dokiman Legal (CIN/NIF)</option>
                <option value="missing_legal">San Dokiman Legal</option>
                <option value="missing_photo">San Foto Pwofil</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chèche non, matrikil, telefòn, oswa CIN/NIF..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#00AEEF]"
              />
            </div>

            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filteredMembers.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                  Okenn manm pa koresponn ak filtè sa a. Sèvi ak bouton &ldquo;Senkro Sèvè&rdquo; oswa chèche yon kòd dirèkteman anlè a.
                </div>
              ) : (
                filteredMembers.slice(0, 60).map((m) => {
                  const isSelected =
                    inspectedTarget?.memberCode?.toUpperCase() ===
                      (m.memberId || m.id).toUpperCase() &&
                    (!inspectedTarget?.churchId ||
                      inspectedTarget.churchId.toUpperCase() === (m.churchId || '').toUpperCase());
                  const chName =
                    churchMap.get((m.churchId || '').toUpperCase())?.name || m.churchId;
                  const photo = m.avatarUrl || m.photoUrl || m.googlePhoto;
                  const isInactive = m.status === 'inactive';

                  return (
                    <button
                      key={`${m.churchId}-${m.id}`}
                      type="button"
                      onClick={() =>
                        setInspectedTarget({
                          memberCode: m.memberId || m.id,
                          churchId: m.churchId,
                        })
                      }
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-[#00AEEF] shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {photo ? (
                          <img
                            src={photo}
                            alt={m.fullName}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {(m.fullName || 'M').slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold text-white truncate">
                              {m.fullName}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                isInactive
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {isInactive ? 'Inaktif' : 'Aktif'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                            <span className="font-mono text-cyan-300">{m.memberId}</span>
                            <span>•</span>
                            <span className="truncate">{chName}</span>
                          </div>
                        </div>
                      </div>

                      <Eye
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-[#00AEEF]' : 'text-slate-500'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): LIVE CERTIFICATE INSPECTOR */}
        <div className="xl:col-span-7 space-y-3">
          {/* Inspector Toolbar */}
          <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">
                  Apèsi An Dirèk Paj Verifye Manm lan
                </span>
                {inspectedTarget?.memberCode && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] font-mono text-cyan-300">
                    {inspectedTarget.memberCode}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Language Switcher for Live Preview */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
                  {(['ht', 'fr', 'en', 'es'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setPreviewLang(lang)}
                      className={`px-2 py-0.5 rounded-lg uppercase cursor-pointer transition-colors ${
                        previewLang === lang
                          ? 'bg-[#00AEEF] text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                {inspectedMemberObj && (
                  <button
                    type="button"
                    id="btn-dev-toggle-member-active-status"
                    disabled={isTogglingMemberStatus}
                    onClick={handleToggleInspectedMemberStatus}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 border cursor-pointer transition-colors disabled:opacity-50 ${
                      inspectedMemberObj.status === 'inactive'
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {inspectedMemberObj.status === 'inactive' ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Re-Aktive Manm</span>
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        <span>Mete Inaktif</span>
                      </>
                    )}
                  </button>
                )}

                {activeVerifyUrl && (
                  <button
                    type="button"
                    onClick={handleCopyVerifyUrl}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Kopye!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Kopye Lyen</span>
                      </>
                    )}
                  </button>
                )}

                {inspectedTarget?.memberCode && (
                  <button
                    type="button"
                    onClick={() => setIsFullScreenPreviewOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Plen Ekran</span>
                  </button>
                )}
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/90 text-[11px] font-mono text-slate-400 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1 truncate">
                  <span>URL Ofisyèl: </span>
                  <span className="text-cyan-300 select-all">
                    {activeVerifyUrl || `${verifConfig.verificationBaseUrl || 'https://verify.omnichurch.download'}/?verify=1`}
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-edit-official-verification-origin"
                  onClick={() => {
                    setBaseUrlDraft(verifConfig.verificationBaseUrl || 'https://verify.omnichurch.download');
                    setIsEditingBaseUrl((prev) => !prev);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-sans font-bold cursor-pointer shrink-0"
                >
                  {isEditingBaseUrl ? 'Fèmen' : 'Modifye Domèn'}
                </button>
              </div>
              {isEditingBaseUrl && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 font-sans">
                  <input
                    id="input-official-verification-base-url"
                    type="url"
                    value={baseUrlDraft}
                    onChange={(e) => setBaseUrlDraft(e.target.value)}
                    placeholder="https://verify.omnichurch.download"
                    className="flex-1 min-w-[200px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-200 text-xs font-mono focus:outline-none focus:border-[#00AEEF]"
                  />
                  <button
                    type="button"
                    id="btn-save-official-verification-base-url"
                    onClick={async () => {
                      const clean = (baseUrlDraft || '').trim().replace(/\/+$/, '') || 'https://verify.omnichurch.download';
                      await applyVerificationUpdate(
                        { verificationBaseUrl: clean },
                        `Domèn verifikasyon ofisyèl la mete sou ${clean}`
                      );
                      setBaseUrlDraft(clean);
                      setIsEditingBaseUrl(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#00AEEF] hover:bg-cyan-400 text-slate-950 font-extrabold text-[11px] cursor-pointer"
                  >
                    Aplike
                  </button>
                  <button
                    type="button"
                    id="btn-reset-official-verification-base-url"
                    onClick={async () => {
                      const defaultOrigin = 'https://verify.omnichurch.download';
                      setBaseUrlDraft(defaultOrigin);
                      await applyVerificationUpdate(
                        { verificationBaseUrl: defaultOrigin },
                        `Domèn ofisyèl la remèt sou ${defaultOrigin}`
                      );
                      setIsEditingBaseUrl(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] cursor-pointer"
                  >
                    Defo Ofisyèl
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Embedded Verification Certificate Preview */}
          {inspectedTarget?.memberCode ? (
            <div className="rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <MemberPublicVerificationPage
                memberCode={inspectedTarget.memberCode}
                churchId={inspectedTarget.churchId}
                initialLanguage={previewLang}
                embeddedMode={true}
                previewConfigOverride={verifConfig}
              />
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0B1120] border border-slate-800 text-center space-y-3">
              <BadgeCheck className="w-10 h-10 text-cyan-400 mx-auto opacity-70" />
              <h4 className="text-sm font-black text-white">
                Chwazi yon Manm oswa Antre yon Kòd QR
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Seleksyone nenpòt manm nan lis agoch la oswa antre matrikil li / lyen verifikasyon an pou li epi verifye paj sètifika ofisyèl li an dirèk.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* IN-APP FULL-SCREEN VERIFICATION MODAL (iframe-safe alternative to window.open) */}
      {isFullScreenPreviewOpen && inspectedTarget?.memberCode && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-3 sm:p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setIsFullScreenPreviewOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Retounen nan Panèl Dev</span>
              </button>
            </div>
            <MemberPublicVerificationPage
              memberCode={inspectedTarget.memberCode}
              churchId={inspectedTarget.churchId}
              initialLanguage={previewLang}
              onClose={() => setIsFullScreenPreviewOpen(false)}
              previewConfigOverride={verifConfig}
            />
          </div>
        </div>
      )}
    </div>
  );
};
