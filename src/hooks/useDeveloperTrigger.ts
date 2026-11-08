import React, { useRef, useEffect, useCallback } from 'react';

interface UseDeveloperTriggerOptions {
  onTrigger?: () => void;
  longPressDurationMs?: number; // Default 10000ms (10 seconds)
  enableKeyboardShortcut?: boolean;
}

/**
 * Dedicated custom hook for stealth 10-second long-press detection
 * and developer emergency keyboard shortcuts (Ctrl+Shift+D / Alt+Shift+D).
 *
 * Designed to be completely hidden from regular users ("tout bagay dwe kache"):
 * No tooltips, no click hints, no countdown UI.
 * Only holding continuously for 10 full seconds triggers Developer Engine Auth.
 */
export function useDeveloperTrigger({
  onTrigger,
  longPressDurationMs = 10000, // 10 seconds
  enableKeyboardShortcut = true,
}: UseDeveloperTriggerOptions = {}) {
  const onTriggerRef = useRef<(() => void) | undefined>(onTrigger);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPressingRef = useRef<boolean>(false);
  const pressStartTimeRef = useRef<number>(0);

  // Keep trigger callback ref fresh without triggering effect re-subscriptions
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  // Clean up any pending timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    };
  }, []);

  // Stable manual trigger function
  const triggerManually = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    isPressingRef.current = false;
    if (onTriggerRef.current) {
      onTriggerRef.current();
    }
  }, []);

  // Start 10-second long press
  const startLongPress = useCallback(
    (e?: React.MouseEvent | MouseEvent | React.TouchEvent) => {
      // Don't trigger on right clicks or auxiliary buttons
      if (e && 'button' in e && (e as MouseEvent).button !== 0) {
        return;
      }

      // Cancel any existing timer
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }

      isPressingRef.current = true;
      pressStartTimeRef.current = Date.now();

      // Start 10-second continuous timer
      pressTimerRef.current = setTimeout(() => {
        if (isPressingRef.current) {
          isPressingRef.current = false;
          pressTimerRef.current = null;

          // Haptic feedback if available (subtle confirmation for the developer)
          if (
            typeof navigator !== 'undefined' &&
            'vibrate' in navigator &&
            typeof navigator.vibrate === 'function'
          ) {
            try {
              navigator.vibrate([100, 50, 100]);
            } catch {
              // Ignore vibration permission or browser limitations
            }
          }

          if (onTriggerRef.current) {
            onTriggerRef.current();
          }
        }
      }, longPressDurationMs);
    },
    [longPressDurationMs]
  );

  // Cancel long press if user releases early or moves out
  const cancelLongPress = useCallback(() => {
    isPressingRef.current = false;
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  // Context menu prevention on the logo to allow smooth 10s holding on mobile
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only prevent default if actively pressing to avoid right click image download modal
    if (isPressingRef.current) {
      e.preventDefault();
    }
  }, []);

  // Legacy fallback: dummy click handler that doesn't trigger on quick clicks
  const handleTriggerClick = useCallback((e?: React.MouseEvent | MouseEvent | React.TouchEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    // Normal clicks do nothing — requires 10-second long press
  }, []);

  // Bundled props to easily spread onto the logo or trigger element
  const triggerProps = {
    onMouseDown: startLongPress,
    onMouseUp: cancelLongPress,
    onMouseLeave: cancelLongPress,
    onTouchStart: startLongPress,
    onTouchEnd: cancelLongPress,
    onTouchCancel: cancelLongPress,
    onContextMenu: handleContextMenu,
  };

  // Global listeners for keyboard shortcuts and cross-component custom events
  useEffect(() => {
    if (!enableKeyboardShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isKeyD = (e?.key || '').toLowerCase() === 'd';
      if ((e.ctrlKey && e.shiftKey && isKeyD) || (e.altKey && e.shiftKey && isKeyD)) {
        e.preventDefault();
        triggerManually();
      }
    };

    const handleCustomEvent = () => {
      triggerManually();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('omnichurch_open_developer_panel', handleCustomEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('omnichurch_open_developer_panel', handleCustomEvent);
    };
  }, [enableKeyboardShortcut, triggerManually]);

  return {
    triggerProps,
    startLongPress,
    cancelLongPress,
    handleTriggerClick,
    triggerManually,
  };
}

