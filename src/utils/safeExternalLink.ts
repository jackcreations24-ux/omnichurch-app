/**
 * Safely opens an external HTTP(S) or mailto URL without using window.open(),
 * avoiding popup blockers and iframe restrictions while blocking unsafe schemes (javascript:, data:, vbscript:).
 */
export function isSafeExternalUrl(rawUrl: string | undefined | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed, 'https://omnichurch.download');
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

export function normalizeSafeHttpUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let candidate = rawUrl.trim();
  if (!candidate) return null;

  const lower = candidate.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return null;
  }

  if (!lower.startsWith('http://') && !lower.startsWith('https://') && !lower.startsWith('mailto:')) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }

  return isSafeExternalUrl(candidate) ? candidate : null;
}

export function openExternalUrlSafely(rawUrl: string | undefined | null): boolean {
  if (typeof document === 'undefined') return false;
  const safeUrl = normalizeSafeHttpUrl(rawUrl);
  if (!safeUrl) return false;

  const link = document.createElement('a');
  link.href = safeUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
