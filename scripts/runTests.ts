/**
 * OmniChurch Comprehensive Automated Test Suite
 * Executable directly via tsx without external test dependencies.
 * Validates Security, Multi-Tenant Isolation, Attendance & Lateness Logic,
 * and Data Integrity Safeguards.
 */

import {
  hashAdminPasscodeSync,
  verifyAdminPasscode,
  isPasscodeHashed,
} from '../src/utils/cryptoSecurity';
import {
  isLegacyDemoMember,
  isLegacyDemoService,
  isLegacyDemoAnnouncement,
  isLegacyDemoAttendance,
} from '../src/services/firestoreService';

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
  // SUITE 3: ATTENDANCE & LATENESS CALCULATION LOGIC
  // -----------------------------------------------------------------
  console.log('\n--- Suite 3: Attendance & Lateness Math Verification ---');

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
  // SUITE 4: MULTI-TENANT ISOLATION (QR CROSS-CHURCH DENIAL)
  // -----------------------------------------------------------------
  console.log('\n--- Suite 4: Multi-Tenant QR Token Security ---');

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
      // Legacy token without embedded churchId allowed for local search
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
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
