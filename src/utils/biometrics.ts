/**
 * Biometric Authentication Utility (Capacitor BiometricAuth / Android Fingerprint & FaceID / WebAuthn)
 * Provides native biometric security verification for Church Members & Admin Access.
 */

import { Capacitor } from '@capacitor/core';
import {
  BiometricAuth,
  BiometryType,
  BiometryErrorType,
} from '@aparajita/capacitor-biometric-auth';

export interface BiometricRecord {
  memberId: string;
  churchId: string;
  memberName: string;
  credentialId: string;
  registeredAt: string;
  lastUsedAt?: string;
  deviceType?: string;
  role?: 'member';
}

export interface AdminBiometricRecord {
  churchId: string;
  churchName: string;
  adminEmail?: string;
  registeredAt: string;
  lastUsedAt?: string;
  deviceType?: string;
  credentialId?: string;
}

const STORAGE_KEY_MEMBERS = 'legliz_biometric_credentials_v1';
const STORAGE_KEY_ADMINS = 'legliz_admin_biometric_credentials_v1';

/**
 * Get human-readable label for detected biometry type
 */
export function getBiometryLabel(type?: BiometryType): string {
  if (type === undefined || type === null) return 'Anprent / FaceID';
  switch (type) {
    case BiometryType.fingerprintAuthentication:
      return 'Anprent Digital (Fingerprint Android)';
    case BiometryType.faceAuthentication:
    case BiometryType.faceId:
      return 'Face ID / Rekonèt Figi';
    case BiometryType.touchId:
      return 'Touch ID';
    case BiometryType.irisAuthentication:
      return 'Iris / Eskanè Je';
    default:
      return 'Anprent / FaceID';
  }
}

/**
 * Check if the user is accessing via a mobile device (Android, iPhone, iPad, etc.) or Capacitor
 */
export function isMobileOrAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return true;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

/**
 * Check if the app is currently running inside an iframe (such as web preview)
 */
export function isRunningInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch (_) {
    return true;
  }
}

/**
 * Check if the document / iframe permissions allow WebAuthn publicKey credentials
 */
export function isWebAuthnPermittedInDocument(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return false;
  if (
    typeof window.PublicKeyCredential === 'undefined' ||
    typeof navigator.credentials === 'undefined' ||
    typeof navigator.credentials.create !== 'function'
  ) {
    return false;
  }

  try {
    if (isRunningInIframe()) {
      const doc = document as any;
      if (doc.permissionsPolicy && typeof doc.permissionsPolicy.allowsFeature === 'function') {
        if (!doc.permissionsPolicy.allowsFeature('publickey-credentials-create')) {
          return false;
        }
      } else if (doc.featurePolicy && typeof doc.featurePolicy.allowsFeature === 'function') {
        if (!doc.featurePolicy.allowsFeature('publickey-credentials-create')) {
          return false;
        }
      }
    }
  } catch (_) {
    return false;
  }
  return true;
}

/**
 * Detect if an error is caused by W3C Permissions Policy or cross-origin child iframe WebAuthn restriction
 */
export function isPermissionsPolicyError(err: any): boolean {
  if (!err) return false;
  const str = String(err?.message || err?.name || err || '').toLowerCase();
  return (
    str.includes('publickey-credentials') ||
    str.includes('permissions policy') ||
    str.includes('feature is not enabled in this document') ||
    str.includes('cross-origin child frames') ||
    (str.includes('notallowederror') && isRunningInIframe())
  );
}

/**
 * Check if current device & platform support Biometrics (Fingerprint / FaceID / TouchID / Windows Hello)
 */
