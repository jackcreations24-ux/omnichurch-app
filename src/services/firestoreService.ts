import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  Church,
  Member,
  ServiceSession,
  Announcement,
  AttendanceRecord,
  AnnouncementComment,
  AnnouncementReactionDoc,
} from '../types';

// Collection references
const CHURCHES_COL = 'churches';
const MEMBERS_COL = 'members';
const SERVICES_COL = 'services';
const ANNOUNCEMENTS_COL = 'announcements';
const ATTENDANCE_COL = 'attendances';
const ANNOUNCEMENT_COMMENTS_COL = 'announcement_comments';
const ANNOUNCEMENT_REACTIONS_COL = 'announcement_reactions';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const msg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: msg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (msg.toLowerCase().includes('missing or insufficient permissions')) {
    throw new Error(JSON.stringify(errInfo));
  }
}

/**
 * Remove undefined values recursively so Firestore setDoc / updateDoc never rejects.
 */
function sanitizeForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item));
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      }
    }
    return clean;
  }
  return data;
}

/**
 * Checks if a member document is part of the legacy pre-registered demo mock data.
 * Safe for production: will NEVER flag real members by name.
 */
export function isLegacyDemoMember(m: Partial<Member>): boolean {
  if (!m) return false;
  if ((m as any).isDemo === true) return true;
  const id = (m.id || '').toLowerCase();
  const email = (m.email || '').toLowerCase();
  const churchId = (m.churchId || '').toUpperCase();

  if (
    churchId === 'CH001' &&
    (id.startsWith('m-00') || id === 'm-010' || id.startsWith('demo-')) &&
    (email.includes('@tabernacle-espoir.org') || email.includes('@legiz.org'))
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a service document is part of the legacy pre-registered demo mock data.
 */
export function isLegacyDemoService(s: Partial<ServiceSession>): boolean {
  if (!s) return false;
  if ((s as any).isDemo === true) return true;
  const id = (s.id || '').toLowerCase();
  const churchId = (s.churchId || '').toUpperCase();

  if (
    churchId === 'CH001' &&
    (id.startsWith('srv-00') || id === 'srv-010' || id.startsWith('srv-demo'))
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if an announcement document is part of the legacy pre-registered demo mock data.
 */
export function isLegacyDemoAnnouncement(a: Partial<Announcement>): boolean {
  if (!a) return false;
  if ((a as any).isDemo === true) return true;
  const id = (a.id || '').toLowerCase();
  const churchId = (a.churchId || '').toUpperCase();

  if (
    churchId === 'CH001' &&
    (id.startsWith('ann-00') || id === 'ann-010' || id.startsWith('ann-demo'))
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if an attendance document is part of the legacy pre-registered demo mock data.
 */
export function isLegacyDemoAttendance(att: Partial<AttendanceRecord>): boolean {
  if (!att) return false;
  if ((att as any).isDemo === true) return true;
  const id = (att.id || '').toLowerCase();
  const churchId = (att.churchId || '').toUpperCase();

  if (
    churchId === 'CH001' &&
    (id.startsWith('att-00') || id.startsWith('att-demo'))
  ) {
    return true;
  }

  return false;
}

/**
 * Actively purge legacy mock demo documents from Cloud Firestore (when explicitly invoked by admin/developer).
 * Scoped to CH001 to prevent full-database scans across all tenants.
 */
export async function purgeFirestoreLegacyDemoData(): Promise<void> {
  try {
    const memSnap = await getDocs(query(collection(db, MEMBERS_COL), where('churchId', '==', 'CH001')));
    const srvSnap = await getDocs(query(collection(db, SERVICES_COL), where('churchId', '==', 'CH001')));
    const annSnap = await getDocs(query(collection(db, ANNOUNCEMENTS_COL), where('churchId', '==', 'CH001')));
    const attSnap = await getDocs(query(collection(db, ATTENDANCE_COL), where('churchId', '==', 'CH001')));

    const batch = writeBatch(db);
    let count = 0;

    memSnap.forEach((d) => {
      const data = d.data() as Member;
      if (isLegacyDemoMember(data)) {
        batch.delete(doc(db, MEMBERS_COL, d.id));
        count++;
      }
    });

    srvSnap.forEach((d) => {
      const data = d.data() as ServiceSession;
      if (isLegacyDemoService(data)) {
        batch.delete(doc(db, SERVICES_COL, d.id));
        count++;
      }
    });

    annSnap.forEach((d) => {
      const data = d.data() as Announcement;
      if (isLegacyDemoAnnouncement(data)) {
        batch.delete(doc(db, ANNOUNCEMENTS_COL, d.id));
        count++;
      }
    });

    attSnap.forEach((d) => {
      const data = d.data() as AttendanceRecord;
      if (isLegacyDemoAttendance(data)) {
        batch.delete(doc(db, ATTENDANCE_COL, d.id));
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Purged ${count} legacy demo records from Cloud Firestore.`);
    }
  } catch (err) {
    console.warn('Could not purge Firestore legacy demo items:', err);
  }
}

/**
 * Initialize Firestore data without triggering full-database reads on every client startup.
 */
export async function initializeFirestoreDataIfEmpty(): Promise<void> {
  // No-op on client boot to protect Firestore read quotas.
}

// ----------------- REAL-TIME LISTENERS & QUERIES -----------------

export function subscribeToChurches(callback: (churches: Church[]) => void): Unsubscribe {
  const q = collection(db, CHURCHES_COL);
  return onSnapshot(
    q,
    (snap) => {
      const items: Church[] = [];
      snap.forEach((docSnap) => {
        const c = docSnap.data() as Church;
        if (c && c.id) {
          items.push(c);
        }
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore churches listener error (fallback to local):', err);
    }
  );
}

export function subscribeToMembers(churchId: string, callback: (members: Member[]) => void): Unsubscribe {
  const q = query(collection(db, MEMBERS_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: Member[] = [];
      snap.forEach((docSnap) => {
        const m = docSnap.data() as Member;
        if (m && !isLegacyDemoMember(m)) {
          items.push(m);
        }
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore members listener error:', err);
    }
  );
}

export function subscribeToServices(churchId: string, callback: (services: ServiceSession[]) => void): Unsubscribe {
  const q = query(collection(db, SERVICES_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: ServiceSession[] = [];
      snap.forEach((docSnap) => {
        const s = docSnap.data() as ServiceSession;
        if (s && !isLegacyDemoService(s)) {
          items.push(s);
        }
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore services listener error:', err);
    }
  );
}

export function subscribeToAnnouncements(churchId: string, callback: (announcements: Announcement[]) => void): Unsubscribe {
  const q = query(collection(db, ANNOUNCEMENTS_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: Announcement[] = [];
      snap.forEach((docSnap) => {
        const a = docSnap.data() as Announcement;
        if (a && !isLegacyDemoAnnouncement(a)) {
          items.push(a);
        }
      });
      items.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore announcements listener error:', err);
    }
  );
}

export function subscribeToAttendance(churchId: string, callback: (records: AttendanceRecord[]) => void): Unsubscribe {
  const q = query(collection(db, ATTENDANCE_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: AttendanceRecord[] = [];
      snap.forEach((docSnap) => {
        const att = docSnap.data() as AttendanceRecord;
        if (att && !isLegacyDemoAttendance(att)) {
          items.push(att);
        }
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(items);
    },
    (err) => {
      console.warn('Firestore attendance listener error:', err);
    }
  );
}

export function subscribeToAnnouncementComments(
  churchId: string,
  callback: (comments: AnnouncementComment[]) => void
): Unsubscribe {
  const q = query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: AnnouncementComment[] = [];
      snap.forEach((docSnap) => {
        const c = docSnap.data() as AnnouncementComment;
        if (c && !c.isDemo && !c.id.startsWith('comm_demo') && !c.id.startsWith('demo_')) {
          items.push(c);
        }
      });
      items.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      callback(items);
    },
    (err) => {
      console.warn('Firestore announcement comments listener error:', err);
    }
  );
}

export function subscribeToAnnouncementReactions(
  churchId: string,
  callback: (reactions: AnnouncementReactionDoc[]) => void
): Unsubscribe {
  const q = query(collection(db, ANNOUNCEMENT_REACTIONS_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: AnnouncementReactionDoc[] = [];
      snap.forEach((docSnap) => {
        const r = docSnap.data() as AnnouncementReactionDoc;
        if (r && r.announcementId) {
          items.push(r);
        }
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore announcement reactions listener error:', err);
    }
  );
}

// ----------------- MUTATIONS & QUERIES -----------------

export async function firestoreSaveChurch(church: Church): Promise<void> {
  try {
    const ref = doc(db, CHURCHES_COL, church.id);
    await setDoc(ref, sanitizeForFirestore(church), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CHURCHES_COL}/${church.id}`);
  }
}

export async function firestoreAddMember(member: Member): Promise<void> {
  try {
    const ref = doc(db, MEMBERS_COL, member.id);
    await setDoc(ref, sanitizeForFirestore(member));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${MEMBERS_COL}/${member.id}`);
  }
}

export async function firestoreBatchAddOrUpdateMembers(members: Member[]): Promise<void> {
  if (!members || members.length === 0) return;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < members.length; i += CHUNK_SIZE) {
    const chunk = members.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const m of chunk) {
      const ref = doc(db, MEMBERS_COL, m.id);
      batch.set(ref, sanitizeForFirestore(m), { merge: true });
    }
    await batch.commit();
  }
}

export async function firestoreUpdateMember(member: Member): Promise<void> {
  try {
    const ref = doc(db, MEMBERS_COL, member.id);
    await setDoc(ref, sanitizeForFirestore(member), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MEMBERS_COL}/${member.id}`);
  }
}

export async function firestoreDeleteMember(
  memberId: string,
  churchId?: string,
  memberCode?: string,
  memberName?: string
): Promise<{
  deletedScansCount: number;
  deletedCommentsCount: number;
  deletedReactionsCount: number;
}> {
  let deletedScansCount = 0;
  let deletedCommentsCount = 0;
  let deletedReactionsCount = 0;

  try {
    const cleanMemberId = (memberId || '').trim();
    let resolvedChurchId = (churchId && churchId !== 'ALL' ? churchId.trim() : '') || undefined;
    let resolvedMemberCode = (memberCode || '').trim() || undefined;
    let resolvedFullName = (memberName || '').trim() || undefined;
    let resolvedBarcodeToken: string | undefined;

    try {
      if (cleanMemberId) {
        const memberRef = doc(db, MEMBERS_COL, cleanMemberId);
        const mSnap = await getDoc(memberRef);
        if (mSnap.exists()) {
          const mData = mSnap.data() as Member;
          if (!resolvedChurchId && mData.churchId) resolvedChurchId = mData.churchId;
          if (!resolvedMemberCode && mData.memberId) resolvedMemberCode = mData.memberId;
          if (!resolvedFullName && mData.fullName) resolvedFullName = mData.fullName;
          if (mData.barcodeToken) resolvedBarcodeToken = mData.barcodeToken;
        }
      }
    } catch (fetchErr) {
      console.warn('Could not pre-fetch member details for cascade delete:', fetchErr);
    }

    const memberDocRefsToDelete = new Set<string>();
    if (cleanMemberId) memberDocRefsToDelete.add(cleanMemberId);
    if (resolvedMemberCode) memberDocRefsToDelete.add(resolvedMemberCode);

    try {
      const memCol = collection(db, MEMBERS_COL);
      const qMem = resolvedChurchId ? query(memCol, where('churchId', '==', resolvedChurchId)) : memCol;
      const memSnap = await getDocs(qMem);
      memSnap.forEach((d) => {
        const data = d.data() as Member;
        const matchId = data.id === cleanMemberId || (resolvedMemberCode && data.id === resolvedMemberCode);
        const matchCode = data.memberId === cleanMemberId || (resolvedMemberCode && data.memberId === resolvedMemberCode);
        const matchBarcode = resolvedBarcodeToken && data.barcodeToken === resolvedBarcodeToken;
        const matchName =
          resolvedFullName &&
          data.fullName &&
          data.fullName.trim().toLowerCase() === resolvedFullName.trim().toLowerCase();
        if (
          matchId ||
          matchCode ||
          matchBarcode ||
          matchName ||
          d.id === cleanMemberId ||
          (resolvedMemberCode && d.id === resolvedMemberCode)
        ) {
          memberDocRefsToDelete.add(d.id);
        }
      });
    } catch (searchErr) {
      console.warn('Error querying members collection for delete:', searchErr);
    }

    for (const docId of memberDocRefsToDelete) {
      try {
        await deleteDoc(doc(db, MEMBERS_COL, docId));
      } catch (delErr) {
        console.warn(`Error deleting member doc ${docId}:`, delErr);
      }
    }

    try {
      const attCol = collection(db, ATTENDANCE_COL);
      const qAtt = resolvedChurchId ? query(attCol, where('churchId', '==', resolvedChurchId)) : attCol;
      const attSnap = await getDocs(qAtt);
      if (!attSnap.empty) {
        const toDeleteDocs: any[] = [];
        attSnap.forEach((d) => {
          const data = d.data() as any;
          const matchDbId = data.memberDbId === cleanMemberId;
          const matchMemberId =
            data.memberId === cleanMemberId || (resolvedMemberCode && data.memberId === resolvedMemberCode);
          const matchBarcode = resolvedBarcodeToken && data.barcodeToken === resolvedBarcodeToken;
          const matchName =
            resolvedFullName &&
            data.memberName &&
            data.memberName.trim().toLowerCase() === resolvedFullName.trim().toLowerCase();
          if (matchDbId || matchMemberId || matchBarcode || matchName) {
            toDeleteDocs.push(d.ref);
          }
        });
        for (let i = 0; i < toDeleteDocs.length; i += 400) {
          const batch = writeBatch(db);
          const slice = toDeleteDocs.slice(i, i + 400);
          slice.forEach((r) => batch.delete(r));
          await batch.commit();
        }
        deletedScansCount = toDeleteDocs.length;
      }
    } catch (attErr) {
      console.warn('Firestore cascade delete attendance error:', attErr);
    }

    try {
      const commCol = collection(db, ANNOUNCEMENT_COMMENTS_COL);
      const qComm = resolvedChurchId ? query(commCol, where('churchId', '==', resolvedChurchId)) : commCol;
      const commSnap = await getDocs(qComm);
      if (!commSnap.empty) {
        const toDeleteDocs: any[] = [];
        commSnap.forEach((d) => {
          const data = d.data() as any;
          const matchAuthor =
            resolvedFullName &&
            data.author &&
            data.author.trim().toLowerCase() === resolvedFullName.trim().toLowerCase();
          const matchId =
            data.authorMemberId === cleanMemberId ||
            data.memberId === cleanMemberId ||
            (resolvedMemberCode && data.memberId === resolvedMemberCode);
          if (matchAuthor || matchId) {
            toDeleteDocs.push(d.ref);
          }
        });
        for (let i = 0; i < toDeleteDocs.length; i += 400) {
          const batch = writeBatch(db);
          const slice = toDeleteDocs.slice(i, i + 400);
          slice.forEach((r) => batch.delete(r));
          await batch.commit();
        }
        deletedCommentsCount = toDeleteDocs.length;
      }
    } catch (commErr) {
      console.warn('Firestore cascade delete comments error:', commErr);
    }

    try {
      const reactCol = collection(db, ANNOUNCEMENT_REACTIONS_COL);
      const qReact = resolvedChurchId ? query(reactCol, where('churchId', '==', resolvedChurchId)) : reactCol;
      const reactSnap = await getDocs(qReact);
      if (!reactSnap.empty) {
        const toDeleteDocs: any[] = [];
        reactSnap.forEach((d) => {
          const data = d.data() as any;
          const matchMember =
            data.memberId === cleanMemberId || (resolvedMemberCode && data.memberId === resolvedMemberCode);
          if (matchMember) {
            toDeleteDocs.push(d.ref);
          }
        });
        for (let i = 0; i < toDeleteDocs.length; i += 400) {
          const batch = writeBatch(db);
          const slice = toDeleteDocs.slice(i, i + 400);
          slice.forEach((r) => batch.delete(r));
          await batch.commit();
        }
        deletedReactionsCount = toDeleteDocs.length;
      }
    } catch (reactErr) {
      console.warn('Firestore cascade delete reactions error:', reactErr);
    }
  } catch (err) {
    console.warn('Firestore deleteMember error:', err);
  }

  return { deletedScansCount, deletedCommentsCount, deletedReactionsCount };
}

export async function firestoreBatchDeleteMembers(
  memberIds: string[],
  churchId?: string
): Promise<{ deletedMembersCount: number }> {
  let count = 0;
  for (const mid of memberIds) {
    try {
      await firestoreDeleteMember(mid, churchId);
      count++;
    } catch (err) {
      console.warn(`Error batch deleting member ${mid}:`, err);
    }
  }
  return { deletedMembersCount: count };
}

export async function firestoreAddService(service: ServiceSession): Promise<void> {
  try {
    const ref = doc(db, SERVICES_COL, service.id);
    await setDoc(ref, sanitizeForFirestore(service));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${SERVICES_COL}/${service.id}`);
  }
}

export async function firestoreUpdateService(serviceId: string, data: Partial<ServiceSession>): Promise<void> {
  try {
    const ref = doc(db, SERVICES_COL, serviceId);
    await updateDoc(ref, sanitizeForFirestore(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SERVICES_COL}/${serviceId}`);
  }
}

export async function firestoreDeleteService(serviceId: string): Promise<void> {
  try {
    const ref = doc(db, SERVICES_COL, serviceId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SERVICES_COL}/${serviceId}`);
  }
}

export async function firestoreAddAnnouncement(ann: Announcement): Promise<void> {
  try {
    const ref = doc(db, ANNOUNCEMENTS_COL, ann.id);
    await setDoc(ref, sanitizeForFirestore(ann));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ANNOUNCEMENTS_COL}/${ann.id}`);
  }
}

export async function firestoreUpdateAnnouncement(annId: string, data: Partial<Announcement>): Promise<void> {
  try {
    const ref = doc(db, ANNOUNCEMENTS_COL, annId);
    await updateDoc(ref, sanitizeForFirestore(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ANNOUNCEMENTS_COL}/${annId}`);
  }
}

export async function firestoreDeleteAnnouncement(annId: string): Promise<void> {
  const ref = doc(db, ANNOUNCEMENTS_COL, annId);
  await deleteDoc(ref);
  try {
    const commentsSnap = await getDocs(
      query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('announcementId', '==', annId))
    );
    if (!commentsSnap.empty) {
      const cBatch = writeBatch(db);
      commentsSnap.forEach((d) => cBatch.delete(d.ref));
      await cBatch.commit();
    }
    const reactionsSnap = await getDocs(
      query(collection(db, ANNOUNCEMENT_REACTIONS_COL), where('announcementId', '==', annId))
    );
    if (!reactionsSnap.empty) {
      const rBatch = writeBatch(db);
      reactionsSnap.forEach((d) => rBatch.delete(d.ref));
      await rBatch.commit();
    }
  } catch (e) {
    console.warn('Error cascade deleting announcement interactions:', e);
  }
}

export async function firestoreAddAnnouncementComment(comment: AnnouncementComment): Promise<void> {
  const ref = doc(db, ANNOUNCEMENT_COMMENTS_COL, comment.id);
  await setDoc(ref, sanitizeForFirestore(comment));
}

export async function firestoreDeleteAnnouncementComment(commentId: string): Promise<void> {
  const ref = doc(db, ANNOUNCEMENT_COMMENTS_COL, commentId);
  await deleteDoc(ref);
}

export async function firestoreSetAnnouncementReaction(
  announcementId: string,
  memberId: string,
  churchId: string,
  reaction: string
): Promise<void> {
  const cleanMemberId = memberId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const reactionId = `${announcementId}_${cleanMemberId}`;
  const ref = doc(db, ANNOUNCEMENT_REACTIONS_COL, reactionId);
  const docData: AnnouncementReactionDoc = {
    id: reactionId,
    announcementId,
    churchId,
    memberId,
    reaction,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, sanitizeForFirestore(docData), { merge: true });
}

export async function firestoreRemoveAnnouncementReaction(
  announcementId: string,
  memberId: string
): Promise<void> {
  const cleanMemberId = memberId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const reactionId = `${announcementId}_${cleanMemberId}`;
  const ref = doc(db, ANNOUNCEMENT_REACTIONS_COL, reactionId);
  await deleteDoc(ref);
}

export async function firestoreAddAttendance(record: AttendanceRecord): Promise<void> {
  try {
    const ref = doc(db, ATTENDANCE_COL, record.id);
    await setDoc(ref, sanitizeForFirestore(record));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ATTENDANCE_COL}/${record.id}`);
  }
}

export async function firestoreDeleteAttendance(recordId: string): Promise<void> {
  try {
    const ref = doc(db, ATTENDANCE_COL, recordId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Firestore deleteAttendance error:', err);
  }
}

export async function firestoreBatchDeleteAttendance(recordIds: string[]): Promise<number> {
  if (!recordIds || recordIds.length === 0) return 0;
  let count = 0;
  try {
    for (let i = 0; i < recordIds.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = recordIds.slice(i, i + 400);
      chunk.forEach((id) => {
        batch.delete(doc(db, ATTENDANCE_COL, id));
      });
      await batch.commit();
      count += chunk.length;
    }
  } catch (err) {
    console.warn('Firestore batchDeleteAttendance error:', err);
  }
  return count;
}

export async function firestoreDeleteChurch(churchId: string): Promise<void> {
  try {
    const churchRef = doc(db, CHURCHES_COL, churchId);
    await deleteDoc(churchRef);

    const membersSnap = await getDocs(
      query(collection(db, MEMBERS_COL), where('churchId', '==', churchId))
    );
    const mBatch = writeBatch(db);
    membersSnap.forEach((d) => mBatch.delete(d.ref));
    await mBatch.commit();

    const servicesSnap = await getDocs(
      query(collection(db, SERVICES_COL), where('churchId', '==', churchId))
    );
    const sBatch = writeBatch(db);
    servicesSnap.forEach((d) => sBatch.delete(d.ref));
    await sBatch.commit();

    const annSnap = await getDocs(
      query(collection(db, ANNOUNCEMENTS_COL), where('churchId', '==', churchId))
    );
    const aBatch = writeBatch(db);
    annSnap.forEach((d) => aBatch.delete(d.ref));
    await aBatch.commit();

    const attSnap = await getDocs(
      query(collection(db, ATTENDANCE_COL), where('churchId', '==', churchId))
    );
    const attBatch = writeBatch(db);
    attSnap.forEach((d) => attBatch.delete(d.ref));
    await attBatch.commit();

    const commSnap = await getDocs(
      query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('churchId', '==', churchId))
    );
    if (!commSnap.empty) {
      const cBatch = writeBatch(db);
      commSnap.forEach((d) => cBatch.delete(d.ref));
      await cBatch.commit();
    }

    const reactSnap = await getDocs(
      query(collection(db, ANNOUNCEMENT_REACTIONS_COL), where('churchId', '==', churchId))
    );
    if (!reactSnap.empty) {
      const rBatch = writeBatch(db);
      reactSnap.forEach((d) => rBatch.delete(d.ref));
      await rBatch.commit();
    }

    console.log(`Successfully deleted church ${churchId} and all associated records from Firestore.`);
  } catch (err) {
    console.error(`Error deleting church ${churchId} from Firestore:`, err);
    throw err;
  }
}

export async function firestoreResetAllDatabase(): Promise<void> {
  try {
    const collectionsToClear = [
      CHURCHES_COL,
      MEMBERS_COL,
      SERVICES_COL,
      ANNOUNCEMENTS_COL,
      ATTENDANCE_COL,
      ANNOUNCEMENT_COMMENTS_COL,
      ANNOUNCEMENT_REACTIONS_COL,
    ];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    console.log('Successfully performed full System Reset in Cloud Firestore.');
  } catch (err) {
    console.error('Error in firestoreResetAllDatabase:', err);
    throw err;
  }
}

export async function firestorePurgeTestChurches(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, CHURCHES_COL));
    let deletedCount = 0;
    for (const docSnap of snap.docs) {
      const c = docSnap.data() as Church;
      const name = (c.name || '').toLowerCase();
      const code = (c.code || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      const isTestOrDemo =
        name.includes('tabernacle de l’espoir') ||
        name.includes("tabernacle de l'espoir") ||
        name.includes('eglise de la grâce') ||
        name.includes('eglise de la grace') ||
        name.includes('temple shalom') ||
        name.includes('demo') ||
        name.includes('test') ||
        code === 'demo' ||
        code === 'test' ||
        id === 'ch001' ||
        id === 'ch002' ||
        id === 'ch003';
      if (isTestOrDemo && c.id) {
        await firestoreDeleteChurch(c.id);
        deletedCount++;
      }
    }
    return deletedCount;
  } catch (err) {
    console.error('Error in firestorePurgeTestChurches:', err);
    return 0;
  }
}

export async function firestoreGetChurch(churchId: string): Promise<Church | null> {
  const cleanId = (churchId || '').trim();
  if (!cleanId) return null;
  try {
    const churchRef = doc(db, CHURCHES_COL, cleanId);
    const snap = await getDoc(churchRef);
    if (snap.exists()) {
      return snap.data() as Church;
    }
  } catch (err) {
    console.warn('firestoreGetChurch failed:', err);
  }
  return null;
}

export async function firestoreGetMember(
  memberIdOrToken: string,
  churchId?: string
): Promise<Member | null> {
  const clean = (memberIdOrToken || '').trim();
  if (!clean) return null;
  try {
    const memberRef = doc(db, MEMBERS_COL, clean);
    const snap = await getDoc(memberRef);
    if (snap.exists()) {
      const data = snap.data() as Member;
      if (!churchId || (data.churchId || '').toLowerCase() === (churchId || '').toLowerCase()) {
        return data;
      }
    }
    const q1 = churchId
      ? query(collection(db, MEMBERS_COL), where('churchId', '==', churchId), where('memberId', '==', clean))
      : query(collection(db, MEMBERS_COL), where('memberId', '==', clean));
    const snapQ1 = await getDocs(q1);
    if (!snapQ1.empty) {
      return snapQ1.docs[0].data() as Member;
    }
    const q2 = churchId
      ? query(collection(db, MEMBERS_COL), where('churchId', '==', churchId), where('barcodeToken', '==', clean))
      : query(collection(db, MEMBERS_COL), where('barcodeToken', '==', clean));
    const snapQ2 = await getDocs(q2);
    if (!snapQ2.empty) {
      return snapQ2.docs[0].data() as Member;
    }
  } catch (err) {
    console.warn('firestoreGetMember failed:', err);
  }
  return null;
}

// Compatibility aliases
export const listenToChurchChanges = subscribeToChurches;
export const listenToChurchMembers = subscribeToMembers;
export const listenToChurchServices = subscribeToServices;
export const listenToChurchAttendance = subscribeToAttendance;
export const listenToChurchAnnouncements = subscribeToAnnouncements;
