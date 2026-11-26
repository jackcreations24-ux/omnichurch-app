import { Church, UserRole } from '../types';

export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC = 60;
const RESEND_STORAGE_PREFIX = 'omnichurch_email_verif_sent_at_v1:';

function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Determines whether the dedicated post-creation Email Verification Screen should be shown
 * immediately after a church owner creates a new church.
 */
export function shouldPromptPostCreationEmailVerification(params: {
  church?: Church | null;
  authEmailVerified: boolean;
  authUserEmail?: string | null;
}): boolean {
  const { church, authEmailVerified, authUserEmail } = params;
  if (!church) return false;
  if (authEmailVerified) return false;
  if (church.adminVerified === true) return false;

  const churchAdminEmail = normalizeEmail(church.adminGoogleEmail);
  const currentEmail = normalizeEmail(authUserEmail);
  if (!churchAdminEmail && !currentEmail) return false;

  // If the church was created via legacy PIN only (no Firebase email owner), do not prompt
  if (church.adminAuthMethod === 'legacy_pin' && !currentEmail) return false;

  // If both emails exist, ensure they correspond to the same owner account
  if (churchAdminEmail && currentEmail && churchAdminEmail !== currentEmail) {
    return false;
  }

  return true;
}

/**
 * Determines whether the compact "Resend imel verifikasyon" button should appear
 * inside the logged-in church owner's profile, dashboard banner, and church profile settings.
 * Works both when actively signed in with an unverified Firebase email AND when logged into
 * an email-owned church via Quick PIN / restored session (even days after the original link expired).
 */
export function shouldShowProfileResendVerificationButton(params: {
  userRole: UserRole | string;
  church?: Church | null;
  hasAuthUser: boolean;
  authEmailVerified: boolean;
  authUserEmail?: string | null;
}): boolean {
  const { userRole, church, hasAuthUser, authEmailVerified, authUserEmail } = params;
  if (userRole !== 'admin') return false;
  if (!church) return false;
  if (church.adminVerified === true) return false;

  const churchAdminEmail = normalizeEmail(church.adminGoogleEmail);
  const currentEmail = normalizeEmail(authUserEmail);

  // Need an owner email on the church or active auth session to verify
  if (!churchAdminEmail && !currentEmail) return false;

  // If the currently authenticated Firebase user IS this church's owner and is already verified, hide the button
  if (hasAuthUser && authEmailVerified) {
    if (!churchAdminEmail || currentEmail === churchAdminEmail) {
      return false;
    }
  }

  // If signed into Firebase with an unverified email matching the church (or church email unset), show it
  if (hasAuthUser && !authEmailVerified) {
    if (!churchAdminEmail || currentEmail === churchAdminEmail) {
      return true;
    }
  }

  // If logged into the church admin console without a matching live verified Firebase session
  // (e.g., Quick PIN, restored local session, or expired link from days ago), STILL show it so they can re-auth & resend!
  if (churchAdminEmail) {
    return true;
  }

  return false;
}

/**
 * Returns true if the current browser session needs a quick inline Email + Password sign-in
 * before Firebase can issue a fresh `sendEmailVerification(user)` link (e.g., PIN login or expired session).
 */
export function needsInlineReauthForVerification(params: {
  church?: Church | null;
  hasAuthUser: boolean;
  authUserEmail?: string | null;
}): boolean {
  const { church, hasAuthUser, authUserEmail } = params;
  if (!hasAuthUser) return true;
  const churchAdminEmail = normalizeEmail(church?.adminGoogleEmail);
  const currentEmail = normalizeEmail(authUserEmail);
  if (!currentEmail) return true;
  if (churchAdminEmail && churchAdminEmail !== currentEmail) return true;
  return false;
}

/**
 * Pure cooldown calculator (in whole seconds) to prevent Firebase `auth/too-many-requests` rate-limiting.
 */
export function computeResendCooldownRemaining(
  lastSentAtMs: number | null | undefined,
  nowMs: number = Date.now(),
  cooldownSec: number = EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC
): number {
  if (!lastSentAtMs || !Number.isFinite(lastSentAtMs) || lastSentAtMs <= 0) {
    return 0;
  }
  const elapsedSec = Math.floor((nowMs - lastSentAtMs) / 1000);
  if (elapsedSec < 0) return cooldownSec;
  return Math.max(0, cooldownSec - elapsedSec);
}

export function recordVerificationEmailSent(
  email?: string | null,
  nowMs: number = Date.now()
): void {
  const key = normalizeEmail(email);
  if (!key) return;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`${RESEND_STORAGE_PREFIX}${key}`, String(nowMs));
    }
  } catch {
    // Non-fatal in private browsing or test runtimes without sessionStorage
  }
}

export function getVerificationEmailLastSentAt(email?: string | null): number | null {
  const key = normalizeEmail(email);
  if (!key) return null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(`${RESEND_STORAGE_PREFIX}${key}`);
      if (!raw) return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
  } catch {
    // Non-fatal
  }
  return null;
}
