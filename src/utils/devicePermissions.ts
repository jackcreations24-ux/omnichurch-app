// Mobile and Native Device Permissions Helper
// Senior-grade camera, storage, and device hardware permissions management for Android (Capacitor/WebView) & Mobile Web

export interface PermissionCheckResult {
  granted: boolean;
  canPrompt: boolean;
  state?: 'granted' | 'prompt' | 'denied';
  error?: string;
}

/**
 * Checks if the app is running inside a native Capacitor / Android container
 */
export function isNativeAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).Capacitor?.isNativePlatform?.() ||
    (window as any).Capacitor?.platform === 'android' ||
    navigator.userAgent.includes('wv') ||
    navigator.userAgent.includes('Android')
  );
}

/**
 * Check Camera Permission Status safely across native Capacitor and standard WebViews
 */
export async function checkCameraPermissionStatus(): Promise<PermissionCheckResult> {
  if (typeof window === 'undefined') {
    return { granted: false, canPrompt: false, state: 'denied' };
  }

  // 1. Check Capacitor Native Plugin if available
  const capacitor = (window as any).Capacitor;
  if (capacitor?.Plugins?.Camera?.checkPermissions) {
    try {
      const res = await capacitor.Plugins.Camera.checkPermissions();
      const isGranted = res?.camera === 'granted' || res?.camera === 'limited';
      return {
        granted: isGranted,
        canPrompt: res?.camera === 'prompt' || res?.camera === 'prompt-with-rationale',
        state: isGranted ? 'granted' : res?.camera === 'denied' ? 'denied' : 'prompt',
      };
    } catch {
      // Fallback to web permissions
    }
  }

  // 2. Standard navigator.permissions query
  if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return {
        granted: status.state === 'granted',
        canPrompt: status.state === 'prompt',
        state: status.state as 'granted' | 'prompt' | 'denied',
      };
    } catch {
      // Permissions query for camera not supported in some WebViews
    }
  }

  // 3. Fallback check based on prior cached user action
  const hasDenied = localStorage.getItem('omnichurch_android_perm_denied') === 'true';
  const hasGranted = localStorage.getItem('omnichurch_android_perm_ready') === 'true';

  return {
    granted: hasGranted && !hasDenied,
    canPrompt: !hasDenied,
    state: hasGranted ? 'granted' : hasDenied ? 'denied' : 'prompt',
  };
}

/**
 * Requests Camera permissions cleanly with multi-tier fallback constraints
 * Designed to work seamlessly on high-end and low-end Android devices without crashing or getting blocked.
 */
export async function requestCameraPermission(
  facingMode: 'environment' | 'user' = 'environment'
): Promise<{ stream: MediaStream | null; error: string | null }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      stream: null,
      error: 'Aparèy oswa navigatè w la pa sipòte aksè dirèk ak kamera a.',
    };
  }

  // 1. Proactively invoke Capacitor native camera permission request if running in Capacitor
  const capacitor = (window as any).Capacitor;
  if (capacitor?.Plugins?.Camera?.requestPermissions) {
    try {
      const capRes = await capacitor.Plugins.Camera.requestPermissions();
      if (capRes?.camera === 'denied') {
        localStorage.setItem('omnichurch_android_perm_denied', 'true');
        return {
          stream: null,
          error:
            'Otorizasyon kamera a te refize nan Android. Tanpri ale nan Paramèt Telefòn > Aplikasyon > OmniChurch > Otorizasyon > Pèmèt Kamera.',
        };
      }
    } catch (capErr) {
      console.warn('Capacitor native camera request warning:', capErr);
    }
  }

  // Multi-tier video constraints for maximum Android hardware compatibility
  const constraintTiers: MediaStreamConstraints[] = [
    // Tier 1: Optimal rear/front camera with HD resolution
    {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
      },
      audio: false,
    },
    // Tier 2: Facing mode without resolution constraints
    {
      video: {
        facingMode: facingMode,
      },
      audio: false,
    },
    // Tier 3: Loose facing mode constraint
    {
      video: {
        facingMode: { ideal: facingMode },
      },
      audio: false,
    },
    // Tier 4: Generic video fallback (guaranteed to work if any camera is present)
    {
      video: true,
      audio: false,
    },
  ];

  let lastError: any = null;

  for (const constraints of constraintTiers) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream) {
        localStorage.setItem('omnichurch_android_perm_ready', 'true');
        localStorage.removeItem('omnichurch_android_perm_denied');
        return { stream, error: null };
      }
    } catch (err: any) {
      lastError = err;
      // If permission is explicitly denied by user, do not loop through fallback constraints
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        localStorage.setItem('omnichurch_android_perm_denied', 'true');
        break;
      }
    }
  }

  // Parse error messages cleanly
  console.warn('Camera request completed with error:', lastError);
  let message = 'Nou pa ka jwenn aksè ak kamera a sou aparèy sa a.';

  if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
    message =
      'Otorizasyon kamera a te refize. Tanpri aksepte "Pèmèt / Allow" lè sistèm nan mande l, oswa ale nan Paramèt Android > Aplikasyon > OmniChurch > Otorizasyon > Pèmèt Kamera.';
  } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
    message = 'Pa gen okenn kamera ki detekte sou aparèy sa a.';
  } else if (lastError?.name === 'NotReadableError' || lastError?.name === 'TrackStartError') {
    message = 'Kamera a deja louvri nan yon lòt aplikasyon. Tanpri fèmen lòt aplikasyon yo epi eseye ankò.';
  } else if (lastError?.name === 'OverconstrainedError') {
    message = 'Kamera aparèy la pa sipòte konfigirasyon rezolisyon sa a.';
  } else if (lastError?.message) {
    message = lastError.message;
  }

  return { stream: null, error: message };
}

