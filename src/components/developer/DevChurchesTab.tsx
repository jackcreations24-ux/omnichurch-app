import React, { useMemo, useState } from 'react';
import {
  Church,
  DeveloperSettings,
  Language,
  LicenseTier,
} from '../../types';
import {
  Building2,
  Search,
  Users,
  Calendar,
  CheckCircle2,
  KeyRound,
  Download,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Zap,
  Check,
  RefreshCw,
  Archive,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CloudUpload,
} from 'lucide-react';
import {
  getMembersByChurch,
  getServicesByChurch,
  getAttendanceByChurch,
  saveChurch,
  setChurchAdminVerificationAsync,
  migrateAllChurchesToActiveCurrentModel,
} from '../../utils/storage';
import {
  generateLicenseKey,
  validateAndActivateLicense,
  deleteLicensePermanently,
  isSuperDeveloperEmail,
} from '../../utils/developerStorage';
import {
  classifyChurchDataset,
  ChurchClassificationReason,
} from '../../utils/developerSyncAudit';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface DevChurchesTabProps {
  allChurches: Church[];
  currentChurch: Church | null;
  settings: DeveloperSettings;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  onSelectChurch?: (church: Church) => void;
  onRefreshChurches?: () => void;
  pendingByChurch?: Record<string, number>;
  language?: Language;
}

type DatasetFilter = 'all' | 'active' | 'archived_legacy';

function formatLicenseTierTitle(tier: LicenseTier, language: Language): string {
  switch (tier) {
    case 'enterprise_lifetime':
      return language === 'fr'
        ? 'Licence à Vie'
        : language === 'es'
        ? 'Licencia de por Vida'
        : language === 'en'
        ? 'Enterprise Lifetime'
        : 'Lisans Pou Lavi';
    case 'pro_annual':
      return language === 'fr'
        ? 'Pro Annuelle'
        : language === 'es'
        ? 'Pro Anual'
        : language === 'en'
        ? 'Pro Annual'
        : 'Pro Anyèl';
    case 'trial':
      return language === 'fr'
        ? 'Essai'
        : language === 'es'
        ? 'Prueba'
        : language === 'en'
        ? 'Trial'
        : 'Esè';
    default:
      return language === 'fr'
        ? 'Personnalisée'
        : language === 'es'
        ? 'Personalizada'
        : language === 'en'
        ? 'Custom'
        : 'Pèsonalize';
  }
}

