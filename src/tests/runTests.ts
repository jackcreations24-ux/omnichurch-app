/**
 * OmniChurch Comprehensive Automated Test Suite
 * Executable directly via tsx without external test dependencies.
 * Validates Security, Multi-Tenant Isolation, Attendance & Lateness Logic,
 * Tombstone Resurrection Prevention, QR Token Decoding, and Data Integrity Safeguards.
 */

import {
  hashAdminPasscodeSync,
  verifyAdminPasscode,
  isPasscodeHashed,
} from '../utils/cryptoSecurity';
import {
  isLegacyDemoMember,
  isLegacyDemoService,
  isLegacyDemoAnnouncement,
} from '../services/firestoreService';

// Mock localStorage for Node.js test execution
const memoryStore = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => (memoryStore.has(key) ? memoryStore.get(key)! : null),
    setItem: (key: string, value: string) => {
      memoryStore.set(key, String(value));
    },
    removeItem: (key: string) => {
      memoryStore.delete(key);
    },
    clear: () => {
      memoryStore.clear();
    },
  };
}

let passedTests = 0;
let failedTests = 0;
const testResults: { name: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passedTests++;
    testResults.push({ name, status: 'PASS' });
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    failedTests++;
    const errorMsg = err instanceof Error ? err.message : String(err);
    testResults.push({ name, status: 'FAIL', error: errorMsg });
    console.error(`  ✗ FAIL: ${name} -> ${errorMsg}`);
  }
}