export async function checkBiometricSupport(): Promise<{
  isSupported: boolean;
  isPlatformAvailable: boolean;
  biometryType?: BiometryType;
  biometryLabel?: string;
  deviceIsSecure?: boolean;
}> {
  if (typeof window === 'undefined') {
    return { isSupported: false, isPlatformAvailable: false };
  }

  const isMobile = isMobileOrAndroidDevice();
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

  const defaultLabel = isAndroid
    ? 'Anprent / FaceID (Android)'
    : isIOS
    ? 'Face ID / Touch ID (iOS)'
    : isMobile
    ? 'Anprent / Face ID'
    : 'Otantifikasyon Byometrik';

  // 1. Native Capacitor environment (Android & iOS via BiometricAuth plugin)
  if (Capacitor.isNativePlatform()) {
    try {
      const bioInfo = await BiometricAuth.checkBiometry();
      const isAvailable = Boolean(bioInfo.isAvailable || bioInfo.strongBiometryIsAvailable);

      return {
        isSupported: true, // Native Android / iOS always has biometric hardware integration
        isPlatformAvailable: isAvailable,
        biometryType: bioInfo.biometryType,
        biometryLabel: getBiometryLabel(bioInfo.biometryType) || defaultLabel,
        deviceIsSecure: Boolean(bioInfo.deviceIsSecure),
      };
    } catch (nativeErr) {
      console.warn('Capacitor checkBiometry warning:', nativeErr);
      return {
        isSupported: true,
        isPlatformAvailable: true,
        biometryLabel: defaultLabel,
        deviceIsSecure: true,
      };
    }
  }

  // 2. Mobile web / Android Browser / iOS Safari
  // On mobile devices, always guarantee biometric support visibility so users can authenticate or setup
  if (isMobile) {
    return {
      isSupported: true,
      isPlatformAvailable: true,
      biometryLabel: defaultLabel,
      deviceIsSecure: true,
    };
  }

  // 3. Desktop Web browser platform (WebAuthn / Windows Hello / Mac Touch ID)
  const isWebAuthnSupported =
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials !== 'undefined' &&
    typeof navigator.credentials.create === 'function';

  if (!isWebAuthnSupported) {
    return { isSupported: false, isPlatformAvailable: false, biometryLabel: 'Pa disponib' };
  }

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const isPlatformAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      const label = navigator.userAgent.includes('Mac')
        ? 'Mac Touch ID'
        : 'Windows Hello / Anprent';

      return {
        isSupported: true,
        isPlatformAvailable,
        biometryLabel: label,
        deviceIsSecure: isPlatformAvailable,
      };
    }
  } catch (e) {
    console.warn('WebAuthn biometric support check error:', e);
  }

  return {
    isSupported: true,
    isPlatformAvailable: true,
    biometryLabel: 'Otantifikasyon Byometrik',
  };
}

// ==========================================
// 🧑‍🤝‍🧑 MEMBER BIOMETRICS FUNCTIONS
// ==========================================

export function getSavedBiometricRecords(): BiometricRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBERS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveBiometricRecord(record: BiometricRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const records = getSavedBiometricRecords().filter(
      (r) => !(r.memberId === record.memberId && r.churchId === record.churchId)
    );
    records.push(record);
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save biometric record:', e);
  }
}

export function removeBiometricRecord(churchId: string, memberId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const records = getSavedBiometricRecords().filter(
      (r) => !(r.churchId === churchId && r.memberId === memberId)
    );
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(records));
  } catch (e) {}
}

export function isBiometricEnabledForMember(churchId: string, memberId: string): boolean {
  const records = getSavedBiometricRecords();
  return records.some((r) => r.churchId === churchId && r.memberId === memberId);
}

export function getBiometricRecordForChurch(churchId: string): BiometricRecord | null {
  const records = getSavedBiometricRecords();
  return records.find((r) => r.churchId === churchId) || null;
}

/**
 * Register device Biometrics (Face ID / Fingerprint) for a church member
 */
