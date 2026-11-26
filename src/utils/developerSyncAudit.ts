import { AttendanceRecord, Church } from '../types';
import { getQueuedItems, QueuedAttendance, triggerOfflineSync } from './offlineQueue';
import {
  getPendingOfflineAttendance,
  isDeviceOnline,
  savePendingOfflineAttendance,
  syncPendingOfflineAttendance,
} from './storage';
import { getSuperDeveloperCloudAuthStatus } from './developerStorage';

export type ChurchDatasetGroup = 'active' | 'archived_legacy';
export type ChurchClassificationReason = 'active' | 'archived' | 'legacy_flag' | 'legacy_demo';

export interface ChurchDatasetClassification {
  group: ChurchDatasetGroup;
  reason: ChurchClassificationReason;
}

/**
 * Classifies a church dataset into Active vs. Archived/Legacy.
 * Explicit `status: 'active'` always keeps a church in Active (supporting restoration).
 */
export function classifyChurchDataset(church: Church): ChurchDatasetClassification {
  if (church.status === 'archived') {
    return { group: 'archived_legacy', reason: 'archived' };
  }
  if (church.status === 'active') {
    return { group: 'active', reason: 'active' };
  }
  if (church.isLegacy) {
    return { group: 'archived_legacy', reason: 'legacy_flag' };
  }

  const name = (church.name || '').trim().toLowerCase();
  const code = (church.code || '').trim().toLowerCase();
  const isLegacyDemo =
    Boolean((church as unknown as { isDemo?: boolean }).isDemo) ||
    code === 'demo' ||
    name === 'demo church' ||
    name.includes('tabernacle de l’espoir') ||
    name.includes("tabernacle de l'espoir") ||
    name.includes('eglise de la grâce') ||
    name.includes('eglise de la grace') ||
    name.includes('temple shalom');

  if (isLegacyDemo) {
    return { group: 'archived_legacy', reason: 'legacy_demo' };
  }

  return { group: 'active', reason: 'active' };
}

export interface PendingSyncItemAudit {
  id: string;
  churchId: string;
  churchName: string;
  memberName: string;
  serviceTitle: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  lastError?: string;
  queuedAt: number;
}

export interface PendingSyncAuditSummary {
  totalPendingTasks: number;
  queuedCount: number;
  failedCount: number;
  affectedChurchCount: number;
  pendingByChurch: Record<string, number>;
  items: PendingSyncItemAudit[];
  activeChurchesCount: number;
  archivedLegacyChurchesCount: number;
  isOnline: boolean;
  cloudWriteAuthorized: boolean;
  cloudWriteEmail: string | null;
  checkedAt: string;
}