async function main() {
  if (typeof process !== 'undefined' && process.env) {
    process.env.OMNICHURCH_TEST_MODE = '1';
  }
  const {
    markMemberAsDeleted,
    isMemberMarkedDeleted,
    markServiceAsDeleted,
    isServiceMarkedDeleted,
    markAnnouncementAsDeleted,
    isAnnouncementMarkedDeleted,
    markAttendanceAsDeleted,
    isAttendanceMarkedDeleted,
    getMemberVerificationUrl,
  } = await import('../utils/storage');

  console.log('\n======================================================');
  console.log('   OMNICHURCH AUTOMATED REGRESSION & LOGIC TEST SUITE');
  console.log('======================================================\n');

  // -----------------------------------------------------------------
  // SUITE 1: CRYPTOGRAPHIC SECURITY & ZERO-KNOWLEDGE ADMIN PASSCODES
  // -----------------------------------------------------------------
  console.log('--- Suite 1: Cryptographic Security & Passcode Hashing ---');

  await runTest('hashAdminPasscodeSync creates properly formatted SHA-256 hash', () => {
    const hash = hashAdminPasscodeSync('7788', 'CH_GONAIVES_01');
    assert(hash.startsWith('sha256:v1:'), 'Hash must start with sha256:v1: prefix');
    assert(hash.length > 30, 'Hash must be long enough');
    assert(isPasscodeHashed(hash), 'isPasscodeHashed should return true for generated hash');
  });

  await runTest('verifyAdminPasscode accepts matching raw passcode for hashed store', async () => {
    const rawPin = '9912';
    const churchId = 'CH_CAP_02';
    const hash = hashAdminPasscodeSync(rawPin, churchId);

    const result = await verifyAdminPasscode(rawPin, hash, churchId);
    assert(result.matches === true, 'Verification should match correct PIN');
    assert(result.needsUpgrade === false, 'Already hashed passcode should not need upgrade');
  });

  await runTest('verifyAdminPasscode rejects incorrect raw passcode', async () => {
    const correctPin = '1234';
    const wrongPin = '4321';
    const churchId = 'CH_LEOGANE_03';
    const hash = hashAdminPasscodeSync(correctPin, churchId);

    const result = await verifyAdminPasscode(wrongPin, hash, churchId);
    assert(result.matches === false, 'Verification must reject wrong PIN');
  });

  await runTest('verifyAdminPasscode supports legacy plain text and flags needsUpgrade', async () => {
    const plainPin = '8822';
    const churchId = 'CH_DELMAS_04';

    const result = await verifyAdminPasscode(plainPin, plainPin, churchId);
    assert(result.matches === true, 'Verification should match legacy plain text PIN');
    assert(result.needsUpgrade === true, 'Legacy plain text PIN must be flagged for auto-upgrade');
  });

  await runTest('hash is salt-isolated across different churches for identical PINs', () => {
    const pin = '4321';
    const hashChurchA = hashAdminPasscodeSync(pin, 'CHURCH_ALPHA');
    const hashChurchB = hashAdminPasscodeSync(pin, 'CHURCH_BETA');
    assert(hashChurchA !== hashChurchB, 'Hashes must differ between different churches to prevent rainbow-table attacks');
  });

  // -----------------------------------------------------------------
  // SUITE 2: SAFEGUARDING REAL HAITIAN MEMBERS & DATA INTEGRITY
  // -----------------------------------------------------------------
  console.log('\n--- Suite 2: Real Member & Data Safeguards ---');

  await runTest('Real members with common Haitian names are NEVER filtered as demo', () => {
    const realHaitianMembers = [
      { id: 'usr-1001', churchId: 'CH_JACMEL_01', fullName: 'Emmanuel Charles', email: 'emmanuel@gmail.com' },
      { id: 'usr-1002', churchId: 'CH_PETION_02', fullName: 'Esther Lindor', email: 'esther@outlook.com' },
      { id: 'usr-1003', churchId: 'CH_PORTAUPRINCE_03', fullName: 'Jean-Claude Dorval', email: 'jcdorval@yahoo.com' },
      { id: 'usr-1004', churchId: 'CH_GONAIVES_04', fullName: 'Roseline Alcime', email: 'roseline@gmail.com' },
      { id: 'usr-1005', churchId: 'CH_JEREMIE_05', fullName: 'David Saint-Louis', email: 'david@live.com' },
    ];

    for (const member of realHaitianMembers) {
      const isDemo = isLegacyDemoMember(member);
      assert(!isDemo, `Real member ${member.fullName} in church ${member.churchId} must NOT be flagged as demo!`);
    }
  });

  await runTest('Hardcoded demo seed fixture belonging to CH001 is correctly identified as demo', () => {
    const demoFixture = {
      id: 'm-001',
      churchId: 'CH001',
      fullName: 'Jean-Claude Dorval',
      email: 'jean-claude@tabernacle-espoir.org',
    };
    assert(isLegacyDemoMember(demoFixture) === true, 'Default CH001 mock fixture must be flagged as demo');
  });

  await runTest('Real church services titled "Jeûne & prière" are NEVER flagged as demo', () => {
    const realService = {
      id: 'srv-prod-99',
      churchId: 'CH_SAINT_MARC',
      title: 'Jeûne & prière pou peyi d Ayiti',
      preacherOrLeader: 'Pastè Jean-Claude Dorval',
    };
    assert(isLegacyDemoService(realService) === false, 'Real church service must not be flagged as demo');
  });

  await runTest('Real announcements titled "Klas batèm" are NEVER flagged as demo', () => {
    const realAnnouncement = {
      id: 'ann-prod-55',
      churchId: 'CH_CARREFOUR',
      title: 'Klas batèm pou jèn yo',
      content: 'Klas batèm ap fèt chak dimanch maten.',
    };
    assert(isLegacyDemoAnnouncement(realAnnouncement) === false, 'Real announcement must not be flagged as demo');
  });

  // -----------------------------------------------------------------
  // SUITE 3: TOMBSTONE PROTECTION AGAINST GHOST RECORD RESURRECTION
  // -----------------------------------------------------------------
  console.log('\n--- Suite 3: Tombstone Protection Against Ghost Record Resurrection ---');

  await runTest('Deleted member is tracked by tombstone and blocked from resurrection', () => {
    const sampleMember: any = {
      id: 'mem-del-101',
      churchId: 'CH_GONAIVES_01',
      memberId: 'GON-2026-0101',
      fullName: 'Marc-Antoine Pierre',
      barcodeToken: 'CHURCH:CH_GONAIVES_01|MEMBER:GON-2026-0101',
    };
    assert(isMemberMarkedDeleted(sampleMember) === false, 'Fresh member is not marked deleted');
    markMemberAsDeleted(sampleMember);
    assert(isMemberMarkedDeleted(sampleMember) === true, 'Deleted member must be marked deleted by tombstone');
  });

  await runTest('Deleted service, announcement, and attendance records are tracked by tombstones', () => {
    assert(isServiceMarkedDeleted('srv-del-201') === false, 'Fresh service not deleted');
    markServiceAsDeleted('srv-del-201');
    assert(isServiceMarkedDeleted('srv-del-201') === true, 'Deleted service must be blocked by tombstone');

    assert(isAnnouncementMarkedDeleted('ann-del-301') === false, 'Fresh announcement not deleted');
    markAnnouncementAsDeleted('ann-del-301');
    assert(isAnnouncementMarkedDeleted('ann-del-301') === true, 'Deleted announcement must be blocked by tombstone');

    assert(isAttendanceMarkedDeleted('att-del-401') === false, 'Fresh attendance not deleted');
    markAttendanceAsDeleted('att-del-401');
    assert(isAttendanceMarkedDeleted('att-del-401') === true, 'Deleted attendance must be blocked by tombstone');
  });

  // -----------------------------------------------------------------
  // SUITE 4: ATTENDANCE & LATENESS CALCULATION LOGIC
  // -----------------------------------------------------------------
  console.log('\n--- Suite 4: Attendance & Lateness Math Verification ---');

  function calculateAttendanceLateness(
    serviceStartTime: string, // "09:00"
    serviceDate: string,      // "2026-11-07"
    scanTime: Date,
    toleranceMinutes: number = 15
  ): { status: 'on_time' | 'late'; lateMinutes: number } {
    const [h, m] = serviceStartTime.split(':').map((v) => parseInt(v, 10));
    const [year, month, day] = serviceDate.split('-').map((v) => parseInt(v, 10));
    const scheduled = new Date(year, month - 1, day, h, m, 0, 0);

    const diffMs = scanTime.getTime() - scheduled.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins > toleranceMinutes) {
      return { status: 'late', lateMinutes: diffMins };
    }
    return { status: 'on_time', lateMinutes: 0 };
  }

  await runTest('Arrival before service start time is ON_TIME', () => {
    const scan = new Date(2026, 10, 7, 8, 50); // 8:50 AM
    const res = calculateAttendanceLateness('09:00', '2026-11-07', scan, 15);
    assert(res.status === 'on_time', 'Arrival 10 mins before start should be on_time');
    assert(res.lateMinutes === 0, 'Late minutes should be 0');
  });

  await runTest('Arrival within tolerance window (e.g. 12 mins after start) is ON_TIME', () => {
    const scan = new Date(2026, 10, 7, 9, 12); // 9:12 AM (12 min after 9:00, tolerance 15)
    const res = calculateAttendanceLateness('09:00', '2026-11-07', scan, 15);
    assert(res.status === 'on_time', 'Arrival within tolerance window must be on_time');
    assert(res.lateMinutes === 0, 'Late minutes within tolerance must be 0');
  });

  await runTest('Arrival exceeding tolerance window (e.g. 25 mins after start) is LATE', () => {
    const scan = new Date(2026, 10, 7, 9, 25); // 9:25 AM (25 min after 9:00, tolerance 15)
    const res = calculateAttendanceLateness('09:00', '2026-11-07', scan, 15);
    assert(res.status === 'late', 'Arrival exceeding tolerance must be marked late');
    assert(res.lateMinutes === 25, `Expected 25 late minutes, got ${res.lateMinutes}`);
  });

  // -----------------------------------------------------------------
  // SUITE 5: MULTI-TENANT ISOLATION & QR PAYLOAD VERIFICATION
  // -----------------------------------------------------------------
  console.log('\n--- Suite 5: Multi-Tenant QR Token & Payload Security ---');

  await runTest('QR verification URL generation preserves member identity and churchId', () => {
    const sampleMember: any = {
      id: 'mem-qr-01',
      churchId: 'CH_CAP_01',
      memberId: 'CAP-2026-0009',
      fullName: 'Samuel Joseph',
      department: 'Koral',
      role: 'Chantre',
      status: 'active',
      barcodeToken: 'CHURCH:CH_CAP_01|MEMBER:CAP-2026-0009',
    };
    const url = getMemberVerificationUrl(sampleMember);
    assert(url.includes('verify=1'), 'Verification URL must include verify=1 flag');
    assert(url.includes('church=CH_CAP_01'), 'Verification URL must include churchId');
    assert(url.includes('member=CAP-2026-0009'), 'Verification URL must include memberId');
  });

  function checkScanTenantEligibility(
    scannedTokenChurchId: string | undefined,
    currentChurchId: string,
    currentChurchCode: string
  ): boolean {
    const validIdentifiers = new Set([
      currentChurchId.trim().toUpperCase(),
      currentChurchCode.trim().toUpperCase(),
    ]);

    if (!scannedTokenChurchId) {
      return true;
    }
    return validIdentifiers.has(scannedTokenChurchId.trim().toUpperCase());
  }

  await runTest('Token matching church ID or church code is accepted', () => {
    assert(checkScanTenantEligibility('CH_OK_01', 'CH_OK_01', 'CHO') === true, 'Direct match allowed');
    assert(checkScanTenantEligibility('CHO', 'CH_OK_01', 'CHO') === true, 'Church code match allowed');
  });

  await runTest('Token belonging to another church is STRICTLY DENIED', () => {
    const foreignChurchAttempt = checkScanTenantEligibility('CH_OTHER_CHURCH', 'CH_MY_CHURCH', 'CMC');
    assert(foreignChurchAttempt === false, 'Foreign church QR code must be blocked');
  });

  // -----------------------------------------------------------------
  // SUITE 6: ABSENCE CALCULATION GUARD (NO SERVICE ACTIVE / CONDUCTED)
  // -----------------------------------------------------------------
  console.log('\n--- Suite 6: Absence Calculation Strictly Requires Active or Conducted Service ---');

  const {
    STORAGE_KEYS,
    hasServiceConductedSession,
    isServiceWithin24hReportWindow,
    syncServiceAbsencesAutomatically,
    getServiceHistoryStats,
  } = await import('../utils/storage');

  await runTest('Scheduled past service never opened produces ZERO absences and purges stale auto-absences', () => {
    const testChurchId = 'CH_ABSENCE_TEST_01';
    const unconductedService: any = {
      id: 'srv-unconducted-1',
      churchId: testChurchId,
      title: 'Kilt Dimanch Maten (Pa t louvri)',
      category: 'sunday_worship',
      date: '2020-01-05',
      startTime: '09:00',
      endTime: '11:30',
      isOpenForAttendance: false,
      wasOpenedForAttendance: false,
      isPermanentlyEnded: true,
    };

    const testMembers: any[] = [
      {
        id: 'm-abs-1',
        churchId: testChurchId,
        memberId: 'ABS-001',
        fullName: 'Jean Baptiste',
        role: 'member',
        status: 'active',
        barcodeToken: 'CHURCH:CH_ABSENCE_TEST_01|MEMBER:ABS-001',
        createdAt: '2020-01-01T00:00:00Z',
      },
      {
        id: 'm-abs-2',
        churchId: testChurchId,
        memberId: 'ABS-002',
        fullName: 'Marie Pierre',
        role: 'member',
        status: 'active',
        barcodeToken: 'CHURCH:CH_ABSENCE_TEST_01|MEMBER:ABS-002',
        createdAt: '2020-01-01T00:00:00Z',
      },
    ];

    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([unconductedService]));
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(testMembers));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    // Seed a stale auto-generated absence left behind by the old bug
    localStorage.setItem(
      STORAGE_KEYS.ABSENCES,
      JSON.stringify([
        {
          id: 'abs-srv-unconducted-1-m-abs-1',
          churchId: testChurchId,
          serviceId: 'srv-unconducted-1',
          serviceCategory: 'sunday_worship',
          serviceTitle: 'Kilt Dimanch Maten (Pa t louvri)',
          serviceDate: '2020-01-05',
          memberId: 'ABS-001',
          memberDbId: 'm-abs-1',
          memberName: 'Jean Baptiste',
          status: 'absent',
          recordedAt: '2020-01-05T12:00:00Z',
          autoGenerated: true,
        },
      ])
    );

    assert(hasServiceConductedSession(unconductedService, 0) === false, 'Unopened service with 0 scans must not count as conducted');

    const resultingAbsences = syncServiceAbsencesAutomatically(testChurchId);
    assert(resultingAbsences.length === 0, `Expected 0 absences for unconducted service, got ${resultingAbsences.length}`);

    const historyStats = getServiceHistoryStats(testChurchId, 'srv-unconducted-1');
    assert(historyStats !== null, 'History stats should return object for service');
    assert(historyStats!.totalAbsent === 0, `Expected totalAbsent === 0, got ${historyStats!.totalAbsent}`);
    assert(historyStats!.membersList.length === 0, 'Unconducted service should not populate absent members roll');
  });

  await runTest('Finished service with 0 verified check-ins AND active unfinished service both produce ZERO absences', () => {
    const testChurchId = 'CH_ABSENCE_TEST_EMPTY';
    const futureDate = '2099-12-31';
    const finishedNoScansService: any = {
      id: 'srv-finished-empty',
      churchId: testChurchId,
      title: 'Kilt Fini San Eskan',
      category: 'sunday_worship',
      date: '2020-02-02',
      startTime: '09:00',
      endTime: '11:30',
      isOpenForAttendance: false,
      wasOpenedForAttendance: true,
      isPermanentlyEnded: true,
    };
    const activeOngoingService: any = {
      id: 'srv-active-ongoing',
      churchId: testChurchId,
      title: 'Kilt an Kous Kounye a',
      category: 'sunday_worship',
      date: futureDate,
      startTime: '09:00',
      endTime: '23:59',
      isOpenForAttendance: true,
      wasOpenedForAttendance: true,
      isPermanentlyEnded: false,
    };

    const testMembers: any[] = [
      {
        id: 'm-empty-1',
        churchId: testChurchId,
        memberId: 'EMP-001',
        fullName: 'Luc Jean',
        role: 'member',
        status: 'active',
        barcodeToken: 'CHURCH:CH_ABSENCE_TEST_EMPTY|MEMBER:EMP-001',
        createdAt: '2020-01-01T00:00:00Z',
      },
    ];

    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([finishedNoScansService, activeOngoingService]));
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(testMembers));
    localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));

    const absences = syncServiceAbsencesAutomatically(testChurchId);
    assert(absences.length === 0, `Expected 0 absences when finished service had 0 verified scans and active service is unfinished, got ${absences.length}`);
  });

  await runTest('24h Report Window shows recently finished service and resets after 24 hours', () => {
    const baseTimeMs = new Date('2026-11-10T12:00:00Z').getTime();
    const recentService: any = {
      id: 'srv-recent-24h',
      churchId: 'CH_24H',
      date: '2026-11-10',
      isOpenForAttendance: false,
      isPermanentlyEnded: true,
      endedAt: new Date(baseTimeMs - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
    };
    const expiredService: any = {
      id: 'srv-expired-24h',
      churchId: 'CH_24H',
      date: '2026-11-08',
      isOpenForAttendance: false,
      isPermanentlyEnded: true,
      endedAt: new Date(baseTimeMs - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
    };

    assert(isServiceWithin24hReportWindow(recentService, baseTimeMs) === true, 'Service ended 10h ago must still appear in 24h report window');
    assert(isServiceWithin24hReportWindow(expiredService, baseTimeMs) === false, 'Service ended 25h ago must reset out of 24h dashboard report');
  });

  await runTest('Service that WAS opened, verified QR attendance, and ended DOES calculate absences for unchecked members', () => {
    const testChurchId = 'CH_ABSENCE_TEST_02';
    const conductedService: any = {
      id: 'srv-conducted-1',
      churchId: testChurchId,
      title: 'Kilt Dimanch Maten (Louvri)',
      category: 'sunday_worship',
      date: '2020-01-12',
      startTime: '09:00',
      endTime: '11:30',
      isOpenForAttendance: false,
      wasOpenedForAttendance: true,
      isPermanentlyEnded: true,
    };

    const testMembers: any[] = [
      {
        id: 'm-cond-1',
        churchId: testChurchId,
        memberId: 'COND-001',
        fullName: 'Paul Francois',
        role: 'member',
        status: 'active',
        barcodeToken: 'CHURCH:CH_ABSENCE_TEST_02|MEMBER:COND-001',
        createdAt: '2020-01-01T00:00:00Z',
      },
      {
        id: 'm-cond-2',
        churchId: testChurchId,
        memberId: 'COND-002',
        fullName: 'Ruth Joseph',
        role: 'member',
        status: 'active',
        barcodeToken: 'CHURCH:CH_ABSENCE_TEST_02|MEMBER:COND-002',
        createdAt: '2020-01-01T00:00:00Z',
      },
    ];

    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([conductedService]));
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(testMembers));
    localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify([]));
    localStorage.setItem(
      STORAGE_KEYS.ATTENDANCE,
      JSON.stringify([
        {
          id: 'att-cond-1',
          churchId: testChurchId,
          serviceId: 'srv-conducted-1',
          serviceCategory: 'sunday_worship',
          serviceTitle: 'Kilt Dimanch Maten (Louvri)',
          serviceDate: '2020-01-12',
          memberId: 'COND-001',
          memberDbId: 'm-cond-1',
          memberName: 'Paul Francois',
          timestamp: '2020-01-12T08:55:00Z',
          checkInMethod: 'qr_scan',
          attendanceStatus: 'on_time',
        },
      ])
    );

    const absences = syncServiceAbsencesAutomatically(testChurchId);
    assert(absences.length === 1, `Expected 1 absence for conducted service, got ${absences.length}`);
    assert(absences[0].memberId === 'COND-002', `Expected COND-002 to be absent, got ${absences[0].memberId}`);
  });

  // -----------------------------------------------------------------
  // SUITE 7: RECEPTION ROLE PERMISSIONS & ACTIVE SERVICE SCANNING GUARD
  // -----------------------------------------------------------------
  console.log('--- Suite 7: Reception Role RBAC & Active Service Enforcement ---');

  await runTest('isReceptionRole recognizes localized Reception roles and excludes regular members', async () => {
    const { isReceptionRole, getMemberPermissions } = await import('../utils/permissions');

    assert(isReceptionRole({ role: 'Recepcion', department: 'Service Général' }) === true, 'Should match Recepcion');
    assert(isReceptionRole({ role: 'Resepsyon & Akèy (Pwotokòl)', department: 'Accueil & Protocole' }) === true, 'Should match Resepsyon & Akèy');
    assert(isReceptionRole({ role: 'Réception, Accueil & Protocole', department: 'Accueil' }) === true, 'Should match Réception with accent');
    assert(isReceptionRole({ role: 'Usher / Hospitality', department: 'General' }) === true, 'Should match Usher');
    assert(isReceptionRole({ role: 'Manm', department: 'Accueil & Protocole' }) === false, 'Regular Manm must not gain reception role solely by department');
    assert(isReceptionRole({ role: 'Pastè', department: 'Service Général' }) === false, 'Pastor role should not match reception matcher unless assigned');

    const perms = getMemberPermissions({ role: 'Recepcion', department: 'Accueil & Protocole' });
    assert(perms.isReception === true, 'isReception must be true');
    assert(perms.canScanAttendance === true, 'canScanAttendance must be true');
    assert(perms.canManualCheckInActiveService === true, 'canManualCheckInActiveService must be true');
    assert(perms.canViewActiveServiceRoster === true, 'canViewActiveServiceRoster must be true');
    assert(perms.canEditMembers === false, 'canEditMembers must be strictly false');
    assert(perms.canDeleteMembers === false, 'canDeleteMembers must be strictly false');
    assert(perms.canChangeRoles === false, 'canChangeRoles must be strictly false');
    assert(perms.canManageServices === false, 'canManageServices must be strictly false');
  });

  await runTest('Reception scan rejects closed/ended services and succeeds only on ongoing active service', async () => {
    const { STORAGE_KEYS } = await import('../utils/storage');
    const { recordAttendanceScanUnified } = await import('../utils/qrSyncLayer');

    const prevNavigator = (globalThis as any).navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        configurable: true,
        writable: true,
      });

      const testChurchId = 'CH_RECEP_TEST_01';
      const uniqueRunId = `${Date.now()}`;
      const closedSrv: any = {
        id: `srv-recep-closed-${uniqueRunId}`,
        churchId: testChurchId,
        title: 'Kilt Fini',
        category: 'dominical',
        date: '2020-01-05',
        startTime: '08:00',
        endTime: '11:00',
        isOpenForAttendance: false,
        isPermanentlyEnded: true,
      };
      const nowDt = new Date();
      const todayLocal = `${nowDt.getFullYear()}-${String(nowDt.getMonth() + 1).padStart(2, '0')}-${String(nowDt.getDate()).padStart(2, '0')}`;
      const activeSrv: any = {
        id: `srv-recep-active-${uniqueRunId}`,
        churchId: testChurchId,
        title: 'Kilt Live Kounye a',
        category: 'dominical',
        date: todayLocal,
        startTime: '00:00',
        endTime: '23:59',
        isOpenForAttendance: true,
        isPermanentlyEnded: false,
      };
      const testMembers: any[] = [
        {
          id: 'm-rec-1',
          churchId: testChurchId,
          memberId: 'REC-001',
          fullName: 'Marie Resepsyon',
          phone: '50900000001',
          department: 'Accueil & Protocole',
          role: 'Resepsyon',
          status: 'active',
          barcodeToken: 'CHURCH:CH_RECEP_TEST_01|MEMBER:REC-001',
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'm-rec-2',
          churchId: testChurchId,
          memberId: 'REC-002',
          fullName: 'Pierre Fidel',
          phone: '50900000002',
          department: 'Service Général',
          role: 'Manm',
          status: 'active',
          barcodeToken: 'CHURCH:CH_RECEP_TEST_01|MEMBER:REC-002',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ];

      localStorage.setItem(
        STORAGE_KEYS.CHURCHES,
        JSON.stringify([{ id: testChurchId, code: 'REC01', name: 'Legliz Tès Resepsyon' }])
      );
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([closedSrv, activeSrv]));
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(testMembers));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PENDING_ATTENDANCE, JSON.stringify([]));

      const blockedScan = await recordAttendanceScanUnified({
        currentChurchId: testChurchId,
        rawCode: 'REC-002',
        serviceId: closedSrv.id,
        method: 'qr_scan',
        recordedBy: 'Resepsyon: Marie Resepsyon',
        requireActiveOngoingService: true,
      });
      assert(blockedScan.success === false, 'Reception scan targeting closed/ended service MUST be rejected');

      const validScan = await recordAttendanceScanUnified({
        currentChurchId: testChurchId,
        rawCode: 'CHURCH:CH_RECEP_TEST_01|MEMBER:REC-002',
        serviceId: activeSrv.id,
        method: 'qr_scan',
        recordedBy: 'Resepsyon: Marie Resepsyon',
        requireActiveOngoingService: true,
      });
      assert(validScan.success === true, `Expected valid scan into active ongoing service, got error: ${validScan.errorMessage}`);
      assert(validScan.record?.recordedBy === 'Resepsyon: Marie Resepsyon', 'recordedBy must attribute the reception operator');
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: prevNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  // -----------------------------------------------------------------
  // SUITE 8: DEVELOPER MULTI-CHURCH CLASSIFICATION & SYNC AUDIT
  // -----------------------------------------------------------------
  console.log('--- Suite 8: Developer Multi-Church Classification & Sync Audit ---');

  await runTest('classifyChurchDataset groups Active vs Archived/Legacy accurately and supports restoring', async () => {
    const { classifyChurchDataset } = await import('../utils/developerSyncAudit');

    const activeChurch: any = { id: 'CH010', code: 'EVG01', name: 'Eglise Evangélique de Sion', createdAt: '2026-01-01' };
    const archivedChurch: any = { id: 'CH011', code: 'EVG02', name: 'Chapelle Betel', status: 'archived', createdAt: '2025-01-01' };
    const legacyDemoChurch: any = { id: 'CH001', code: 'ETG01', name: 'Tabernacle de l’Espoir', createdAt: '2024-01-01' };
    const restoredLegacyChurch: any = { id: 'CH001', code: 'ETG01', name: 'Tabernacle de l’Espoir', status: 'active', createdAt: '2024-01-01' };
    const legacyFlagged: any = { id: 'CH012', code: 'OLD01', name: 'Legacy Branch', isLegacy: true, createdAt: '2024-01-01' };

    assert(classifyChurchDataset(activeChurch).group === 'active', 'Standard church should be classified active');
    assert(classifyChurchDataset(archivedChurch).group === 'archived_legacy', 'Archived church should be in archived_legacy');
    assert(classifyChurchDataset(archivedChurch).reason === 'archived', 'Archived reason should be archived');
    assert(classifyChurchDataset(legacyDemoChurch).group === 'archived_legacy', 'CH001 legacy demo should default to archived_legacy');
    assert(classifyChurchDataset(legacyDemoChurch).reason === 'legacy_demo', 'Legacy demo reason should match');
    assert(classifyChurchDataset(restoredLegacyChurch).group === 'active', 'Explicit status active should restore church to active');
    assert(classifyChurchDataset(legacyFlagged).group === 'archived_legacy', 'isLegacy true should classify as archived_legacy');
  });

  await runTest('buildPendingSyncAuditSummary deduplicates queues and computes affected churches and failures', async () => {
    const { buildPendingSyncAuditSummary } = await import('../utils/developerSyncAudit');

    const churches: any[] = [
      { id: 'CH010', code: 'EVG01', name: 'Eglise Sion' },
      { id: 'CH001', code: 'DEMO', name: 'Demo Church' },
    ];

    const idbItems: any[] = [
      {
        id: 'att-1',
        queuedAt: 1000,
        retryCount: 2,
        status: 'failed',
        lastError: 'Network timeout',
        record: { id: 'att-1', churchId: 'CH010', memberId: 'M1', memberName: 'Jean Paul', serviceTitle: 'Kilt Dimanch' },
      },
      {
        id: 'att-2',
        queuedAt: 2000,
        retryCount: 0,
        status: 'pending',
        record: { id: 'att-2', churchId: 'CH010', memberId: 'M2', memberName: 'Marie Rose', serviceTitle: 'Kilt Dimanch' },
      },
    ];

    // Duplicate att-1 in localStorage fallback + unique att-3
    const lsItems: any[] = [
      { id: 'att-1', churchId: 'CH010', memberId: 'M1', memberName: 'Jean Paul', serviceTitle: 'Kilt Dimanch', timestamp: '2026-11-13T10:00:00Z' },
      { id: 'att-3', churchId: 'CH001', memberId: 'M3', memberName: 'Pierre', serviceTitle: 'Etid Biblik', timestamp: '2026-11-13T11:00:00Z' },
    ];

    const summary = buildPendingSyncAuditSummary({
      indexedDbItems: idbItems,
      localStoragePending: lsItems,
      allChurches: churches,
      isOnline: true,
      cloudWriteAuthorized: false,
      cloudWriteEmail: null,
    });

    assert(summary.totalPendingTasks === 3, `Expected 3 deduplicated tasks, got ${summary.totalPendingTasks}`);
    assert(summary.failedCount === 1, `Expected 1 failed task, got ${summary.failedCount}`);
    assert(summary.queuedCount === 2, `Expected 2 queued tasks, got ${summary.queuedCount}`);
    assert(summary.affectedChurchCount === 2, `Expected 2 affected churches, got ${summary.affectedChurchCount}`);
    assert(summary.pendingByChurch['CH010'] === 2, 'CH010 should have 2 pending tasks');
    assert(summary.activeChurchesCount === 1, 'Expected 1 active church');
    assert(summary.archivedLegacyChurchesCount === 1, 'Expected 1 archived/legacy church');
    assert(summary.items[0].id === 'att-1', 'Failed items should sort first for auditing');
  });

  // -----------------------------------------------------------------
  // SUITE 9: CHURCH OWNER EMAIL + PASSWORD AUTH & ISOLATION
  // -----------------------------------------------------------------
  console.log('--- Suite 9: Church Owner Email + UID Auth & Isolation ---');

  await runTest('createNewChurch succeeds with Firebase admin email + UID without PIN and stores no raw password', async () => {
    const { createNewChurch, getChurchById } = await import('../utils/storage');

    const created = createNewChurch({
      name: 'Eglise Email Auth Test',
      code: 'EAT01',
      pastor: 'Pastè Jean',
      address: 'Delmas 33',
      city: 'Port-au-Prince',
      phone: '+509 3700-0001',
      email: 'pastor@eat01.org',
      motto: 'Lafenfwa',
      adminGoogleEmail: 'Pastor@EAT01.org',
      adminGoogleUid: 'uid-owner-eat01',
      adminGoogleName: 'Pastè Jean',
      adminAuthMethod: 'email_password',
    });

    assert(created.id.startsWith('CH'), 'Created church should have valid CH id');
    assert(created.adminGoogleEmail === 'pastor@eat01.org', 'Admin email should be normalized lowercase');
    assert(created.adminGoogleUid === 'uid-owner-eat01', 'Admin UID should be stored');
    assert(created.adminAuthMethod === 'email_password', 'Auth method should be email_password');
    assert(!created.adminPasscode, 'No legacy adminPasscode should be required or stored');
    assert(!('password' in (created as any)), 'Plaintext password must never be stored on Church object');

    const loaded = getChurchById(created.id);
    assert(Boolean(loaded && loaded.adminGoogleUid === 'uid-owner-eat01'), 'Church should persist in storage');
  });

  await runTest('createNewChurch rejects when neither Firebase owner nor valid legacy PIN is provided', async () => {
    const { createNewChurch } = await import('../utils/storage');
    let threw = false;
    try {
      createNewChurch({
        name: 'Unauthenticated Church',
        pastor: 'Pastè Test',
        address: 'Rue 1',
        city: 'Jacmel',
        phone: '+509 3000-0000',
        email: 'contact@test.org',
        motto: 'Test',
      });
    } catch {
      threw = true;
    }
    assert(threw === true, 'createNewChurch must reject churches without admin auth credentials');
  });

  await runTest('isChurchAdminAuthorized enforces UID/email ownership, allows Super Dev, and blocks mismatched users even with sessionStorage', async () => {
    const {
      createNewChurch,
      isChurchAdminAuthorized,
      authorizeChurchAdminSession,
    } = await import('../utils/storage');

    // Mock sessionStorage in Node if absent
    const sessionMap = new Map<string, string>();
    if (typeof (globalThis as any).sessionStorage === 'undefined') {
      (globalThis as any).sessionStorage = {
        getItem: (k: string) => (sessionMap.has(k) ? sessionMap.get(k)! : null),
        setItem: (k: string, v: string) => { sessionMap.set(k, String(v)); },
        removeItem: (k: string) => { sessionMap.delete(k); },
        clear: () => { sessionMap.clear(); },
      };
    }

    const church = createNewChurch({
      name: 'Eglise Isolation Test',
      code: 'ISO01',
      pastor: 'Pastè Marc',
      address: 'Petion-Ville',
      city: 'Port-au-Prince',
      phone: '+509 3700-0002',
      email: 'marc@iso01.org',
      motto: 'Lapè',
      adminGoogleEmail: 'marc@iso01.org',
      adminGoogleUid: 'uid-marc-iso01',
      adminAuthMethod: 'email_password',
    });

    // Even if sessionStorage was previously unlocked, a different signed-in user must be denied
    authorizeChurchAdminSession(church.id);

    assert(
      isChurchAdminAuthorized(church.id, 'marc@iso01.org', 'uid-marc-iso01') === true,
      'Owner matching UID and email must be authorized'
    );
    assert(
      isChurchAdminAuthorized(church.id, null, 'uid-marc-iso01') === true,
      'Owner matching UID alone must be authorized'
    );
    const decodedDevEmail = Buffer.from('Y2hhcmxlc2pqMzE4NkBnbWFpbC5jb20=', 'base64').toString('utf8');
    assert(
      isChurchAdminAuthorized(church.id, decodedDevEmail, 'uid-super-dev') === false,
      'Super Developer account is strictly decoupled from individual church admin sessions'
    );
    assert(
      isChurchAdminAuthorized(church.id, 'intruder@evil.com', 'uid-intruder') === false,
      'Different signed-in Firebase user must be strictly rejected'
    );
  });

  await runTest('lockChurchAdminSession blocks admin access even when Firebase owner stays active until Quick PIN clears lock', async () => {
    const {
      createNewChurch,
      isChurchAdminAuthorized,
      authorizeChurchAdminSession,
      lockChurchAdminSession,
      isChurchAdminLocked,
      hasMatchingChurchCloudOwner,
    } = await import('../utils/storage');

    const church = createNewChurch({
      name: 'Eglise Quick PIN Test',
      code: 'QPN01',
      pastor: 'Pastè Paul',
      address: 'Carrefour',
      city: 'Port-au-Prince',
      phone: '+509 3700-0003',
      email: 'paul@qpn01.org',
      motto: 'Lagras',
      adminGoogleEmail: 'paul@qpn01.org',
      adminGoogleUid: 'uid-paul-qpn01',
      adminAuthMethod: 'email_password',
    });

    authorizeChurchAdminSession(church.id);
    assert(isChurchAdminAuthorized(church.id, 'paul@qpn01.org', 'uid-paul-qpn01') === true, 'Owner authorized initially');

    // Simulate 5-min auto-lock or manual lock
    lockChurchAdminSession(church.id);
    assert(isChurchAdminLocked(church.id) === true, 'Church session should be marked locked');
    assert(
      isChurchAdminAuthorized(church.id, 'paul@qpn01.org', 'uid-paul-qpn01') === false,
      'Locked session must deny admin entry until unlocked with Quick PIN / biometrics / password'
    );
    assert(
      hasMatchingChurchCloudOwner(church.id, 'paul@qpn01.org', 'uid-paul-qpn01') === true,
      'Cloud owner remains signed in in background so Quick PIN unlock is permitted'
    );
    assert(
      hasMatchingChurchCloudOwner(church.id, 'stranger@other.org', 'uid-stranger') === false,
      'Non-owner cannot use Quick PIN resume'
    );

    // Unlock after Quick PIN / Biometric / Password check
    authorizeChurchAdminSession(church.id);
    assert(isChurchAdminLocked(church.id) === false, 'Unlock should clear lock flag');
    assert(
      isChurchAdminAuthorized(church.id, 'paul@qpn01.org', 'uid-paul-qpn01') === true,
      'Authorized again after unlocking'
    );
  });

  // -----------------------------------------------------------------
  // SUITE 10: ANNOUNCEMENTS & NOTIFICATIONS SCHEMA PARITY (WEB + ANDROID)
  // -----------------------------------------------------------------
  console.log('\n--- Suite 10: Announcements & Notifications Schema Parity ---');

  await runTest('buildAnnouncementFirestorePayload emits ONLY exact firestore.rules allowed keys', async () => {
    const { buildAnnouncementFirestorePayload } = await import('../services/firestoreService');
    const sampleAnn: any = {
      id: 'ann-test-parity-1',
      churchId: 'CH_PARITY_01',
      title: ' Konvansyon Anyèl ',
      content: ' Tout manm envite nan konvansyon an. ',
      department: 'Depatman Administrasyon',
      category: 'anons',
      date: '2026-11-14',
      targetAudience: 'Tout moun',
      isPinned: true,
      showToastOnLogin: false,
      toastAlertLevel: 'info',
      isScheduledNotification: false,
      scheduledNotificationDate: null,
      posterUrl: 'https://example.com/poster.webp',
      author: 'Pastè Jean',
      title_fr: 'Convention Annuelle', // UI-only translation field that must NOT leak into strict Firestore schema
      leader: 'Frè Marc',              // UI-only role field that must NOT leak into strict Firestore schema
    };

    const payload = buildAnnouncementFirestorePayload(sampleAnn, { isCreate: true });
    const allowedKeys = new Set([
      'churchId',
      'title',
      'content',
      'department',
      'category',
      'date',
      'targetAudience',
      'isPinned',
      'showToastOnLogin',
      'toastAlertLevel',
      'isScheduledNotification',
      'scheduledNotificationDate',
      'posterUrl',
      'imageUrl',
      'serviceId',
      'authorId',
      'authorName',
      'reactionsCount',
      'commentsCount',
      'createdAt',
      'updatedAt',
    ]);

    const payloadKeys = Object.keys(payload);
    for (const k of payloadKeys) {
      assert(allowedKeys.has(k), `Disallowed key "${k}" found in announcement Firestore payload`);
    }
    assert(payload.churchId === 'CH_PARITY_01', 'churchId must match');
    assert(payload.title === 'Konvansyon Anyèl', 'title must be trimmed');
    assert(payload.department === 'Depatman Administrasyon', 'department must be set');
    assert(payload.posterUrl === 'https://example.com/poster.webp', 'posterUrl must be preserved');
    assert(payload.imageUrl === 'https://example.com/poster.webp', 'imageUrl must mirror posterUrl');
    assert(payload.reactionsCount === 0, 'reactionsCount must initialize to 0');
    assert(payload.commentsCount === 0, 'commentsCount must initialize to 0');
  });

  await runTest('formatAnnouncementTimestamp formats Today, Yesterday, and older dates accurately', async () => {
    const { formatAnnouncementTimestamp } = await import('../utils/storage');
    const now = new Date();
    const todayFormatted = formatAnnouncementTimestamp(now.toISOString(), undefined, undefined, 'ht');
    assert(todayFormatted.startsWith('Jodi a • '), `Expected "Jodi a • HH:mm", got "${todayFormatted}"`);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayFormatted = formatAnnouncementTimestamp(yesterday.toISOString(), undefined, undefined, 'ht');
    assert(yesterdayFormatted.startsWith('Yè • '), `Expected "Yè • HH:mm", got "${yesterdayFormatted}"`);

    const historicalFormatted = formatAnnouncementTimestamp(
      { seconds: Math.floor(new Date('2025-05-10T14:30:00Z').getTime() / 1000), nanoseconds: 0 },
      '2025-05-10',
      undefined,
      'ht'
    );
    assert(historicalFormatted.includes('2025 • '), `Expected "dd MMM 2025 • hh:mm a", got "${historicalFormatted}"`);
  });

  await runTest('normalizeReactionType supports all 8 canonical mobile/web reactions and legacy aliases', async () => {
    const { normalizeReactionType } = await import('../services/firestoreService');
    assert(normalizeReactionType('pray') === 'pray', 'pray -> pray');
    assert(normalizeReactionType('amen') === 'amen', 'amen -> amen');
    assert(normalizeReactionType('love') === 'love', 'love -> love');
    assert(normalizeReactionType('heart') === 'love', 'heart -> love');
    assert(normalizeReactionType('applause') === 'clap', 'applause -> clap');
    assert(normalizeReactionType('fire') === 'wow', 'fire -> wow');
    assert(normalizeReactionType('sad') === 'sad', 'sad -> sad');
  });

  await runTest('Strict Admin Exclusion blocks Church Admin, Pastor, Author, and Super Developer from member notifications', async () => {
    const { isExcludedAdminRecipient } = await import('../services/firestoreService');
    const { getContextualNotifications } = await import('../services/notificationCenterService');

    const church: any = {
      id: 'CH_NOTIF_01',
      code: 'NT01',
      name: 'Legliz Notifikasyon',
      adminGoogleUid: 'uid-pastor-admin',
      adminGoogleEmail: 'pastor@nt01.org',
    };

    const adminMember: any = {
      id: 'mem-admin-1',
      memberId: 'NT01-0001',
      fullName: 'Pastè Admin',
      role: 'admin',
      email: 'pastor@nt01.org',
    };

    const superDevMember: any = {
      id: 'mem-dev-1',
      memberId: 'NT01-0002',
      fullName: 'Jackson Charles',
      role: 'member',
      email: Buffer.from('Y2hhcmxlc2pqMzE4NkBnbWFpbC5jb20=', 'base64').toString('utf8'),
    };

    const regularMember: any = {
      id: 'mem-reg-1',
      memberId: 'NT01-0003',
      fullName: 'Sè Marie',
      role: 'member',
      department: 'Chorale',
      email: 'marie@nt01.org',
    };

    assert(isExcludedAdminRecipient(adminMember, church) === true, 'Role admin must be excluded');
    assert(isExcludedAdminRecipient(superDevMember, church) === true, 'Super developer email must be excluded');
    assert(
      isExcludedAdminRecipient(regularMember, church, 'mem-reg-1') === true,
      'Announcement authorId matching member must be excluded'
    );
    assert(isExcludedAdminRecipient(regularMember, church, 'uid-pastor-admin') === false, 'Regular member must NOT be excluded');

    const sampleAnnouncements: any[] = [
      {
        id: 'ann-100',
        churchId: 'CH_NOTIF_01',
        title: 'Nouvo Anons Koral',
        content: 'Repetisyon samdi a 4è.',
        department: 'Depatman Administrasyon',
        category: 'anons',
        date: '2026-11-14',
        isPinned: false,
        authorId: 'uid-pastor-admin',
        authorName: 'Pastè Admin',
        reactionsCount: 0,
        commentsCount: 0,
      },
    ];

    const adminNotifs = getContextualNotifications({
      church,
      member: regularMember,
      userRole: 'admin',
      announcements: sampleAnnouncements,
      services: [],
    });
    assert(adminNotifs.length === 0, 'userRole === "admin" must receive 0 notifications');

    const memberNotifs = getContextualNotifications({
      church,
      member: regularMember,
      userRole: 'member',
      announcements: sampleAnnouncements,
      services: [],
    });
    assert(memberNotifs.length === 1, 'Regular member must receive the announcement notification');
  });

  await runTest('Notification read/unread toggle, alias cleanup, read timestamps, cloud sync, localization, and per-member isolation', async () => {
    localStorage.clear();
    const {
      getContextualNotifications,
      getUnreadNotificationsCount,
      markNotificationAsRead,
      toggleNotificationRead,
      markAllNotificationsAsRead,
      isAnnouncementReadForMember,
      getNotificationReadAt,
      syncNotificationReadStatesFromCloud,
      formatNotificationTimestamp,
    } = await import('../services/notificationCenterService');

    const church: any = {
      id: 'CH_NOTIF_READ_01',
      code: 'NR01',
      name: 'Legliz Lekti',
      adminGoogleUid: 'uid-admin-nr',
      adminGoogleEmail: 'admin@nr01.org',
    };

    const memberA: any = {
      id: 'mem_alpha_001',
      memberId: 'NR01-0001',
      fullName: 'Frè Pòl',
      role: 'member',
    };

    const memberB: any = {
      id: 'mem_beta_002',
      memberId: 'NR01-0002',
      fullName: 'Sè Ester',
      role: 'member',
    };

    const announcements: any[] = [
      {
        id: 'ann-read-1',
        churchId: 'CH_NOTIF_READ_01',
        title: 'Anons Jeneral',
        title_en: 'General Notice',
        title_fr: 'Annonce Générale',
        title_es: 'Aviso General',
        content: 'Kontni anons la an Kreyòl.',
        content_en: 'Announcement body in English.',
        category: 'anons',
        date: '2026-11-23',
        authorId: 'uid-admin-nr',
        authorName: 'Pastè',
      },
    ];

    const nowNotif = new Date();
    const todayNotifYmd = `${nowNotif.getFullYear()}-${String(nowNotif.getMonth() + 1).padStart(2, '0')}-${String(nowNotif.getDate()).padStart(2, '0')}`;
    const services: any[] = [
      {
        id: 'srv-live-1',
        churchId: 'CH_NOTIF_READ_01',
        title: 'Kilt Dimanch',
        date: todayNotifYmd,
        startTime: '00:00',
        endTime: '23:59',
        isOpenForAttendance: true,
        isPermanentlyEnded: false,
        preacherOrLeader: 'Pastè Jan',
        createdAt: new Date().toISOString(),
      },
    ];

    // 1. Initial unread state + multi-language localization check
    const enNotifs = getContextualNotifications({
      church,
      member: memberA,
      userRole: 'member',
      announcements,
      services,
      language: 'en',
    });
    assert(enNotifs.length === 2, 'Member A should receive 2 notifications (1 announcement + 1 live service)');
    assert(getUnreadNotificationsCount(enNotifs) === 2, 'Both notifications start unread');
    const enAnn = enNotifs.find((n) => n.id === 'ann_ann-read-1');
    assert(enAnn?.title === 'General Notice', 'English announcement title should be localized');
    assert(enAnn?.body === 'Announcement body in English.', 'English announcement body should be localized');

    // 2. Mark announcement read -> persists readAt timestamp and decrements unread count
    markNotificationAsRead('ann_ann-read-1', church.id, memberA.id, memberA, { syncCloud: false });
    assert(isAnnouncementReadForMember('ann-read-1', church.id, memberA) === true, 'Announcement must be marked read');
    assert(Boolean(getNotificationReadAt('ann_ann-read-1', church.id, memberA.id, memberA)), 'Read timestamp must be recorded');

    let afterMark = getContextualNotifications({
      church,
      member: memberA,
      userRole: 'member',
      announcements,
      services,
      language: 'ht',
    });
    assert(getUnreadNotificationsCount(afterMark) === 1, 'Unread count should drop to 1 after marking announcement read');

    // 3. Per-member isolation: Member B still sees 2 unread
    const memberBNotifs = getContextualNotifications({
      church,
      member: memberB,
      userRole: 'member',
      announcements,
      services,
      language: 'ht',
    });
    assert(getUnreadNotificationsCount(memberBNotifs) === 2, 'Member B unread count must remain isolated at 2');

    // 4. Toggle announcement back to UNREAD (must clear ALL alias IDs including underscored member IDs!)
    const nextState = toggleNotificationRead('ann_ann-read-1', church.id, memberA.id, memberA);
    assert(nextState === false, 'toggleNotificationRead should return false when unmarking read');
    assert(isAnnouncementReadForMember('ann-read-1', church.id, memberA) === false, 'Announcement must cleanly revert to unread');
    assert(!getNotificationReadAt('ann_ann-read-1', church.id, memberA.id, memberA), 'Read timestamp must be cleared when unmarked');

    afterMark = getContextualNotifications({
      church,
      member: memberA,
      userRole: 'member',
      announcements,
      services,
      language: 'ht',
    });
    assert(getUnreadNotificationsCount(afterMark) === 2, 'Unread count must return to 2 after marking unread');

    // 5. Mark all as read -> unread count becomes 0
    markAllNotificationsAsRead(afterMark.map((n) => n.id), church.id, memberA.id, memberA);
    const allReadNotifs = getContextualNotifications({
      church,
      member: memberA,
      userRole: 'member',
      announcements,
      services,
      language: 'ht',
    });
    assert(getUnreadNotificationsCount(allReadNotifs) === 0, 'markAllNotificationsAsRead must bring unread count to 0');

    // 6. Bidirectional Cloud Firestore sync for underscored member IDs
    const cloudChanged = syncNotificationReadStatesFromCloud(
      [
        {
          id: `notif_announcement_ann-read-1_${memberB.id}`,
          userId: memberB.id,
          churchId: church.id,
          title: 'Anons Jeneral',
          message: 'Kontni',
          type: 'announcement',
          isRead: true,
          createdAt: new Date().toISOString(),
        },
      ],
      church.id,
      memberB
    );
    assert(cloudChanged === true, 'Cloud snapshot with isRead: true should mark Member B announcement read');
    assert(isAnnouncementReadForMember('ann-read-1', church.id, memberB) === true, 'Member B announcement should now be read');

    const cloudUnreadChanged = syncNotificationReadStatesFromCloud(
      [
        {
          id: `notif_announcement_ann-read-1_${memberB.id}`,
          userId: memberB.id,
          churchId: church.id,
          title: 'Anons Jeneral',
          message: 'Kontni',
          type: 'announcement',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      church.id,
      memberB
    );
    assert(cloudUnreadChanged === true, 'Cloud snapshot with isRead: false should mark Member B announcement unread');
    assert(isAnnouncementReadForMember('ann-read-1', church.id, memberB) === false, 'Member B announcement should revert to unread');

    // 7. Human-readable timestamp formatting works across languages
    const nowFormatted = formatNotificationTimestamp(new Date().toISOString(), 'ht');
    assert(nowFormatted.relative === 'Kounye a', 'Current timestamp in HT should format as "Kounye a"');
  });

  // -----------------------------------------------------------------
  // SUITE 11: VISITOR MEMBER TYPE & CROSS-CHURCH QR ISOLATION
  // -----------------------------------------------------------------
  console.log('\n[Suite 11] Visitor Member Type & Cross-Church QR Isolation');

  await runTest('Cross-church QR scan records Visitor attendance at host church without leaking or mutating origin/host rosters', async () => {
    const prevNavigator = (globalThis as any).navigator;
    (globalThis as any).navigator = { onLine: false };
    try {
      const storage = await import('../utils/storage');
      const qrSync = await import('../utils/qrSyncLayer');
      const perms = await import('../utils/permissions');

      localStorage.clear();

      const churchA: any = {
        id: 'CH_ALPHA',
        code: 'ALP',
        name: 'Legliz Alfa (Orijin)',
        pastor: 'Pastè Jean',
        address: 'Delmas 33',
        city: 'Pòtoprens',
        phone: '50911111111',
        email: 'alfa@test.org',
        motto: 'Lafwa',
        themeColor: 'indigo',
        logoIcon: 'Church',
        createdAt: '2026-01-01',
      };
      const churchB: any = {
        id: 'CH_BETA',
        code: 'BET',
        name: 'Legliz Beta (Rekèy)',
        pastor: 'Pastè Paul',
        address: 'Petyonvil',
        city: 'Pòtoprens',
        phone: '50922222222',
        email: 'beta@test.org',
        motto: 'Renmen',
        themeColor: 'indigo',
        logoIcon: 'Church',
        createdAt: '2026-01-01',
      };
      storage.saveToStorage(storage.STORAGE_KEYS.CHURCHES, [churchA, churchB]);

      const memberA: any = {
        id: 'mem-alpha-1',
        churchId: 'CH_ALPHA',
        memberId: 'ALP-0001',
        fullName: 'Frè Pierre (Alfa)',
        department: 'Koral',
        role: 'Manm Koral',
        memberType: 'member',
        status: 'active',
        joinedDate: '2026-01-01',
      };
      const memberBReg: any = {
        id: 'mem-beta-1',
        churchId: 'CH_BETA',
        memberId: 'BET-0001',
        fullName: 'Sè Ruth (Beta)',
        department: 'Akèy',
        role: 'Manm Akèy',
        memberType: 'member',
        status: 'active',
        joinedDate: '2026-01-01',
      };
      const memberBVisitorType: any = {
        id: 'mem-beta-vis',
        churchId: 'CH_BETA',
        memberId: 'BET-0002',
        fullName: 'Envite Lokal',
        department: 'Visiteurs',
        role: 'Vizitè',
        memberType: 'visitor',
        status: 'active',
        joinedDate: '2026-01-01',
      };
      storage.saveToStorage(storage.STORAGE_KEYS.MEMBERS, [memberA, memberBReg, memberBVisitorType]);

      const todayStr = new Date().toISOString().split('T')[0];
      const serviceB: any = {
        id: 'srv-beta-today',
        churchId: 'CH_BETA',
        title: 'Kilt Dimanch Maten',
        category: 'culte_dimanche',
        date: todayStr,
        startTime: '08:00',
        endTime: '23:59',
        isOpenForAttendance: true,
        wasOpenedForAttendance: true,
        isPermanentlyEnded: false,
      };
      storage.saveToStorage(storage.STORAGE_KEYS.SERVICES, [serviceB]);

      assert(perms.isVisitorRole('Vizitè') === true, 'Vizitè role helper must return true');
      assert(perms.isVisitorMember(memberBVisitorType) === true, 'Visitor-typed member must be detected');
      assert(perms.isVisitorMember(memberA) === false, 'Regular member must not be detected as visitor');

      // Scan Church A member QR card at Church B
      const canonicalQr = qrSync.buildCanonicalQrPayload('CH_ALPHA', 'ALP-0001');
      const scanRes = await qrSync.recordAttendanceScanUnified({
        currentChurchId: 'CH_BETA',
        rawCode: canonicalQr,
        serviceId: serviceB.id,
      });

      assert(scanRes.success === true, 'Cross-church visitor scan must succeed');
      assert(scanRes.isVisitor === true, 'Scan result must be marked isVisitor === true');
      assert(scanRes.homeChurchId === 'CH_ALPHA', 'Scan result must carry homeChurchId CH_ALPHA');
      assert(scanRes.homeChurchName === 'Legliz Alfa (Orijin)', 'Scan result must carry homeChurchName');
      assert(scanRes.record?.attendanceRole === 'visitor', 'Recorded attendance must have attendanceRole=visitor');
      assert(scanRes.record?.churchId === 'CH_BETA', 'Attendance must belong strictly to host church CH_BETA');
      assert(scanRes.record?.hostChurchName === 'Legliz Beta (Rekèy)', 'Attendance must carry hostChurchName');

      // Data isolation checks
      const churchBMembers = storage.getMembersByChurch('CH_BETA');
      assert(
        !churchBMembers.some((m) => m.memberId === 'ALP-0001' || m.id === 'mem-alpha-1'),
        'Origin member MUST NEVER be added to host church members collection'
      );
      const churchAAttendance = storage.getAttendanceByChurch('CH_ALPHA');
      assert(churchAAttendance.length === 0, 'Origin church attendances MUST remain completely untouched');

      const visitsForMemberA = storage.getMemberCrossChurchVisits('mem-alpha-1', 'ALP-0001', 'CH_ALPHA');
      assert(visitsForMemberA.length === 1, 'Origin member can inspect their own cross-church visit record');
      assert(visitsForMemberA[0].churchId === 'CH_BETA', 'Cross-church visit points to host church');

      // Duplicate scan prevention
      const dupRes = await qrSync.recordAttendanceScanUnified({
        currentChurchId: 'CH_BETA',
        rawCode: canonicalQr,
        serviceId: serviceB.id,
      });
      assert(dupRes.success === false && dupRes.duplicate === true, 'Duplicate visitor scan in same service must be blocked');

      // Service History stats checks: visitor counted in visitorsList/totalVisitors without inflating regular member denominator
      const endedServiceB = { ...serviceB, isPermanentlyEnded: true, isOpenForAttendance: false };
      storage.saveToStorage(storage.STORAGE_KEYS.SERVICES, [endedServiceB]);
      const statsB = storage.getServiceHistoryStats('CH_BETA', endedServiceB.id);
      assert(statsB !== null, 'Service history stats should be returned');
      assert(statsB!.totalMembers === 1, 'Regular member denominator must exclude Vizitè member type (expected 1)');
      assert(statsB!.totalVisitors === 1, 'Service history must count 1 visitor');
      assert(statsB!.visitorsList.length === 1 && statsB!.visitorsList[0].memberDbId === 'mem-alpha-1', 'Visitors list must include Church A visitor');
      assert(statsB!.visitorsList[0].homeChurchName === 'Legliz Alfa (Orijin)', 'Visitor stat must carry homeChurchName');
      assert(
        !statsB!.membersList.some((entry) => entry.memberDbId === 'mem-beta-vis' && entry.status === 'absent'),
        'Vizitè-type member must never be marked absent in service history'
      );
    } finally {
      (globalThis as any).navigator = prevNavigator;
    }
  });

  // -----------------------------------------------------------------
  // 35. ANDROID KOTLIN ADMOB REMOTE CONTROL RESOLUTION & ANTI-BAN GUARD
  // -----------------------------------------------------------------
  await runTest('35. Android Kotlin AdMob Remote Control Resolution & Anti-Ban Guard', async () => {
    const devStorage = await import('../utils/developerStorage');

    // Case A: Default Test Mode forces Google Official Test IDs even if custom IDs are passed
    const testRes = devStorage.resolveEffectiveMobileAdMobConfig({
      enabled: true,
      mobileEnabled: true,
      environment: 'test',
      mobileForceTestIds: false,
      bannerAdUnitId: 'ca-app-pub-9999999999999999/1111111111',
    });
    assert(testRes.shouldShowAds === true, 'Ads should be enabled when master + mobile are active');
    assert(testRes.isTestMode === true, 'environment=test must enforce isTestMode=true');
    assert(
      testRes.effectiveBannerId === 'ca-app-pub-3940256099942544/6300978111',
      'Test mode must return Google Official Test Banner ID'
    );

    // Case B: Production environment WITH mobileForceTestIds=true still locks to Test IDs (Anti-Ban Guard)
    const antiBanRes = devStorage.resolveEffectiveMobileAdMobConfig({
      enabled: true,
      mobileEnabled: true,
      environment: 'production',
      mobileForceTestIds: true,
      bannerAdUnitId: 'ca-app-pub-9999999999999999/1111111111',
    });
    assert(antiBanRes.isTestMode === true, 'mobileForceTestIds=true must keep test mode locked');
    assert(
      antiBanRes.effectiveBannerId === 'ca-app-pub-3940256099942544/6300978111',
      'Anti-ban guard must prevent real Ad Unit IDs while mobileForceTestIds is true'
    );

    // Case C: Production environment with mobileForceTestIds=false resolves live production Ad Unit IDs
    const prodRes = devStorage.resolveEffectiveMobileAdMobConfig({
      enabled: true,
      mobileEnabled: true,
      environment: 'production',
      mobileForceTestIds: false,
      bannerAdUnitId: 'ca-app-pub-9999999999999999/1111111111',
      interstitialAdUnitId: 'ca-app-pub-9999999999999999/2222222222',
      mobileShowBannerServices: true,
      mobileInterstitialCooldownSeconds: 240,
    });
    assert(prodRes.isTestMode === false, 'Production mode without test lock must resolve isTestMode=false');
    assert(
      prodRes.effectiveBannerId === 'ca-app-pub-9999999999999999/1111111111',
      'Production mode must resolve live bannerAdUnitId'
    );
    assert(prodRes.placements.servicesBanner === true, 'Services banner placement must reflect remote toggle');
    assert(prodRes.placements.interstitialCooldownSeconds === 240, 'Cooldown must reflect remote setting');

    // Case D: Pro Church License with allowAdFree=true disables all mobile placements automatically
    const proChurchRes = devStorage.resolveEffectiveMobileAdMobConfig(
      {
        enabled: true,
        mobileEnabled: true,
        adFreeForLicensedChurches: true,
      },
      'CH_PRO_1',
      [
        {
          key: 'OMNI-PRO-TEST',
          churchId: 'CH_PRO_1',
          churchName: 'Legliz Pro',
          tier: 'pro_annual',
          status: 'active',
          issuedAt: '2026-01-01',
          expiresAt: 'never',
          maxMembers: 0,
          allowCloudSync: true,
          allowMultiChurch: true,
          allowAdFree: true,
        },
      ]
    );
    assert(proChurchRes.shouldShowAds === false, 'Licensed Pro church must be Ad-Free');
    assert(proChurchRes.adFreeReason === 'pro_church_license', 'Reason must be pro_church_license');
    assert(proChurchRes.placements.homeBanner === false, 'Home banner must be disabled for Ad-Free church');
    assert(
      proChurchRes.placements.interstitialAfterScanClose === false,
      'Scanner interstitial must be disabled for Ad-Free church'
    );
  });

  await runTest('36. Google Account Linking Unifies Member Profile & Preserves Custom Photo on Same Pedestal', async () => {
    const { unifyMemberProfile } = await import('../utils/storage');

    const existingMemberWithCustomPhoto: any = {
      id: 'mem_101',
      memberId: 'EVG-101',
      churchId: 'CH010',
      fullName: 'Frè Samuel Pierre',
      email: '',
      phone: '+509 3711-2233',
      dateOfBirth: '1988-05-14',
      department: 'Koral',
      role: 'Resepsyon',
      status: 'active',
      pin: '4829',
      avatarUrl: 'data:image/webp;base64,CUSTOM_CHURCH_PHOTO_DATA',
      notes: 'Manm fidèl depi 2021',
    };

    const googleUser = {
      uid: 'google_uid_999',
      email: 'Samuel.Pierre@gmail.com',
      displayName: 'Sam Pierre',
      photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    };

    // 1. Linking Google when member ALREADY has a custom church photo MUST preserve custom photo across all 3 photo fields
    const unifiedWithCustom = unifyMemberProfile(existingMemberWithCustomPhoto, null, googleUser);
    assert(
      unifiedWithCustom.avatarUrl === 'data:image/webp;base64,CUSTOM_CHURCH_PHOTO_DATA',
      'Custom church avatarUrl must NEVER be overwritten by Google avatar'
    );
    assert(
      unifiedWithCustom.photoUrl === 'data:image/webp;base64,CUSTOM_CHURCH_PHOTO_DATA',
      'photoUrl must be synchronized with custom avatarUrl'
    );
    assert(
      unifiedWithCustom.googlePhoto === 'data:image/webp;base64,CUSTOM_CHURCH_PHOTO_DATA',
      'googlePhoto must reflect the canonical custom photo so ID card and all views match'
    );
    assert(unifiedWithCustom.googleEmail === 'samuel.pierre@gmail.com', 'googleEmail must be normalized and saved');
    assert(unifiedWithCustom.googleUid === 'google_uid_999', 'googleUid must be saved');
    assert(unifiedWithCustom.email === 'samuel.pierre@gmail.com', 'Empty member email must be populated from Google email');
    assert(unifiedWithCustom.fullName === 'Frè Samuel Pierre', 'Existing fullName must be preserved');
    assert(unifiedWithCustom.phone === '+509 3711-2233', 'Existing phone must be preserved');
    assert(unifiedWithCustom.pin === '4829', 'Existing PIN must be preserved');
    assert(unifiedWithCustom.role === 'Resepsyon', 'Existing role must be preserved');

    // 2. Linking Google when member has NO photo yet MUST populate avatarUrl, photoUrl, and googlePhoto from Google
    const memberWithoutPhoto: any = {
      ...existingMemberWithCustomPhoto,
      avatarUrl: undefined,
      photoUrl: undefined,
      googlePhoto: undefined,
    };
    const unifiedWithGoogleFallback = unifyMemberProfile(memberWithoutPhoto, null, googleUser);
    assert(
      unifiedWithGoogleFallback.avatarUrl === googleUser.photoURL &&
        unifiedWithGoogleFallback.photoUrl === googleUser.photoURL &&
        unifiedWithGoogleFallback.googlePhoto === googleUser.photoURL,
      'When member has no photo yet, Google photoURL must populate avatarUrl, photoUrl, and googlePhoto'
    );
  });

  // -----------------------------------------------------------------
  // SUITE 12: REAL-TIME COMMENT MODERATION ENGINE & SCHEMA PARITY
  // -----------------------------------------------------------------
  console.log('\n--- Suite 12: Real-Time Comment Moderation Engine & Schema Parity ---');

  await runTest('37. sanitizeCommentModerationConfig clamps limits and preserves defaults', async () => {
    const devStorage = await import('../utils/developerStorage');

    const defaults = devStorage.sanitizeCommentModerationConfig(undefined);
    assert(defaults.enabled === true, 'enabled defaults to true');
    assert(defaults.allowMemberCommentsGlobal === true, 'allowMemberCommentsGlobal defaults to true');
    assert(defaults.allowServiceComments === true, 'allowServiceComments defaults to true');
    assert(defaults.allowAnnouncementComments === true, 'allowAnnouncementComments defaults to true');
    assert(defaults.autoBlockProfanity === true, 'autoBlockProfanity defaults to true');
    assert(defaults.blockExternalLinks === true, 'blockExternalLinks defaults to true');
    assert(defaults.maxCommentLength === 500, 'maxCommentLength defaults to 500');
    assert(defaults.slowModeCooldownSeconds === 15, 'slowModeCooldownSeconds defaults to 15');
    assert(defaults.blockedKeywords.length > 0, 'blockedKeywords defaults must be non-empty');

    const clamped = devStorage.sanitizeCommentModerationConfig({
      maxCommentLength: 5000,
      slowModeCooldownSeconds: 999,
      blockedKeywords: ['  SPAM ', 'spam', 'Scam'],
      mutedMemberIds: ['mem-1', 'MEM-1', 'mem-2'],
      disabledChurchIds: ['ch-a', 'CH-A'],
    });
    assert(clamped.maxCommentLength === 1000, 'maxCommentLength must clamp to max 1000');
    assert(clamped.slowModeCooldownSeconds === 300, 'slowModeCooldownSeconds must clamp to max 300');
    assert(clamped.blockedKeywords.length === 2, 'blockedKeywords must deduplicate case-insensitively');
    assert(clamped.mutedMemberIds.length === 2, 'mutedMemberIds must deduplicate case-insensitively');
    assert(clamped.disabledChurchIds.length === 1, 'disabledChurchIds must deduplicate case-insensitively');

    const minClamped = devStorage.sanitizeCommentModerationConfig({
      maxCommentLength: 10,
      slowModeCooldownSeconds: -5,
    });
    assert(minClamped.maxCommentLength === 50, 'maxCommentLength must clamp to min 50');
    assert(minClamped.slowModeCooldownSeconds === 0, 'slowModeCooldownSeconds must clamp to min 0');
  });

  await runTest('38. evaluateCommentAgainstModeration enforces global kill-switch, church/type lock, mute, slow mode, links & profanity', async () => {
    const devStorage = await import('../utils/developerStorage');

    const baseConfig = {
      ...devStorage.DEFAULT_COMMENT_MODERATION_CONFIG,
      blockedKeywords: ['scam', 'kouyon', 'merde'],
      mutedMemberIds: ['MEM-MUTED-1'],
      disabledChurchIds: ['CH_LOCKED'],
      maxCommentLength: 120,
      slowModeCooldownSeconds: 20,
    };

    // Global kill-switch
    const globalOff = devStorage.evaluateCommentAgainstModeration({
      content: 'Amen Bondye beni nou!',
      churchId: 'CH_OK',
      userIds: ['MEM-1'],
      targetType: 'announcement',
      customConfig: { ...baseConfig, allowMemberCommentsGlobal: false },
    });
    assert(globalOff.allowed === false && globalOff.reasonCode === 'global_disabled', 'Global kill-switch must block');

    // Church disabled
    const churchOff = devStorage.evaluateCommentAgainstModeration({
      content: 'Amen Bondye beni nou!',
      churchId: 'ch_locked',
      userIds: ['MEM-1'],
      targetType: 'announcement',
      customConfig: baseConfig,
    });
    assert(churchOff.allowed === false && churchOff.reasonCode === 'church_disabled', 'Disabled church must block');

    // Service comments disabled
    const serviceOff = devStorage.evaluateCommentAgainstModeration({
      content: 'Bon sèvis jodi a!',
      churchId: 'CH_OK',
      userIds: ['MEM-1'],
      targetType: 'service',
      customConfig: { ...baseConfig, allowServiceComments: false },
    });
    assert(serviceOff.allowed === false && serviceOff.reasonCode === 'service_comments_disabled', 'Service toggle must block service comments');

    // Announcement comments disabled
    const annOff = devStorage.evaluateCommentAgainstModeration({
      content: 'Mèsi pou anons la!',
      churchId: 'CH_OK',
      userIds: ['MEM-1'],
      targetType: 'announcement',
      customConfig: { ...baseConfig, allowAnnouncementComments: false },
    });
    assert(annOff.allowed === false && annOff.reasonCode === 'announcement_comments_disabled', 'Announcement toggle must block announcement comments');

    // Muted user
    const muted = devStorage.evaluateCommentAgainstModeration({
      content: 'Mwen kontan la',
      churchId: 'CH_OK',
      userIds: ['mem-muted-1'],
      targetType: 'announcement',
      customConfig: baseConfig,
    });
    assert(muted.allowed === false && muted.reasonCode === 'user_muted', 'Muted member must be blocked');

    // Too long
    const tooLong = devStorage.evaluateCommentAgainstModeration({
      content: 'A'.repeat(121),
      churchId: 'CH_OK',
      userIds: ['MEM-1'],
      targetType: 'announcement',
      customConfig: baseConfig,
    });
    assert(tooLong.allowed === false && tooLong.reasonCode === 'too_long', 'Over maxCommentLength must be blocked');

    // Slow mode cooldown
    const nowMs = 1_700_000_000_000;
    const slowBlocked = devStorage.evaluateCommentAgainstModeration({
      content: 'Glwa pou Bondye!',
      churchId: 'CH_OK',
      userIds: ['MEM-1'],
      targetType: 'announcement',
      lastCommentTimestampMs: nowMs - 8_000,
      nowMs,
      customConfig: baseConfig,
    });
    assert(slowBlocked.allowed === false && slowBlocked.reasonCode === 'slow_mode', 'Slow mode within cooldown must block');
    assert(slowBlocked.remainingCooldownSeconds === 12, 'Remaining cooldown seconds must be 12');

    // External URL blocking
    const linkBlocked = devStorage.evaluateCommentAgainstModeration({
      content: 'Gade sa https://evil-spam.example.com kounye a',
      churchId: 'CH_OK',
      userIds: ['MEM-1'],
      targetType: 'announcement',
      customConfig: baseConfig,
    });
    assert(linkBlocked.allowed === false && linkBlocked.reasonCode === 'external_link', 'External link must be blocked');

    // Profanity / banned keyword blocking
    const profanityBlocked = devStorage.evaluateCommentAgainstModeration({
      content: 'Pa koute scam sa a',
      churchId: 'CH_OK',
      userIds: ['MEM-1'],
      targetType: 'announcement',
      customConfig: baseConfig,
    });
    assert(profanityBlocked.allowed === false && profanityBlocked.reasonCode === 'profanity_keyword', 'Banned keyword must be blocked');

    // Clean valid comment
    const cleanPass = devStorage.evaluateCommentAgainstModeration({
      content: 'Mèsi anpil Pastè, Bondye beni legliz la!',
      churchId: 'CH_OK',
      userIds: ['MEM-1'],
      targetType: 'announcement',
      lastCommentTimestampMs: nowMs - 25_000,
      nowMs,
      customConfig: baseConfig,
    });
    assert(cleanPass.allowed === true, 'Clean valid comment after cooldown must be allowed');
  });

  await runTest('39. buildAnnouncementCommentFirestorePayload & buildCommentRedactionUpdatePayload match Android + firestore.rules schema', async () => {
    const {
      buildAnnouncementCommentFirestorePayload,
      buildCommentRedactionUpdatePayload,
    } = await import('../services/firestoreService');
    const { REDACTED_COMMENT_PLACEHOLDER, detectSuspectCommentReasons } = await import('../utils/developerStorage');

    const payload = buildAnnouncementCommentFirestorePayload(
      {
        id: 'comm-1',
        targetId: 'ann-123',
        churchId: 'CH001',
        userId: 'mem-42',
        userName: 'Sè Marthe',
        userPhotoUrl: 'https://example.com/marthe.jpg',
        content: 'Amen, glwa pou Bondye!',
        author: 'Sè Marthe',
        text: 'Amen, glwa pou Bondye!',
        isDemo: false,
      } as any,
      '2026-11-16T00:00:00Z'
    );
    assert(payload !== null, 'Payload must not be null');
    const allowedKeys = new Set([
      'targetId',
      'churchId',
      'userId',
      'userName',
      'userPhotoUrl',
      'content',
      'createdAt',
    ]);
    for (const k of Object.keys(payload!)) {
      assert(allowedKeys.has(k), `Disallowed key "${k}" emitted in announcement_comments payload`);
    }
    assert(payload!.targetId === 'ann-123', 'targetId preserved');
    assert(payload!.churchId === 'CH001', 'churchId preserved');
    assert(payload!.userId === 'mem-42', 'userId preserved');
    assert(payload!.userName === 'Sè Marthe', 'userName preserved');
    assert(payload!.userPhotoUrl === 'https://example.com/marthe.jpg', 'userPhotoUrl preserved');
    assert(payload!.content === 'Amen, glwa pou Bondye!', 'content preserved');

    const redactPayload = buildCommentRedactionUpdatePayload(REDACTED_COMMENT_PLACEHOLDER);
    assert(
      Object.keys(redactPayload).length === 1 && Object.keys(redactPayload)[0] === 'content',
      'Redaction update payload MUST contain ONLY the "content" key'
    );
    assert(redactPayload.content === REDACTED_COMMENT_PLACEHOLDER, 'Redaction placeholder must match');

    const suspect = detectSuspectCommentReasons(
      'CLICK WWW.FREE-CRYPTO.BIZ RIGHT NOW!!!!!!!',
      'mem-99',
      { blockedKeywords: ['crypto'], mutedMemberIds: ['mem-99'] }
    );
    assert(suspect.isSuspect === true, 'URL + keyword + spam must be flagged as suspect');
    assert(suspect.hasExternalLink === true, 'External link detected');
    assert(suspect.isMutedUser === true, 'Muted user detected');

    const redactedAnalysis = detectSuspectCommentReasons(REDACTED_COMMENT_PLACEHOLDER, 'mem-99');
    assert(redactedAnalysis.isRedacted === true && redactedAnalysis.isSuspect === false, 'Redacted comment must not show as active suspect');
  });

  // -----------------------------------------------------------------
  // SUITE 13: MEMBER VERIFICATION ENGINE, MASKING & URL/QR PARSING
  // -----------------------------------------------------------------
  console.log('\n--- Suite 13: Member Verification Engine, Masking & URL/QR Parsing ---');

  await runTest('40. sanitizeMemberVerificationConfig preserves defaults, dedups disabled churches, and caps authority notice', async () => {
    const devStorage = await import('../utils/developerStorage');

    const defaults = devStorage.sanitizeMemberVerificationConfig(undefined);
    assert(defaults.enabled === true, 'enabled must default to true');
    assert(defaults.enforceActiveStatusCheck === true, 'enforceActiveStatusCheck must default to true');
    assert(defaults.showMemberPhoto === true, 'showMemberPhoto must default to true');
    assert(defaults.showLegalDocuments === true, 'showLegalDocuments must default to true');
    assert(defaults.maskLegalDocumentNumber === false, 'maskLegalDocumentNumber must default to false');
    assert(defaults.showChurchContactInfo === true, 'showChurchContactInfo must default to true');
    assert(defaults.showChurchRncBadge === true, 'showChurchRncBadge must default to true');
    assert(defaults.allowPrintAndShare === true, 'allowPrintAndShare must default to true');
    assert(Array.isArray(defaults.disabledChurchIds) && defaults.disabledChurchIds.length === 0, 'disabledChurchIds defaults to empty array');

    const sanitized = devStorage.sanitizeMemberVerificationConfig({
      enabled: false,
      maskLegalDocumentNumber: true,
      disabledChurchIds: ['ch001', 'CH001', ' ch002 '],
      customAuthorityNotice: 'A'.repeat(700),
    });
    assert(sanitized.enabled === false, 'enabled=false must persist');
    assert(sanitized.maskLegalDocumentNumber === true, 'maskLegalDocumentNumber=true must persist');
    assert(sanitized.disabledChurchIds.length === 2, 'disabledChurchIds must deduplicate case-insensitively');
    assert(sanitized.customAuthorityNotice!.length === 600, 'customAuthorityNotice must cap at 600 characters');
  });

  await runTest('41. maskLegalDocumentNumberValue protects short and formatted CIN/NIF/Passport numbers cleanly', async () => {
    const devStorage = await import('../utils/developerStorage');

    assert(devStorage.maskLegalDocumentNumberValue('') === '', 'Empty legal number must return empty string');
    assert(devStorage.maskLegalDocumentNumberValue('1234') === '••••', '4-char doc number must mask completely');
    assert(
      devStorage.maskLegalDocumentNumberValue('001-234-567-8') === '•••-•••-•67-8',
      'Formatted CIN/NIF must mask prefix digits while preserving separators and last 4 chars'
    );
    assert(
      devStorage.maskLegalDocumentNumberValue('AB987654') === '••••7654',
      'Alphanumeric passport must mask prefix and keep last 4 chars visible'
    );
  });

  await runTest('42. parseMemberVerificationLookupInput parses raw codes, canonical QR tokens, and full verification URLs', async () => {
    const devStorage = await import('../utils/developerStorage');

    const rawParsed = devStorage.parseMemberVerificationLookupInput('  ch001-ab12  ');
    assert(rawParsed.memberCode === 'ch001-ab12' && !rawParsed.churchId, 'Raw code must trim without inventing churchId');

    const canonicalParsed = devStorage.parseMemberVerificationLookupInput('CHURCH:ch005|MEMBER:ch005-xy89');
    assert(
      canonicalParsed.churchId === 'ch005' && canonicalParsed.memberCode === 'ch005-xy89',
      'Canonical QR payload must extract both churchId and memberCode'
    );

    const urlParsed = devStorage.parseMemberVerificationLookupInput(
      'https://verify.omnichurch.download/?verify=1&church=ch010&member=evg-0042&lang=ht'
    );
    assert(
      urlParsed.churchId === 'ch010' && urlParsed.memberCode === 'evg-0042',
      'Full verification URL must extract church and member query parameters'
    );

    const hashUrlParsed = devStorage.parseMemberVerificationLookupInput(
      'https://verify.omnichurch.download/#/?verify=1&church=CH022&member=SIN-0901'
    );
    assert(
      hashUrlParsed.churchId === 'CH022' && hashUrlParsed.memberCode === 'SIN-0901',
      'Hash-based verification URL must also extract church and member parameters'
    );
  });

  // -----------------------------------------------------------------
  // SUITE 14: QR SCANNER PIPELINE, PAYLOAD PARITY & RACE MUTEX
  // -----------------------------------------------------------------
  console.log('\n--- Suite 14: QR Scanner Pipeline, Payload Parity & Race Mutex ---');

  await runTest('43. parseScanToken & parseCanonicalQrToken handle hash URLs, JSON payloads, scanner control chars, and mixed-case pipes', async () => {
    const storage = await import('../utils/storage');
    const qrSync = await import('../utils/qrSyncLayer');

    // Hash-routed verification URL with trailing hardware scanner newline
    const hashUrl = 'https://verify.omnichurch.download/#/?verify=1&church=CH_ALPHA&member=alp-0001\r\n';
    const parsedStorageHash = storage.parseScanToken(hashUrl);
    const parsedQrHash = qrSync.parseCanonicalQrToken(hashUrl);
    assert(
      parsedStorageHash.churchId === 'CH_ALPHA' && parsedStorageHash.memberId === 'alp-0001',
      `parseScanToken must parse hash verify URL (got church=${parsedStorageHash.churchId}, member=${parsedStorageHash.memberId})`
    );
    assert(
      parsedQrHash.churchId === 'CH_ALPHA' &&
        parsedQrHash.memberId === 'alp-0001' &&
        parsedQrHash.format === 'url',
      `parseCanonicalQrToken must parse hash verify URL (got church=${parsedQrHash.churchId}, member=${parsedQrHash.memberId}, format=${parsedQrHash.format})`
    );

    // JSON QR payload
    const jsonPayload = '{"churchId":"ch_json_1","memberId":"evg-0042"}\n';
    const parsedStorageJson = storage.parseScanToken(jsonPayload);
    const parsedQrJson = qrSync.parseCanonicalQrToken(jsonPayload);
    assert(
      parsedStorageJson.churchId === 'ch_json_1' && parsedStorageJson.memberId === 'evg-0042',
      'parseScanToken must extract churchId and memberId from JSON QR payload'
    );
    assert(
      parsedQrJson.churchId === 'ch_json_1' &&
        parsedQrJson.memberId === 'evg-0042' &&
        parsedQrJson.format === 'url',
      'parseCanonicalQrToken must extract churchId and memberId from JSON QR payload'
    );

    // Mixed-case canonical pipe token with tab/CR control characters
    const pipeToken = '\tchurch:ch_pipe_9|member:ch009-ab12\r\n';
    const parsedStoragePipe = storage.parseScanToken(pipeToken);
    const parsedQrPipe = qrSync.parseCanonicalQrToken(pipeToken);
    assert(
      parsedStoragePipe.churchId === 'ch_pipe_9' && parsedStoragePipe.memberId === 'ch009-ab12',
      'parseScanToken must parse mixed-case canonical pipe token after control-char stripping'
    );
    assert(
      parsedQrPipe.churchId === 'ch_pipe_9' &&
        parsedQrPipe.memberId === 'ch009-ab12' &&
        parsedQrPipe.format === 'pipe_token',
      'parseCanonicalQrToken must parse mixed-case canonical pipe token as pipe_token format'
    );
  });

  await runTest('44. unifyMemberProfile synthesizes canonical barcodeToken when missing and preserves existing token', async () => {
    const { unifyMemberProfile } = await import('../utils/storage');

    const legacyMember: any = {
      id: 'mem-legacy-qr',
      memberId: 'evg-777',
      churchId: 'CH_QR_SYNC',
      fullName: 'Frè Legacy',
      department: 'Koral',
      role: 'Manm',
      status: 'active',
    };
    const unified = unifyMemberProfile(legacyMember, null);
    assert(
      unified.barcodeToken === 'CHURCH:CH_QR_SYNC|MEMBER:EVG-777',
      `Expected synthesized canonical barcodeToken, got "${unified.barcodeToken}"`
    );

    const explicitMember: any = {
      ...legacyMember,
      barcodeToken: 'CHURCH:CH_QR_SYNC|MEMBER:CUSTOM-99',
    };
    const preserved = unifyMemberProfile(explicitMember, null);
    assert(
      preserved.barcodeToken === 'CHURCH:CH_QR_SYNC|MEMBER:CUSTOM-99',
      'Existing barcodeToken must be preserved cleanly'
    );
  });

  await runTest('45. recordAttendanceScanUnified blocks concurrent double-scan race and checks in hash-URL cross-church visitor', async () => {
    const prevNavigator = (globalThis as any).navigator;
    (globalThis as any).navigator = { onLine: false };
    try {
      const storage = await import('../utils/storage');
      const qrSync = await import('../utils/qrSyncLayer');

      localStorage.clear();

      const churchOrigin: any = {
        id: 'CH_QR_ORG',
        code: 'QRO',
        name: 'Legliz Orijin QR',
        pastor: 'Pastè Jean',
        address: 'Delmas',
        city: 'Pòtoprens',
        phone: '50933330001',
        email: 'qro@test.org',
        motto: 'Lafwa',
        themeColor: 'indigo',
        logoIcon: 'Church',
        createdAt: '2026-01-01',
      };
      const churchHost: any = {
        id: 'CH_QR_HOST',
        code: 'QRH',
        name: 'Legliz Rekèy QR',
        pastor: 'Pastè Marc',
        address: 'Petyonvil',
        city: 'Pòtoprens',
        phone: '50933330002',
        email: 'qrh@test.org',
        motto: 'Lapè',
        themeColor: 'indigo',
        logoIcon: 'Church',
        createdAt: '2026-01-01',
      };
      storage.saveToStorage(storage.STORAGE_KEYS.CHURCHES, [churchOrigin, churchHost]);

      const hostMember: any = {
        id: 'mem-qrh-1',
        churchId: 'CH_QR_HOST',
        memberId: 'QRH-1001',
        fullName: 'Sè Nadine',
        department: 'Akèy',
        role: 'Manm',
        status: 'active',
        joinedDate: '2026-01-01',
      };
      const originVisitor: any = {
        id: 'mem-qro-1',
        churchId: 'CH_QR_ORG',
        memberId: 'QRO-2002',
        fullName: 'Frè Daniel',
        department: 'Koral',
        role: 'Manm',
        status: 'active',
        joinedDate: '2026-01-01',
      };
      storage.saveToStorage(storage.STORAGE_KEYS.MEMBERS, [hostMember, originVisitor]);

      const todayStr = new Date().toISOString().split('T')[0];
      const hostService: any = {
        id: 'srv-qrh-today',
        churchId: 'CH_QR_HOST',
        title: 'Sèvis QR Live',
        category: 'culte_dimanche',
        date: todayStr,
        startTime: '08:00',
        endTime: '23:59',
        isOpenForAttendance: true,
        wasOpenedForAttendance: true,
        isPermanentlyEnded: false,
      };
      storage.saveToStorage(storage.STORAGE_KEYS.SERVICES, [hostService]);

      // 1. Concurrent double-scan with the exact same QR code must yield 1 success and 1 blocked duplicate
      const qrToken = 'CHURCH:CH_QR_HOST|MEMBER:QRH-1001\r\n';
      const [firstScan, secondScan] = await Promise.all([
        qrSync.recordAttendanceScanUnified({
          currentChurchId: 'CH_QR_HOST',
          rawCode: qrToken,
          serviceId: hostService.id,
        }),
        qrSync.recordAttendanceScanUnified({
          currentChurchId: 'CH_QR_HOST',
          rawCode: qrToken,
          serviceId: hostService.id,
        }),
      ]);
      const successes = [firstScan, secondScan].filter((r) => r.success);
      const duplicates = [firstScan, secondScan].filter((r) => r.duplicate);
      assert(successes.length === 1 && duplicates.length === 1, 'Concurrent double-scan must produce 1 success and 1 duplicate');

      // 2. Hash-based verification URL from cross-church visitor checks in cleanly
      const visitorHashUrl = 'https://verify.omnichurch.download/#/?verify=1&church=CH_QR_ORG&member=qro-2002';
      const visitorRes = await qrSync.recordAttendanceScanUnified({
        currentChurchId: 'CH_QR_HOST',
        rawCode: visitorHashUrl,
        serviceId: hostService.id,
      });
      assert(visitorRes.success === true, 'Hash verification URL visitor scan must succeed');
      assert(visitorRes.isVisitor === true, 'Cross-church hash URL scan must mark isVisitor=true');
      assert(visitorRes.homeChurchId === 'CH_QR_ORG', 'Visitor result must preserve homeChurchId');
    } finally {
      (globalThis as any).navigator = prevNavigator;
    }
  });

  // -----------------------------------------------------------------
  // SUITE 15: PRODUCTION AUTHORITY VERIFICATION & 4-ROLE QR INTEGRITY
  // -----------------------------------------------------------------
  console.log('\n[Suite 15] Production Authority Verification & 4-Role QR Integrity');

  await runTest('46. resolvePublicVerificationOrigin & getMemberVerificationUrl enforce official https://verify.omnichurch.download origin and support explicit overrides', async () => {
    const storage = await import('../utils/storage');
    const qrSync = await import('../utils/qrSyncLayer');
    const prevWindow = (globalThis as any).window;

    try {
      localStorage.clear();

      // Case A: Default official verification domain stays https://verify.omnichurch.download even inside dev preview
      (globalThis as any).window = {
        location: { origin: 'https://ais-dev-rx56dvjvhjiqeufracetxr-412075223902.us-east5.run.app' },
      };
      const defaultOrigin = storage.resolvePublicVerificationOrigin();
      assert(
        defaultOrigin === 'https://verify.omnichurch.download',
        `Expected official verification origin https://verify.omnichurch.download, got "${defaultOrigin}"`
      );
      const defaultUrl = storage.getMemberVerificationUrl({
        id: 'm-1',
        churchId: 'CH_PROD_1',
        memberId: 'PRD-001',
      });
      assert(
        defaultUrl === 'https://verify.omnichurch.download/?verify=1&church=CH_PROD_1&member=PRD-001',
        `Unexpected default verification URL: "${defaultUrl}"`
      );
      assert(
        qrSync.buildCanonicalQrPayload('CH_PROD_1', 'PRD-001') ===
          'https://verify.omnichurch.download/?verify=1&church=CH_PROD_1&member=PRD-001',
        'buildCanonicalQrPayload must default to https://verify.omnichurch.download'
      );

      // Case B: Saved developer domain override is respected cleanly
      localStorage.setItem(
        'omnichurch_dev_settings',
        JSON.stringify({
          memberVerification: {
            verificationBaseUrl: 'https://custom-verify.omnichurch.download/',
          },
        })
      );
      assert(
        storage.resolvePublicVerificationOrigin() === 'https://custom-verify.omnichurch.download',
        'Saved developer verificationBaseUrl must override cleanly without trailing slash'
      );

      // Case C: Explicit override argument takes precedence over stored setting
      assert(
        storage.getMemberVerificationUrl(
          { id: 'm-1', churchId: 'CH_PROD_1', memberId: 'PRD-001' },
          'https://verify.omnichurch.download/'
        ) === 'https://verify.omnichurch.download/?verify=1&church=CH_PROD_1&member=PRD-001',
        'Explicit overrideBaseUrl must resolve cleanly'
      );
    } finally {
      localStorage.clear();
      (globalThis as any).window = prevWindow;
    }
  });

  await runTest('47. Single production QR URL preserves all 4 multi-role responsibilities (Authority, Host Check-In, Cross-Church Visitor, Dev/Member Lookup)', async () => {
    const prevNavigator = (globalThis as any).navigator;
    const prevWindow = (globalThis as any).window;
    (globalThis as any).navigator = { onLine: false };
    (globalThis as any).window = {
      location: { origin: 'https://ais-dev-rx56dvjvhjiqeufracetxr-412075223902.us-east5.run.app' },
    };

    try {
      const storage = await import('../utils/storage');
      const qrSync = await import('../utils/qrSyncLayer');
      const devStorage = await import('../utils/developerStorage');

      localStorage.clear();

      const chHome: any = {
        id: 'CH_HOME_4R',
        code: 'HM4',
        name: 'Legliz Matris',
        pastor: 'Pastè Elie',
        address: 'Delmas 75',
        city: 'Pòtoprens',
        phone: '50944440001',
        email: 'hm4@test.org',
        motto: 'Verite',
        themeColor: 'indigo',
        logoIcon: 'Church',
        createdAt: '2026-01-01',
      };
      const chHost: any = {
        id: 'CH_HOST_4R',
        code: 'HS4',
        name: 'Legliz Akèy',
        pastor: 'Pastè Jude',
        address: 'Tabarre',
        city: 'Pòtoprens',
        phone: '50944440002',
        email: 'hs4@test.org',
        motto: 'Gras',
        themeColor: 'indigo',
        logoIcon: 'Church',
        createdAt: '2026-01-01',
      };
      storage.saveToStorage(storage.STORAGE_KEYS.CHURCHES, [chHome, chHost]);

      const homeMember: any = {
        id: 'mem-4r-1',
        churchId: 'CH_HOME_4R',
        memberId: 'HM4-0088',
        fullName: 'Sè Esther Jean',
        department: 'Koral',
        role: 'Chantre',
        status: 'active',
        joinedDate: '2026-01-01',
        barcodeToken: 'CHURCH:CH_HOME_4R|MEMBER:HM4-0088',
      };
      storage.saveToStorage(storage.STORAGE_KEYS.MEMBERS, [homeMember]);

      const todayStr = new Date().toISOString().split('T')[0];
      storage.saveToStorage(storage.STORAGE_KEYS.SERVICES, [
        {
          id: 'srv-hm4',
          churchId: 'CH_HOME_4R',
          title: 'Kilt Maten',
          category: 'culte_dimanche',
          date: todayStr,
          startTime: '08:00',
          endTime: '23:59',
          isOpenForAttendance: true,
          wasOpenedForAttendance: true,
          isPermanentlyEnded: false,
        },
        {
          id: 'srv-hs4',
          churchId: 'CH_HOST_4R',
          title: 'Konvansyon Aswè',
          category: 'culte_dimanche',
          date: todayStr,
          startTime: '08:00',
          endTime: '23:59',
          isOpenForAttendance: true,
          wasOpenedForAttendance: true,
          isPermanentlyEnded: false,
        },
      ]);

      // Canonical QR URL generated on Digital/Physical card
      const cardQrUrl = storage.getMemberVerificationUrl(homeMember);

      // Role 1 & Role 4: Authority verification & Developer Inspector lookup extraction
      const authorityLookup = devStorage.parseMemberVerificationLookupInput(cardQrUrl);
      assert(
        authorityLookup.churchId === 'CH_HOME_4R' && authorityLookup.memberCode === 'HM4-0088',
        'Authority/Dev lookup parser must extract churchId and memberCode from production QR URL'
      );

      // Role 2: Host/Home Church Attendance Check-In
      const parsedForScan = qrSync.parseCanonicalQrToken(cardQrUrl);
      assert(
        parsedForScan.format === 'url' && parsedForScan.churchId === 'CH_HOME_4R' && parsedForScan.memberId === 'HM4-0088',
        'parseCanonicalQrToken must parse production QR URL cleanly'
      );
      const homeCheckIn = await qrSync.recordAttendanceScanUnified({
        currentChurchId: 'CH_HOME_4R',
        rawCode: cardQrUrl,
        serviceId: 'srv-hm4',
      });
      assert(
        homeCheckIn.success === true && !homeCheckIn.isVisitor,
        'Home church scan using production QR URL must check in regular member'
      );

      // Role 3: Cross-Church Visitor Check-In using the exact same card QR URL
      const crossCheckIn = await qrSync.recordAttendanceScanUnified({
        currentChurchId: 'CH_HOST_4R',
        rawCode: cardQrUrl,
        serviceId: 'srv-hs4',
      });
      assert(
        crossCheckIn.success === true &&
          crossCheckIn.isVisitor === true &&
          crossCheckIn.homeChurchId === 'CH_HOME_4R',
        'Foreign church scan using the exact same production QR URL must record Visitor check-in cleanly'
      );
    } finally {
      (globalThis as any).navigator = prevNavigator;
      (globalThis as any).window = prevWindow;
    }
  });

  // -----------------------------------------------------------------
  // SUITE 16: BIDIRECTIONAL REAL-TIME SYNC, DELETION PROPAGATION & SECURITY HARDENING
  // -----------------------------------------------------------------
  console.log('\n--- Suite 16: Bidirectional Real-Time Sync, Deletion Propagation & Security ---');

  await runTest('48. reconcileServerSnapshotWithLocal purges remotely deleted entities without resurrection while preserving offline pending uploads', async () => {
    const storage = await import('../utils/storage');
    localStorage.clear();

    const deletedSet = new Set<string>();
    const pendingSet = new Set<string>(['srv-offline-draft']);

    const remoteItems = [
      { id: 'srv-alive', title: 'Sèvis Dimanch Maten', updated: 2 },
    ];
    const localItems = [
      { id: 'srv-alive', title: 'Sèvis Dimanch (Old)', updated: 1 },
      { id: 'srv-deleted-mobile', title: 'Sèvis Siprime sou Mobil', updated: 1 },
      { id: 'srv-offline-draft', title: 'Sèvis Kreye Offline', updated: 1 },
    ];

    // 1. Offline / cache snapshot must NOT purge non-pending local items prematurely
    const cachePass = storage.reconcileServerSnapshotWithLocal({
      remoteItems,
      localItems,
      meta: { fromCache: true, hasPendingWrites: false, removedIds: [] },
      isMarkedDeleted: (item) => deletedSet.has(item.id),
      markDeleted: (item) => { deletedSet.add(item.id); },
      isDemo: () => false,
      isPendingUpload: (id) => pendingSet.has(id),
    });
    assert(cachePass.merged.length === 3, 'Cache snapshot keeps unconfirmed local items temporarily without auto-uploading them');
    assert(cachePass.pendingToUpload.length === 1 && cachePass.pendingToUpload[0].id === 'srv-offline-draft', 'Only active pendingLocalUpload item is queued for upload');
    assert(cachePass.removedIdsProcessed.length === 0, 'Cache snapshot must not emit server deletions');

    // 2. Authoritative server snapshot without srv-deleted-mobile MUST purge it permanently and mark tombstone
    const serverPass = storage.reconcileServerSnapshotWithLocal({
      remoteItems,
      localItems,
      meta: { fromCache: false, hasPendingWrites: false, removedIds: ['srv-deleted-mobile'] },
      isMarkedDeleted: (item) => deletedSet.has(item.id),
      markDeleted: (item) => { deletedSet.add(item.id); },
      isDemo: () => false,
      isPendingUpload: (id) => pendingSet.has(id),
    });
    assert(!serverPass.merged.some((s) => s.id === 'srv-deleted-mobile'), 'Remotely deleted service must be purged from merged output');
    assert(deletedSet.has('srv-deleted-mobile'), 'Remotely deleted service must receive deletion tombstone');
    assert(serverPass.merged.some((s) => s.id === 'srv-offline-draft'), 'Unsynced local draft with pendingLocalUpload flag stays preserved');
    assert(serverPass.removedIdsProcessed.includes('srv-deleted-mobile'), 'removedIdsProcessed records purged ID');
  });

  await runTest('49. syncLocalCommentsFromServerSnapshot removes deleted comments and updates redacted content in localStorage', async () => {
    const storage = await import('../utils/storage');
    localStorage.clear();

    const initialInteractions = {
      'ann-live-1': {
        likes: 2,
        userLiked: true,
        comments: [
          { id: 'c-keep', targetId: 'ann-live-1', churchId: 'CH_SYNC', userName: 'Paul', content: 'Orijiinal tèks' },
          { id: 'c-deleted-remote', targetId: 'ann-live-1', churchId: 'CH_SYNC', userName: 'Jean', content: 'Sa te siprime' },
        ],
      },
      'ann-other-church': {
        likes: 1,
        userLiked: false,
        comments: [
          { id: 'c-other', targetId: 'ann-other-church', churchId: 'CH_OTHER', userName: 'Luc', content: 'Lòt legliz' },
        ],
      },
    };
    storage.saveToStorage(storage.STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS, initialInteractions);

    storage.syncLocalCommentsFromServerSnapshot(
      'CH_SYNC',
      [
        {
          id: 'c-keep',
          targetId: 'ann-live-1',
          announcementId: 'ann-live-1',
          churchId: 'CH_SYNC',
          userName: 'Paul',
          author: 'Paul',
          content: '[Kòmantè modere]',
          text: '[Kòmantè modere]',
          time: '10:00',
          avatarInitials: 'P',
        } as any,
      ],
      { fromCache: false, hasPendingWrites: false, removedIds: ['c-deleted-remote'] }
    );

    const updated = storage.getAnnouncementInteractions();
    assert(updated['ann-live-1'].comments.length === 1, 'Deleted comment must be removed from local cache');
    assert(updated['ann-live-1'].comments[0].id === 'c-keep', 'Surviving comment must remain');
    assert(updated['ann-live-1'].comments[0].content === '[Kòmantè modere]', 'Redacted comment text must sync locally');
    assert(updated['ann-other-church'].comments.length === 1, 'Comments belonging to other churches must stay isolated and untouched');
  });

  await runTest('50. markChurchAsDeleted and pendingLocalUpload lifecycle prevent stale draft resurrection', async () => {
    const storage = await import('../utils/storage');
    localStorage.clear();

    const church1: any = {
      id: 'CH_SYNC_1',
      code: 'SY1',
      name: 'Legliz Senkro',
      pastor: 'Pastè Marc',
      address: 'Delmas',
      city: 'Pòtoprens',
      phone: '50911112222',
      email: 'sy1@test.org',
      motto: 'Lafwa',
      themeColor: 'indigo',
      logoIcon: 'Church',
      createdAt: '2026-01-01',
    };
    storage.saveToStorage(storage.STORAGE_KEYS.CHURCHES, [church1]);
    assert(storage.getAllChurches().some((c) => c.id === 'CH_SYNC_1'), 'Active church appears before deletion');

    storage.markPendingLocalUpload('member', 'm-draft-1');
    assert(storage.hasPendingLocalUpload('member', 'm-draft-1', 60_000) === true, 'Fresh pending upload marker is active');
    assert(storage.hasPendingLocalUpload('member', 'm-draft-1', -1) === false, 'Expired pending upload marker clears automatically');

    storage.markChurchAsDeleted('CH_SYNC_1');
    assert(storage.isChurchMarkedDeleted('CH_SYNC_1') === true, 'Church tombstone stored');
    assert(!storage.getAllChurches().some((c) => c.id === 'CH_SYNC_1'), 'Tombstoned church excluded from getAllChurches');
  });

  await runTest('51. normalizeSafeHttpUrl and isSafeExternalUrl block XSS schemes while allowing https/http/mailto', async () => {
    const safe = await import('../utils/safeExternalLink');
    assert(safe.normalizeSafeHttpUrl('https://omnichurch.download') === 'https://omnichurch.download', 'Allows https URL');
    assert(safe.normalizeSafeHttpUrl('omnichurch.download/app') === 'https://omnichurch.download/app', 'Prepends https cleanly to bare domain');
    assert(safe.isSafeExternalUrl('mailto:support@omnichurch.download') === true, 'Allows mailto link');
    assert(safe.normalizeSafeHttpUrl('javascript:alert(1)') === null, 'Blocks javascript: XSS payload');
    assert(safe.normalizeSafeHttpUrl('JAVASCRIPT:window.location="evil"') === null, 'Blocks uppercase JAVASCRIPT: XSS payload');
    assert(safe.normalizeSafeHttpUrl('data:text/html,<script>alert(1)</script>') === null, 'Blocks data: HTML payload');
  });

  // -----------------------------------------------------------------
  // SUITE 17: LEGAL DOCUMENTS ROUTING & URL PARSER
  // -----------------------------------------------------------------
  console.log('\n--- Suite 17: Legal Documents Routing & URL Parser ---');

  await runTest('52. parseLegalRouteFromUrl resolves ?page, ?legal, and #hash fragments for privacy and terms accurately', async () => {
    const legal = await import('../utils/legalRoutes');

    assert(legal.parseLegalRouteFromUrl('?page=privacy', '') === 'privacy', 'Parses ?page=privacy');
    assert(legal.parseLegalRouteFromUrl('?legal=privacy-policy', '') === 'privacy', 'Parses ?legal=privacy-policy');
    assert(legal.parseLegalRouteFromUrl('?privacy', '') === 'privacy', 'Parses ?privacy shorthand');
    assert(legal.parseLegalRouteFromUrl('', '#privacy') === 'privacy', 'Parses #privacy hash');
    assert(legal.parseLegalRouteFromUrl('', '#/privacy-policy') === 'privacy', 'Parses #/privacy-policy hash');
    assert(legal.parseLegalRouteFromUrl('', '', '/privacy-policy') === 'privacy', 'Parses /privacy-policy pathname');
    assert(legal.parseLegalRouteFromUrl('', '', '/policy-privacy') === 'privacy', 'Parses /policy-privacy pathname');
    assert(legal.parseLegalRouteFromUrl('', '', '/privacy/') === 'privacy', 'Parses /privacy/ pathname with trailing slash');

    assert(legal.parseLegalRouteFromUrl('?page=terms', '') === 'terms', 'Parses ?page=terms');
    assert(legal.parseLegalRouteFromUrl('?legal=terms-of-service', '') === 'terms', 'Parses ?legal=terms-of-service');
    assert(legal.parseLegalRouteFromUrl('?page=tos', '') === 'terms', 'Parses ?page=tos');
    assert(legal.parseLegalRouteFromUrl('', '#terms') === 'terms', 'Parses #terms hash');
    assert(legal.parseLegalRouteFromUrl('', '', '/terms-of-service') === 'terms', 'Parses /terms-of-service pathname');
    assert(legal.parseLegalRouteFromUrl('', '', '/terms/') === 'terms', 'Parses /terms/ pathname');

    assert(legal.parseLegalRouteFromUrl('?verify=1&member=CH001-01', '', '/') === null, 'Does not misinterpret verification URLs');
    assert(legal.parseLegalRouteFromUrl('', '#dev', '/') === null, 'Does not misinterpret developer route hash');
    assert(
      legal.getLegalDocumentPath('privacy') === '/privacy-policy',
      'Returns canonical /privacy-policy path'
    );
    assert(
      legal.getLegalDocumentPath('terms') === '/terms-of-service',
      'Returns canonical /terms-of-service path'
    );
    assert(
      legal.getLegalDocumentUrl('privacy', 'https://omnichurch.download/') === 'https://omnichurch.download/privacy-policy',
      'Builds clean /privacy-policy URL without trailing slash duplication'
    );
    assert(
      legal.getLegalDocumentUrl('terms', 'https://omnichurch.download') === 'https://omnichurch.download/terms-of-service',
      'Builds clean /terms-of-service URL'
    );
    assert(
      legal.getLegalDocumentUrl('privacy') === '',
      'getLegalDocumentUrl without explicit origin MUST return empty string so dev URLs never leak'
    );
  });

  await runTest('53. sanitizeLegalConfig keeps URLs empty by default and parsePlainLegalBlocks formats headings, paragraphs & lists cleanly', async () => {
    const legal = await import('../utils/legalRoutes');

    const emptyCfg = legal.sanitizeLegalConfig(undefined);
    assert(emptyCfg.officialPrivacyUrl === '', 'Default officialPrivacyUrl must be strictly empty');
    assert(emptyCfg.officialTermsUrl === '', 'Default officialTermsUrl must be strictly empty');
    assert(emptyCfg.useExternalLinksOnClick === false, 'Default useExternalLinksOnClick must be false');

    const cleanedCfg = legal.sanitizeLegalConfig({
      officialPrivacyUrl: '  javascript:alert(1)  ',
      officialTermsUrl: '  https://omnichurch.download/terms  ',
      useExternalLinksOnClick: true,
      customPrivacy: {
        ht: { title: '  Politik Pèsonalize  ', content: 'Entwodiksyon\n\n## 1. Sekirite\n- Done chifre' },
      },
    });
    assert(cleanedCfg.officialPrivacyUrl === '', 'Dangerous javascript URL must be rejected to empty string');
    assert(cleanedCfg.officialTermsUrl === 'https://omnichurch.download/terms', 'Valid HTTPS URL preserved cleanly');
    assert(cleanedCfg.customPrivacy?.ht?.title === 'Politik Pèsonalize', 'Custom title trimmed and preserved');

    const blocks = legal.parsePlainLegalBlocks(
      'Premye paragraf.\n\n## 1. Enfòmasyon Nou Kolekte\n\n- Non konplè\n- Nimewo telefòn'
    );
    assert(blocks.length === 3, `Expected 3 parsed blocks, got ${blocks.length}`);
    assert(blocks[0].type === 'paragraph' && blocks[0].text === 'Premye paragraf.', 'First block is paragraph');
    assert(blocks[1].type === 'heading' && blocks[1].text === '1. Enfòmasyon Nou Kolekte', 'Second block is heading');
    assert(blocks[2].type === 'list' && blocks[2].items.length === 2, 'Third block is 2-item list');
  });

  // -----------------------------------------------------------------
  // SUITE 18: SMART LANGUAGE AUTO-DETECTION & DEVELOPER DEFAULT CONFIG
  // -----------------------------------------------------------------
  console.log('\n--- Suite 18: Smart Language Auto-Detection & Default Config ---');

  await runTest('54. sanitizeLanguageConfig, getCountryFromTimeZone, and mapCountryCodeToLanguage resolve countries accurately', async () => {
    const langDet = await import('../utils/languageDetection');

    const defaultCfg = langDet.sanitizeLanguageConfig(undefined);
    assert(defaultCfg.mode === 'auto', 'Default mode should be auto');
    assert(defaultCfg.defaultLanguage === 'ht', 'Default language should be ht');
    assert(defaultCfg.autoDetectByCountry === true, 'Default autoDetectByCountry should be true');

    const customCfg = langDet.sanitizeLanguageConfig({
      mode: 'manual',
      defaultLanguage: 'es',
      autoDetectByCountry: false,
      showInitialModalOnFirstVisit: false,
    });
    assert(customCfg.mode === 'manual', 'Manual mode preserved');
    assert(customCfg.defaultLanguage === 'es', 'Default es preserved');
    assert(customCfg.autoDetectByCountry === false, 'autoDetectByCountry false preserved');
    assert(customCfg.showInitialModalOnFirstVisit === false, 'showInitialModalOnFirstVisit false preserved');

    assert(langDet.getCountryFromTimeZone('America/Santo_Domingo') === 'DO', 'Santo Domingo -> DO');
    assert(langDet.getCountryFromTimeZone('America/Port-au-Prince') === 'HT', 'Port-au-Prince -> HT');
    assert(langDet.getCountryFromTimeZone('Europe/Paris') === 'FR', 'Paris -> FR');
    assert(langDet.getCountryFromTimeZone('America/New_York') === 'US', 'New York -> US');

    assert(langDet.mapCountryCodeToLanguage('DO') === 'es', 'DO maps to Spanish');
    assert(langDet.mapCountryCodeToLanguage('ES') === 'es', 'ES maps to Spanish');
    assert(langDet.mapCountryCodeToLanguage('MX') === 'es', 'MX maps to Spanish');
    assert(langDet.mapCountryCodeToLanguage('HT') === 'ht', 'HT maps to Haitian Creole');
    assert(langDet.mapCountryCodeToLanguage('FR') === 'fr', 'FR maps to French');
    assert(langDet.mapCountryCodeToLanguage('US') === 'en', 'US maps to English');
    assert(langDet.mapCountryCodeToLanguage('BR') === null, 'Non-supported country returns null for fallback');
  });

  await runTest('55. resolveInitialLanguageSync respects manual default, country position, diaspora browser preference, URL override, and user choice', async () => {
    const langDet = await import('../utils/languageDetection');

    // Manual mode forces developer default even in Spain
    const manualRes = langDet.resolveInitialLanguageSync({
      config: { mode: 'manual', defaultLanguage: 'fr', autoDetectByCountry: true, autoDetectByBrowser: true },
      timeZone: 'Europe/Madrid',
      browserLanguages: ['es-ES'],
      hasUserExplicitChoice: false,
      urlLang: null,
    });
    assert(manualRes.language === 'fr' && manualRes.source === 'developer_default', 'Manual mode must enforce developer defaultLanguage');

    // Auto mode detects Spanish-speaking country even if phone UI is English
    const drRes = langDet.resolveInitialLanguageSync({
      config: { mode: 'auto', defaultLanguage: 'ht', autoDetectByCountry: true, autoDetectByBrowser: true },
      timeZone: 'America/Santo_Domingo',
      geoCountryCode: null,
      browserLanguages: ['en-US'],
      hasUserExplicitChoice: false,
      urlLang: null,
    });
    assert(drRes.language === 'es' && drRes.source === 'country_position', 'Santo Domingo timezone must auto-match Spanish');

    // Auto mode in Haiti resolves to Haitian Creole
    const htRes = langDet.resolveInitialLanguageSync({
      config: { mode: 'auto', defaultLanguage: 'en', autoDetectByCountry: true, autoDetectByBrowser: true },
      timeZone: 'America/Port-au-Prince',
      geoCountryCode: null,
      browserLanguages: ['fr-HT'],
      hasUserExplicitChoice: false,
      urlLang: null,
    });
    assert(htRes.language === 'ht' && htRes.source === 'country_position', 'Port-au-Prince timezone must auto-match Haitian Creole');

    // Auto mode in US with Spanish browser honors diaspora Spanish preference
    const usEsRes = langDet.resolveInitialLanguageSync({
      config: { mode: 'auto', defaultLanguage: 'ht', autoDetectByCountry: true, autoDetectByBrowser: true },
      timeZone: 'America/New_York',
      geoCountryCode: 'US',
      browserLanguages: ['es-US', 'en-US'],
      hasUserExplicitChoice: false,
      urlLang: null,
    });
    assert(usEsRes.language === 'es' && usEsRes.source === 'browser', 'US user with es-US device locale should get Spanish');

    // Unsupported country & unsupported locale falls back to developer defaultLanguage
    const fallbackRes = langDet.resolveInitialLanguageSync({
      config: { mode: 'auto', defaultLanguage: 'es', autoDetectByCountry: true, autoDetectByBrowser: true },
      timeZone: 'America/Sao_Paulo',
      geoCountryCode: 'BR',
      browserLanguages: ['pt-BR'],
      hasUserExplicitChoice: false,
      urlLang: null,
    });
    assert(fallbackRes.language === 'es' && fallbackRes.source === 'developer_fallback', 'Unsupported region + locale falls back to developer default');

    // Explicit user choice overrides auto detection
    const userRes = langDet.resolveInitialLanguageSync({
      config: { mode: 'auto', defaultLanguage: 'ht' },
      timeZone: 'Europe/Madrid',
      userSavedLang: 'ht',
      hasUserExplicitChoice: true,
      urlLang: null,
    });
    assert(userRes.language === 'ht' && userRes.source === 'user_saved', 'Explicit user choice takes priority over location');

    // URL parameter ?lang= overrides everything
    const urlRes = langDet.resolveInitialLanguageSync({
      config: { mode: 'manual', defaultLanguage: 'ht' },
      userSavedLang: 'fr',
      hasUserExplicitChoice: true,
      urlLang: 'es',
    });
    assert(urlRes.language === 'es' && urlRes.source === 'url', 'URL ?lang= parameter takes highest priority');
  });

  await runTest('56. detectGeoCountryAsync fetches & caches country code and fails silently on network errors', async () => {
    const langDet = await import('../utils/languageDetection');
    localStorage.clear();

    // Failing fetcher must gracefully return null
    const errRes = await langDet.detectGeoCountryAsync(async () => {
      throw new Error('Network unreachable');
    });
    assert(errRes === null, 'Network error must resolve gracefully to null');

    // Valid response parses country code and caches it
    let fetchCount = 0;
    const okRes = await langDet.detectGeoCountryAsync(async () => {
      fetchCount++;
      return {
        ok: true,
        json: async () => ({ country: 'es' }),
      } as unknown as Response;
    });
    assert(okRes === 'ES', 'Country code should normalize to uppercase ES');
    assert(langDet.getCachedGeoCountry() === 'ES', 'Country code should be cached in localStorage');

    // Subsequent call reads cache without calling fetcher
    const cachedRes = await langDet.detectGeoCountryAsync(async () => {
      fetchCount++;
      return {
        ok: true,
        json: async () => ({ country: 'FR' }),
      } as unknown as Response;
    });
    assert(cachedRes === 'ES' && fetchCount === 1, 'Cached geo country must avoid redundant network fetches');
  });

  // -----------------------------------------------------------------
  // SUITE 19: FIRESTORE MEMBER & CHURCH PERMISSION SCHEMA INTEGRITY
  // -----------------------------------------------------------------
  console.log('\n--- Suite 19: Firestore Member & Church Permission Schema Integrity ---');

  await runTest('57. buildMemberFirestorePayload enforces strict 38-key allowlist, normalizes enums, clamps media & resolves church code aliases', async () => {
    const fsSvc = await import('../services/firestoreService');
    const storage = await import('../utils/storage');
    localStorage.clear();

    const canonicalChurch: any = {
      id: 'CH004-9X2K',
      code: 'RESURR',
      name: 'Iglesia Evangelica de la Resurreccion',
      pastor: 'Pastor Demo',
      address: 'Calle Central',
      city: 'Santo Domingo',
      phone: '8095550000',
      email: 'iglesiaevangelicadelaresurrecc@gmail.com',
      motto: 'Fe y Vida',
      themeColor: 'indigo',
      logoIcon: 'Church',
      adminGoogleEmail: 'iglesiaevangelicadelaresurrecc@gmail.com',
      adminGoogleUid: 'kp7Fcyg21zT5LlFL7xsGxQpVrEI2',
      adminAuthMethod: 'email_password',
      createdAt: '2026-11-18',
    };
    storage.saveToStorage(storage.STORAGE_KEYS.CHURCHES, [canonicalChurch]);

    const hugeImage = 'data:image/jpeg;base64,' + 'A'.repeat(650000);
    const dirtyMember: any = {
      id: 'm-1795041127201-c5yhe',
      churchId: 'RESURR', // Legacy alias using church.code instead of canonical church.id
      memberId: 'RESURR-JB1234',
      fullName: 'J', // Too short for Firestore rule >= 2 chars
      phone: '809-555-1234',
      email: 'member@test.org',
      memberType: 'INVALID_TYPE',
      status: 'SUSPENDED',
      avatarUrl: hugeImage,
      extraUiTransientField: 'must-be-stripped',
      tempSelectionFlag: true,
    };

    const payload = fsSvc.buildMemberFirestorePayload(dirtyMember, 'm-1795041127201-c5yhe');
    const allowedMemberKeys = new Set([
      'id', 'userId', 'churchId', 'memberId', 'pin', 'securityPin', 'titlePrefix',
      'fullName', 'gender', 'civilStatus', 'profession', 'dateOfBirth',
      'baptismDate', 'phone', 'emergencyContact', 'emergencyContactName',
      'email', 'googleEmail', 'googleUid', 'googlePhoto', 'address',
      'city', 'zone', 'department', 'role', 'memberType', 'cellGroup', 'joinedDate',
      'status', 'avatarUrl', 'photoUrl', 'legalDocumentType',
      'legalDocumentNumber', 'barcodeToken', 'notes', 'isDemo',
      'createdAt', 'updatedAt',
    ]);

    for (const k of Object.keys(payload)) {
      assert(allowedMemberKeys.has(k), `Disallowed member key "${k}" leaked into Firestore payload`);
    }
    assert(!('extraUiTransientField' in payload) && !('tempSelectionFlag' in payload), 'Unknown UI keys must be stripped');
    assert(payload.churchId === 'CH004-9X2K', `Expected canonical church ID CH004-9X2K, got ${payload.churchId}`);
    assert(typeof payload.fullName === 'string' && payload.fullName.length >= 2, 'fullName must be padded to >= 2 chars');
    assert(payload.memberType === 'member', 'Invalid memberType must normalize to member');
    assert(payload.status === 'active', 'Invalid status must normalize to active');
    assert(payload.avatarUrl === undefined, 'Oversized >600KB avatarUrl must be omitted instead of failing rules');
  });

  await runTest('58. buildChurchFirestorePayload enforces strict schema and createNewChurch issues collision-proof unique CH IDs', async () => {
    const fsSvc = await import('../services/firestoreService');
    const storage = await import('../utils/storage');
    localStorage.clear();

    const churchPayload = fsSvc.buildChurchFirestorePayload({
      id: 'CH009-ABCD',
      name: 'Legliz Test',
      adminAuthMethod: 'email_password',
      adminPasscode: 'hashed_secret',
      localOnlyRuntimeNote: 'should-be-stripped',
    } as any);

    assert(!('localOnlyRuntimeNote' in churchPayload), 'Unknown church keys must be stripped');
    assert(!('adminPasscode' in churchPayload), 'adminPasscode must not overwrite unless deliberatePasscodeUpdate is true');

    const c1 = storage.createNewChurch({
      name: 'Legliz Premye',
      pastor: 'Pastè 1',
      address: 'Ri 1',
      city: 'Pòtoprens',
      phone: '50911112222',
      email: 'p1@test.org',
      motto: 'Lafwa',
      adminGoogleEmail: 'p1@test.org',
      adminGoogleUid: 'uid-p1',
      adminAuthMethod: 'email_password',
    });
    const c2 = storage.createNewChurch({
      name: 'Legliz Dezyèm',
      pastor: 'Pastè 2',
      address: 'Ri 2',
      city: 'Pòtoprens',
      phone: '50933334444',
      email: 'p2@test.org',
      motto: 'Espwa',
      adminGoogleEmail: 'p2@test.org',
      adminGoogleUid: 'uid-p2',
      adminAuthMethod: 'email_password',
    });

    assert(c1.id.startsWith('CH') && c2.id.startsWith('CH'), 'Church IDs preserve CH prefix');
    assert(/^[a-zA-Z0-9_-]{2,64}$/.test(c1.id), `c1.id (${c1.id}) must match Firestore churchId regex`);
    assert(/^[a-zA-Z0-9_-]{2,64}$/.test(c2.id), `c2.id (${c2.id}) must match Firestore churchId regex`);
    assert(c1.id.includes('-') && c2.id.includes('-'), 'Generated church IDs include unique entropy suffix');
    assert(c1.id !== c2.id, 'Sequential created churches must have distinct IDs');
  });

  await runTest('59. reconcileRemoteChurchWithLocalPasscode preserves pending local adminGoogleUid/email against stale remote snapshots', async () => {
    const storage = await import('../utils/storage');
    localStorage.clear();

    const localUpgraded: any = {
      id: 'CH_AUTH_SYNC_01',
      code: 'SYNC01',
      name: 'Iglesia Evangelica de la Resurreccion',
      pastor: 'Pastor Test',
      address: 'Calle 1',
      city: 'Santo Domingo',
      phone: '+18095550101',
      email: 'iglesiaevangelicadelaresurrecc@gmail.com',
      motto: 'Fe',
      themeColor: 'indigo',
      logoIcon: 'Church',
      createdAt: '2026-01-01',
      adminGoogleEmail: 'iglesiaevangelicadelaresurrecc@gmail.com',
      adminGoogleUid: 'kp7Fcyg21zT5LlFL7xsGxQpVrEI2',
      adminAuthMethod: 'email_password',
    };

    // Case A: Remote snapshot is unclaimed (legacy PIN church not yet updated on server)
    const remoteUnclaimed: any = {
      ...localUpgraded,
      adminGoogleEmail: undefined,
      adminGoogleUid: undefined,
      adminAuthMethod: 'legacy_pin',
    };
    const resA = storage.reconcileRemoteChurchWithLocalPasscode(remoteUnclaimed, localUpgraded);
    assert(resA.church.adminGoogleUid === 'kp7Fcyg21zT5LlFL7xsGxQpVrEI2', 'Must preserve local adminGoogleUid against unclaimed remote');
    assert(resA.church.adminGoogleEmail === 'iglesiaevangelicadelaresurrecc@gmail.com', 'Must preserve local adminGoogleEmail');
    assert(resA.needsFirestoreReconcile === true, 'Must flag needsFirestoreReconcile when remote is missing ownership');

    // Case B: Remote snapshot has matching email but missing/stale UID while local upload is pending
    storage.markPendingLocalUpload('church', localUpgraded.id);
    const remoteStaleUid: any = {
      ...localUpgraded,
      adminGoogleUid: 'old-stale-uid-000',
    };
    const resB = storage.reconcileRemoteChurchWithLocalPasscode(remoteStaleUid, localUpgraded);
    assert(resB.church.adminGoogleUid === 'kp7Fcyg21zT5LlFL7xsGxQpVrEI2', 'Must preserve pending local UID over stale remote UID');
    assert(resB.needsFirestoreReconcile === true, 'Must flag needsFirestoreReconcile for pending UID sync');
    storage.clearPendingLocalUpload('church', localUpgraded.id);
  });

  await runTest('60. syncChurchAdminOwnershipWithCloud handles unauthenticated state safely and clearVerifiedChurchCache resets cleanly', async () => {
    const fsSvc = await import('../services/firestoreService');
    fsSvc.clearVerifiedChurchCache();

    const res = await fsSvc.syncChurchAdminOwnershipWithCloud({
      id: 'CH_SYNC_SAFE_01',
      code: 'SS01',
      name: 'Legliz Senkro Test',
      pastor: 'Pastè',
      address: 'Adrès',
      city: 'Pòtoprens',
      phone: '50900000000',
      email: 'test@church.org',
      motto: 'Lafwa',
      themeColor: 'indigo',
      logoIcon: 'Church',
      createdAt: '2026-01-01',
    });

    assert(res.synced === false, 'Unauthenticated sync must return synced=false');
    assert(
      res.status === 'offline_or_unauthenticated',
      `Expected offline_or_unauthenticated, got ${res.status}`
    );
  });

  await runTest('61. buildMemberFirestorePayload strictly matches firestore.rules isValidMember keys & sanitizes timestamps/large base64 photos', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const fsSvc = await import('../services/firestoreService');

    const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    const memberFnMatch = rulesText.match(/function isValidMember[\s\S]*?data\.keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/);
    assert(Boolean(memberFnMatch), 'firestore.rules must declare isValidMember with data.keys().hasOnly(...)');
    const ruleAllowedKeys = new Set(
      Array.from(memberFnMatch![1].matchAll(/'([^']+)'/g)).map((m) => m[1])
    );
    assert(ruleAllowedKeys.has('avatar') && ruleAllowedKeys.has('photo'), 'isValidMember must allow legacy avatar/photo keys for existing member updates');
    assert(ruleAllowedKeys.has('memberType'), 'isValidMember must allow memberType');

    const largePhoto = 'data:image/jpeg;base64,' + 'A'.repeat(150000);
    const payload = fsSvc.buildMemberFirestorePayload(
      {
        id: 'm-1795041127201-c5yhe',
        churchId: 'CH001',
        memberId: 'IER-CM4821',
        fullName: 'Carlos Manuel Rodriguez',
        phone: '+1 809-555-0123',
        email: 'carlos@legiz.ht',
        dateOfBirth: '1998-05-15',
        department: 'Servicio General',
        role: 'Miembro',
        memberType: 'member',
        joinedDate: '2026-11-18',
        status: 'active',
        avatarUrl: largePhoto,
        photoUrl: largePhoto,
        googlePhoto: largePhoto,
        barcodeToken: 'CHURCH:CH001|MEMBER:IER-CM4821',
        createdAt: 1795041127201 as any,
        updatedAt: { invalidPlainObject: true } as any,
        notes: 'Test note',
      },
      'm-1795041127201-c5yhe',
      'CH001'
    );

    const unknownKeys = Object.keys(payload).filter((k) => !ruleAllowedKeys.has(k));
    assert(unknownKeys.length === 0, `Payload emitted keys rejected by firestore.rules: ${unknownKeys.join(', ')}`);
    assert(typeof payload.createdAt === 'string' && payload.createdAt.includes('T'), 'Numeric createdAt must convert to ISO string');
    assert(payload.updatedAt === undefined, 'Invalid plain-object updatedAt must be omitted');
    assert(payload.avatarUrl === largePhoto, 'Primary avatarUrl must be preserved');
    assert(payload.photoUrl === undefined && payload.googlePhoto === undefined, 'Duplicate large base64 photoUrl/googlePhoto must be deduplicated');
  });

  await runTest('62. firestore.rules uses direct inline church paths in exists/get and allows UID-matched owners regardless of email_verified', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

    assert(!rulesText.includes('function churchPath('), 'firestore.rules should inline /databases/$(database)/documents/churches/$(churchId) directly without indirect path-returning helper');
    assert(
      rulesText.includes('exists(/databases/$(database)/documents/churches/$(churchId))'),
      'firestore.rules must use direct inline exists(/databases/$(database)/documents/churches/$(churchId))'
    );
    assert(
      rulesText.includes('get(/databases/$(database)/documents/churches/$(churchId)).data'),
      'firestore.rules must use direct inline get(/databases/$(database)/documents/churches/$(churchId)).data'
    );
    assert(
      rulesText.includes("('adminGoogleUid' in churchData) && churchData.adminGoogleUid is string && churchData.adminGoogleUid == request.auth.uid"),
      'isChurchOwner must allow UID-matched church admins even when email_verified is false'
    );
  });

  await runTest('63. Mandatory & immutable churchId enforcement in buildMemberFirestorePayload and firestore.rules custom-claim + admin gates', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const fsSvc = await import('../services/firestoreService');

    // A. Missing or blank churchId must throw (never silently fall back to CH001)
    let missingThrew = false;
    try {
      fsSvc.buildMemberFirestorePayload({ id: 'm-missing', fullName: 'Jean Test', churchId: '' }, 'm-missing');
    } catch (err: any) {
      missingThrew = String(err?.message || '').toLowerCase().includes('mandatory churchid');
    }
    assert(missingThrew, 'buildMemberFirestorePayload must throw when churchId is empty/missing');

    let invalidThrew = false;
    try {
      fsSvc.buildMemberFirestorePayload({ id: 'm-bad', fullName: 'Jean Test', churchId: 'bad church!@#' }, 'm-bad');
    } catch (err: any) {
      invalidThrew = String(err?.message || '').toLowerCase().includes('invalid mandatory churchid');
    }
    assert(invalidThrew, 'buildMemberFirestorePayload must reject invalid churchId characters');

    // B. Valid member payload locks churchId as enumerable, non-writable, non-configurable
    const payload = fsSvc.buildMemberFirestorePayload(
      { id: 'm-immutable-01', fullName: 'Marie Joseph', churchId: 'CH001' },
      'm-immutable-01'
    );
    const descriptor = Object.getOwnPropertyDescriptor(payload, 'churchId');
    assert(payload.churchId === 'CH001', 'Payload must carry exact mandatory churchId');
    assert(
      Boolean(descriptor) && descriptor!.enumerable === true && descriptor!.writable === false && descriptor!.configurable === false,
      'churchId must be locked as enumerable, non-writable, non-configurable on member payloads'
    );

    let mutateThrew = false;
    try {
      payload.churchId = 'CH999';
    } catch {
      mutateThrew = true;
    }
    assert(mutateThrew && payload.churchId === 'CH001', 'Attempting to mutate payload.churchId must fail');

    // C. Verify firestore.rules enforces mandatory + immutable churchId, custom claims, and DB ownership fallback
    const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    assert(
      rulesText.includes("data.keys().hasAll(['churchId', 'fullName'])"),
      'isValidMember must explicitly enforce mandatory churchId via data.keys().hasAll'
    );
    assert(
      rulesText.includes("('churchId' in request.auth.token) && request.auth.token.churchId is string && request.auth.token.churchId == churchId"),
      'firestore.rules must authorize request.resource.data.churchId matching request.auth.token.churchId'
    );
    assert(
      rulesText.includes("hasAdminAuthorizedClaim(churchId)") &&
      rulesText.includes("hasAuthorizedChurchClaim(request.resource.data.churchId)"),
      'firestore.rules must support admin-authorized custom claims on member creation'
    );
    assert(
      rulesText.includes("isChurchAdminOrDev(request.resource.data.churchId)"),
      'firestore.rules must preserve DB-backed admin ownership check for CH001 Email+Password admins without custom claims'
    );
    assert(
      rulesText.includes("request.resource.data.churchId == resource.data.churchId"),
      'firestore.rules must enforce immutable churchId on member update'
    );
  });

  await runTest('64. executeMemberCreateWithRetry verifies church existence before writing and retries transient permission-denied errors', async () => {
    const fsSvc = await import('../services/firestoreService');

    // Case 1: Church does not exist in `churches` -> aborts BEFORE calling writeMemberDoc
    let writeCalledForMissingChurch = false;
    let missingChurchThrew = false;
    try {
      await fsSvc.executeMemberCreateWithRetry('CH_MISSING_99', {
        maxAttempts: 3,
        retryDelaysMs: [0, 0],
        sleep: async () => {},
        verifyChurchExists: async (cid) => ({ canonicalChurchId: cid, existsInFirestore: false }),
        writeMemberDoc: async () => {
          writeCalledForMissingChurch = true;
        },
      });
    } catch (err: any) {
      missingChurchThrew = String(err?.message || '').includes('does not exist in the churches collection');
    }
    assert(missingChurchThrew && !writeCalledForMissingChurch, 'Must verify church existence and abort before writing if church is missing');

    // Case 2: Transient permission-denied on attempt 1 -> refreshes token, force-verifies church on server, succeeds on attempt 2
    const verifyCalls: Array<{ churchId: string; forceServer: boolean }> = [];
    let tokenRefreshes = 0;
    let writeAttempts = 0;

    const retryResult = await fsSvc.executeMemberCreateWithRetry('CH001', {
      maxAttempts: 3,
      retryDelaysMs: [0, 0],
      sleep: async () => {},
      verifyChurchExists: async (cid, forceServer) => {
        verifyCalls.push({ churchId: cid, forceServer });
        return { canonicalChurchId: 'CH001', existsInFirestore: true };
      },
      refreshAuthToken: async () => {
        tokenRefreshes += 1;
      },
      writeMemberDoc: async (verifiedChurchId, attempt) => {
        writeAttempts += 1;
        assert(verifiedChurchId === 'CH001', `Expected verifiedChurchId CH001, got ${verifiedChurchId}`);
        if (attempt === 1) {
          const err: any = new Error('Missing or insufficient permissions.');
          err.code = 'permission-denied';
          throw err;
        }
      },
    });

    assert(retryResult.attemptsUsed === 2, `Expected 2 attempts, got ${retryResult.attemptsUsed}`);
    assert(retryResult.churchVerified === true && retryResult.canonicalChurchId === 'CH001', 'Retry result must report verified CH001');
    assert(writeAttempts === 2, 'Expected writeMemberDoc to execute twice');
    assert(tokenRefreshes === 1, 'Expected refreshAuthToken to run once between attempt 1 and attempt 2');
    assert(
      verifyCalls.length === 2 && verifyCalls[0].forceServer === false && verifyCalls[1].forceServer === true,
      'Must verify church before initial write and force server re-verification before retry'
    );

    // Case 3: Non-permission error does NOT trigger unnecessary retries
    let nonPermAttempts = 0;
    let nonPermThrew = false;
    try {
      await fsSvc.executeMemberCreateWithRetry('CH001', {
        maxAttempts: 3,
        retryDelaysMs: [0, 0],
        sleep: async () => {},
        verifyChurchExists: async () => ({ canonicalChurchId: 'CH001', existsInFirestore: true }),
        writeMemberDoc: async () => {
          nonPermAttempts += 1;
          throw new Error('Network offline');
        },
      });
    } catch {
      nonPermThrew = true;
    }
    assert(nonPermThrew && nonPermAttempts === 1, 'Non-permission errors must fail immediately without permission-denied retries');
  });

  await runTest('65. Lossless Member Migration CSV round-trip preserves unique MemberIDs, apostrophes, quotes, accents, female gender & all fields', async () => {
    const mig = await import('../utils/memberMigration');

    const sourceMembers: any[] = [
      {
        id: 'm-1795041127201-c5yhe',
        churchId: 'CH001',
        memberId: 'IER-JD4821',
        titlePrefix: 'Frè',
        fullName: "Jean-Pierre d'Or",
        gender: 'male',
        civilStatus: 'marie',
        profession: 'Enjenyè Sivil',
        dateOfBirth: '1984-06-14',
        baptismDate: '2011-08-20',
        phone: '+1 809-555-1234',
        emergencyContact: '+1 809-555-9999',
        emergencyContactName: "Marie d'Or",
        email: 'jean.dor@legliz.org',
        googleEmail: 'jean.dor.google@gmail.com',
        address: 'Calle Duarte #45, Apto 2B',
        city: 'Santo Domingo',
        zone: 'Zona Colonial',
        department: 'Louanj & Mizik',
        role: 'Diacre',
        memberType: 'member',
        cellGroup: 'Selil Espwa',
        joinedDate: '2019-03-12',
        status: 'active',
        legalDocumentType: 'cin',
        legalDocumentNumber: '001-840614-9',
        pin: '4821',
        securityPin: '9042',
        barcodeToken: 'CHURCH:CH001|MEMBER:IER-JD4821',
        notes: 'Manm fidèl, te di "Mèsi Bondye"\nResponsab son',
      },
      {
        id: 'm-1795041127202-k8xzt',
        churchId: 'CH001',
        memberId: 'IER-MC9312',
        titlePrefix: 'Sè',
        fullName: 'María Peña-Célestin',
        gender: 'female',
        civilStatus: 'celibataire',
        profession: 'Enfimyè',
        dateOfBirth: '1995-11-02',
        baptismDate: '2017-04-16',
        phone: '+1 829-555-8877',
        email: 'maria.pena@legliz.org',
        address: 'Av. Bolívar #10',
        city: 'Santiago',
        department: 'Chorale',
        role: 'Soprano',
        memberType: 'visitor',
        joinedDate: '2021-09-01',
        status: 'inactive',
        legalDocumentType: 'passeport',
        legalDocumentNumber: 'PP-998877',
        pin: '9312',
        barcodeToken: 'CHURCH:CH001|MEMBER:IER-MC9312',
        notes: 'An vwayaj',
      },
    ];

    const csv = mig.exportMembersToMigrationCsv(sourceMembers, 'CH001');
    assert(csv.startsWith('\uFEFF'), 'Exported migration CSV must include UTF-8 BOM for Excel accent fidelity');

    const parsed = mig.parseMembersImportText(csv);
    assert(parsed.format === 'csv', `Expected csv format, got ${parsed.format}`);
    assert(parsed.errors.length === 0, `Expected 0 parse errors, got ${parsed.errors.join('; ')}`);
    assert(parsed.members.length === 2, `Expected 2 members parsed, got ${parsed.members.length}`);

    const m1 = parsed.members[0];
    assert(m1.memberId === 'IER-JD4821', `Expected preserved MemberID IER-JD4821, got ${m1.memberId}`);
    assert(m1.fullName === "Jean-Pierre d'Or", `Apostrophe in name corrupted: ${m1.fullName}`);
    assert(m1.address === 'Calle Duarte #45, Apto 2B', `Comma in address corrupted: ${m1.address}`);
    assert(m1.joinedDate === '2019-03-12', `JoinedDate lost: ${m1.joinedDate}`);
    assert(m1.baptismDate === '2011-08-20', `BaptismDate lost: ${m1.baptismDate}`);
    assert(m1.emergencyContact === '+1 809-555-9999' && m1.emergencyContactName === "Marie d'Or", 'Emergency contact fields lost');
    assert(m1.email === 'jean.dor@legliz.org' && m1.googleEmail === 'jean.dor.google@gmail.com', 'Email / GoogleEmail collided or lost');
    assert(m1.pin === '4821' && m1.securityPin === '9042', 'PIN / SecurityPin lost');
    assert(m1.notes === 'Manm fidèl, te di "Mèsi Bondye"\nResponsab son', `Quoted/multiline notes corrupted: ${m1.notes}`);
    assert(m1.sourceChurchId === 'CH001', `SourceChurchID lost: ${m1.sourceChurchId}`);

    const m2 = parsed.members[1];
    assert(m2.memberId === 'IER-MC9312', `Expected preserved MemberID IER-MC9312, got ${m2.memberId}`);
    assert(m2.gender === 'female', `Female gender must NEVER be misclassified as male, got ${m2.gender}`);
    assert(m2.status === 'inactive', `Inactive status lost: ${m2.status}`);
    assert(m2.memberType === 'visitor', `Visitor memberType lost: ${m2.memberType}`);
    assert(m2.legalDocumentType === 'passeport' && m2.legalDocumentNumber === 'PP-998877', 'Legal document fields lost');

    // Verify gender normalizer across HT/ES/FR/EN female strings containing letter "m"
    assert(mig.normalizeGenderValue('Femenino') === 'female', 'Femenino must normalize to female');
    assert(mig.normalizeGenderValue('Femme') === 'female', 'Femme must normalize to female');
    assert(mig.normalizeGenderValue('Female') === 'female', 'Female must normalize to female');
    assert(mig.normalizeGenderValue('Mujer') === 'female', 'Mujer must normalize to female');
    assert(mig.normalizeGenderValue('Fanm') === 'female', 'Fanm must normalize to female');
    assert(mig.normalizeGenderValue('Masculino') === 'male', 'Masculino must normalize to male');
  });

  await runTest('66. Cross-church bulkImportMembers preserves unique MemberIDs, isolates Firestore DocIDs, and is idempotent on re-import', async () => {
    const storage = await import('../utils/storage');
    const mig = await import('../utils/memberMigration');
    localStorage.clear();

    const oldChurch: any = {
      id: 'CH001',
      code: 'IER',
      name: 'Iglesia Original',
      pastor: 'Pastor A',
      address: 'Calle 1',
      city: 'Santo Domingo',
      phone: '8095550001',
      email: 'old@church.org',
      motto: 'Fe',
      themeColor: 'indigo',
      logoIcon: 'Church',
      createdAt: '2025-01-01',
    };
    const newChurch: any = {
      id: 'CH002-MIG9',
      code: 'NEW',
      name: 'Nouvo Legliz Migre',
      pastor: 'Pastor B',
      address: 'Calle 2',
      city: 'Santo Domingo',
      phone: '8095550002',
      email: 'new@church.org',
      motto: 'Espwa',
      themeColor: 'emerald',
      logoIcon: 'Church',
      createdAt: '2026-11-18',
    };
    storage.saveToStorage(storage.STORAGE_KEYS.CHURCHES, [oldChurch, newChurch]);

    const oldMembers: any[] = [
      {
        id: 'm-1795041127201-orig1',
        churchId: 'CH001',
        memberId: 'IER-JD4821',
        fullName: 'Jean Baptiste',
        gender: 'male',
        dateOfBirth: '1985-04-12',
        phone: '8095551111',
        email: 'jean@test.org',
        department: 'Dominical',
        role: 'Monitè',
        joinedDate: '2020-02-15',
        status: 'active',
        pin: '4821',
        barcodeToken: 'CHURCH:CH001|MEMBER:IER-JD4821',
      },
      {
        id: 'm-1795041127202-orig2',
        churchId: 'CH001',
        memberId: 'IER-MC9312',
        fullName: 'Marie Célestin',
        gender: 'female',
        dateOfBirth: '1992-07-08',
        phone: '8095552222',
        email: 'marie@test.org',
        department: 'Chorale',
        role: 'Chantèz',
        joinedDate: '2021-05-20',
        status: 'inactive',
        pin: '9312',
        barcodeToken: 'CHURCH:CH001|MEMBER:IER-MC9312',
      },
    ];
    storage.saveToStorage(storage.STORAGE_KEYS.MEMBERS, oldMembers);

    // Export CSV from CH001 and import into CH002-MIG9
    const exportedCsv = mig.exportMembersToMigrationCsv(oldMembers, 'CH001');
    const parsed = mig.parseMembersImportText(exportedCsv);

    const firstImport = await storage.bulkImportMembers('CH002-MIG9', parsed.members, 'migrate', {
      preserveMemberIds: true,
      skipCloudSync: true,
    });
    assert(firstImport.added === 2 && firstImport.updated === 0 && firstImport.skipped === 0, `Unexpected first import counts: ${JSON.stringify(firstImport)}`);
    assert(firstImport.preservedIdsCount === 2 && firstImport.generatedIdsCount === 0, `Both MemberIDs must be preserved: ${JSON.stringify(firstImport)}`);

    const allAfterFirst: any[] = storage.loadFromStorage(storage.STORAGE_KEYS.MEMBERS, []);
    const oldChurchAfter = allAfterFirst.filter((m) => m.churchId === 'CH001');
    const newChurchAfter = allAfterFirst.filter((m) => m.churchId === 'CH002-MIG9');

    assert(oldChurchAfter.length === 2, 'Old church CH001 roster must remain completely untouched');
    assert(newChurchAfter.length === 2, 'New church CH002-MIG9 must have 2 migrated members');

    const migJean = newChurchAfter.find((m) => m.memberId === 'IER-JD4821');
    const migMarie = newChurchAfter.find((m) => m.memberId === 'IER-MC9312');
    assert(Boolean(migJean) && Boolean(migMarie), 'Exact unique MemberIDs IER-JD4821 & IER-MC9312 must exist in CH002-MIG9');
    assert(migJean.id !== 'm-1795041127201-orig1', 'Migrated member must use a non-colliding target-church Firestore DocID');
    assert(migJean.id === 'mig-CH002-MIG9-IER-JD4821', `Expected deterministic target DocID mig-CH002-MIG9-IER-JD4821, got ${migJean.id}`);
    assert(migJean.barcodeToken === 'CHURCH:CH002-MIG9|MEMBER:IER-JD4821', `BarcodeToken must point to target church + preserved MemberID, got ${migJean.barcodeToken}`);
    assert(migJean.joinedDate === '2020-02-15' && migJean.pin === '4821', 'JoinedDate and PIN must be preserved');
    assert(migMarie.status === 'inactive' && migMarie.gender === 'female', 'Status and gender must be preserved');

    // Re-importing the exact same CSV into CH002-MIG9 must be 100% idempotent (0 duplicates)
    const secondImport = await storage.bulkImportMembers('CH002-MIG9', parsed.members, 'migrate', {
      preserveMemberIds: true,
      skipCloudSync: true,
    });
    assert(secondImport.added === 0 && secondImport.updated === 2, `Re-import must update in place without duplicating: ${JSON.stringify(secondImport)}`);
    const newChurchAfterSecond = storage
      .loadFromStorage<any[]>(storage.STORAGE_KEYS.MEMBERS, [])
      .filter((m) => m.churchId === 'CH002-MIG9');
    assert(newChurchAfterSecond.length === 2, 'Re-import must still leave exactly 2 members in CH002-MIG9');
  });

  await runTest('67. analyzeMemberMigration flags duplicate MemberIDs & cross-church transfers and prevents same-file ID collision', async () => {
    const mig = await import('../utils/memberMigration');
    const storage = await import('../utils/storage');
    localStorage.clear();

    storage.saveToStorage(storage.STORAGE_KEYS.CHURCHES, [
      { id: 'CH003-DUP', code: 'DUP', name: 'Legliz Tès', pastor: 'P', address: 'A', city: 'C', phone: '1', email: 'a@b.c', motto: 'M', themeColor: 'indigo', logoIcon: 'Church', createdAt: '2026-01-01' },
    ]);
    storage.saveToStorage(storage.STORAGE_KEYS.MEMBERS, []);

    const csvWithDupId = `MemberID,FullName,Phone,SourceChurchID
IER-DUP01,Premye Manm,50911112222,CH001
IER-DUP01,Dezyèm Manm,50933334444,CH001
,Twazyèm Manm,50955556666,CH001`;

    const parsed = mig.parseMembersImportText(csvWithDupId);
    const analysis = mig.analyzeMemberMigration(parsed.members, 'CH003-DUP', []);

    assert(analysis.totalRows === 3, 'Expected 3 rows');
    assert(analysis.withExistingMemberIdCount === 2, 'Expected 2 rows with existing MemberID');
    assert(analysis.autoGenerateIdCount === 1, 'Expected 1 row needing auto-generated ID');
    assert(analysis.duplicateMemberIdsInFile.includes('IER-DUP01'), 'Must detect duplicate MemberID IER-DUP01 inside file');
    assert(analysis.crossChurchSourceIds.includes('CH001'), 'Must detect cross-church source CH001');

    const res = await storage.bulkImportMembers('CH003-DUP', parsed.members, 'append', {
      preserveMemberIds: true,
      skipCloudSync: true,
    });
    assert(res.added === 3, `Expected 3 members added, got ${res.added}`);
    assert(res.preservedIdsCount === 1 && res.generatedIdsCount === 2, `First row preserves IER-DUP01, duplicate & blank rows get unique IDs: ${JSON.stringify(res)}`);

    const stored: any[] = storage.loadFromStorage(storage.STORAGE_KEYS.MEMBERS, []);
    const uniqueIds = new Set(stored.map((m) => m.memberId));
    assert(uniqueIds.size === 3 && uniqueIds.has('IER-DUP01'), 'All 3 imported members must have distinct MemberIDs with IER-DUP01 preserved on the first row');
  });

  await runTest('68. Platform-owner adminVerified gate is locked to Super Developer in firestore.rules and stripped from normal church writes', async () => {
    const fsMod = await import('node:fs');
    const pathMod = await import('node:path');
    const firestoreSvc = await import('../services/firestoreService');

    const rulesPath = pathMod.resolve(process.cwd(), 'firestore.rules');
    const rulesSrc = fsMod.readFileSync(rulesPath, 'utf8');

    // 1. Rules must authorize platform-verified admins inside isChurchOwner
    assert(
      rulesSrc.includes("('adminVerified' in churchData) && churchData.adminVerified == true"),
      'firestore.rules isChurchOwner must authorize churches with adminVerified == true'
    );
    // 2. Rules must prevent non-Super-Developers from creating adminVerified: true or mutating adminVerified* on update
    assert(
      rulesSrc.includes("!('adminVerified' in incoming()) || incoming().adminVerified == false") &&
        rulesSrc.includes("!incoming().diff(existing()).affectedKeys().hasAny(['adminVerified', 'adminVerifiedAt', 'adminVerifiedBy'])"),
      'firestore.rules must strictly lock adminVerified/adminVerifiedAt/adminVerifiedBy to isSuperDeveloper() on create and update'
    );

    // 3. Normal church save payload MUST strip adminVerified* so church admins never trigger permission-denied
    const sampleChurch: any = {
      id: 'CH009-VER',
      code: 'VER',
      name: 'Legliz Verifikasyon',
      pastor: 'Pastè Test',
      address: 'Delmas',
      city: 'Pòtoprens',
      phone: '50933334444',
      email: 'ver@test.org',
      motto: 'Lafwa',
      themeColor: 'indigo',
      logoIcon: 'Church',
      createdAt: '2026-01-01',
      adminGoogleEmail: 'admin@test.org',
      adminVerified: true,
      adminVerifiedAt: '2026-11-18T12:00:00.000Z',
      adminVerifiedBy: 'charlesjj3186@gmail.com',
    };

    const normalPayload = firestoreSvc.buildChurchFirestorePayload(sampleChurch, 'CH009-VER');
    assert(
      !('adminVerified' in normalPayload) &&
        !('adminVerifiedAt' in normalPayload) &&
        !('adminVerifiedBy' in normalPayload),
      'Default buildChurchFirestorePayload must omit adminVerified* keys to respect Super-Developer-only rule lock'
    );

    // 4. Deliberate Super-Developer update payload MUST emit adminVerified=true and metadata cleanly
    const deliberateTruePayload = firestoreSvc.buildChurchFirestorePayload(sampleChurch, 'CH009-VER', {
      deliberateAdminVerificationUpdate: true,
    });
    assert(
      deliberateTruePayload.adminVerified === true &&
        deliberateTruePayload.adminVerifiedBy === 'charlesjj3186@gmail.com' &&
        typeof deliberateTruePayload.adminVerifiedAt === 'string',
      `Deliberate true payload must emit adminVerified metadata: ${JSON.stringify(deliberateTruePayload)}`
    );

    // 5. Deliberate revocation payload MUST emit adminVerified=false and clear metadata to null
    const deliberateFalsePayload = firestoreSvc.buildChurchFirestorePayload(
      { ...sampleChurch, adminVerified: false },
      'CH009-VER',
      { deliberateAdminVerificationUpdate: true }
    );
    assert(
      deliberateFalsePayload.adminVerified === false &&
        deliberateFalsePayload.adminVerifiedAt === null &&
        deliberateFalsePayload.adminVerifiedBy === null,
      `Deliberate false payload must set adminVerified=false and null out metadata: ${JSON.stringify(deliberateFalsePayload)}`
    );
  });

  await runTest('69. Post-creation Email Verification Screen & Profile Resend Verification Button rules + 60s cooldown', async () => {
    const flow = await import('../utils/emailVerificationFlow');

    const unverifiedEmailChurch: any = {
      id: 'CH010-NEW',
      name: 'Legliz Nouvo',
      adminGoogleEmail: 'pastor@legliznouvo.org',
      adminAuthMethod: 'email_password',
      adminVerified: false,
    };

    // 1. Newly created church with unverified email MUST trigger dedicated verification screen
    assert(
      flow.shouldPromptPostCreationEmailVerification({
        church: unverifiedEmailChurch,
        authEmailVerified: false,
        authUserEmail: 'pastor@legliznouvo.org',
      }) === true,
      'Unverified email owner right after church creation must trigger post-creation verification screen'
    );

    // 2. Already email-verified Google user MUST skip verification screen
    assert(
      flow.shouldPromptPostCreationEmailVerification({
        church: unverifiedEmailChurch,
        authEmailVerified: true,
        authUserEmail: 'pastor@legliznouvo.org',
      }) === false,
      'Already verified Firebase user must not see post-creation verification screen'
    );

    // 3. Platform-owner pre-verified church (adminVerified: true) MUST skip verification screen
    assert(
      flow.shouldPromptPostCreationEmailVerification({
        church: { ...unverifiedEmailChurch, adminVerified: true },
        authEmailVerified: false,
        authUserEmail: 'pastor@legliznouvo.org',
      }) === false,
      'Platform-verified church must not prompt verification screen'
    );

    // 4. After login, unverified church owner MUST see compact "Resend imel verifikasyon" button in profile
    assert(
      flow.shouldShowProfileResendVerificationButton({
        userRole: 'admin',
        church: unverifiedEmailChurch,
        hasAuthUser: true,
        authEmailVerified: false,
        authUserEmail: 'PASTOR@legliznouvo.org',
      }) === true,
      'Logged-in unverified admin owner must see profile Resend Verification Email button'
    );

    // 5. Verified admin, member role, or platform-approved admin MUST NOT see resend button in profile
    assert(
      flow.shouldShowProfileResendVerificationButton({
        userRole: 'admin',
        church: unverifiedEmailChurch,
        hasAuthUser: true,
        authEmailVerified: true,
        authUserEmail: 'pastor@legliznouvo.org',
      }) === false,
      'Verified admin must not see profile Resend Verification Email button'
    );
    assert(
      flow.shouldShowProfileResendVerificationButton({
        userRole: 'member',
        church: unverifiedEmailChurch,
        hasAuthUser: true,
        authEmailVerified: false,
        authUserEmail: 'pastor@legliznouvo.org',
      }) === false,
      'Member mode must not see admin profile Resend Verification Email button'
    );
    assert(
      flow.shouldShowProfileResendVerificationButton({
        userRole: 'admin',
        church: { ...unverifiedEmailChurch, adminVerified: true },
        hasAuthUser: true,
        authEmailVerified: false,
        authUserEmail: 'pastor@legliznouvo.org',
      }) === false,
      'Platform-owner verified church admin must not see resend prompt'
    );

    // 6. 60-second resend cooldown math prevents rate-limit spam accurately
    const t0 = 1700000000000;
    assert(flow.computeResendCooldownRemaining(null, t0) === 0, 'Null timestamp must return 0s cooldown');
    assert(flow.computeResendCooldownRemaining(t0, t0 + 15000) === 45, '15s elapsed must leave 45s cooldown');
    assert(flow.computeResendCooldownRemaining(t0, t0 + 60000) === 0, '60s elapsed must return 0s cooldown');
    assert(flow.computeResendCooldownRemaining(t0, t0 + 95000) === 0, 'Past 60s must clamp cleanly to 0s');

    // 7. Expired-link / Quick PIN session (5+ days later, hasAuthUser: false) MUST STILL show Resend button
    // and flag needsInlineReauthForVerification === true so user can re-auth inline & resend a fresh link
    assert(
      flow.shouldShowProfileResendVerificationButton({
        userRole: 'admin',
        church: unverifiedEmailChurch,
        hasAuthUser: false,
        authEmailVerified: false,
        authUserEmail: null,
      }) === true,
      'Unverified church admin logged in via Quick PIN / restored session must still see Resend Verification button'
    );
    assert(
      flow.needsInlineReauthForVerification({
        church: unverifiedEmailChurch,
        hasAuthUser: false,
        authUserEmail: null,
      }) === true,
      'Missing live Firebase session must request inline owner re-auth before calling sendEmailVerification'
    );
    assert(
      flow.needsInlineReauthForVerification({
        church: unverifiedEmailChurch,
        hasAuthUser: true,
        authUserEmail: 'other@example.com',
      }) === true,
      'Mismatched signed-in email must request inline owner re-auth'
    );
    assert(
      flow.needsInlineReauthForVerification({
        church: unverifiedEmailChurch,
        hasAuthUser: true,
        authUserEmail: 'PASTOR@legliznouvo.org',
      }) === false,
      'Matching live owner Firebase session must resend directly without inline re-auth'
    );

    // 8. Accidental test church filter & CH001 production safety + hardened firestore.rules create lock
    const firestoreSvc = await import('../services/firestoreService');
    const fs = await import('fs');
    const rulesSrc = fs.readFileSync('firestore.rules', 'utf8');
    assert(
      firestoreSvc.isAccidentalTestChurch({ id: 'CH002-MIG9', name: 'Nouvo Legliz Migre' }) === true,
      'Unclaimed CH002-MIG9 test artifact must be flagged as accidental test church'
    );
    assert(
      firestoreSvc.isAccidentalTestChurch({ id: 'CH003-DUP', name: 'Legliz Tès' }) === true,
      'Unclaimed CH003-DUP test artifact must be flagged as accidental test church'
    );
    assert(
      firestoreSvc.isAccidentalTestChurch({
        id: 'CH001',
        name: 'Iglesia Ev. de la Resurreccion',
        adminGoogleEmail: 'iglesiaevangelicadelaresurrecc@gmail.com',
        adminGoogleUid: 'kp7Fcyg21zT5LlFL7xsGxQpVrEI2',
      }) === false,
      'Production church CH001 must NEVER be flagged as an accidental test church'
    );
    assert(
      !/allow create:[\s\S]{0,180}churchIsUnclaimed\(incoming\(\)\)/.test(rulesSrc),
      'firestore.rules must NOT allow unauthenticated churchIsUnclaimed(incoming()) on churches create'
    );
  });

  await runTest('70. Super Developer surgical adminVerified patch, plain-object Timestamp sanitization & schema drift detection', async () => {
    const firestoreSvc = await import('../services/firestoreService');

    // 1. Plain JSON-serialized Firestore Timestamp objects from localStorage must convert to valid ISO strings
    const churchWithPlainTimestamps: any = {
      id: 'CH001',
      name: 'Iglesia Ev. de la Resurreccion',
      code: 'IER',
      createdAt: { seconds: 1789689600, nanoseconds: 0 },
      updatedAt: { seconds: 1794926834, nanoseconds: 496000000 },
      adminAuthMethod: 'email_password',
    };
    const sanitizedChurch = firestoreSvc.buildChurchFirestorePayload(churchWithPlainTimestamps, 'CH001');
    assert(
      typeof sanitizedChurch.createdAt === 'string' && sanitizedChurch.createdAt.includes('T'),
      `Plain-object createdAt must serialize to ISO string, got: ${JSON.stringify(sanitizedChurch.createdAt)}`
    );
    assert(
      typeof sanitizedChurch.updatedAt === 'string' && sanitizedChurch.updatedAt.includes('T'),
      `Plain-object updatedAt must serialize to ISO string, got: ${JSON.stringify(sanitizedChurch.updatedAt)}`
    );

    // 2. Surgical 4-field patch for Super Developer approval (true) & revocation (false)
    const nowIso = '2026-11-19T05:00:00.000Z';
    const approvePatch = firestoreSvc.buildSurgicalAdminVerificationPatch(
      true,
      'CharlesJJ3186@gmail.com',
      nowIso
    );
    assert(
      Object.keys(approvePatch).sort().join(',') ===
        'adminVerified,adminVerifiedAt,adminVerifiedBy,updatedAt',
      `Surgical patch must contain ONLY the 4 allowlisted fields: ${Object.keys(approvePatch).join(',')}`
    );
    assert(
      approvePatch.adminVerified === true &&
        approvePatch.adminVerifiedAt === nowIso &&
        approvePatch.adminVerifiedBy === 'charlesjj3186@gmail.com' &&
        approvePatch.updatedAt === nowIso,
      `Approve surgical patch mismatch: ${JSON.stringify(approvePatch)}`
    );

    const revokePatch = firestoreSvc.buildSurgicalAdminVerificationPatch(
      false,
      'charlesjj3186@gmail.com',
      nowIso
    );
    assert(
      revokePatch.adminVerified === false &&
        revokePatch.adminVerifiedAt === null &&
        revokePatch.adminVerifiedBy === null &&
        revokePatch.updatedAt === nowIso,
      `Revoke surgical patch mismatch: ${JSON.stringify(revokePatch)}`
    );

    // 3. Schema drift detector passes clean CH001 docs and catches unknown keys or plain-object timestamps
    assert(
      firestoreSvc.hasChurchDocumentSchemaDrift(
        {
          id: 'CH001',
          name: 'Iglesia Ev. de la Resurreccion',
          adminAuthMethod: 'email_password',
          createdAt: '2026-09-18',
          updatedAt: '2026-11-19T05:00:00.000Z',
        },
        'CH001'
      ) === false,
      'Clean CH001 document must report zero schema drift'
    );
    assert(
      firestoreSvc.hasChurchDocumentSchemaDrift(
        {
          id: 'CH001',
          name: 'Iglesia Ev. de la Resurreccion',
          unexpectedLegacyField: 'bad',
        },
        'CH001'
      ) === true,
      'Unknown legacy key outside ALLOWED_CHURCH_KEYS must be flagged as schema drift'
    );
    assert(
      firestoreSvc.hasChurchDocumentSchemaDrift(
        {
          id: 'CH001',
          name: 'Iglesia Ev. de la Resurreccion',
          updatedAt: { seconds: 1794926834, nanoseconds: 0 },
        },
        'CH001'
      ) === true,
      'Plain-object updatedAt must be flagged as schema drift'
    );
  });

  await runTest('71. Multi-tenant CreateChurch enforces >=2 char name, skipImmediateCloudSave + strict sync, and safe rollback preserving CH001', async () => {
    const storage = await import('../utils/storage');
    const firestoreSvc = await import('../services/firestoreService');
    localStorage.clear();

    storage.saveToStorage(storage.STORAGE_KEYS.CHURCHES, [
      {
        id: 'CH001',
        code: 'CH001',
        name: 'Iglesia Ev. de la Resurreccion',
        pastor: 'Pastor Primary',
        address: 'Santo Domingo',
        city: 'Santo Domingo',
        phone: '',
        email: 'primary@church.org',
        motto: 'Fe',
        themeColor: 'indigo',
        logoIcon: 'Church',
        createdAt: '2026-09-18',
      },
    ]);

    let threwShortName = false;
    try {
      storage.createNewChurch(
        {
          name: 'X',
          pastor: 'Pastè Jean',
          address: 'Port-au-Prince',
          city: 'Port-au-Prince',
          phone: '',
          email: 'jean@church.org',
          motto: 'Espwa',
          adminGoogleEmail: 'jean@church.org',
          adminGoogleUid: 'uid-jean-1',
          adminAuthMethod: 'email_password',
        },
        { skipImmediateCloudSave: true }
      );
    } catch {
      threwShortName = true;
    }
    assert(threwShortName, 'createNewChurch must reject < 2 char church names');

    const created = storage.createNewChurch(
      {
        name: 'Legliz Espwa Vivant',
        code: 'LEV',
        pastor: 'Pastè Jean',
        address: 'Delmas 33',
        city: 'Port-au-Prince',
        phone: '+509 3700-1111',
        email: 'jean@church.org',
        motto: 'Lafwa',
        adminGoogleEmail: 'jean@church.org',
        adminGoogleUid: 'uid-jean-1',
        adminAuthMethod: 'email_password',
      },
      { skipImmediateCloudSave: true }
    );

    assert(created.id.startsWith('CH002-'), `Expected CH002-* ID, got ${created.id}`);
    assert(storage.hasPendingLocalUpload('church', created.id) === true, 'Created church starts with pending local upload flag');

    const strictPayload = firestoreSvc.buildChurchFirestorePayload(created, created.id, {
      deliberateAdminVerificationUpdate: false,
    });
    assert(
      strictPayload.adminGoogleUid === 'uid-jean-1' &&
        strictPayload.adminGoogleEmail === 'jean@church.org' &&
        !('adminVerified' in strictPayload) &&
        !('adminVerifiedAt' in strictPayload) &&
        !('adminVerifiedBy' in strictPayload),
      'New church payload must carry owner UID/email and omit adminVerified* locks'
    );

    const syncRes = await storage.syncCreatedChurchToCloudStrict(created);
    assert(
      syncRes.synced === true &&
        syncRes.offlineQueued === false &&
        storage.hasPendingLocalUpload('church', created.id) === false,
      'syncCreatedChurchToCloudStrict must confirm sync and clear pending upload flag'
    );

    // Rollback protects CH001 while removing only uncommitted target church
    storage.rollbackLocalChurchCreation(created.id);
    storage.rollbackLocalChurchCreation('CH001');
    const remaining = storage.getAllChurches();
    assert(
      remaining.some((c) => c.id === 'CH001') &&
        !remaining.some((c) => c.id === created.id),
      'rollbackLocalChurchCreation must remove target church without ever affecting CH001'
    );
  });

  await runTest('72. resolveAdminOwnedChurches strictly isolates tenant churches by UID/email and blocks Super Dev & accidental test churches', async () => {
    const storage = await import('../utils/storage');

    const pool: any[] = [
      {
        id: 'CH-ALPHA',
        code: 'ALP',
        name: 'Legliz Alfa',
        adminGoogleEmail: 'paste.alpha@church.org',
        adminGoogleUid: 'uid-alpha',
        status: 'active',
      },
      {
        id: 'CH-BETA-1',
        code: 'BT1',
        name: 'Legliz Beta Nò',
        adminGoogleEmail: 'paste.beta@church.org',
        adminGoogleUid: 'uid-beta',
        status: 'active',
      },
      {
        id: 'CH-BETA-2',
        code: 'BT2',
        name: 'Legliz Beta Sid',
        adminGoogleEmail: 'PASTE.BETA@CHURCH.ORG',
        adminGoogleUid: 'uid-beta',
        status: 'active',
      },
      {
        id: 'CH002-MIG9',
        code: 'MIG',
        name: 'Nouvo Legliz Migre',
        status: 'active',
      },
    ];

    const alphaOwned = storage.resolveAdminOwnedChurches(pool, 'uid-alpha', 'paste.alpha@church.org');
    assert(
      alphaOwned.length === 1 && alphaOwned[0].id === 'CH-ALPHA',
      'Single-church admin must auto-resolve strictly to their own single church'
    );

    const betaOwned = storage.resolveAdminOwnedChurches(pool, 'uid-other', 'paste.beta@church.org');
    assert(
      betaOwned.length === 2 &&
        betaOwned.every((c) => c.id.startsWith('CH-BETA-')) &&
        !betaOwned.some((c) => c.id === 'CH-ALPHA'),
      'Multi-church admin must resolve ONLY their own churches with case-insensitive email match and zero cross-tenant leak'
    );

    const strangerOwned = storage.resolveAdminOwnedChurches(pool, 'uid-stranger', 'stranger@other.org');
    assert(
      strangerOwned.length === 0,
      'Unrelated user must resolve 0 churches and never inherit another tenant church'
    );

    const superDevEmail = Buffer.from('Y2hhcmxlc2pqMzE4NkBnbWFpbC5jb20=', 'base64').toString('utf8');
    const superDevOwned = storage.resolveAdminOwnedChurches(pool, 'uid-alpha', superDevEmail);
    assert(
      superDevOwned.length === 0,
      'Super Developer email must be strictly isolated from church admin auto-resolution'
    );
  });

  await runTest('73. Remember Me helpers persist only non-sensitive identifiers (never passwords/PINs), block Super Dev, and clear cleanly', async () => {
    const storage = await import('../utils/storage');

    localStorage.clear();

    const initialAdmin = storage.getRememberedAdminLogin();
    assert(initialAdmin.remember === false && initialAdmin.email === '', 'Admin remember-me starts disabled');

    storage.saveRememberedAdminLogin('  Paste.Jean@Legliz.ORG ', 'CH-JEAN');
    const savedAdmin = storage.getRememberedAdminLogin();
    const rawAdminJson = localStorage.getItem('omnichurch_remembered_admin_login_v1') || '';
    assert(
      savedAdmin.remember === true &&
        savedAdmin.email === 'paste.jean@legliz.org' &&
        savedAdmin.churchId === 'CH-JEAN' &&
        !rawAdminJson.toLowerCase().includes('password'),
      'Admin remember-me must persist lowercase email + churchId without storing any password field'
    );

    // Super Developer email must never be stored
    const superDevEmail = Buffer.from('Y2hhcmxlc2pqMzE4NkBnbWFpbC5jb20=', 'base64').toString('utf8');
    storage.saveRememberedAdminLogin(superDevEmail, 'CH001');
    assert(
      storage.getRememberedAdminLogin().remember === false,
      'Super Developer email must be rejected by saveRememberedAdminLogin'
    );

    // Clear removes completely
    storage.saveRememberedAdminLogin('admin@ok.org', 'CH-OK');
    storage.clearRememberedAdminLogin();
    assert(
      storage.getRememberedAdminLogin().remember === false &&
        storage.getRememberedAdminLogin().email === '',
      'clearRememberedAdminLogin must clear remembered email immediately'
    );

    // Member Remember-Me stores identifier + churchId only (never PIN)
    storage.saveRememberedMemberLogin('CH001-JD4827', 'CH001');
    const savedMember = storage.getRememberedMemberLogin();
    const rawMemberJson = localStorage.getItem('omnichurch_remembered_member_login_v1') || '';
    assert(
      savedMember.remember === true &&
        savedMember.memberIdOrPhone === 'CH001-JD4827' &&
        savedMember.churchId === 'CH001' &&
        !rawMemberJson.toLowerCase().includes('pin'),
      'Member remember-me must persist only identifier + churchId without storing any PIN'
    );

    storage.clearRememberedMemberLogin();
    assert(
      storage.getRememberedMemberLogin().remember === false,
      'clearRememberedMemberLogin must wipe remembered member identifier'
    );
  });

  await runTest('74. Admin QR unified scan blocks ended, expired-endTime, and closed services without falling back to services[0]', async () => {
    const { STORAGE_KEYS } = await import('../utils/storage');
    const { recordAttendanceScanUnified } = await import('../utils/qrSyncLayer');

    const prevNavigator = (globalThis as any).navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        configurable: true,
        writable: true,
      });

      const testChurchId = 'CH_FAY1_TEST';
      const endedPastSrv: any = {
        id: 'srv-fay1-ended',
        churchId: testChurchId,
        title: 'Kilt Fini Pou Toutan',
        category: 'dominical',
        date: '2020-01-05',
        startTime: '08:00',
        endTime: '11:00',
        isOpenForAttendance: false,
        isPermanentlyEnded: true,
        endedAt: '2020-01-05T11:00:00Z',
      };
      const expiredOpenFlagSrv: any = {
        id: 'srv-fay1-expired-flag',
        churchId: testChurchId,
        title: 'Kilt Lè Li Pase Men Drapo Toujou Vre',
        category: 'dominical',
        date: '2020-01-06',
        startTime: '08:00',
        endTime: '11:00',
        isOpenForAttendance: true,
        isPermanentlyEnded: false,
      };
      const futureClosedSrv: any = {
        id: 'srv-fay1-closed-future',
        churchId: testChurchId,
        title: 'Kilt Pwograme Poko Louvri',
        category: 'dominical',
        date: '2099-12-30',
        startTime: '08:00',
        endTime: '11:00',
        isOpenForAttendance: false,
        isPermanentlyEnded: false,
      };
      const nowDt = new Date();
      const todayLocal = `${nowDt.getFullYear()}-${String(nowDt.getMonth() + 1).padStart(2, '0')}-${String(nowDt.getDate()).padStart(2, '0')}`;
      const liveOngoingSrv: any = {
        id: 'srv-fay1-active',
        churchId: testChurchId,
        title: 'Kilt Aktif Kounye a',
        category: 'dominical',
        date: todayLocal,
        startTime: '00:00',
        endTime: '23:59',
        isOpenForAttendance: true,
        isPermanentlyEnded: false,
      };
      const testMember: any = {
        id: 'm-fay1-1',
        churchId: testChurchId,
        memberId: 'FY1-001',
        fullName: 'Jean Baptiste',
        phone: '50911112222',
        department: 'Service Général',
        role: 'Manm',
        status: 'active',
        barcodeToken: 'CHURCH:CH_FAY1_TEST|MEMBER:FY1-001',
        createdAt: '2026-01-01T00:00:00Z',
      };

      localStorage.setItem(
        STORAGE_KEYS.CHURCHES,
        JSON.stringify([{ id: testChurchId, code: 'FY1', name: 'Legliz Tès Fay 1' }])
      );
      localStorage.setItem(
        STORAGE_KEYS.SERVICES,
        JSON.stringify([endedPastSrv, expiredOpenFlagSrv, futureClosedSrv])
      );
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([testMember]));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PENDING_ATTENDANCE, JSON.stringify([]));

      // 1. Admin scan targeting permanently ended service MUST fail
      const resEnded = await recordAttendanceScanUnified({
        currentChurchId: testChurchId,
        rawCode: 'FY1-001',
        serviceId: endedPastSrv.id,
        recordedBy: 'Admin Scanner',
        requireActiveOngoingService: false,
      });
      assert(resEnded.success === false, 'Admin scan into permanently ended service must be blocked');

      // 2. Admin scan targeting service past endTime (even if isOpenForAttendance is still true) MUST fail
      const resExpired = await recordAttendanceScanUnified({
        currentChurchId: testChurchId,
        rawCode: 'FY1-001',
        serviceId: expiredOpenFlagSrv.id,
        recordedBy: 'Admin Scanner',
        requireActiveOngoingService: false,
      });
      assert(resExpired.success === false, 'Admin scan into expired-endTime service must be blocked');

      // 3. Admin scan targeting closed (not yet opened) future service MUST fail
      const resClosed = await recordAttendanceScanUnified({
        currentChurchId: testChurchId,
        rawCode: 'FY1-001',
        serviceId: futureClosedSrv.id,
        recordedBy: 'Admin Scanner',
        requireActiveOngoingService: false,
      });
      assert(resClosed.success === false, 'Admin scan into closed service must be blocked');

      // 4. Admin scan with omitted serviceId when NO active ongoing service exists MUST NOT fall back to services[0]
      const resAutoNoActive = await recordAttendanceScanUnified({
        currentChurchId: testChurchId,
        rawCode: 'FY1-001',
        recordedBy: 'Admin Scanner',
        requireActiveOngoingService: false,
      });
      assert(resAutoNoActive.success === false, 'Admin scan with no active ongoing service must not fall back to services[0]');

      // 5. Once an active ongoing service exists, Admin scan MUST succeed
      localStorage.setItem(
        STORAGE_KEYS.SERVICES,
        JSON.stringify([endedPastSrv, expiredOpenFlagSrv, futureClosedSrv, liveOngoingSrv])
      );
      const resActive = await recordAttendanceScanUnified({
        currentChurchId: testChurchId,
        rawCode: 'CHURCH:CH_FAY1_TEST|MEMBER:FY1-001',
        serviceId: liveOngoingSrv.id,
        recordedBy: 'Admin Scanner',
        requireActiveOngoingService: false,
      });
      assert(
        resActive.success === true && resActive.record?.serviceId === liveOngoingSrv.id,
        `Admin scan into open ongoing service must succeed, got: ${resActive.errorMessage}`
      );
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: prevNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  await runTest('75. Admin Desk manual check-in rejects ended/closed services and allows only active ongoing service', async () => {
    const { STORAGE_KEYS, isServiceEnded } = await import('../utils/storage');
    const { isServiceCurrentlyActive } = await import('../utils/permissions');
    const { recordAttendanceScanUnified } = await import('../utils/qrSyncLayer');

    const prevNavigator = (globalThis as any).navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        configurable: true,
        writable: true,
      });

      const churchId = 'CH_FAY2_DESK';
      const endedSrv: any = {
        id: 'srv-fay2-ended',
        churchId,
        title: 'Kilt Fini Mèkredi',
        category: 'priere',
        date: '2021-03-10',
        startTime: '18:00',
        endTime: '20:00',
        isOpenForAttendance: false,
        isPermanentlyEnded: true,
        endedAt: '2021-03-10T20:00:00Z',
      };
      const nowDt = new Date();
      const todayLocal = `${nowDt.getFullYear()}-${String(nowDt.getMonth() + 1).padStart(2, '0')}-${String(nowDt.getDate()).padStart(2, '0')}`;
      const activeSrv: any = {
        id: 'srv-fay2-active',
        churchId,
        title: 'Kilt Dimanch Live',
        category: 'dominical',
        date: todayLocal,
        startTime: '00:00',
        endTime: '23:59',
        isOpenForAttendance: true,
        isPermanentlyEnded: false,
      };
      const member: any = {
        id: 'm-fay2-1',
        churchId,
        memberId: 'FY2-001',
        fullName: 'Marie Claire',
        phone: '50922223333',
        department: 'Koral',
        role: 'Manm',
        status: 'active',
        barcodeToken: 'CHURCH:CH_FAY2_DESK|MEMBER:FY2-001',
        createdAt: '2026-01-01T00:00:00Z',
      };

      localStorage.setItem(
        STORAGE_KEYS.CHURCHES,
        JSON.stringify([{ id: churchId, code: 'FY2', name: 'Legliz Tès Fay 2' }])
      );
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([endedSrv, activeSrv]));
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([member]));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PENDING_ATTENDANCE, JSON.stringify([]));

      assert(
        isServiceCurrentlyActive(endedSrv, isServiceEnded) === false,
        'Ended service must NOT allow Admin Desk manual check-in UI'
      );
      assert(
        isServiceCurrentlyActive(activeSrv, isServiceEnded) === true,
        'Open ongoing service must allow Admin Desk manual check-in UI'
      );

      const deskEndedRes = await recordAttendanceScanUnified({
        currentChurchId: churchId,
        rawCode: 'FY2-001',
        serviceId: endedSrv.id,
        method: 'manual',
        recordedBy: 'Admin Desk',
        requireActiveOngoingService: true,
      });
      assert(deskEndedRes.success === false, 'Admin Desk manual check-in into ended service MUST fail');

      const deskActiveRes = await recordAttendanceScanUnified({
        currentChurchId: churchId,
        rawCode: 'FY2-001',
        serviceId: activeSrv.id,
        method: 'manual',
        recordedBy: 'Admin Desk',
        requireActiveOngoingService: true,
      });
      assert(
        deskActiveRes.success === true && deskActiveRes.record?.checkInMethod === 'manual',
        `Admin Desk manual check-in into active service must succeed, got: ${deskActiveRes.errorMessage}`
      );
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: prevNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  await runTest('76. Dashboard quick-open excludes ended services and setServiceActiveStatus returns false on ended reopen attempts', async () => {
    const { STORAGE_KEYS, isServiceEnded, setServiceActiveStatus, getServicesByChurch } = await import('../utils/storage');

    const churchId = 'CH_FAY3_DASH';
    const endedPastSrv: any = {
      id: 'srv-fay3-ended',
      churchId,
      title: 'Kilt Pase',
      category: 'dominical',
      date: '2020-02-02',
      startTime: '08:00',
      endTime: '11:00',
      isOpenForAttendance: false,
      isPermanentlyEnded: true,
      endedAt: '2020-02-02T11:00:00Z',
    };
    const nowDt = new Date();
    const todayLocal = `${nowDt.getFullYear()}-${String(nowDt.getMonth() + 1).padStart(2, '0')}-${String(nowDt.getDate()).padStart(2, '0')}`;
    const closedUpcomingSrv: any = {
      id: 'srv-fay3-upcoming',
      churchId,
      title: 'Kilt Pwograme',
      category: 'dominical',
      date: todayLocal,
      startTime: '00:00',
      endTime: '23:59',
      isOpenForAttendance: false,
      isPermanentlyEnded: false,
    };

    localStorage.setItem(
      STORAGE_KEYS.CHURCHES,
      JSON.stringify([{ id: churchId, code: 'FY3', name: 'Legliz Tès Fay 3' }])
    );
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([endedPastSrv, closedUpcomingSrv]));

    const allChurchServices = getServicesByChurch(churchId);
    const openableServices = allChurchServices.filter((s) => !s.isPermanentlyEnded && !isServiceEnded(s));
    assert(
      openableServices.length === 1 && openableServices[0].id === closedUpcomingSrv.id,
      'Quick-open list must strictly exclude ended/permanently closed services'
    );

    const reopenEndedOk = setServiceActiveStatus(churchId, endedPastSrv.id, true);
    assert(reopenEndedOk === false, 'setServiceActiveStatus must return false when attempting to reopen an ended service');

    const openUpcomingOk = setServiceActiveStatus(churchId, closedUpcomingSrv.id, true);
    assert(openUpcomingOk === true, 'setServiceActiveStatus must return true when opening a valid non-ended service');

    // Closing it marks it permanently ended and subsequent reopen returns false
    const closeOk = setServiceActiveStatus(churchId, closedUpcomingSrv.id, false);
    assert(closeOk === true, 'Closing active service must succeed');
    const reopenAfterCloseOk = setServiceActiveStatus(churchId, closedUpcomingSrv.id, true);
    assert(reopenAfterCloseOk === false, 'Reopening a service after manual close must return false');
  });

  await runTest('77. isServiceEnded uses local calendar date (not UTC rollover) so evening services stay open until scheduled local endTime', async () => {
    const { isServiceEnded, formatLocalDateYmd } = await import('../utils/storage');

    // Construct an evening service on a specific local date (2026-11-20, 19:00 -> 21:30 local time)
    const eveningService: any = {
      id: 'srv-fay4-evening',
      churchId: 'CH_FAY4_TZ',
      title: 'Sèvis Aswè Vandredi',
      category: 'priere',
      date: '2026-11-20',
      startTime: '19:00',
      endTime: '21:30',
      isOpenForAttendance: true,
      isPermanentlyEnded: false,
    };

    const at2030Local = new Date(2026, 10, 20, 20, 30, 0, 0); // 20:30 local (which is 2026-11-21 in UTC for UTC-4/UTC-5/UTC-8!)
    assert(
      formatLocalDateYmd(at2030Local) === '2026-11-20',
      `formatLocalDateYmd must return local date 2026-11-20, got ${formatLocalDateYmd(at2030Local)}`
    );
    assert(
      isServiceEnded(eveningService, at2030Local) === false,
      'Evening service (19:00-21:30 local) must NOT be marked ended at 20:30 local even when UTC date has rolled over'
    );

    const at2129Local = new Date(2026, 10, 20, 21, 29, 59, 0);
    assert(
      isServiceEnded(eveningService, at2129Local) === false,
      'Evening service must remain open 1 second before scheduled endTime'
    );

    const at2130Local = new Date(2026, 10, 20, 21, 30, 0, 0);
    assert(
      isServiceEnded(eveningService, at2130Local) === true,
      'Evening service must be marked ended exactly at scheduled local endTime (21:30)'
    );

    const nextDayLocal = new Date(2026, 10, 21, 0, 5, 0, 0);
    assert(
      isServiceEnded(eveningService, nextDayLocal) === true,
      'Evening service must be marked ended on the next local calendar day'
    );
  });

  await runTest('78. getNextServiceAutoSyncDelayMs schedules exactly 5 minutes after earliest active endTime, returns null when all ended, and caps at 24h', async () => {
    const { getNextServiceAutoSyncDelayMs, POST_SERVICE_AUTO_SYNC_DELAY_MS } = await import('../utils/storage');

    assert(POST_SERVICE_AUTO_SYNC_DELAY_MS === 5 * 60 * 1000, 'Default post-service sync buffer must be exactly 5 minutes');

    const alreadyLockedSrv: any = {
      id: 'srv-locked',
      date: '2026-11-20',
      startTime: '08:00',
      endTime: '11:00',
      isOpenForAttendance: false,
      isPermanentlyEnded: true,
    };
    assert(
      getNextServiceAutoSyncDelayMs([alreadyLockedSrv], new Date(2026, 10, 20, 12, 0, 0).getTime()) === null,
      'Must return null (0 active timers) when all services are already permanently ended'
    );

    const todaySrv: any = {
      id: 'srv-today',
      date: '2026-11-20',
      startTime: '08:00',
      endTime: '11:00',
      isOpenForAttendance: true,
      isPermanentlyEnded: false,
    };

    // At 10:50 -> 10 min until endTime + 5 min buffer = 15 min
    const at1050 = new Date(2026, 10, 20, 10, 50, 0, 0).getTime();
    assert(
      getNextServiceAutoSyncDelayMs([todaySrv], at1050) === 15 * 60 * 1000,
      'At 10:50 for 11:00 endTime, next auto-sync must be scheduled in exactly 15 minutes (11:05)'
    );

    // At 11:02 (2 min after endTime) -> still 3 min left before 5-min post-service sync
    const at1102 = new Date(2026, 10, 20, 11, 2, 0, 0).getTime();
    assert(
      getNextServiceAutoSyncDelayMs([todaySrv], at1102) === 3 * 60 * 1000,
      'At 11:02 for 11:00 endTime, next auto-sync must wait remaining 3 minutes until 11:05'
    );

    // At 11:05 (5 min after endTime) -> due immediately (0 ms)
    const at1105 = new Date(2026, 10, 20, 11, 5, 0, 0).getTime();
    assert(
      getNextServiceAutoSyncDelayMs([todaySrv], at1105) === 0,
      'At 11:05 for 11:00 endTime, auto-sync must trigger immediately (0 ms)'
    );

    // Far-future service (> 30 days away) must be capped at 24h to avoid JS 32-bit timer overflow
    const farFutureSrv: any = {
      id: 'srv-far',
      date: '2027-06-01',
      startTime: '08:00',
      endTime: '11:00',
      isOpenForAttendance: false,
      isPermanentlyEnded: false,
    };
    const cappedDelay = getNextServiceAutoSyncDelayMs([farFutureSrv], at1050);
    assert(
      cappedDelay === 24 * 60 * 60 * 1000,
      `Far-future service delay must be capped at 24h (86400000ms), got ${cappedDelay}`
    );
  });

  await runTest('79. addServiceSession blocks creating past/already-ended services as Open and preserves existing active service', async () => {
    const { STORAGE_KEYS, addServiceSession, getServicesByChurch, getActiveService } = await import('../utils/storage');

    const churchId = 'CH_FAY5_CREATE';
    const nowDt = new Date();
    const todayLocal = `${nowDt.getFullYear()}-${String(nowDt.getMonth() + 1).padStart(2, '0')}-${String(nowDt.getDate()).padStart(2, '0')}`;
    const existingLiveSrv: any = {
      id: 'srv-fay5-live-existing',
      churchId,
      title: 'Kilt Live Ki Deja Louvri',
      category: 'dominical',
      date: todayLocal,
      startTime: '00:00',
      endTime: '23:59',
      isOpenForAttendance: true,
      wasOpenedForAttendance: true,
      isPermanentlyEnded: false,
    };

    localStorage.setItem(
      STORAGE_KEYS.CHURCHES,
      JSON.stringify([{ id: churchId, code: 'FY5', name: 'Legliz Tès Fay 5' }])
    );
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([existingLiveSrv]));

    // Attempt to create a past service with isOpenForAttendance: true
    const pastCreated = addServiceSession(churchId, {
      title: 'Kilt nan Pase',
      category: 'priere',
      date: '2020-05-01',
      startTime: '08:00',
      endTime: '11:00',
      isOpenForAttendance: true,
      sendReminder24h: false,
    });

    assert(pastCreated.isOpenForAttendance === false, 'Past service MUST NEVER be saved with isOpenForAttendance === true');
    assert(pastCreated.isPermanentlyEnded === true, 'Past service MUST be saved as isPermanentlyEnded === true');
    assert(pastCreated.wasOpenedForAttendance === false, 'Past service saved as archived must have wasOpenedForAttendance === false');

    // Existing live service must STILL remain open and undisturbed!
    const currentActive = getActiveService(churchId);
    assert(
      currentActive?.id === existingLiveSrv.id && currentActive?.isOpenForAttendance === true,
      'Creating a past service must NEVER close an already-open ongoing service'
    );

    // Creating a genuine ongoing service with isOpenForAttendance: true works normally
    const futureCreated = addServiceSession(churchId, {
      title: 'Nouvo Kilt Aktif',
      category: 'dominical',
      date: todayLocal,
      startTime: '00:00',
      endTime: '23:59',
      isOpenForAttendance: true,
      sendReminder24h: false,
    });
    assert(futureCreated.isOpenForAttendance === true, 'Valid ongoing service can be created as open');
    assert(futureCreated.wasOpenedForAttendance === true, 'Valid open service sets wasOpenedForAttendance === true');
    const refreshedServices = getServicesByChurch(churchId);
    const oldLiveAfter = refreshedServices.find((s) => s.id === existingLiveSrv.id);
    assert(oldLiveAfter?.isOpenForAttendance === false, 'Opening a valid new ongoing service still enforces single-active-service rule');
  });

  await runTest('80. Legacy recordAttendanceScan, updateServiceSession, and firestore.rules enforce terminal lock on ended services (Fay #6)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const {
      STORAGE_KEYS,
      recordAttendanceScan,
      updateServiceSession,
      getServicesByChurch,
    } = await import('../utils/storage');

    const churchId = 'CH_FAY6_HARDEN';
    const endedSrv: any = {
      id: 'srv-fay6-ended',
      churchId,
      title: 'Kilt Fini',
      category: 'dominical',
      date: '2020-01-10',
      startTime: '08:00',
      endTime: '11:00',
      isOpenForAttendance: false,
      isPermanentlyEnded: true,
      endedAt: '2020-01-10T16:00:00.000Z',
    };
    const expiredOpenSrv: any = {
      id: 'srv-fay6-expired-open',
      churchId,
      title: 'Kilt Lè Pase Men Open Flag',
      category: 'priere',
      date: '2020-02-10',
      startTime: '08:00',
      endTime: '10:00',
      isOpenForAttendance: true,
      isPermanentlyEnded: false,
    };
    const closedUpcomingSrv: any = {
      id: 'srv-fay6-closed-future',
      churchId,
      title: 'Kilt Pwograme Fèmen',
      category: 'jeunesse',
      date: '2099-12-20',
      startTime: '15:00',
      endTime: '17:00',
      isOpenForAttendance: false,
      isPermanentlyEnded: false,
    };
    const nowDt = new Date();
    const todayLocal = `${nowDt.getFullYear()}-${String(nowDt.getMonth() + 1).padStart(2, '0')}-${String(nowDt.getDate()).padStart(2, '0')}`;
    const liveActiveSrv: any = {
      id: 'srv-fay6-live',
      churchId,
      title: 'Kilt Aktif Kounye a',
      category: 'dominical',
      date: todayLocal,
      startTime: '00:00',
      endTime: '23:59',
      isOpenForAttendance: true,
      wasOpenedForAttendance: true,
      isPermanentlyEnded: false,
    };
    const member: any = {
      id: 'mem-fay6-1',
      churchId,
      memberId: 'F6-001',
      fullName: 'Jean F6',
      role: 'Manm',
      department: 'Koral',
      status: 'active',
      barcodeToken: `${churchId}:F6-001`,
    };

    localStorage.setItem(
      STORAGE_KEYS.CHURCHES,
      JSON.stringify([{ id: churchId, code: 'FY6', name: 'Legliz Tès Fay 6' }])
    );
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([member]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(
      STORAGE_KEYS.SERVICES,
      JSON.stringify([endedSrv, expiredOpenSrv, closedUpcomingSrv])
    );

    // 1. Legacy recordAttendanceScan MUST NOT fall back to services[0] when no active ongoing service exists
    const autoNoActive = recordAttendanceScan({
      currentChurchId: churchId,
      rawCode: member.barcodeToken,
    });
    assert(autoNoActive.success === false, 'Legacy recordAttendanceScan must reject when no ongoing open service exists (no services[0] fallback)');

    const explicitEnded = recordAttendanceScan({
      currentChurchId: churchId,
      serviceId: endedSrv.id,
      rawCode: member.barcodeToken,
    });
    assert(explicitEnded.success === false, 'Legacy recordAttendanceScan must reject permanently ended service');

    const explicitExpired = recordAttendanceScan({
      currentChurchId: churchId,
      serviceId: expiredOpenSrv.id,
      rawCode: member.barcodeToken,
    });
    assert(explicitExpired.success === false, 'Legacy recordAttendanceScan must reject service whose scheduled endTime has passed');

    const explicitClosed = recordAttendanceScan({
      currentChurchId: churchId,
      serviceId: closedUpcomingSrv.id,
      rawCode: member.barcodeToken,
    });
    assert(explicitClosed.success === false, 'Legacy recordAttendanceScan must reject closed upcoming service');

    // Add an active ongoing service -> legacy recordAttendanceScan succeeds
    localStorage.setItem(
      STORAGE_KEYS.SERVICES,
      JSON.stringify([endedSrv, expiredOpenSrv, closedUpcomingSrv, liveActiveSrv])
    );
    const validLegacyScan = recordAttendanceScan({
      currentChurchId: churchId,
      rawCode: member.barcodeToken,
    });
    assert(
      validLegacyScan.success === true && validLegacyScan.service?.id === liveActiveSrv.id,
      'Legacy recordAttendanceScan must resolve and accept a valid open ongoing service'
    );

    // 2. updateServiceSession MUST block reopening/unlocking an already-ended service
    const reopenAttempt = updateServiceSession(churchId, endedSrv.id, {
      isOpenForAttendance: true,
      isPermanentlyEnded: false,
      endedAt: '',
    });
    assert(reopenAttempt?.isOpenForAttendance === false, 'updateServiceSession must block setting isOpenForAttendance: true on ended service');
    assert(reopenAttempt?.isPermanentlyEnded === true, 'updateServiceSession must block setting isPermanentlyEnded: false on ended service');
    assert(reopenAttempt?.endedAt === endedSrv.endedAt, 'updateServiceSession must block clearing endedAt on ended service');

    // Non-destructive metadata like notes/reminderSentAt on ended service remains allowed
    const noteUpdate = updateServiceSession(churchId, endedSrv.id, { notes: 'Achiv verifye' });
    assert(noteUpdate?.notes === 'Achiv verifye', 'updateServiceSession should still allow non-destructive notes update on ended service');

    // Rescheduling an open service into the past forces it closed & permanently ended
    const movedToPast = updateServiceSession(churchId, liveActiveSrv.id, {
      date: '2020-03-01',
      startTime: '08:00',
      endTime: '10:00',
      isOpenForAttendance: true,
    });
    assert(movedToPast?.isOpenForAttendance === false, 'Rescheduling a live service into the past must force isOpenForAttendance: false');
    assert(movedToPast?.isPermanentlyEnded === true, 'Rescheduling a live service into the past must force isPermanentlyEnded: true');
    const persistedMoved = getServicesByChurch(churchId).find((s) => s.id === liveActiveSrv.id);
    assert(persistedMoved?.isOpenForAttendance === false && persistedMoved?.isPermanentlyEnded === true, 'Persisted past-rescheduled service must be permanently locked');

    // 3. Static verification of hardened firestore.rules
    const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    assert(
      rulesText.includes('!(isServicePermanentlyLocked(data) && isServiceOpenFlag(data))'),
      'firestore.rules isValidService must reject simultaneous isPermanentlyEnded == true and isOpenForAttendance == true'
    );
    assert(
      rulesText.includes('!isServicePermanentlyLocked(existing())') &&
      rulesText.includes("affectedKeys().hasOnly(['notes', 'reminderSentAt', 'sendReminder24h', 'updatedAt'])"),
      'firestore.rules services update must lock permanently ended services against reopening and schedule tampering'
    );
    assert(
      rulesText.includes('isServiceAcceptingAttendance(get(/databases/$(database)/documents/services/$(incoming().serviceId)).data, incoming().churchId)'),
      'firestore.rules attendances create must verify the target service is open and not permanently ended'
    );
  });

  await runTest('81. Member Home Feed displays services exclusively while Announcements stay inside Notifications section', async () => {
    localStorage.clear();
    const {
      getMemberFeedServices,
      getServiceFeedTargetId,
      formatServiceCalendarBadge,
      buildServiceShareAnnouncement,
    } = await import('../utils/memberFeedUtils');
    const { getContextualNotifications } = await import('../services/notificationCenterService');

    const church: any = {
      id: 'CH_FEED_ONLY',
      code: 'CFO',
      name: 'Legliz Sèvis Fil',
      pastor: 'Pastè Jak',
      city: 'Pòtoprens',
      country: 'Ayiti',
      adminGoogleUid: 'uid-admin-cfo',
    };

    const member: any = {
      id: 'mem-feed-1',
      memberId: 'CFO-0001',
      churchId: church.id,
      fullName: 'Sè Ruth',
      role: 'member',
      department: 'Koral',
    };

    const services: any[] = [
      {
        id: 'srv-ended-1',
        churchId: church.id,
        category: 'etude',
        title: 'Etid Biblik Pase',
        date: '2020-01-10',
        startTime: '18:00',
        endTime: '20:00',
        preacherOrLeader: 'Pastè Jak',
        isOpenForAttendance: false,
        isPermanentlyEnded: true,
        createdAt: '2020-01-09T10:00:00.000Z',
      },
      {
        id: 'srv-upcoming-1',
        churchId: church.id,
        category: 'jeunesse',
        title: 'Reyinyon Jenès',
        date: '2099-06-15',
        startTime: '16:00',
        endTime: '18:00',
        preacherOrLeader: 'Frè Pòl',
        isOpenForAttendance: false,
        isPermanentlyEnded: false,
        sendReminder24h: true,
        createdAt: '2026-11-24T09:00:00.000Z',
      },
      {
        id: 'srv-live-1',
        churchId: church.id,
        category: 'dominical',
        title: 'Gwo Kilt Dimanch Maten',
        date: (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        startTime: '00:00',
        endTime: '23:59',
        preacherOrLeader: 'Pastè Jak',
        leader: 'Sè Ester',
        musicians: 'Koral Betèl',
        isOpenForAttendance: true,
        isPermanentlyEnded: false,
        createdAt: '2026-11-24T10:00:00.000Z',
      },
      {
        id: 'srv-other-church',
        churchId: 'CH_OTHER',
        category: 'dominical',
        title: 'Lòt Legliz',
        date: '2099-12-31',
        startTime: '09:00',
        endTime: '11:00',
        preacherOrLeader: 'Pastè Lòt',
        isOpenForAttendance: true,
      },
      {
        id: 'srv-demo-1',
        churchId: church.id,
        category: 'dominical',
        title: 'Demo Service',
        date: '2099-12-31',
        startTime: '09:00',
        endTime: '11:00',
        isDemo: true,
      },
    ];

    const allFeed = getMemberFeedServices(services, church.id, church.code, 'all');
    assert(allFeed.length === 3, 'All valid church services (live, upcoming, ended) must appear in Member Home Feed');
    assert(allFeed[0].id === 'srv-live-1', 'Live active service must appear first in feed');
    assert(allFeed[1].id === 'srv-upcoming-1', 'Upcoming service (even with reminder enabled) must appear in feed');
    assert(allFeed[2].id === 'srv-ended-1', 'Completed service remains ordered cleanly after upcoming');
    assert(getServiceFeedTargetId(allFeed[0].id) === 'srv-feed-srv-live-1', 'Service feed target ID must use srv-feed- prefix');

    const jeunesseFeed = getMemberFeedServices(services, church.id, church.code, 'jeunesse');
    assert(jeunesseFeed.length === 1 && jeunesseFeed[0].id === 'srv-upcoming-1', 'Category filter must isolate matching service category');

    const cal = formatServiceCalendarBadge('2099-06-15', 'ht');
    assert(cal.month === 'JEN' && cal.day === '15', 'Calendar badge should format month and day properly');

    const shared = buildServiceShareAnnouncement(services[2], church, 'ht');
    assert(shared.id === 'srv-feed-srv-live-1' && shared.title === 'Gwo Kilt Dimanch Maten', 'Share payload must map service metadata cleanly');

    // Announcements must appear ONLY inside Notifications section (not linking back to home feed)
    const announcements: any[] = [
      {
        id: 'ann-notif-only-1',
        churchId: church.id,
        title: 'Reyinyon Koral',
        content: 'Tout manm koral yo envite.',
        category: 'anons',
        date: '2026-11-24',
        authorId: 'uid-admin-cfo',
        posterUrl: 'https://example.com/poster.webp',
        targetAudience: 'Koral',
      },
    ];

    const notifs = getContextualNotifications({
      church,
      member,
      userRole: 'member',
      announcements,
      services,
      language: 'ht',
    });

    const annNotif = notifs.find((n) => n.id === 'ann_ann-notif-only-1');
    assert(Boolean(annNotif), 'Announcement must appear in Notifications section');
    assert(annNotif?.imageUrl === 'https://example.com/poster.webp', 'Announcement poster image must be carried into Notifications');
    assert(!annNotif?.actionTarget, 'Standalone announcement notification must not redirect to MemberHome feed');
  });

  await runTest('82. Service Feed resolves service thumbnails and member profile avatars for Dirijan, Lektè, and Adoratè', async () => {
    const {
      resolveServiceThumbnailUrl,
      resolveMemberAvatarsForRole,
      buildServiceShareAnnouncement,
      getPersonInitials,
    } = await import('../utils/memberFeedUtils');

    const church: any = {
      id: 'CH_AVATAR_TEST',
      code: 'CAT',
      name: 'Legliz Bethel',
      pastor: 'Pastè Jean-Claude Voltaire',
      adminGooglePhoto: 'https://example.com/pastor-admin.jpg',
    };

    const roster: any[] = [
      {
        id: 'm1',
        memberId: 'CAT-001',
        churchId: church.id,
        titlePrefix: 'Frè',
        fullName: 'Jonas Paul',
        avatarUrl: 'https://example.com/jonas.webp',
      },
      {
        id: 'm2',
        memberId: 'CAT-002',
        churchId: church.id,
        fullName: 'Marie Yolande',
        photoUrl: 'https://example.com/marie.webp',
      },
      {
        id: 'm3',
        memberId: 'CAT-003',
        churchId: church.id,
        fullName: 'DavidPierre',
        googlePhoto: 'https://example.com/david.webp',
      },
      {
        id: 'm4',
        memberId: 'CAT-004',
        churchId: church.id,
        fullName: 'Sarah Joseph',
        avatarUrl: 'data:image/webp;base64,UklGRh4AAABXRUJQ',
      },
    ];

    assert(
      resolveServiceThumbnailUrl({ thumbnailUrl: 'https://example.com/thumb.webp', imageUrl: 'https://example.com/img.webp' }) === 'https://example.com/thumb.webp',
      'thumbnailUrl should resolve cleanly'
    );
    assert(
      resolveServiceThumbnailUrl({ posterUrl: 'https://example.com/poster.webp' }) === 'https://example.com/poster.webp',
      'posterUrl should resolve cleanly'
    );
    assert(
      resolveServiceThumbnailUrl({ imageUrl: '  ', bannerUrl: 'data:image/png;base64,AAAA' }) === 'data:image/png;base64,AAAA',
      'Empty imageUrl should fall through to valid bannerUrl'
    );
    assert(
      resolveServiceThumbnailUrl({ imageUrl: 'javascript:alert(1)' }) === null,
      'Unsafe non-image URLs must be rejected for service thumbnails'
    );

    const leaderAvatars = resolveMemberAvatarsForRole('Frè Jonas Paul', roster, church);
    assert(leaderAvatars.length === 1 && leaderAvatars[0].avatarUrl === 'https://example.com/jonas.webp', 'Dirijan avatar should match member with honorific prefix');

    const readerAvatars = resolveMemberAvatarsForRole('Sè Marie Yolande', roster, church);
    assert(readerAvatars.length === 1 && readerAvatars[0].avatarUrl === 'https://example.com/marie.webp', 'Lektè avatar should match member even when Sè prefix is present');

    const preacherAvatars = resolveMemberAvatarsForRole('Pastè Jean-Claude Voltaire', roster, church);
    assert(preacherAvatars.length === 1 && preacherAvatars[0].avatarUrl === 'https://example.com/pastor-admin.jpg', 'Preacher should fall back cleanly to church adminGooglePhoto when matching pastor');

    const worshipAvatars = resolveMemberAvatarsForRole('DavidPierre & Sè Sarah Joseph', roster, church, 3);
    assert(worshipAvatars.length === 2, 'Adoratè / Mizisyen multi-name string must resolve multiple stacked avatars');
    assert(worshipAvatars[0].avatarUrl === 'https://example.com/david.webp', 'First adoratè googlePhoto should resolve');
    assert(worshipAvatars[1].avatarUrl === 'data:image/webp;base64,UklGRh4AAABXRUJQ', 'Second adoratè avatarUrl should resolve');

    assert(getPersonInitials('Frè Jean Baptiste') === 'JB', 'Initials must strip honorific prefix like Frè');
    const shared = buildServiceShareAnnouncement(
      {
        id: 'srv-thumb-1',
        churchId: church.id,
        category: 'dominical',
        title: 'Kilt Dimanch',
        date: '2099-12-31',
        startTime: '08:30',
        endTime: '11:30',
        preacherOrLeader: 'Pastè Jean-Claude Voltaire',
        posterUrl: 'https://example.com/service-cover.webp',
        isOpenForAttendance: false,
        createdAt: '2026-11-24T10:00:00.000Z',
      },
      church,
      'ht'
    );
    assert(shared.posterUrl === 'https://example.com/service-cover.webp', 'Shared service payload must carry service thumbnail');
  });

  await runTest('83. formatServiceFullDateLabel renders weekday + day + month + year accurately in ht/fr/en/es', async () => {
    const { formatServiceFullDateLabel } = await import('../utils/memberFeedUtils');
    assert(
      formatServiceFullDateLabel('2026-11-23', 'ht') === 'lendi 23 novanm 2026',
      'Haitian Creole format must match lendi 23 novanm 2026'
    );
    assert(
      formatServiceFullDateLabel('2026-11-23', 'fr') === 'lundi 23 novembre 2026',
      'French format must match lundi 23 novembre 2026'
    );
    assert(
      formatServiceFullDateLabel('2026-11-23', 'en') === 'Monday, November 23, 2026',
      'English format must match Monday, November 23, 2026'
    );
    assert(
      formatServiceFullDateLabel('2026-11-23', 'es') === 'lunes 23 de noviembre 2026',
      'Spanish format must match lunes 23 de noviembre 2026'
    );
    assert(
      formatServiceFullDateLabel('2026-11-22', 'ht') === 'dimanch 22 novanm 2026',
      'Sunday must format cleanly without UTC day shift'
    );
  });

  await runTest('84. formatServiceTimeAmPm & formatServiceTimeRangeAmPm format 24h and 12h service schedules with AM/PM precision', async () => {
    const { formatServiceTimeAmPm, formatServiceTimeRangeAmPm } = await import('../utils/memberFeedUtils');
    assert(formatServiceTimeAmPm('00:00') === '12:00 AM', '00:00 -> 12:00 AM');
    assert(formatServiceTimeAmPm('08:30') === '8:30 AM', '08:30 -> 8:30 AM');
    assert(formatServiceTimeAmPm('12:00') === '12:00 PM', '12:00 -> 12:00 PM');
    assert(formatServiceTimeAmPm('18:45') === '6:45 PM', '18:45 -> 6:45 PM');
    assert(formatServiceTimeAmPm('06:15 pm') === '6:15 PM', 'Existing am/pm normalizes cleanly');
    assert(
      formatServiceTimeRangeAmPm('08:30', '13:15') === '8:30 AM - 1:15 PM',
      'Range must display both start and end times with AM/PM'
    );
    assert(
      formatServiceTimeRangeAmPm(undefined, undefined, '08:30') === '8:30 AM',
      'Missing startTime falls back cleanly with AM/PM'
    );
  });

  await runTest('85. LIVE badge appears ONLY when service is activated for scanning AND blocks all attendance checks before scheduled startTime (e.g. 6:00 PM vs 7:00 PM)', async () => {
    localStorage.clear();
    const { isServiceBeforeStart, isServiceCurrentlyActive } = await import('../utils/permissions');
    const {
      STORAGE_KEYS,
      isServiceEnded,
      setServiceActiveStatus,
      addServiceSession,
      recordAttendanceScan,
      formatLocalDateYmd,
    } = await import('../utils/storage');
    const { recordAttendanceScanUnified } = await import('../utils/qrSyncLayer');
    const { getContextualNotifications } = await import('../services/notificationCenterService');

    const prevNavigator = (globalThis as any).navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        configurable: true,
        writable: true,
      });

      const churchId = 'CH_PRESTART_TEST';
      const church: any = {
        id: churchId,
        code: 'PST',
        name: 'Legliz Règleman Lè',
      };

      // 1. Exact 6:00 PM vs 7:00 PM deterministic schedule guard
      const eveningService: any = {
        id: 'srv-evening-7pm',
        churchId,
        category: 'priere',
        title: 'Sèvis 7è Aswè',
        date: '2026-11-24',
        startTime: '19:00',
        endTime: '21:00',
        isOpenForAttendance: false,
        isPermanentlyEnded: false,
      };
      const at6pm = new Date(2026, 10, 24, 18, 0, 0, 0);
      const at659pm = new Date(2026, 10, 24, 18, 59, 59, 0);
      const at7pm = new Date(2026, 10, 24, 19, 0, 0, 0);

      assert(isServiceBeforeStart(eveningService, at6pm) === true, 'At 6:00 PM, a 7:00 PM service must be marked before-start');
      assert(isServiceBeforeStart(eveningService, at659pm) === true, 'At 6:59:59 PM, a 7:00 PM service must still be before-start');
      assert(isServiceBeforeStart(eveningService, at7pm) === false, 'At 7:00 PM, service start time has arrived');

      // LIVE badge strictly false before start even if isOpenForAttendance was manually true
      assert(
        isServiceCurrentlyActive({ ...eveningService, isOpenForAttendance: true }, isServiceEnded, at6pm) === false,
        'LIVE badge must NEVER appear at 6:00 PM for a 7:00 PM service even if isOpenForAttendance is true'
      );
      // LIVE badge strictly false at 7:00 PM if admin has NOT activated member attendance scanning
      assert(
        isServiceCurrentlyActive({ ...eveningService, isOpenForAttendance: false }, isServiceEnded, at7pm) === false,
        'LIVE badge must NOT appear at 7:00 PM unless attendance scanning is activated (isOpenForAttendance === true)'
      );
      // LIVE badge appears ONLY when BOTH at/after startTime AND activated for scanning
      assert(
        isServiceCurrentlyActive({ ...eveningService, isOpenForAttendance: true }, isServiceEnded, at7pm) === true,
        'LIVE badge MUST appear at 7:00 PM when service is activated for attendance scanning'
      );

      // 2. Real-clock storage & scanner enforcement for a strictly future upcoming service (tomorrow)
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tomorrowYmd = formatLocalDateYmd(tomorrow);
      const futurePreStartSrv: any = {
        id: 'srv-future-prestart',
        churchId,
        category: 'priere',
        title: 'Kilt 7è Demen',
        date: tomorrowYmd,
        startTime: '19:00',
        endTime: '21:00',
        isOpenForAttendance: true, // simulate stale/tampered open flag before start time
        isPermanentlyEnded: false,
      };
      const todayInProgressNotActivated: any = {
        id: 'srv-today-not-activated',
        churchId,
        category: 'dominical',
        title: 'Kilt Jodi a Poko Aktive',
        date: formatLocalDateYmd(new Date()),
        startTime: '00:00',
        endTime: '23:59',
        isOpenForAttendance: false,
        isPermanentlyEnded: false,
      };
      const member: any = {
        id: 'm-pre-1',
        churchId,
        memberId: 'PST-001',
        fullName: 'Marc Prestart',
        role: 'Manm',
        status: 'active',
        barcodeToken: `CHURCH:${churchId}|MEMBER:PST-001`,
      };

      localStorage.setItem(STORAGE_KEYS.CHURCHES, JSON.stringify([church]));
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([futurePreStartSrv, todayInProgressNotActivated]));
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([member]));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PENDING_ATTENDANCE, JSON.stringify([]));

      // Unified scanner must block pre-start check-in (both QR and manual)
      const unifiedPreStartQr = await recordAttendanceScanUnified({
        currentChurchId: churchId,
        rawCode: member.barcodeToken,
        serviceId: futurePreStartSrv.id,
        method: 'qr_scan',
        recordedBy: 'Admin Scanner',
        requireActiveOngoingService: false,
      });
      assert(
        unifiedPreStartQr.success === false,
        'recordAttendanceScanUnified must strictly reject QR scans before scheduled start time'
      );

      const unifiedPreStartManual = await recordAttendanceScanUnified({
        currentChurchId: churchId,
        rawCode: member.memberId,
        serviceId: futurePreStartSrv.id,
        method: 'manual',
        recordedBy: 'Admin Desk',
        requireActiveOngoingService: false,
      });
      assert(
        unifiedPreStartManual.success === false,
        'recordAttendanceScanUnified must strictly reject manual check-in before scheduled start time'
      );

      // Legacy scanner must also block pre-start check-in
      const legacyPreStart = recordAttendanceScan({
        currentChurchId: churchId,
        serviceId: futurePreStartSrv.id,
        rawCode: member.barcodeToken,
      });
      assert(
        legacyPreStart.success === false,
        'Legacy recordAttendanceScan must reject attendance before scheduled start time'
      );

      // Admin cannot toggle a future/pre-start service active for scanning
      const toggleEarlyOk = setServiceActiveStatus(churchId, futurePreStartSrv.id, true);
      assert(toggleEarlyOk === false, 'setServiceActiveStatus must return false before scheduled start time');

      // Creating a future service with isOpenForAttendance: true automatically keeps it closed until start time
      const createdFuture = addServiceSession(churchId, {
        title: 'Sèvis Demen Aswè',
        category: 'priere',
        date: tomorrowYmd,
        startTime: '19:00',
        endTime: '21:00',
        isOpenForAttendance: true,
        sendReminder24h: false,
      });
      assert(
        createdFuture.isOpenForAttendance === false && createdFuture.wasOpenedForAttendance === false,
        'Creating a pre-start future service with isOpenForAttendance: true must force it closed until scheduled start time'
      );

      // Notifications: 'Live' notification appears ONLY when service is actively scannable AND started
      const memberNotifsClosed = getContextualNotifications({
        church,
        member,
        userRole: 'member',
        announcements: [],
        services: [futurePreStartSrv, todayInProgressNotActivated],
        language: 'ht',
      });
      assert(
        !memberNotifsClosed.some((n) => n.id.startsWith('service_active_')),
        'Notification center must NOT emit any Live notification for pre-start or non-activated services'
      );

      // When an activated in-progress service exists, Live notification IS emitted
      const todayLiveActivated = { ...todayInProgressNotActivated, id: 'srv-today-live', isOpenForAttendance: true };
      const memberNotifsLive = getContextualNotifications({
        church,
        member,
        userRole: 'member',
        announcements: [],
        services: [futurePreStartSrv, todayLiveActivated],
        language: 'ht',
      });
      assert(
        memberNotifsLive.some((n) => n.id === 'service_active_srv-today-live' && n.badgeText === 'An dirèk'),
        'Notification center MUST emit Live notification only when service has started and is activated for scanning'
      );
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: prevNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  await runTest('86. Admin/Owner can change or remove profile photo & church logo even when connected to Google with full sync', async () => {
    localStorage.clear();
    const {
      STORAGE_KEYS,
      resolveChurchAdminAvatarUrl,
      updateChurchAdminProfilePhoto,
      updateChurchLogoPhoto,
      reconcileRemoteChurchWithLocalPasscode,
      getChurchById,
      getMembersByChurch,
      markPendingLocalUpload,
    } = await import('../utils/storage');
    const { buildChurchFirestorePayload } = await import('../services/firestoreService');

    const prevNavigator = (globalThis as any).navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        configurable: true,
        writable: true,
      });

      const churchId = 'CH_ADMIN_PHOTO_SYNC';
      const googleUser = {
        uid: 'uid-admin-google-1',
        email: 'pastor.owner@gmail.com',
        photoURL: 'https://lh3.googleusercontent.com/a/default-google-avatar',
      };
      const initialChurch: any = {
        id: churchId,
        code: 'APS',
        name: 'Legliz Senkwonize',
        pastor: 'Pastè Mèt Legliz',
        adminGoogleUid: googleUser.uid,
        adminGoogleEmail: googleUser.email,
        adminGooglePhoto: googleUser.photoURL,
      };
      const ownerMember: any = {
        id: 'mem-owner-1',
        churchId,
        memberId: 'APS-001',
        fullName: 'Pastè Mèt Legliz',
        googleUid: googleUser.uid,
        googleEmail: googleUser.email,
        email: googleUser.email,
        avatarUrl: googleUser.photoURL,
        photoUrl: googleUser.photoURL,
        googlePhoto: googleUser.photoURL,
        role: 'Pastè',
        status: 'active',
      };
      const otherMember: any = {
        id: 'mem-other-2',
        churchId,
        memberId: 'APS-002',
        fullName: 'Lòt Manm',
        email: 'other@example.com',
        avatarUrl: 'https://example.com/other.webp',
        role: 'Manm',
        status: 'active',
      };

      localStorage.setItem(STORAGE_KEYS.CHURCHES, JSON.stringify([initialChurch]));
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([ownerMember, otherMember]));

      // 1. Default resolves Google photo when adminGooglePhoto matches Google URL
      assert(
        resolveChurchAdminAvatarUrl(initialChurch, googleUser) === googleUser.photoURL,
        'Initial Google avatar should resolve when no custom upload exists'
      );

      // 2. Admin uploads a custom photo while connected with Google
      const customBase64 = 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4';
      await updateChurchAdminProfilePhoto(churchId, customBase64);
      const afterCustom = getChurchById(churchId)!;
      assert(
        afterCustom.adminGooglePhoto === customBase64,
        'Custom uploaded admin profile photo must be persisted on church'
      );
      assert(
        resolveChurchAdminAvatarUrl(afterCustom, googleUser) === customBase64,
        'Custom uploaded photo must take priority over googleUser.photoURL'
      );

      // Matching 1:1 owner member record is synced while unrelated members stay untouched
      const syncedMembers = getMembersByChurch(churchId);
      const syncedOwner = syncedMembers.find((m) => m.id === ownerMember.id)!;
      const untouchedOther = syncedMembers.find((m) => m.id === otherMember.id)!;
      assert(
        syncedOwner.avatarUrl === customBase64 &&
        syncedOwner.photoUrl === customBase64 &&
        syncedOwner.googlePhoto === customBase64,
        'Matching admin member record must synchronize avatarUrl/photoUrl/googlePhoto'
      );
      assert(
        untouchedOther.avatarUrl === 'https://example.com/other.webp',
        'Unrelated members must not have their photos overwritten'
      );

      // 3. Reconciling an older remote snapshot with Google photo must preserve pending local custom photo
      markPendingLocalUpload('church', churchId);
      const remoteStaleChurch: any = {
        ...initialChurch,
        adminGooglePhoto: googleUser.photoURL,
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const reconciled = reconcileRemoteChurchWithLocalPasscode(remoteStaleChurch, afterCustom);
      assert(
        reconciled.church.adminGooglePhoto === customBase64 && reconciled.needsFirestoreReconcile === true,
        'Pending local custom admin photo must survive remote reconciliation even when Google UID already matches'
      );

      // 4. Church official logo update & clear sync
      const customLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
      await updateChurchLogoPhoto(churchId, customLogo);
      assert(getChurchById(churchId)?.logoUrl === customLogo, 'Church official logoUrl must save cleanly');

      await updateChurchLogoPhoto(churchId, null);
      assert(!getChurchById(churchId)?.logoUrl, 'Removing church logo must clear logoUrl locally');
      const logoClearPayload = buildChurchFirestorePayload(
        { ...getChurchById(churchId)!, logoUrl: undefined },
        undefined,
        { clearLogoUrl: true }
      );
      assert(logoClearPayload.logoUrl === null, 'buildChurchFirestorePayload must emit logoUrl: null when cleared');

      // 5. Explicitly removing admin profile photo does NOT silently snap back to Gmail photo
      await updateChurchAdminProfilePhoto(churchId, null);
      const afterRemove = getChurchById(churchId)!;
      assert(afterRemove.adminGooglePhoto === '', 'Removed adminGooglePhoto must store empty sentinel locally');
      assert(
        resolveChurchAdminAvatarUrl(afterRemove, googleUser) === undefined,
        'Removed admin photo must NOT snap back to googleUser.photoURL'
      );
      const clearedOwner = getMembersByChurch(churchId).find((m) => m.id === ownerMember.id)!;
      assert(
        !clearedOwner.avatarUrl && !clearedOwner.photoUrl && !clearedOwner.googlePhoto,
        'Removing admin photo must also clear matched admin member photos'
      );
      const adminClearPayload = buildChurchFirestorePayload(afterRemove, undefined, { clearAdminGooglePhoto: true });
      assert(
        adminClearPayload.adminGooglePhoto === null,
        'buildChurchFirestorePayload must emit adminGooglePhoto: null so Firestore merge deletes old photo'
      );
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: prevNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  await runTest('87. Member profile photo update/remove sync & public verification church logo priority', async () => {
    const {
      saveChurch,
      updateMember,
      getMembersByChurch,
      updateMemberProfilePhoto,
      unifyMemberProfile,
    } = await import('../utils/storage');
    const {
      buildMemberFirestorePayload,
      firestoreUpdateMemberProfilePhoto,
    } = await import('../services/firestoreService');

    const churchId = 'CH-MEMPHOTO-87';
    saveChurch({
      id: churchId,
      code: 'CHMEM87',
      name: 'Legliz Test Foto Manm',
      pastor: 'Pastè Jean',
      address: '12 Rue Panaméricaine',
      city: 'Pétion-Ville',
      country: 'Haiti',
      phone: '+509 3700-0000',
      email: 'test87@legliz.org',
      motto: 'Sèvis ak Verite',
      themeColor: '#f59e0b',
      logoIcon: 'church',
      logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
      createdAt: new Date().toISOString(),
    });

    const initialMember: any = {
      id: 'mem-photo-test-87',
      memberId: 'CHMEM87-001',
      churchId,
      fullName: 'Pierre Paul',
      role: 'Manm',
      department: 'Koral',
      status: 'active',
      dateOfBirth: '1995-05-10',
      phone: '50933334444',
      email: 'pierre@example.com',
      googleEmail: 'pierre@gmail.com',
      googleUid: 'uid-mem-87',
      googlePhoto: 'https://lh3.googleusercontent.com/a/mem-default',
      avatarUrl: 'https://lh3.googleusercontent.com/a/mem-default',
      photoUrl: 'https://lh3.googleusercontent.com/a/mem-default',
      joinedDate: '2026-01-10',
    };
    updateMember(churchId, initialMember, { skipFirestore: true });

    // 1. Custom base64 photo overrides Google photo
    const customPhoto = 'data:image/webp;base64,' + 'A'.repeat(240);
    const updateRes = await updateMemberProfilePhoto(churchId, initialMember, customPhoto);
    assert(updateRes.cloudSynced === true, 'updateMemberProfilePhoto should report cloudSynced=true in unit test mode');

    const savedAfterUpload = getMembersByChurch(churchId).find((m) => m.id === initialMember.id)!;
    assert(
      savedAfterUpload.avatarUrl === customPhoto &&
        savedAfterUpload.photoUrl === customPhoto &&
        savedAfterUpload.googlePhoto === customPhoto,
      'Custom photo must populate avatarUrl, photoUrl, and googlePhoto locally'
    );

    // 2. Re-unifying with Google user keeps custom photo on top
    const reunited = unifyMemberProfile(savedAfterUpload, null, {
      uid: 'uid-mem-87',
      email: 'pierre@gmail.com',
      photoURL: 'https://lh3.googleusercontent.com/a/mem-default',
      displayName: 'Pierre Paul',
    });
    assert(
      reunited.avatarUrl === customPhoto && reunited.photoUrl === customPhoto,
      'unifyMemberProfile must prioritize custom member photo over googleUser.photoURL'
    );

    // 3. Clearing photo wipes all 3 fields locally and emits explicit null in Firestore payload
    const clearRes = await updateMemberProfilePhoto(churchId, savedAfterUpload, null);
    const savedAfterClear = getMembersByChurch(churchId).find((m) => m.id === initialMember.id)!;
    assert(
      !clearRes.member.avatarUrl && !clearRes.member.photoUrl && !clearRes.member.googlePhoto,
      'Returned cleared member must have empty photo fields'
    );
    assert(
      !savedAfterClear.avatarUrl && !savedAfterClear.photoUrl && !savedAfterClear.googlePhoto,
      'Stored member record must not have resurrected Google photo after removal'
    );

    const clearPayload = buildMemberFirestorePayload(
      savedAfterClear,
      initialMember.id,
      churchId,
      { clearPhoto: true }
    );
    assert(
      clearPayload.avatarUrl === null &&
        clearPayload.photoUrl === null &&
        clearPayload.googlePhoto === null,
      'buildMemberFirestorePayload with clearPhoto=true must emit explicit null for avatarUrl, photoUrl, and googlePhoto'
    );

    const directRes = await firestoreUpdateMemberProfilePhoto(savedAfterUpload, customPhoto);
    assert(directRes.synced === true, 'firestoreUpdateMemberProfilePhoto must succeed cleanly');
  });

  // -----------------------------------------------------------------
  // SUITE 49: ADMIN CHURCH SETTINGS DEDUPLICATION REGRESSION GUARDS
  // -----------------------------------------------------------------
  console.log('\n--- Suite 49: AdminChurchSettings Deduplication Guards ---');

  await runTest('AdminChurchSettings sub-tabs are sequentially numbered 1..9 without duplicate 4.', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/components/admin/AdminChurchSettings.tsx'), 'utf8');

    assert(!src.includes('"4. Modèl Kat & Koulè"') && !src.includes('"4. Cards & Colors"'), 'Cards subtab must no longer be numbered 4.');
    assert(src.includes('"5. Modèl Kat & Koulè"') && src.includes('"5. Cards & Colors"'), 'Cards subtab must be numbered 5.');
    assert(src.includes('"6. Sovgad & Restorasyon"'), 'Backup subtab must be numbered 6.');
    assert(src.includes('"7. Donasyon & Kont Labank Legliz la"'), 'Donations subtab must be numbered 7.');
    assert(src.includes('"8. Règleman & Vi Prive"'), 'Rules subtab must be numbered 8.');
    assert(src.includes('"9. Dyagnostik Sistèm"'), 'Diagnostics subtab must be numbered 9.');
  });

  await runTest('AdminChurchSettings Profile tab removes duplicate verification banner, RNC form, and signature panel', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/components/admin/AdminChurchSettings.tsx'), 'utf8');

    assert(!src.includes('settings-profile-owner-verification-bar'), 'Duplicate owner verification banner must be removed from Profile tab');
    assert(!src.includes('profile-signature-upload-input'), 'Duplicate electronic signature uploader must be removed from Profile tab');
    assert(!src.includes('legalDocInputRef'), 'Duplicate legal doc uploader must be removed from Profile tab');
    assert(!src.includes('admin-rules-privacy-link'), 'Duplicate rules privacy link must not repeat footer link');
    assert(src.includes('profile-rnc-shortcut-card'), 'Profile tab must keep compact RNC summary/shortcut card linking to subtab 3');
    assert(src.includes('settings-signature-upload-input'), 'Cards subtab must retain single electronic signature section');
  });

  // -----------------------------------------------------------------
  // SUITE 50: DEACON ("WOL JAK") RBAC & SECURITY ISOLATION GUARDS
  // -----------------------------------------------------------------
  console.log('\n--- Suite 50: Deacon ("Wol Jak") RBAC & Security Isolation ---');

  await runTest('isDeaconRole matches valid active deacon roles and rejects non-deacons, departments, visitors, and inactive members', async () => {
    const { isDeaconRole } = await import('../utils/permissions');

    const baseMember = {
      id: 'm-deacon-test',
      churchId: 'ch-1',
      memberId: 'OMNI-2026-0010',
      fullName: 'Frè Marc-Antoine',
      department: 'Liturgi',
      status: 'active' as const,
      memberType: 'member' as const,
      joinedDate: '2026-01-01T00:00:00.000Z',
    };

    for (const validRole of [
      'Dyak',
      'Dyakonès',
      'Dyak / Dyakonès',
      'Diacre',
      'Diaconesse',
      'Diácono',
      'Diaconisa',
      'Deacon',
      'Deaconess',
      'Dyak & Resepsyon',
    ]) {
      assert(
        isDeaconRole({ ...baseMember, role: validRole }) === true,
        `isDeaconRole must accept "${validRole}"`
      );
    }

    assert(
      isDeaconRole({ ...baseMember, role: 'Manm', department: 'Diaconat' }) === false,
      'Department alone must NOT grant deacon permissions'
    );
    assert(isDeaconRole({ ...baseMember, role: 'Resepsyon' }) === false, 'Resepsyon is not a deacon');
    assert(isDeaconRole({ ...baseMember, role: 'Pastè' }) === false, 'Pastè must not trigger deacon branch');
    assert(isDeaconRole({ ...baseMember, role: 'Dyak', status: 'inactive' }) === false, 'Inactive deacon must be denied');
    assert(isDeaconRole({ ...baseMember, role: 'Dyak', status: 'suspended' as any }) === false, 'Suspended deacon must be denied');
    assert(isDeaconRole({ ...baseMember, role: 'Dyak', memberType: 'visitor' }) === false, 'Visitor memberType cannot hold deacon permissions');
    assert(isDeaconRole({ ...baseMember, role: 'Vizitè Dyak' }) === false, 'Vizitè role string cannot hold deacon permissions');
    assert(isDeaconRole(null) === false && isDeaconRole(undefined) === false, 'Null/undefined must return false');
  });

  await runTest('getMemberPermissions grants services & announcements ONLY to Deacons while isolating PII and admin powers', async () => {
    const { getMemberPermissions } = await import('../utils/permissions');

    const deaconPerms = getMemberPermissions({
      id: 'm-d1',
      churchId: 'ch-1',
      memberId: 'OMNI-2026-0100',
      fullName: 'Dyak Jean',
      role: 'Dyak',
      department: 'Diaconat',
      status: 'active',
      joinedDate: '2026-01-01T00:00:00.000Z',
    });

    assert(deaconPerms.isDeacon === true, 'Deacon isDeacon must be true');
    assert(deaconPerms.isReception === false, 'Pure Deacon isReception must be false');
    assert(deaconPerms.canCreateServices === true, 'Deacon canCreateServices must be true');
    assert(deaconPerms.canManageServices === true, 'Deacon canManageServices must be true');
    assert(deaconPerms.canPublishAnnouncements === true, 'Deacon canPublishAnnouncements must be true');
    assert(deaconPerms.canScanAttendance === false, 'Pure Deacon CANNOT scan attendance');
    assert(deaconPerms.canManualCheckInActiveService === false, 'Pure Deacon CANNOT perform manual reception check-in');
    assert(deaconPerms.canViewActiveServiceRoster === false, 'Pure Deacon CANNOT view reception active service roster');
    assert(deaconPerms.canEditMembers === false, 'Deacon CANNOT edit members');
    assert(deaconPerms.canDeleteMembers === false, 'Deacon CANNOT delete members');
    assert(deaconPerms.canChangeRoles === false, 'Deacon CANNOT change roles');
    assert(deaconPerms.canDeleteChurchRecords === false, 'Deacon CANNOT delete church records');

    const receptionPerms = getMemberPermissions({
      id: 'm-r1',
      churchId: 'ch-1',
      memberId: 'OMNI-2026-0101',
      fullName: 'Sè Ruth',
      role: 'Resepsyon',
      department: 'Akèy',
      status: 'active',
      joinedDate: '2026-01-01T00:00:00.000Z',
    });
    assert(receptionPerms.isReception === true && receptionPerms.canScanAttendance === true, 'Reception keeps scan permission');
    assert(receptionPerms.canCreateServices === false && receptionPerms.canPublishAnnouncements === false, 'Reception CANNOT create services or announcements');

    const combinedPerms = getMemberPermissions({
      id: 'm-dr1',
      churchId: 'ch-1',
      memberId: 'OMNI-2026-0102',
      fullName: 'Dyak Paul',
      role: 'Dyak & Resepsyon',
      department: 'Diaconat',
      status: 'active',
      joinedDate: '2026-01-01T00:00:00.000Z',
    });
    assert(
      combinedPerms.isDeacon &&
        combinedPerms.isReception &&
        combinedPerms.canCreateServices &&
        combinedPerms.canPublishAnnouncements &&
        combinedPerms.canScanAttendance &&
        !combinedPerms.canEditMembers,
      'Combined Deacon & Reception role merges capabilities safely without granting member edit'
    );
  });

  await runTest('isDeaconAuthorOfRecord enforces strict ownership isolation against Admin/other records', async () => {
    const { isDeaconAuthorOfRecord } = await import('../utils/permissions');

    const deaconMember = {
      id: 'mem-deacon-99',
      churchId: 'ch-1',
      memberId: 'OMNI-2026-0099',
      fullName: 'Dyak Marc',
      role: 'Dyak',
      department: 'Diaconat',
      status: 'active' as const,
      joinedAt: '2026-01-01T00:00:00.000Z',
    };

    assert(
      isDeaconAuthorOfRecord(deaconMember, { authorId: 'uid-deacon-1' }, 'uid-deacon-1') === true,
      'Must match when Firebase authUid matches authorId'
    );
    assert(
      isDeaconAuthorOfRecord(deaconMember, { authorId: 'uid-admin-owner', createdBy: 'admin_ch-1' }, 'uid-deacon-1') === false,
      'Deacon must NOT own Admin-authored records'
    );
    assert(
      isDeaconAuthorOfRecord(deaconMember, { authorId: 'uid-other-deacon', createdBy: 'mem-other' }, 'uid-deacon-1') === false,
      'Deacon must NOT own records authored by another user'
    );
    assert(
      isDeaconAuthorOfRecord(deaconMember, { createdBy: 'mem-deacon-99' }, null) === true,
      'Local fallback matches createdBy member document ID when offline'
    );
  });

  await runTest('buildAnnouncementFirestorePayload resolves Diaconate department and preserves strict key whitelist', async () => {
    const { buildAnnouncementFirestorePayload } = await import('../services/firestoreService');

    const payload = buildAnnouncementFirestorePayload({
      id: 'ann-deacon-1',
      churchId: 'ch-deacon',
      title: 'Reyinyon Priyè Dyakonat',
      content: 'Tout frè ak sè yo envite nan jèn espesyal la.',
      category: 'anons',
      date: '2026-11-28',
      authorId: 'uid-deacon-test',
      authorName: 'Dyak Pierre',
      authorType: 'deacon',
      createdAt: '2026-11-25T10:00:00.000Z',
    });

    assert(payload.department === 'Dyakonat / Ministè', 'Deacon authorType must resolve Diaconate department');
    assert(!('createdBy' in payload) && !('authorType' in payload), 'Payload must retain strict Firestore whitelist keys');
  });

  await runTest('firestore.rules and App.tsx enforce server-side Deacon RBAC & member PII isolation', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    assert(rules.includes('function isDeaconOfChurch(churchId)'), 'firestore.rules must define isDeaconOfChurch');
    assert(rules.includes('function canClaimDeaconRole(churchId, memberDocId)'), 'firestore.rules must define canClaimDeaconRole');
    assert(rules.includes('function isActiveDeaconMemberData(memberData)'), 'firestore.rules must define isActiveDeaconMemberData');
    assert(rules.includes("incoming().type in ['service', 'announcement']"), 'Deacon notifications must be strictly restricted to service/announcement');
    assert(
      rules.includes('isDeaconOfChurch(existing().churchId)') &&
        rules.includes('!isServicePermanentlyLocked(existing())') &&
        rules.includes('existing().authorId == request.auth.uid'),
      'Deacon service deletion must require own active service'
    );

    const appSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    assert(appSrc.includes('isDeaconMember'), 'App.tsx must compute isDeaconMember');
    assert(appSrc.includes('canCreateServicesMember'), 'App.tsx must gate deacon services tab on canCreateServicesMember');
    assert(appSrc.includes('canPublishAnnouncementsMember'), 'App.tsx must gate deacon announcements tab on canPublishAnnouncementsMember');
    assert(appSrc.includes('const isAdminOrReception = userRole === "admin" || isReceptionMember;'), 'Member & attendance subscriptions must remain isolated from pure Deacons');
  });

  // -----------------------------------------------------------------
  // Suite 51: Multilingual Donate System (HT / FR / EN / ES) & Sync
  // -----------------------------------------------------------------
  console.log('\n--- Suite 51: Multilingual Donate System (HT / FR / EN / ES) & Sync ---');

  await runTest('cleanDonationConfig & resolveLocalizedDonationCopy isolate all 4 languages cleanly without leaking HT defaults', async () => {
    const {
      cleanDonationConfig,
      resolveLocalizedDonationCopy,
      DEFAULT_LOCALIZED_DONATION_COPY,
    } = await import('../utils/developerStorage');

    // Legacy config with only Haitian Creole top-level fields must NOT leak HT text into FR/EN/ES
    const legacyConfig = cleanDonationConfig({
      enabled: true,
      screenTitle: 'Tit Pèsonalize Kreyòl',
      developerBio: 'Vizyon kreyòl pèsonalize',
      shakeIntervalSeconds: 99, // should clamp to 30
    });

    assert(legacyConfig.shakeIntervalSeconds === 30, 'shakeIntervalSeconds must clamp to max 30');
    assert(legacyConfig.enableShakeAnimation === true, 'enableShakeAnimation must default to true');

    const htCopy = resolveLocalizedDonationCopy(legacyConfig, 'ht');
    const frCopy = resolveLocalizedDonationCopy(legacyConfig, 'fr');
    const enCopy = resolveLocalizedDonationCopy(legacyConfig, 'en');
    const esCopy = resolveLocalizedDonationCopy(legacyConfig, 'es');

    assert(htCopy.screenTitle === 'Tit Pèsonalize Kreyòl', 'HT preserves legacy top-level custom screenTitle');
    assert(htCopy.developerBio === 'Vizyon kreyòl pèsonalize', 'HT preserves legacy top-level custom developerBio');
    assert(
      frCopy.screenTitle === DEFAULT_LOCALIZED_DONATION_COPY.fr.screenTitle,
      'FR must use authentic French default instead of leaking HT text'
    );
    assert(
      enCopy.screenTitle === DEFAULT_LOCALIZED_DONATION_COPY.en.screenTitle,
      'EN must use authentic English default instead of leaking HT text'
    );
    assert(
      esCopy.screenTitle === DEFAULT_LOCALIZED_DONATION_COPY.es.screenTitle,
      'ES must use authentic Spanish default instead of leaking HT text'
    );

    // Custom localized edits per language override cleanly
    const multiConfig = cleanDonationConfig({
      enabled: true,
      shakeIntervalSeconds: 1, // should clamp to 3
      localizedCopy: {
        ht: { ...DEFAULT_LOCALIZED_DONATION_COPY.ht, screenTitle: 'Soutni Legliz la' },
        fr: { ...DEFAULT_LOCALIZED_DONATION_COPY.fr, screenTitle: 'Soutenir la Mission' },
        en: { ...DEFAULT_LOCALIZED_DONATION_COPY.en, screenTitle: 'Support Our Mission' },
        es: { ...DEFAULT_LOCALIZED_DONATION_COPY.es, screenTitle: 'Apoya Nuestra Misión' },
      },
    });
    assert(multiConfig.shakeIntervalSeconds === 3, 'shakeIntervalSeconds must clamp to min 3');
    assert(resolveLocalizedDonationCopy(multiConfig, 'fr').screenTitle === 'Soutenir la Mission', 'Custom FR screenTitle resolves');
    assert(resolveLocalizedDonationCopy(multiConfig, 'en').screenTitle === 'Support Our Mission', 'Custom EN screenTitle resolves');
    assert(resolveLocalizedDonationCopy(multiConfig, 'es').screenTitle === 'Apoya Nuestra Misión', 'Custom ES screenTitle resolves');
  });

  // -----------------------------------------------------------------
  // FINAL REPORT
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TOTAL TESTS RUN: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