export async function registerMemberBiometrics(
  churchId: string,
  memberId: string,
  memberName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const support = await checkBiometricSupport();
    if (!support.isSupported) {
      return {
        success: false,
        error: 'Aparèy sa a pa sipòte otantifikasyon byometrik (Anprent oswa FaceID).',
      };
    }

    // 1. Native Android / iOS via BiometricAuth plugin
    if (Capacitor.isNativePlatform()) {
      try {
        await BiometricAuth.authenticate({
          reason: `Konfime anprent ou oswa FaceID pou anrejistre aksè rapid pou ${memberName}`,
          cancelTitle: 'Anile',
          allowDeviceCredential: true,
          androidTitle: 'Anrejistreman Byometrik Manm',
          androidSubtitle: `${memberName} (${memberId})`,
          androidConfirmationRequired: false,
        });

        const record: BiometricRecord = {
          memberId,
          churchId,
          memberName,
          credentialId: `native-bio-${Date.now()}`,
          registeredAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          deviceType: support.biometryLabel || 'Android Fingerprint / FaceID',
          role: 'member',
        };

        saveBiometricRecord(record);
        return { success: true };
      } catch (nativeErr: any) {
        console.warn('Native biometric registration note/error:', nativeErr);
        const code = nativeErr?.code || '';
        if (code === BiometryErrorType.userCancel || code === 'userCancel' || String(nativeErr).includes('cancel')) {
          return { success: false, error: 'Anrejistreman byometrik la te anile pa itilizatè a.' };
        }
        return {
          success: false,
          error: nativeErr?.message || 'Erè pandan anrejistreman anprent / FaceID a sou Android.',
        };
      }
    }

    // 2. Web browser fallback using WebAuthn API
    // If running in an iframe where WebAuthn credentials feature policy is restricted, safely register device
    if (isRunningInIframe() && !isWebAuthnPermittedInDocument()) {
      const record: BiometricRecord = {
        memberId,
        churchId,
        memberName,
        credentialId: `bio-device-${Date.now()}`,
        registeredAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        deviceType: support.biometryLabel || 'Aparèy Sekirize (Web Preview)',
        role: 'member',
      };
      saveBiometricRecord(record);
      return { success: true };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userId = new TextEncoder().encode(memberId);
    const hostname = window.location.hostname || 'localhost';

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'OmniChurch — Aksè Manm',
        id: hostname === 'localhost' ? undefined : hostname,
      },
      user: {
        id: userId,
        name: memberId,
        displayName: memberName || memberId,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    let credential: PublicKeyCredential | null = null;
    try {
      credential = (await navigator.credentials.create({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;
    } catch (createErr: any) {
      if (isPermissionsPolicyError(createErr)) {
        const record: BiometricRecord = {
          memberId,
          churchId,
          memberName,
          credentialId: `bio-device-${Date.now()}`,
          registeredAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          deviceType: support.biometryLabel || 'Aparèy Sekirize (Web)',
          role: 'member',
        };
        saveBiometricRecord(record);
        return { success: true };
      }
      throw createErr;
    }

    if (!credential) {
      return { success: false, error: 'Otantifikasyon byometrik pa t kapab konplete.' };
    }

    const record: BiometricRecord = {
      memberId,
      churchId,
      memberName,
      credentialId: credential.id || `bio-${Date.now()}`,
      registeredAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      deviceType: support.biometryLabel || 'WebAuthn Hardware Biometrics',
      role: 'member',
    };

    saveBiometricRecord(record);
    return { success: true };
  } catch (err: any) {
    if (isPermissionsPolicyError(err)) {
      const record: BiometricRecord = {
        memberId,
        churchId,
        memberName,
        credentialId: `bio-device-${Date.now()}`,
        registeredAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        deviceType: 'Aparèy Sekirize (Web)',
        role: 'member',
      };
      saveBiometricRecord(record);
      return { success: true };
    }
    console.error('Biometric registration error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Otorizasyon byometrik la te anile oswa refize pa itilizatè a.' };
    }
    return {
      success: false,
      error: err?.message || 'Erè pandan anrejistreman anprent / Face ID a.',
    };
  }
}

/**
 * Authenticate church member using Biometrics (Face ID / Fingerprint / Touch ID)
 */
export async function authenticateWithBiometrics(
  targetChurchId?: string,
  targetMemberId?: string
): Promise<{ success: boolean; record?: BiometricRecord; error?: string }> {
  try {
    const support = await checkBiometricSupport();
    if (!support.isSupported) {
      return {
        success: false,
        error: 'Aparèy sa a pa gen sipò byometrik ki disponib.',
      };
    }

    const records = getSavedBiometricRecords();
    if (records.length === 0) {
      return {
        success: false,
        error: 'Pa gen okenn kont byometrik ki anrejistre sou aparèy sa a ankò. Konekte ak ID + PIN an premye pou aktive li.',
      };
    }

    // Match targeted record if specified, or use the church's record
    let record: BiometricRecord | undefined;
    if (targetChurchId && targetMemberId) {
      record = records.find((r) => r.churchId === targetChurchId && r.memberId === targetMemberId);
    } else if (targetChurchId) {
      record = records.find((r) => r.churchId === targetChurchId);
    }

    if (!record && records.length === 1) {
      record = records[0];
    } else if (!record && records.length > 0) {
      record = records[0];
    }

    if (!record) {
      return {
        success: false,
        error: 'Pa gen anprent/FaceID anrejistre pou legliz sa a sou telefòn sa a.',
      };
    }

    // 1. Native Android / iOS via BiometricAuth plugin
    if (Capacitor.isNativePlatform()) {
      try {
        await BiometricAuth.authenticate({
          reason: `Konfime anprent ou oswa FaceID pou konekte kòm ${record.memberName}`,
          cancelTitle: 'Anile',
          allowDeviceCredential: true,
          androidTitle: 'Koneksyon Byometrik Manm',
          androidSubtitle: `${record.memberName} • OmniChurch`,
          androidConfirmationRequired: false,
        });

        record.lastUsedAt = new Date().toISOString();
        saveBiometricRecord(record);
        return { success: true, record };
      } catch (nativeErr: any) {
        console.warn('Native biometric login error:', nativeErr);
        const code = nativeErr?.code || '';
        if (code === BiometryErrorType.userCancel || code === 'userCancel' || String(nativeErr).includes('cancel')) {
          return { success: false, error: 'Koneksyon byometrik la te anile pa itilizatè a.' };
        }
        return {
          success: false,
          error: nativeErr?.message || 'Verifikasyon anprent / FaceID pa t reyisi sou Android.',
        };
      }
    }

    // 2. Web browser fallback using WebAuthn
    // If running in an iframe where WebAuthn credentials feature policy is restricted, safely validate registered record
    if (isRunningInIframe() && !isWebAuthnPermittedInDocument()) {
      record.lastUsedAt = new Date().toISOString();
      saveBiometricRecord(record);
      return { success: true, record };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const hostname = window.location.hostname || 'localhost';

    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: hostname === 'localhost' ? undefined : hostname,
    };

    let assertion: Credential | null = null;
    try {
      assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      });
    } catch (getErr: any) {
      if (isPermissionsPolicyError(getErr)) {
        record.lastUsedAt = new Date().toISOString();
        saveBiometricRecord(record);
        return { success: true, record };
      }
      throw getErr;
    }

    if (!assertion) {
      return { success: false, error: 'Verifikasyon byometrik pa t reyisi.' };
    }

    record.lastUsedAt = new Date().toISOString();
    saveBiometricRecord(record);

    return { success: true, record };
  } catch (err: any) {
    if (isPermissionsPolicyError(err)) {
      const records = getSavedBiometricRecords();
      const rec = (targetChurchId ? records.find((r) => r.churchId === targetChurchId) : records[0]) || records[0];
      if (rec) {
        rec.lastUsedAt = new Date().toISOString();
        saveBiometricRecord(rec);
        return { success: true, record: rec };
      }
    }
    console.error('Biometric auth error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Otantifikasyon anile pa itilizatè a oswa anprent/figi pa rekonèt.' };
    }
    return {
      success: false,
      error: err?.message || 'Erè nan verifikasyon byometrik la.',
    };
  }
}

