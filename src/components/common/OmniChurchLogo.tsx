import React from 'react';

/**
 * Official OmniChurch PRO brand assets (high-resolution transparent PNGs).
 * Full Logo: 1293x1217 RGBA transparent (3D metallic flame + OmniChurch typography + gold swoosh)
 * App Icon:  1254x1254 RGBA transparent (gold-framed royal blue squircle + flame & cross)
 */
export const OMNICHURCH_LOGO_SRC = '/assets/aistudio/download_b4dd93b3.png';
export const OMNICHURCH_ICON_SRC = '/assets/aistudio/download_ea37b16b.png';
export const OMNICHURCH_LOGO_ALT = 'OmniChurch PRO Official Logo';

export interface OmniChurchLogoProps {
  /**
   * "full" renders the complete metallic emblem + OmniChurch wordmark.
   * "icon" renders the compact official OmniChurch app icon.
   * "responsive" renders the compact icon on small screens and the complete logo on sm+ screens.
   */
  variant?: 'full' | 'icon' | 'responsive';
  /** Tailwind sizing classes applied directly to the <img> element (preserve aspect ratio, e.g. "h-10 w-auto"). */
  className?: string;
  /** Optional mobile icon sizing classes when variant="responsive". */
  mobileClassName?: string;
  /** Optional desktop/tablet full logo sizing classes when variant="responsive". */
  desktopClassName?: string;
  alt?: string;
  priority?: boolean;
}

export const OmniChurchLogo: React.FC<OmniChurchLogoProps> = ({
  variant = 'full',
  className = 'h-12 w-auto',
  mobileClassName = 'h-9 w-9',
  desktopClassName = 'h-11 w-auto',
  alt = OMNICHURCH_LOGO_ALT,
  priority = false,
}) => {
  const loadingMode = priority ? 'eager' : 'lazy';
  const fetchPriorityProp = priority ? ({ fetchPriority: 'high' } as Record<string, string>) : {};

  if (variant === 'icon') {
    return (
      <img
        src={OMNICHURCH_ICON_SRC}
        alt={alt}
        width={128}
        height={128}
        loading={loadingMode}
        decoding="async"
        draggable={false}
        referrerPolicy="no-referrer"
        className={`block max-w-full object-contain select-none shrink-0 bg-transparent ${className}`}
        {...fetchPriorityProp}
      />
    );
  }

  if (variant === 'responsive') {
    return (
      <>
        <img
          src={OMNICHURCH_ICON_SRC}
          alt={alt}
          width={128}
          height={128}
          loading={loadingMode}
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          className={`block sm:hidden max-w-full object-contain select-none shrink-0 bg-transparent ${mobileClassName}`}
          {...fetchPriorityProp}
        />
        <img
          src={OMNICHURCH_LOGO_SRC}
          alt={alt}
          width={128}
          height={120}
          loading={loadingMode}
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          className={`hidden sm:block max-w-full object-contain select-none shrink-0 bg-transparent ${desktopClassName}`}
          {...fetchPriorityProp}
        />
      </>
    );
  }

  return (
    <img
      src={OMNICHURCH_LOGO_SRC}
      alt={alt}
      width={128}
      height={120}
      loading={loadingMode}
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      className={`block max-w-full object-contain select-none shrink-0 bg-transparent ${className}`}
      {...fetchPriorityProp}
    />
  );
};

export default OmniChurchLogo;
