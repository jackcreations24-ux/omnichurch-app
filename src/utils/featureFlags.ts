/**
 * OmniChurch Feature Flags & Control Constants
 * Ensures sensitive modules like Financial Giving/Donations are disabled by default
 * and strictly guarded by license requirements.
 */
export const featureFlags = {
  // Financial/Donations module is closed/disabled by default
  donationsEnabled: false,
  // Require active license to enable church-specific financial donation collections
  requireLicenseForDonations: true,
};