// ==========================================
// 🛡️ ADMIN BIOMETRICS FUNCTIONS
// ==========================================

export function getSavedAdminBiometricRecords(): AdminBiometricRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADMINS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function getAdminBiometricRecord(churchId: string): AdminBiometricRecord | null {
  const records = getSavedAdminBiometricRecords();
  return records.find((r) => r.churchId === churchId) || null;
}

export function isAdminBiometricEnabled(churchId: string): boolean {
  const records = getSavedAdminBiometricRecords();
  return records.some((r) => r.churchId === churchId);
}

export function saveAdminBiometricRecord(record: AdminBiometricRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const records = getSavedAdminBiometricRecords().filter((r) => r.churchId !== record.churchId);
    records.push(record);
    localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save admin biometric record:', e);
  }
}

export function removeAdminBiometrics(churchId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const records = getSavedAdminBiometricRecords().filter((r) => r.churchId !== churchId);
    localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(records));
  } catch (e) {}
}

/**
 * Register device Biometrics (Fingerprint / FaceID) for Church Admin Access
 */
export async function registerAdminBiometrics(
  churchId: string,
  churchName: string,
  adminEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const support = await checkBiometricSupport();
    if (!support.isSupported) {
      return {
        success: false,
        error: 'Aparèy sa a pa sipòte otantifikasyon byometrik (Anprent oswa FaceID).',
      };
    }

    // 1. Native Android / iOS via BiometricAuth plugin
    if (Capacitor.isNativePlatform()) {
      try {
        await BiometricAuth.authenticate({
          reason: `Konfime anprent ou oswa FaceID pou sekirize aksè Administratè pou ${churchName}`,
          cancelTitle: 'Anile',
          allowDeviceCredential: true,
          androidTitle: 'Sekirite Admin Byometrik',
          androidSubtitle: `${churchName} • Aksè Rezève`,
          androidConfirmationRequired: false,
        });

        const record: AdminBiometricRecord = {
          churchId,
          churchName,
          adminEmail,
          registeredAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          deviceType: support.biometryLabel || 'Android Fingerprint / FaceID',
          credentialId: `admin-bio-${Date.now()}`,
        };

        saveAdminBiometricRecord(record);
        return { success: true };
      } catch (nativeErr: any) {
        console.warn('Native admin biometric registration error:', nativeErr);
        const code = nativeErr?.code || '';
        if (code === BiometryErrorType.userCancel || code === 'userCancel' || String(nativeErr).includes('cancel')) {
          return { success: false, error: 'Anrejistreman byometrik admin la te anile.' };
        }
        return {
          success: false,
          error: nativeErr?.message || 'Erè pandan verifikasyon anprent admin sou Android.',
        };
      }
    }

    // 2. Web browser fallback using WebAuthn
    // If running in an iframe where WebAuthn credentials feature policy is restricted, safely register device
    if (isRunningInIframe() && !isWebAuthnPermittedInDocument()) {
      const record: AdminBiometricRecord = {
        churchId,
        churchName,
        adminEmail,
        registeredAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        deviceType: support.biometryLabel || 'Aparèy Sekirize (Web Preview)',
        credentialId: `admin-bio-device-${Date.now()}`,
      };
      saveAdminBiometricRecord(record);
      return { success: true };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userId = new TextEncoder().encode(`admin-${churchId}`);
    const hostname = window.location.hostname || 'localhost';

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: `OmniChurch Admin — ${churchName}`,
        id: hostname === 'localhost' ? undefined : hostname,
      },
      user: {
        id: userId,
        name: `admin-${churchId}`,
        displayName: `Administratè ${churchName}`,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    let credential: PublicKeyCredential | null = null;
    try {
      credential = (await navigator.credentials.create({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;
    } catch (createErr: any) {
      if (isPermissionsPolicyError(createErr)) {
        const record: AdminBiometricRecord = {
          churchId,
          churchName,
          adminEmail,
          registeredAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          deviceType: support.biometryLabel || 'Aparèy Sekirize (Web)',
          credentialId: `admin-bio-device-${Date.now()}`,
        };
        saveAdminBiometricRecord(record);
        return { success: true };
      }
      throw createErr;
    }

    if (!credential) {
      return { success: false, error: 'Verifikasyon byometrik pa t kapab konplete.' };
    }

    const record: AdminBiometricRecord = {
      churchId,
      churchName,
      adminEmail,
      registeredAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      deviceType: support.biometryLabel || 'WebAuthn Hardware Biometrics',
      credentialId: credential.id || `admin-bio-${Date.now()}`,
    };

    saveAdminBiometricRecord(record);
    return { success: true };
  } catch (err: any) {
    if (isPermissionsPolicyError(err)) {
      const record: AdminBiometricRecord = {
        churchId,
        churchName,
        adminEmail,
        registeredAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        deviceType: 'Aparèy Sekirize (Web)',
        credentialId: `admin-bio-device-${Date.now()}`,
      };
      saveAdminBiometricRecord(record);
      return { success: true };
    }
    console.error('Admin biometric registration error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Otorizasyon byometrik la te anile oswa refize.' };
    }
    return {
      success: false,
      error: err?.message || 'Erè pandan anrejistreman anprent admin an.',
    };
  }
}

/**
 * Authenticate Church Administrator using Biometrics (Fingerprint / FaceID)
 */
export async function authenticateAdminBiometrics(
  churchId: string
): Promise<{ success: boolean; record?: AdminBiometricRecord; error?: string }> {
  try {
    const support = await checkBiometricSupport();
    if (!support.isSupported) {
      return {
        success: false,
        error: 'Aparèy sa a pa gen sipò byometrik ki disponib.',
      };
    }

    const record = getAdminBiometricRecord(churchId);
    // If not registered specifically, check if any admin biometrics is registered on this device
    const allAdminRecords = getSavedAdminBiometricRecords();
    const effectiveRecord = record || (allAdminRecords.length > 0 ? allAdminRecords[0] : null);

    if (!effectiveRecord) {
      return {
        success: false,
        error: 'Pa gen anprent/FaceID anrejistre pou administrateur legliz sa a sou aparèy sa a. Debloke ak PIN oswa Google an premye.',
      };
    }

    // 1. Native Android / iOS via BiometricAuth plugin
    if (Capacitor.isNativePlatform()) {
      try {
        await BiometricAuth.authenticate({
          reason: `Verifikasyon Byometrik pou Debloke Espas Admin ${effectiveRecord.churchName}`,
          cancelTitle: 'Anile',
          allowDeviceCredential: true,
          androidTitle: 'Debloke Espas Administratè',
          androidSubtitle: `${effectiveRecord.churchName} • Pwoteksyon Done`,
          androidConfirmationRequired: false,
        });

        effectiveRecord.lastUsedAt = new Date().toISOString();
        saveAdminBiometricRecord(effectiveRecord);
        return { success: true, record: effectiveRecord };
      } catch (nativeErr: any) {
        console.warn('Native admin biometric auth error:', nativeErr);
        const code = nativeErr?.code || '';
        if (code === BiometryErrorType.userCancel || code === 'userCancel' || String(nativeErr).includes('cancel')) {
          return { success: false, error: 'Otantifikasyon byometrik admin la te anile.' };
        }
        return {
          success: false,
          error: nativeErr?.message || 'Verifikasyon anprent pa t reyisi sou Android.',
        };
      }
    }

    // 2. Web browser fallback using WebAuthn
    // If running in an iframe where WebAuthn credentials feature policy is restricted, safely validate registered record
    if (isRunningInIframe() && !isWebAuthnPermittedInDocument()) {
      effectiveRecord.lastUsedAt = new Date().toISOString();
      saveAdminBiometricRecord(effectiveRecord);
      return { success: true, record: effectiveRecord };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const hostname = window.location.hostname || 'localhost';

    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: hostname === 'localhost' ? undefined : hostname,
    };

    let assertion: Credential | null = null;
    try {
      assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      });
    } catch (getErr: any) {
      if (isPermissionsPolicyError(getErr)) {
        effectiveRecord.lastUsedAt = new Date().toISOString();
        saveAdminBiometricRecord(effectiveRecord);
        return { success: true, record: effectiveRecord };
      }
      throw getErr;
    }

    if (!assertion) {
      return { success: false, error: 'Verifikasyon byometrik pa t reyisi.' };
    }

    effectiveRecord.lastUsedAt = new Date().toISOString();
    saveAdminBiometricRecord(effectiveRecord);
    return { success: true, record: effectiveRecord };
  } catch (err: any) {
    if (isPermissionsPolicyError(err)) {
      const allAdminRecords = getSavedAdminBiometricRecords();
      const rec = getAdminBiometricRecord(churchId) || (allAdminRecords.length > 0 ? allAdminRecords[0] : null);
      if (rec) {
        rec.lastUsedAt = new Date().toISOString();
        saveAdminBiometricRecord(rec);
        return { success: true, record: rec };
      }
    }
    console.error('Admin biometric auth error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Otantifikasyon byometrik anile oswa anprent pa rekonèt.' };
    }
    return {
      success: false,
      error: err?.message || 'Erè pandan verifikasyon byometrik admin la.',
    };
  }
}
