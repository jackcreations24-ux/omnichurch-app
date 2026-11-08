/**
 * OmniChurch Unified Reactive Store
 * Powered by React 19 useSyncExternalStore.
 * Provides synchronized state across all app screens with zero lag and zero extra bundle weight.
 */

import { useSyncExternalStore } from 'react';
import { Church, Member, ServiceSession, Announcement, AttendanceRecord } from '../types';

interface ChurchStoreState {
  currentChurch: Church | null;
  allChurches: Church[];
  members: Member[];
  services: ServiceSession[];
  announcements: Announcement[];
  attendanceRecords: AttendanceRecord[];
  activeService: ServiceSession | null;
  isOnline: boolean;
  offlineQueueCount: number;
  lastUpdated: number;
}

let state: ChurchStoreState = {
  currentChurch: null,
  allChurches: [],
  members: [],
  services: [],
  announcements: [],
  attendanceRecords: [],
  activeService: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  offlineQueueCount: 0,
  lastUpdated: Date.now(),
};

const listeners = new Set<() => void>();

function emitChange() {
  state = { ...state, lastUpdated: Date.now() };
  listeners.forEach((listener) => listener());
}

export const churchStore = {
  getSnapshot(): ChurchStoreState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setCurrentChurch(church: Church | null) {
    state = { ...state, currentChurch: church };
    emitChange();
  },

  setAllChurches(churches: Church[]) {
    state = { ...state, allChurches: churches };
    emitChange();
  },

  setMembers(members: Member[]) {
    state = { ...state, members };
    emitChange();
  },

  setServices(services: ServiceSession[]) {
    const active = services.find((s) => s.isOpenForAttendance) || null;
    state = { ...state, services, activeService: active };
    emitChange();
  },

  setAnnouncements(announcements: Announcement[]) {
    state = { ...state, announcements };
    emitChange();
  },

  setAttendanceRecords(records: AttendanceRecord[]) {
    state = { ...state, attendanceRecords: records };
    emitChange();
  },

  setOnlineStatus(isOnline: boolean) {
    state = { ...state, isOnline };
    emitChange();
  },

  setOfflineQueueCount(count: number) {
    state = { ...state, offlineQueueCount: count };
    emitChange();
  },
};

/**
 * Hook to consume the reactive store with selector optimization.
 */
export function useChurchStore<T>(selector: (state: ChurchStoreState) => T): T {
  return useSyncExternalStore(
    churchStore.subscribe,
    () => selector(churchStore.getSnapshot()),
    () => selector(churchStore.getSnapshot())
  );
}