/**
 * Triggers native vibration if supported
 */
export function triggerHapticFeedback(pattern: number | number[] = 50): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error
    }
  }
}

/**
 * Real-time Device & Capacitor Initial Permissions Initialization
 * Checks and proactively requests camera and storage permissions on Android
 * to prevent 'Permission Denied' errors during runtime QR scanning and photo uploads.
 */
export async function initializeAppPermissions(): Promise<{ camera: boolean; storage: boolean }> {
  const isAndroid = isNativeAndroidApp();
  const results = { camera: false, storage: true };

  if (typeof window === 'undefined') return results;

  // 1. Check if native Capacitor Plugins for Camera/Permissions are injected on window
  const capacitor = (window as any).Capacitor;
  if (capacitor?.Plugins) {
    try {
      if (capacitor.Plugins.Camera?.requestPermissions) {
        const res = await capacitor.Plugins.Camera.requestPermissions();
        if (res?.camera === 'granted' || res?.camera === 'limited') {
          results.camera = true;
        }
      }
      if (capacitor.Plugins.Filesystem?.requestPermissions) {
        await capacitor.Plugins.Filesystem.requestPermissions();
      }
    } catch (capErr) {
      console.warn('Capacitor native permissions hook notification:', capErr);
    }
  }

  // 2. Passive Browser/WebView permission state check (does not open camera hardware on boot)
  if (isAndroid) {
    try {
      const status = await checkCameraPermissionStatus();
      results.camera = status.granted;
    } catch {
      // Ignore passive permission check error
    }
  }

  return results;
}

/**
 * Resets camera permission state cache so user can re-prompt or re-trigger
 */
export function resetCameraPermissionPreferences(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('omnichurch_android_perm_denied');
  localStorage.removeItem('omnichurch_android_perm_ready');
  localStorage.removeItem('omnichurch_device_permissions_checked');
}

/**
 * Checks if the current camera stream track supports hardware torch / flashlight
 */
export function hasTorchSupport(stream: MediaStream | null): boolean {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  if (!track || typeof (track as any).getCapabilities !== 'function') return false;
  try {
    const caps = (track as any).getCapabilities();
    return !!caps?.torch;
  } catch {
    return false;
  }
}

/**
 * Turns device camera torch / flashlight on or off
 */
export async function setTorchState(stream: MediaStream | null, enabled: boolean): Promise<boolean> {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  if (!track || typeof track.applyConstraints !== 'function') return false;
  try {
    await track.applyConstraints({
      advanced: [{ torch: enabled } as any],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns optical/sensor zoom capabilities if supported by the camera hardware
 */
export function getCameraZoomRange(stream: MediaStream | null): {
  supported: boolean;
  min: number;
  max: number;
  current: number;
  step: number;
} {
  if (!stream) return { supported: false, min: 1, max: 1, current: 1, step: 0.1 };
  const track = stream.getVideoTracks()[0];
  if (!track || typeof (track as any).getCapabilities !== 'function') {
    return { supported: false, min: 1, max: 1, current: 1, step: 0.1 };
  }
  try {
    const caps = (track as any).getCapabilities();
    const settings = track.getSettings ? track.getSettings() : ({} as any);
    if (caps?.zoom) {
      return {
        supported: true,
        min: caps.zoom.min || 1,
        max: caps.zoom.max || 5,
        current: settings.zoom || 1,
        step: caps.zoom.step || 0.1,
      };
    }
  } catch {
    //
  }
  return { supported: false, min: 1, max: 1, current: 1, step: 0.1 };
}

/**
 * Applies optical/sensor zoom on the active camera stream track
 */
export async function setCameraZoom(stream: MediaStream | null, zoom: number): Promise<boolean> {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  if (!track || typeof track.applyConstraints !== 'function') return false;
  try {
    await track.applyConstraints({
      advanced: [{ zoom } as any],
    });
    return true;
  } catch {
    return false;
  }
}
