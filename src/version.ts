import packageJson from '../package.json';

/**
 * Single Source of Truth for App Versioning
 * Synchronized across package.json, Android Studio Gradle, and Developer Update Center.
 */
export const APP_BASE_VERSION: string = packageJson.version || '1.0.0';
export const APP_PRODUCT_NAME: string = packageJson.build?.productName || packageJson.name || 'OmniChurch Pro';
