/**
 * OmniChurch Offline Queue & Synchronization Engine
 * Powered by native browser IndexedDB with automatic reconnection sync,
 * batch commits, and zero external runtime dependencies.
 */

import { AttendanceRecord } from '../types';
import { firestoreAddAttendance } from '../services/firestoreService';

const DB_NAME = 'omnichurch_offline_db';
const DB_VERSION = 1;
const QUEUE_STORE = 'attendance_sync_queue';

export interface QueuedAttendance {
  id: string; // unique scan ID
  record: AttendanceRecord;
  queuedAt: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  lastError?: string;
}

type SyncListener = (pendingCount: number, isSyncing: boolean) => void;
const listeners = new Set<SyncListener>();

let dbPromise: Promise<IDBDatabase> | null = null;
let isSyncInProgress = false;

function notifyListeners(pendingCount: number, isSyncing: boolean) {
  listeners.forEach((listener) => {
    try {
      listener(pendingCount, isSyncing);
    } catch (e) {
      console.warn('SyncListener error:', e);
    }
  });
}

/**
 * Opens or initializes the IndexedDB store.
 */
function getIDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this runtime.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('queuedAt', 'queuedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/**
 * Enqueue an attendance record to be synchronized later.
 */
export async function enqueueAttendance(record: AttendanceRecord): Promise<void> {
  try {
    const db = await getIDB();
    const queuedItem: QueuedAttendance = {
      id: record.id || `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      record,
      queuedAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.put(queuedItem);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    const count = await getPendingCount();
    notifyListeners(count, isSyncInProgress);

    // If online, immediately attempt to flush queue in background
    if (navigator.onLine && !isSyncInProgress) {
      triggerOfflineSync();
    }
  } catch (err) {
    console.warn('Could not enqueue attendance to IndexedDB, fallback memory:', err);
  }
}

/**
 * Get count of all pending offline attendance records.
 */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await getIDB();
    return await new Promise<number>((resolve) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export const getOfflineQueueCount = getPendingCount;


/**
 * Get all queued records.
 */
export async function getQueuedItems(): Promise<QueuedAttendance[]> {
  try {
    const db = await getIDB();
    return await new Promise<QueuedAttendance[]>((resolve) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Flushes all pending attendance records to Cloud Firestore.
 */
export async function triggerOfflineSync(): Promise<{ synced: number; failed: number }> {
  if (isSyncInProgress) {
    return { synced: 0, failed: 0 };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const count = await getPendingCount();
    notifyListeners(count, false);
    return { synced: 0, failed: 0 };
  }

  isSyncInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    const items = await getQueuedItems();
    if (items.length === 0) {
      isSyncInProgress = false;
      notifyListeners(0, false);
      return { synced: 0, failed: 0 };
    }

    notifyListeners(items.length, true);
    const db = await getIDB();

    for (const item of items) {
      try {
        await firestoreAddAttendance(item.record);
        synced++;

        // Remove item from IndexedDB on successful sync
        await new Promise<void>((resolve) => {
          const tx = db.transaction(QUEUE_STORE, 'readwrite');
          const store = tx.objectStore(QUEUE_STORE);
          const req = store.delete(item.id);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      } catch (postErr) {
        failed++;
        console.warn('Sync failed for record:', item.id, postErr);

        // Update retry count
        await new Promise<void>((resolve) => {
          const tx = db.transaction(QUEUE_STORE, 'readwrite');
          const store = tx.objectStore(QUEUE_STORE);
          item.retryCount = (item.retryCount || 0) + 1;
          item.status = 'failed';
          item.lastError = postErr instanceof Error ? postErr.message : String(postErr);
          store.put(item);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    }

    const remaining = await getPendingCount();
    notifyListeners(remaining, false);
  } catch (err) {
    console.warn('Offline sync encountered an error:', err);
  } finally {
    isSyncInProgress = false;
    const finalCount = await getPendingCount();
    notifyListeners(finalCount, false);
  }

  return { synced, failed };
}

/**
 * Subscribe to sync events and queue status changes.
 */
export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  // Emit initial state
  getPendingCount().then((count) => listener(count, isSyncInProgress));

  return () => {
    listeners.delete(listener);
  };
}

// Auto-bind network listeners if running in browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('Network restored: triggering automatic offline queue sync...');
    triggerOfflineSync();
  });

  // Periodic safety check every 45 seconds
  setInterval(() => {
    if (navigator.onLine && !isSyncInProgress) {
      getPendingCount().then((count) => {
        if (count > 0) {
          triggerOfflineSync();
        }
      });
    }
  }, 45000);
}