export const DevChurchesTab = ({
  allChurches,
  currentChurch,
  settings,
  onSelectChurch,
  onRefreshChurches,
  pendingByChurch = {},
  language = 'ht',
}: DevChurchesTabProps) => {
  const toast = useToast();
  const { developerUser, googleUser, isEmailVerified, signInSuperDeveloperWithGoogle } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [datasetFilter, setDatasetFilter] = useState<DatasetFilter>('all');
  const [showArchivedSection, setShowArchivedSection] = useState(true);
  const [isActivatingId, setIsActivatingId] = useState<string | null>(null);
  const [isVerifyingAdminId, setIsVerifyingAdminId] = useState<string | null>(null);
  const [isConnectingSuperDev, setIsConnectingSuperDev] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [churchToRevoke, setChurchToRevoke] = useState<Church | null>(null);

  const liveAuthUser = auth.currentUser;
  const activeAuthEmail = (liveAuthUser?.email || developerUser?.email || googleUser?.email || '').trim().toLowerCase();
  const isSuperDevCloudReady = Boolean(
    liveAuthUser &&
    isSuperDeveloperEmail(liveAuthUser.email) &&
    (Boolean(liveAuthUser.emailVerified) || isEmailVerified)
  );

  const isEn = language === 'en';
  const isFr = language === 'fr';
  const isEs = language === 'es';

  const labels = {
    headerTitle: isEn
      ? 'Church Dataset Management'
      : isFr
      ? 'Gestion des Données des Églises'
      : isEs
      ? 'Gestión de Conjuntos de Iglesias'
      : 'Jesyon Done Legliz yo',
    searchPlaceholder: isEn
      ? 'Search by name, city, code, or pastor...'
      : isFr
      ? 'Rechercher par nom, ville, code ou pasteur...'
      : isEs
      ? 'Buscar por nombre, ciudad, código o pastor...'
      : 'Chèche pa non, vil, kòd, oswa pastè...',
    refreshTooltip: isEn
      ? 'Refresh Church Datasets'
      : isFr
      ? 'Actualiser les Églises'
      : isEs
      ? 'Actualizar Iglesias'
      : 'Rafrechi Lis Legliz yo',
    filterAll: isEn
      ? 'All Datasets'
      : isFr
      ? 'Tous les Ensembles'
      : isEs
      ? 'Todos'
      : 'Tout Legliz yo',
    filterActive: isEn
      ? 'Active Churches'
      : isFr
      ? 'Églises Actives'
      : isEs
      ? 'Iglesias Activas'
      : 'Legliz Aktif yo',
    filterArchived: isEn
      ? 'Archived & Legacy'
      : isFr
      ? 'Archivées & Anciennes'
      : isEs
      ? 'Archivadas y Legado'
      : 'Achive & Ansyen Modèl',
    activeSectionTitle: isEn
      ? 'Active Churches'
      : isFr
      ? 'Églises Actives'
      : isEs
      ? 'Iglesias Activas'
      : 'Legliz Aktif yo',
    activeSectionDesc: isEn
      ? 'Production church datasets currently active across the platform'
      : isFr
      ? 'Églises de production actuellement actives sur la plateforme'
      : isEs
      ? 'Iglesias de producción actualmente activas en la plataforma'
      : 'Legliz ki aktif nan pwodiksyon kounye a sou platfòm nan',
    archivedSectionTitle: isEn
      ? 'Archived & Legacy Churches'
      : isFr
      ? 'Églises Archivées & Anciennes'
      : isEs
      ? 'Iglesias Archivadas y Legado'
      : 'Legliz Achive ak Ansyen Modèl',
    archivedSectionDesc: isEn
      ? 'Archived church accounts and historical datasets preserved for reference or restoration'
      : isFr
      ? 'Comptes d’églises archivés et historiques conservés pour référence ou restauration'
      : isEs
      ? 'Cuentas de iglesias archivadas e históricas conservadas para referencia o restauración'
      : 'Kont legliz ki achive ak dosye istorik ki konsève pou referans oswa restorasyon',
    currentInApp: isEn
      ? 'Current Active Church'
      : isFr
      ? 'Église Active Actuelle'
      : isEs
      ? 'Iglesia Activa Actual'
      : 'Legliz Aktif Kounye a',
    archivedBadge: isEn
      ? 'Archived'
      : isFr
      ? 'Archivée'
      : isEs
      ? 'Archivada'
      : 'Achive',
    legacyBadge: isEn
      ? 'Legacy Dataset'
      : isFr
      ? 'Ancien Jeu'
      : isEs
      ? 'Conjunto Legado'
      : 'Ansyen Modèl',
    licenseHeading: isEn
      ? 'License'
      : isFr
      ? 'Licence'
      : isEs
      ? 'Licencia'
      : 'Lisans',
    noLicense: isEn
      ? 'No Active License'
      : isFr
      ? 'Aucune Licence Active'
      : isEs
      ? 'Sin Licencia Activa'
      : 'Pa gen Lisans Aktif',
    trialMode: isEn
      ? 'Free or Trial Mode'
      : isFr
      ? 'Mode Libre ou Essai'
      : isEs
      ? 'Modo Libre o Prueba'
      : 'Mòd Lib oswa Esè',
    switchChurch: isEn
      ? 'Switch to Church'
      : isFr
      ? 'Basculer vers l’Église'
      : isEs
      ? 'Cambiar a Iglesia'
      : 'Chanje sou li',
    activateLifetime: isEn
      ? 'Activate Lifetime'
      : isFr
      ? 'Activer à Vie'
      : isEs
      ? 'Activar de por Vida'
      : 'Aktive Pou Lavi',
    activating: isEn
      ? 'Activating...'
      : isFr
      ? 'Activation...'
      : isEs
      ? 'Activando...'
      : 'Ap aktive...',
    revoke: isEn ? 'Revoke' : isFr ? 'Révoquer' : isEs ? 'Revocar' : 'Retire',
    archiveAction: isEn
      ? 'Archive'
      : isFr
      ? 'Archiver'
      : isEs
      ? 'Archivar'
      : 'Achive',
    restoreAction: isEn
      ? 'Restore Active'
      : isFr
      ? 'Restaurer'
      : isEs
      ? 'Restaurar'
      : 'Retabli Aktif',
    adminVerifiedTrue: isEn
      ? 'Verified (true)'
      : isFr
      ? 'Vérifié (true)'
      : isEs
      ? 'Verificado (true)'
      : 'Verifye (true)',
    adminVerifiedFalse: isEn
      ? 'Unverified (false)'
      : isFr
      ? 'Non vérifié (false)'
      : isEs
      ? 'No verificado (false)'
      : 'Pa Verifye (false)',
    confirmAdminPermission: isEn
      ? 'Confirm Admin Permission'
      : isFr
      ? 'Confirmer Admin'
      : isEs
      ? 'Confirmar Admin'
      : 'Konfime Pèmisyon Admin',
    revokeAdminPermission: isEn
      ? 'Revoke Admin Verification'
      : isFr
      ? 'Retirer Confirmation'
      : isEs
      ? 'Revocar Confirmación'
      : 'Retire Konfimasyon',
    updatingAdminPermission: isEn
      ? 'Updating...'
      : isFr
      ? 'Mise à jour...'
      : isEs
      ? 'Actualizando...'
      : 'Ap mete ajou...',
    noMatchTitle: isEn
      ? 'No Churches Found'
      : isFr
      ? 'Aucune Église Trouvée'
      : isEs
      ? 'No se Encontraron Iglesias'
      : 'Okenn Legliz Pa Jwenn',
    noMatchDesc: isEn
      ? 'No church datasets match your current filter or search.'
      : isFr
      ? 'Aucune église ne correspond à votre filtre ou recherche.'
      : isEs
      ? 'Ninguna iglesia coincide con tu filtro o búsqueda actual.'
      : 'Pa gen okenn legliz ki koresponn ak filtè oswa rechèch ou a.',
  };

  const handleRefreshChurches = () => {
    setIsRefreshing(true);
    if (onRefreshChurches) {
      onRefreshChurches();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success(
        isEn ? 'Church List Refreshed' : isFr ? 'Liste Actualisée' : isEs ? 'Lista Actualizada' : 'Lis Legliz yo Rafrechi',
        isEn
          ? 'Church datasets and license statuses have been updated.'
          : isFr
          ? 'Les données des églises et les licences ont été mises à jour.'
          : isEs
          ? 'Los conjuntos de iglesias y licencias se han actualizado.'
          : 'Done legliz yo ak lisans yo mete ajou.'
      );
    }, 450);
  };

  const filteredChurches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allChurches.filter((c) => {
      if (!q) return true;
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q) ||
        Boolean(c.code && c.code.toLowerCase().includes(q)) ||
        Boolean(c.pastor && c.pastor.toLowerCase().includes(q)) ||
        Boolean(c.city && c.city.toLowerCase().includes(q))
      );
    });
  }, [allChurches, searchQuery]);

  const { activeChurches, archivedLegacyChurches } = useMemo(() => {
    const active: Array<{ church: Church; reason: ChurchClassificationReason }> = [];
    const archivedLegacy: Array<{ church: Church; reason: ChurchClassificationReason }> = [];

    for (const church of filteredChurches) {
      const classification = classifyChurchDataset(church);
      if (classification.group === 'active') {
        active.push({ church, reason: classification.reason });
      } else {
        archivedLegacy.push({ church, reason: classification.reason });
      }
    }

    return { activeChurches: active, archivedLegacyChurches: archivedLegacy };
  }, [filteredChurches]);

  const getChurchLicense = (churchId: string) => {
    return settings.licenses.find(
      (l) => l.churchId.toUpperCase() === churchId.toUpperCase() || l.churchId.toUpperCase() === 'GLOBAL'
    );
  };

  const getPendingCountForChurch = (church: Church): number => {
    let count = 0;
    for (const [key, val] of Object.entries(pendingByChurch as Record<string, number>)) {
      const upperKey = key.toUpperCase();
      if (
        upperKey === church.id.toUpperCase() ||
        (church.code && upperKey === church.code.toUpperCase())
      ) {
        count += Number(val) || 0;
      }
    }
    return count;
  };

  const handleInstantLicense = async (church: Church, tier: LicenseTier) => {
    setIsActivatingId(church.id);
    try {
      const key = generateLicenseKey(church.id, tier);
      const res = await validateAndActivateLicense(key, church.id, church.name);
      if (res.success) {
        toast.success(
          isEn ? 'License Activated' : 'Lisans Aktive',
          isEn
            ? `"${church.name}" now has an active ${formatLicenseTierTitle(tier, language)} license.`
            : `Legliz "${church.name}" resevwa yon lisans ${formatLicenseTierTitle(tier, language)} ki valab kounye a.`
        );
        if (onRefreshChurches) onRefreshChurches();
      } else {
        toast.error(isEn ? 'Activation Error' : 'Erè Aktivasyon', res.message);
      }
    } catch (err: unknown) {
      toast.error(isEn ? 'Error' : 'Erè', err instanceof Error ? err.message : undefined);
    } finally {
      setIsActivatingId(null);
    }
  };

  const handleToggleArchiveStatus = (church: Church, targetStatus: 'archived' | 'active') => {
    const updated: Church = {
      ...church,
      status: targetStatus,
      archivedAt: targetStatus === 'archived' ? new Date().toISOString() : undefined,
      isLegacy: targetStatus === 'active' ? false : church.isLegacy,
    };
    saveChurch(updated);
    if (onRefreshChurches) {
      onRefreshChurches();
    }
    if (targetStatus === 'archived') {
      toast.info(
        isEn ? 'Church Archived' : isFr ? 'Église Archivée' : isEs ? 'Iglesia Archivada' : 'Legliz Achive',
        isEn
          ? `"${church.name}" was moved to Archived & Legacy Churches.`
          : isFr
          ? `« ${church.name} » a été déplacée vers les Églises Archivées.`
          : isEs
          ? `"${church.name}" se movió a Iglesias Archivadas y Legado.`
          : `"${church.name}" deplase nan seksyon Legliz Achive & Ansyen Modèl.`
      );
    } else {
      toast.success(
        isEn ? 'Church Restored' : isFr ? 'Église Restaurée' : isEs ? 'Iglesia Restaurada' : 'Legliz Retabli',
        isEn
          ? `"${church.name}" is now listed in Active Churches.`
          : isFr
          ? `« ${church.name} » est maintenant active.`
          : isEs
          ? `"${church.name}" ahora está en Iglesias Activas.`
          : `"${church.name}" retabli nan seksyon Legliz Aktif yo.`
      );
    }
  };

  const handleConnectSuperDevForChurches = async (): Promise<boolean> => {
    setIsConnectingSuperDev(true);
    try {
      const { user, isSuperDeveloper, emailVerified } = await signInSuperDeveloperWithGoogle();
      if (isSuperDeveloper) {
        toast.success(
          isEn ? 'Super Developer Authenticated' : isFr ? 'Propriétaire Authentifié' : isEs ? 'Propietario Autenticado' : 'Kont Super Dev Konekte ✓',
          isEn
            ? `Signed in as ${user.email}. Firestore write permissions are now active.`
            : `Ou konekte ak ${user.email}. Ou gen pèmisyon konplè sou Firestore kounye a.`
        );
        return true;
      }
      toast.warning(
        isEn ? 'Wrong Account Selected' : 'Move Kont Chwazi',
        !emailVerified && isSuperDeveloperEmail(user.email)
          ? isEn
            ? 'Your developer email must be verified in Google/Firebase.'
            : 'Imèl kont Super Dev la dwe verifye nan Google/Firebase.'
          : isEn
          ? `You picked ${user.email || 'another account'}. Please choose your Super Developer Google account (charlesjj3186@gmail.com).`
          : `Ou te chwazi ${user.email || 'yon lòt kont'}. Tanpri chwazi kont Google Super Dev ou a (charlesjj3186@gmail.com).`
      );
      return false;
    } catch (err: any) {
      toast.error(
        isEn ? 'Google Sign-In Failed' : 'Koneksyon Google Echwe',
        err?.message || (isEn ? 'Could not complete Google Sign-In.' : 'Pa t ka konekte ak Google.')
      );
      return false;
    } finally {
      setIsConnectingSuperDev(false);
    }
  };

  const handleToggleAdminVerification = async (church: Church, nextVerified: boolean) => {
    setIsVerifyingAdminId(church.id);
    try {
      // If Firebase Auth is currently signed out or signed into a church admin email (e.g. CH001 owner),
      // authenticate the verified Super Developer Google session right inside this click gesture
      // so Firestore rules authorize the write cleanly without weakening security rules.
      const currentLiveUser = auth.currentUser;
      const alreadyVerifiedSuperDev = Boolean(
        currentLiveUser &&
        isSuperDeveloperEmail(currentLiveUser.email) &&
        Boolean(currentLiveUser.emailVerified)
      );
      if (!alreadyVerifiedSuperDev) {
        const connected = await handleConnectSuperDevForChurches();
        if (!connected) {
          return;
        }
      }

      await setChurchAdminVerificationAsync(church, nextVerified);
      if (onRefreshChurches) {
        onRefreshChurches();
      }
      if (nextVerified) {
        toast.success(
          isEn
            ? 'Church Admin Verified (true)'
            : isFr
            ? 'Administrateur Vérifié (true)'
            : isEs
            ? 'Administrador Verificado (true)'
            : 'Pèmisyon Admin Konfime (true) ✓',
          isEn
            ? `Platform owner approved admin permissions for "${church.name}" (${church.id}).`
            : isFr
            ? `Les permissions administrateur de « ${church.name} » (${church.id}) sont passées à true.`
            : isEs
            ? `Los permisos de administrador de "${church.name}" (${church.id}) pasaron a true.`
            : `Verifikasyon mèt legliz "${church.name}" (${church.id}) pase de false a true nan Firestore.`
        );
      } else {
        toast.info(
          isEn
            ? 'Admin Verification Revoked (false)'
            : isFr
            ? 'Confirmation Retirée (false)'
            : isEs
            ? 'Confirmación Revocada (false)'
            : 'Konfimasyon Admin Retire (false)',
          isEn
            ? `Platform verification for "${church.name}" was set back to false.`
            : isFr
            ? `La vérification plateforme de « ${church.name} » est repassée à false.`
            : isEs
            ? `La verificación de plataforma de "${church.name}" volvió a false.`
            : `Verifikasyon platfòm pou "${church.name}" tounen false nan Firestore.`
        );
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isNotSuperDev = msg.includes('SUPER_DEV_AUTH_REQUIRED');
      const isUnverifiedSuperDev =
        msg.includes('SUPER_DEV_EMAIL_UNVERIFIED') || msg.includes('SUPER_DEV_TOKEN_UNVERIFIED');
      const isFirestorePermDenied =
        msg.toLowerCase().includes('permission-denied') ||
        msg.toLowerCase().includes('missing or insufficient permissions');

      let detail = msg || (isEn ? 'Unexpected Firestore error.' : 'Erè Firestore inatandi.');
      if (isNotSuperDev) {
        detail = isEn
          ? `Active session is "${activeAuthEmail || 'none'}". Sign in with Google as charlesjj3186@gmail.com to authorize this change.`
          : `Sesyon aktif la se "${activeAuthEmail || 'okenn'}". Konekte ak Google kòm charlesjj3186@gmail.com pou konfime pèmisyon mèt legliz la.`;
      } else if (isUnverifiedSuperDev) {
        detail = isEn
          ? 'Your Super Developer Google email is not marked verified in the Firebase Auth token. Sign in again with Google.'
          : 'Jeton Google Super Dev la pa make email_verified=true. Klike "Konekte Kont Super Dev (Google)" pou rafrechi sesyon an.';
      } else if (isFirestorePermDenied) {
        detail = isEn
          ? `Firestore denied update on churches/${church.id} (signed in as ${auth.currentUser?.email || 'none'}, emailVerified=${Boolean(auth.currentUser?.emailVerified)}). Reconnect Google as charlesjj3186@gmail.com and retry.`
          : `Firestore refize ekriti sou churches/${church.id} (kont aktif: ${auth.currentUser?.email || 'okenn'}, verifye: ${Boolean(auth.currentUser?.emailVerified)}). Rekonekte ak Google (charlesjj3186@gmail.com) epi re-eseye.`;
      }

      toast.error(
        isEn
          ? 'Could Not Update Admin Verification'
          : isFr
          ? 'Échec de la Mise à Jour'
          : isEs
          ? 'No se Pudo Actualizar la Verificación'
          : 'Erè nan Konfimasyon Pèmisyon',
        detail
      );
    } finally {
      setIsVerifyingAdminId(null);
    }
  };

  const handleExportChurchData = (church: Church) => {
    const members = getMembersByChurch(church.id);
    const services = getServicesByChurch(church.id);
    const attendance = getAttendanceByChurch(church.id);

    const payload = {
      exportedAt: new Date().toISOString(),
      church,
      members,
      services,
      attendance,
      stats: {
        totalMembers: members.length,
        totalServices: services.length,
        totalAttendance: attendance.length,
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${church.id}_${church.name.replace(/\s+/g, '_')}_data.json`);
    dlAnchor.click();
    toast.success(
      isEn ? 'Church Data Exported' : 'Done Legliz Ekspòte',
      isEn
        ? `JSON export for ${church.name} downloaded.`
        : `Fichye JSON pou ${church.name} telechaje avèk siksè.`
    );
  };

  const confirmRevokeLicense = async () => {
    if (!churchToRevoke) return;
    await deleteLicensePermanently(churchToRevoke.id);
    toast.info(
      isEn ? 'License Revoked' : 'Lisans Retire',
      isEn
        ? `License for ${churchToRevoke.name} removed.`
        : `Lisans legliz ${churchToRevoke.name} retire nan sistèm nan.`
    );
    if (onRefreshChurches) onRefreshChurches();
    setChurchToRevoke(null);
  };

  const renderChurchCard = (
    church: Church,
    reason: ChurchClassificationReason,
    isArchivedSection: boolean
  ) => {
    const isCurrent = currentChurch?.id === church.id;
    const churchMembers = getMembersByChurch(church.id);
    const churchServices = getServicesByChurch(church.id);
    const churchAttendance = getAttendanceByChurch(church.id);
    const lic = getChurchLicense(church.id);
    const isLicensed = Boolean(lic && lic.status === 'active');
    const pendingSyncCount = getPendingCountForChurch(church);

    return (
      <div
        key={church.id}
        className={`p-5 sm:p-6 rounded-3xl border transition-all ${
          isCurrent
            ? 'bg-gradient-to-r from-[#0B1120] via-slate-900 to-[#0B1120] border-amber-400/60 ring-1 ring-amber-400/30 shadow-2xl'
            : isArchivedSection
            ? 'bg-[#090E1B] border-slate-800/70 hover:border-slate-700/90 shadow-lg opacity-95'
            : 'bg-[#0B1120] border-slate-800/80 hover:border-slate-700 shadow-xl'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Church Info */}
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-black text-white truncate">
                {church.name}
              </h4>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono text-[10px] font-bold border border-slate-700">
                {church.id} {church.code ? `• ${church.code}` : ''}
              </span>
              {isCurrent && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/40">
                  {labels.currentInApp}
                </span>
              )}
              {isArchivedSection && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    reason === 'archived'
                      ? 'bg-slate-800/90 text-slate-300 border-slate-700'
                      : 'bg-amber-950/50 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {reason === 'archived' ? labels.archivedBadge : labels.legacyBadge}
                </span>
              )}
              {pendingSyncCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-semibold inline-flex items-center gap-1">
                  <CloudUpload className="w-3 h-3" />
                  <span>
                    {pendingSyncCount}{' '}
                    {isEn ? 'Pending Sync' : isFr ? 'En Attente' : isEs ? 'Pendiente' : 'An Atant Senkro'}
                  </span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              {church.pastor && (
                <div>
                  {isEn ? 'Pastor:' : isFr ? 'Pasteur :' : isEs ? 'Pastor:' : 'Pastè:'}{' '}
                  <span className="text-slate-200 font-medium">{church.pastor}</span>
                </div>
              )}
              {church.city && (
                <div>
                  {isEn ? 'City:' : isFr ? 'Ville :' : isEs ? 'Ciudad:' : 'Vil:'}{' '}
                  <span className="text-slate-200 font-medium">{church.city}</span>
                </div>
              )}
              {church.phone && (
                <div>
                  {isEn ? 'Phone:' : isFr ? 'Téléphone :' : isEs ? 'Teléfono:' : 'Telefòn:'}{' '}
                  <span className="text-slate-200 font-mono font-medium">{church.phone}</span>
                </div>
              )}
              {church.adminGoogleEmail && (
                <div>
                  Admin: <span className="text-slate-200 font-mono font-medium">{church.adminGoogleEmail}</span>
                </div>
              )}
            </div>

            {/* Dataset Stats */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-[11px] font-mono">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300 font-bold">{churchMembers.length}</span>
                <span className="text-slate-500">{isEn ? 'members' : 'manm'}</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-[11px] font-mono">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-300 font-bold">{churchServices.length}</span>
                <span className="text-slate-500">{isEn ? 'services' : 'kilt'}</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-[11px] font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-300 font-bold">{churchAttendance.length}</span>
                <span className="text-slate-500">{isEn ? 'attendance' : 'prezans'}</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-[11px] font-mono">
                <Shield
                  className={`w-3.5 h-3.5 ${
                    church.rncVerificationStatus === 'verified'
                      ? 'text-emerald-400'
                      : church.rncVerificationStatus === 'pending'
                      ? 'text-amber-400 animate-pulse'
                      : church.rncVerificationStatus === 'rejected'
                      ? 'text-rose-400'
                      : 'text-slate-600'
                  }`}
                />
                <span className="text-slate-400">RNC:</span>
                <span
                  className={
                    church.rncVerificationStatus === 'verified'
                      ? 'text-emerald-300 font-bold'
                      : church.rncVerificationStatus === 'pending'
                      ? 'text-amber-300 font-bold'
                      : church.rncVerificationStatus === 'rejected'
                      ? 'text-rose-300 font-bold'
                      : 'text-slate-500'
                  }
                >
                  {church.rncVerificationStatus === 'verified'
                    ? isEn ? 'Verified' : 'Verifye'
                    : church.rncVerificationStatus === 'pending'
                    ? isEn ? 'Pending' : 'An Atant'
                    : church.rncVerificationStatus === 'rejected'
                    ? isEn ? 'Rejected' : 'Rejte'
                    : isEn ? 'Not Submitted' : 'Poko soumèt'}
                </span>
              </div>
              <div
                className={`px-3 py-1 rounded-xl border flex items-center gap-1.5 text-[11px] font-mono ${
                  church.adminVerified
                    ? 'bg-emerald-950/50 border-emerald-500/40'
                    : 'bg-slate-950 border-slate-800'
                }`}
                title={
                  church.adminVerified && church.adminVerifiedAt
                    ? `${church.adminVerifiedBy || 'Super Developer'} • ${church.adminVerifiedAt}`
                    : undefined
                }
              >
                {church.adminVerified ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="text-slate-400">Admin:</span>
                <span className={church.adminVerified ? 'text-emerald-300 font-bold' : 'text-amber-300 font-semibold'}>
                  {church.adminVerified ? labels.adminVerifiedTrue : labels.adminVerifiedFalse}
                </span>
              </div>
            </div>
          </div>

          {/* Right: License & Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 min-w-[165px]">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                <span>{labels.licenseHeading}</span>
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              </div>
              {isLicensed && lic ? (
                <div className="mt-1">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{formatLicenseTierTitle(lic.tier, language)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[145px]">
                    {lic.key}
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <div className="text-xs font-bold text-amber-400">{labels.noLicense}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{labels.trialMode}</div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {onSelectChurch && !isCurrent && (
                <button
                  type="button"
                  onClick={() => onSelectChurch(church)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={labels.switchChurch}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  <span>{labels.switchChurch}</span>
                </button>
              )}

              {!isArchivedSection && (
                !isLicensed ? (
                  <button
                    type="button"
                    disabled={isActivatingId === church.id}
                    onClick={() => handleInstantLicense(church, 'enterprise_lifetime')}
                    className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{isActivatingId === church.id ? labels.activating : labels.activateLifetime}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setChurchToRevoke(church)}
                    className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs font-bold transition-colors cursor-pointer"
                    title={labels.revoke}
                  >
                    {labels.revoke}
                  </button>
                )
              )}

              {/* Archive / Restore Button */}
              {!isArchivedSection ? (
                <button
                  type="button"
                  onClick={() => handleToggleArchiveStatus(church, 'archived')}
                  className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={labels.archiveAction}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{labels.archiveAction}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleArchiveStatus(church, 'active')}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={labels.restoreAction}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{labels.restoreAction}</span>
                </button>
              )}

              {/* Platform-Owner Admin Verification Toggle (false <-> true) */}
              <button
                type="button"
                id={`btn-toggle-admin-verified-${church.id}`}
                disabled={isVerifyingAdminId === church.id}
                onClick={() => handleToggleAdminVerification(church, !church.adminVerified)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                  church.adminVerified
                    ? 'bg-slate-900 hover:bg-rose-950/40 text-emerald-300 hover:text-rose-300 border border-emerald-500/35 hover:border-rose-500/40'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 active:scale-95'
                }`}
                title={
                  church.adminVerified
                    ? labels.revokeAdminPermission
                    : labels.confirmAdminPermission
                }
              >
                {isVerifyingAdminId === church.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : church.adminVerified ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5" />
                )}
                <span>
                  {isVerifyingAdminId === church.id
                    ? labels.updatingAdminPermission
                    : church.adminVerified
                    ? labels.revokeAdminPermission
                    : labels.confirmAdminPermission}
                </span>
              </button>

              {/* Export Church Data */}
              <button
                type="button"
                onClick={() => handleExportChurchData(church)}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                title={isEn ? 'Export church JSON data' : 'Ekspòte done legliz sa a (JSON)'}
              >
                <Download className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const showActiveGroup = datasetFilter === 'all' || datasetFilter === 'active';
  const showArchivedGroup = datasetFilter === 'all' || datasetFilter === 'archived_legacy';

  return (
    <div className="space-y-6">
      {/* HEADER BAR & FILTER CONTROLS */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Building2 className="w-5 h-5 text-amber-400" />
              <h3 className="font-extrabold text-base text-white">
                {labels.headerTitle}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {activeChurches.length}{' '}
              {isEn ? 'active' : isFr ? 'actives' : isEs ? 'activas' : 'aktif'} •{' '}
              {archivedLegacyChurches.length}{' '}
              {isEn
                ? 'archived or legacy'
                : isFr
                ? 'archivées ou anciennes'
                : isEs
                ? 'archivadas o legado'
                : 'achive oswa ansyen modèl'}
            </p>
          </div>

          {/* Search Bar & Refresh */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={labels.searchPlaceholder}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="button"
              id="btn-dev-refresh-churches"
              onClick={handleRefreshChurches}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              title={labels.refreshTooltip}
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Super Developer Cloud Write Authorization Banner */}
        {!isSuperDevCloudReady && (
          <div
            id="dev-churches-superdev-auth-banner"
            className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0 space-y-0.5">
                <p className="font-bold text-white">
                  {isEn
                    ? 'Super Developer Google authentication required for Firestore writes'
                    : isFr
                    ? 'Authentification Google Propriétaire requise pour écrire sur Firestore'
                    : isEs
                    ? 'Autenticación Google de Propietario requerida para escribir en Firestore'
                    : 'Koneksyon Google Super Dev egzije pou ekri sou Firestore'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {activeAuthEmail
                    ? isEn
                      ? `Current Firebase session: ${activeAuthEmail} (not the verified Super Developer account).`
                      : `Sesyon Firebase aktyèl la se: ${activeAuthEmail} (sa pa kont Google Super Dev la).`
                    : isEn
                    ? 'Opening this panel with the Master PIN unlocks the UI only. Connect your verified Super Developer Google account to authorize Firestore changes.'
                    : 'Kòd PIN nan ouvri panèl la lokalman sèlman. Konekte kont Google Super Dev ou a (charlesjj3186@gmail.com) pou Firestore aksepte konfimasyon yo.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-dev-churches-connect-superdev-google"
              disabled={isConnectingSuperDev}
              onClick={handleConnectSuperDevForChurches}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap transition-colors"
            >
              {isConnectingSuperDev ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>
                {isConnectingSuperDev
                  ? isEn ? 'Connecting...' : 'Ap konekte...'
                  : isEn ? 'Connect Super Dev (Google)' : 'Konekte Kont Super Dev (Google)'}
              </span>
            </button>
          </div>
        )}

        {/* Dataset Group Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setDatasetFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
              datasetFilter === 'all'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span>{labels.filterAll}</span>
            <span className="font-mono text-[11px] opacity-80">{filteredChurches.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setDatasetFilter('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
              datasetFilter === 'active'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span>{labels.filterActive}</span>
            <span className="font-mono text-[11px] opacity-80">{activeChurches.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setDatasetFilter('archived_legacy')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
              datasetFilter === 'archived_legacy'
                ? 'bg-slate-200 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span>{labels.filterArchived}</span>
            <span className="font-mono text-[11px] opacity-80">{archivedLegacyChurches.length}</span>
          </button>

          {archivedLegacyChurches.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const count = migrateAllChurchesToActiveCurrentModel();
                if (onRefreshChurches) onRefreshChurches();
                toast.success(
                  isEn
                    ? 'All Churches Upgraded to Active Model'
                    : 'Tout Legliz Konvèti nan Modèl Aktif ✓',
                  isEn
                    ? `${count || archivedLegacyChurches.length} church(es) migrated to the current active schema.`
                    : `${count || archivedLegacyChurches.length} legliz pase sou nouvo modèl aktif la epi senkronize.`
                );
              }}
              className="ml-auto px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {isEn
                  ? 'Migrate All to Current Active Model'
                  : 'Konvèti Tout nan Nouvo Modèl Aktif'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* EMPTY OVERALL STATE */}
      {filteredChurches.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0B1120] border border-slate-800 text-slate-400 space-y-2">
          <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <div className="font-bold text-sm text-white">{labels.noMatchTitle}</div>
          <p className="text-xs">{labels.noMatchDesc}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: ACTIVE CHURCHES */}
          {showActiveGroup && (
            <section aria-label={labels.activeSectionTitle} className="space-y-3.5">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-white">
                        {labels.activeSectionTitle}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                        {activeChurches.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{labels.activeSectionDesc}</p>
                  </div>
                </div>
              </div>

              {activeChurches.length === 0 ? (
                <div className="p-8 text-center rounded-3xl bg-[#0B1120] border border-slate-800/80 text-slate-400 text-xs">
                  {labels.noMatchDesc}
                </div>
              ) : (
                <div className="space-y-4">
                  {activeChurches.map(({ church, reason }) =>
                    renderChurchCard(church, reason, false)
                  )}
                </div>
              )}
            </section>
          )}

          {/* SECTION 2: ARCHIVED & LEGACY CHURCHES */}
          {showArchivedGroup && (archivedLegacyChurches.length > 0 || datasetFilter === 'archived_legacy') && (
            <section aria-label={labels.archivedSectionTitle} className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2.5">
                  <Archive className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-200">
                        {labels.archivedSectionTitle}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] font-bold">
                        {archivedLegacyChurches.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{labels.archivedSectionDesc}</p>
                  </div>
                </div>

                {datasetFilter === 'all' && (
                  <button
                    type="button"
                    onClick={() => setShowArchivedSection((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <span>
                      {showArchivedSection
                        ? isEn ? 'Collapse' : isFr ? 'Réduire' : isEs ? 'Ocultar' : 'Pliye'
                        : isEn ? 'Expand' : isFr ? 'Afficher' : isEs ? 'Mostrar' : 'Montre'}
                    </span>
                    {showArchivedSection ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {(showArchivedSection || datasetFilter === 'archived_legacy') && (
                archivedLegacyChurches.length === 0 ? (
                  <div className="p-8 text-center rounded-3xl bg-[#090E1B] border border-slate-800/70 text-slate-400 text-xs">
                    {isEn
                      ? 'No archived or legacy church datasets.'
                      : isFr
                      ? 'Aucune église archivée ou ancienne.'
                      : isEs
                      ? 'No hay iglesias archivadas ni de legado.'
                      : 'Pa gen okenn legliz achive oswa ansyen modèl.'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {archivedLegacyChurches.map(({ church, reason }) =>
                      renderChurchCard(church, reason, true)
                    )}
                  </div>
                )
              )}
            </section>
          )}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(churchToRevoke)}
        title={isEn ? 'Revoke Church License' : 'Retire Lisans Legliz'}
        message={
          isEn
            ? `Do you want to revoke the license for "${churchToRevoke?.name || ''}"?`
            : `Èske w vle retire lisans legliz "${churchToRevoke?.name || ''}"?`
        }
        itemName={churchToRevoke ? `${churchToRevoke.name} (${churchToRevoke.id})` : undefined}
        confirmButtonText={isEn ? 'Yes, Revoke License' : 'Wi, Retire Lisans'}
        onConfirm={confirmRevokeLicense}
        onClose={() => setChurchToRevoke(null)}
      />
    </div>
  );
};