export function buildPendingSyncAuditSummary(params: {
  indexedDbItems: QueuedAttendance[];
  localStoragePending: AttendanceRecord[];
  allChurches: Church[];
  isOnline: boolean;
  cloudWriteAuthorized: boolean;
  cloudWriteEmail: string | null;
}): PendingSyncAuditSummary {
  const churchMap = new Map<string, Church>();
  let activeChurchesCount = 0;
  let archivedLegacyChurchesCount = 0;

  for (const church of params.allChurches) {
    churchMap.set((church.id || '').toUpperCase(), church);
    if (church.code) {
      churchMap.set(church.code.toUpperCase(), church);
    }
    const classification = classifyChurchDataset(church);
    if (classification.group === 'active') {
      activeChurchesCount++;
    } else {
      archivedLegacyChurchesCount++;
    }
  }

  const deduped = new Map<string, PendingSyncItemAudit>();

  for (const qItem of params.indexedDbItems) {
    if (!qItem || !qItem.record) continue;
    const itemId = qItem.id || qItem.record.id;
    const churchId = (qItem.record.churchId || 'unknown').trim();
    const matchedChurch = churchMap.get(churchId.toUpperCase());
    deduped.set(itemId, {
      id: itemId,
      churchId,
      churchName: matchedChurch?.name || churchId,
      memberName: qItem.record.memberName || qItem.record.memberId || 'Unknown Member',
      serviceTitle: qItem.record.serviceTitle || 'Service',
      status: qItem.status || 'pending',
      retryCount: qItem.retryCount || 0,
      lastError: qItem.lastError,
      queuedAt: qItem.queuedAt || Date.now(),
    });
  }

  for (const lsRecord of params.localStoragePending) {
    if (!lsRecord || !lsRecord.id) continue;
    if (deduped.has(lsRecord.id)) continue;
    const churchId = (lsRecord.churchId || 'unknown').trim();
    const matchedChurch = churchMap.get(churchId.toUpperCase());
    deduped.set(lsRecord.id, {
      id: lsRecord.id,
      churchId,
      churchName: matchedChurch?.name || churchId,
      memberName: lsRecord.memberName || lsRecord.memberId || 'Unknown Member',
      serviceTitle: lsRecord.serviceTitle || 'Service',
      status: 'pending',
      retryCount: 0,
      queuedAt: lsRecord.timestamp ? new Date(lsRecord.timestamp).getTime() || Date.now() : Date.now(),
    });
  }

  const items = Array.from(deduped.values()).sort((a, b) => {
    if (a.status === 'failed' && b.status !== 'failed') return -1;
    if (b.status === 'failed' && a.status !== 'failed') return 1;
    return b.queuedAt - a.queuedAt;
  });

  const pendingByChurch: Record<string, number> = {};
  let failedCount = 0;
  let queuedCount = 0;

  for (const item of items) {
    const cid = item.churchId;
    pendingByChurch[cid] = (pendingByChurch[cid] || 0) + 1;
    if (item.status === 'failed' || item.retryCount > 0) {
      failedCount++;
    } else {
      queuedCount++;
    }
  }

  return {
    totalPendingTasks: items.length,
    queuedCount,
    failedCount,
    affectedChurchCount: Object.keys(pendingByChurch).length,
    pendingByChurch,
    items,
    activeChurchesCount,
    archivedLegacyChurchesCount,
    isOnline: params.isOnline,
    cloudWriteAuthorized: params.cloudWriteAuthorized,
    cloudWriteEmail: params.cloudWriteEmail,
    checkedAt: new Date().toISOString(),
  };
}

export async function collectPendingSyncAudit(
  allChurches: Church[]
): Promise<PendingSyncAuditSummary> {
  const [indexedDbItems, localStoragePending] = await Promise.all([
    getQueuedItems(),
    Promise.resolve(getPendingOfflineAttendance() as AttendanceRecord[]),
  ]);
  const cloudAuth = getSuperDeveloperCloudAuthStatus();

  return buildPendingSyncAuditSummary({
    indexedDbItems,
    localStoragePending: Array.isArray(localStoragePending) ? localStoragePending : [],
    allChurches,
    isOnline: isDeviceOnline(),
    cloudWriteAuthorized: cloudAuth.isAuthorized,
    cloudWriteEmail: cloudAuth.email,
  });
}

export async function executePendingSyncAll(): Promise<{
  syncedCount: number;
  failedCount: number;
}> {
  const beforeIdb = await getQueuedItems();
  const idbResult = await triggerOfflineSync();
  const afterIdb = await getQueuedItems();

  // Any IDB items that disappeared succeeded — make sure localStorage queue also drops them
  const remainingIdbIds = new Set(afterIdb.map((i) => i.id));
  const clearedIdbSet = new Set(
    beforeIdb
      .filter((i) => !remainingIdbIds.has(i.id))
      .map((i) => i.record?.id || i.id)
      .filter(Boolean)
  );

  if (clearedIdbSet.size > 0) {
    const currentLsPending = (getPendingOfflineAttendance() as AttendanceRecord[]) || [];
    const remainingLs = currentLsPending.filter((r) => !clearedIdbSet.has(r.id));
    if (remainingLs.length !== currentLsPending.length) {
      savePendingOfflineAttendance(remainingLs);
    }
  }

  const lsResult = await syncPendingOfflineAttendance();
  const syncedCount = idbResult.synced + (lsResult?.syncedCount || 0);
  const failedCount = Math.max(idbResult.failed, afterIdb.filter((i) => i.status === 'failed').length);

  return { syncedCount, failedCount };
}
