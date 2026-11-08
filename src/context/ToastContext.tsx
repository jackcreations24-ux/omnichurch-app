import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Megaphone,
  Flame,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'announcement' | 'urgent';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  createdAt: number;
  badge?: string;
}

export interface ToastContextType {
  toasts: ToastItem[];
  showToast: (params: {
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    badge?: string;
  }) => string;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  announcementToast: (
    title: string,
    message?: string,
    badge?: string,
    duration?: number
  ) => string;
  urgent: (title: string, message?: string, duration?: number) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type,
      title,
      message,
      duration = 4000,
      badge,
    }: {
      type: ToastType;
      title: string;
      message?: string;
      duration?: number;
      badge?: string;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        duration,
        createdAt: Date.now(),
        badge,
      };
      setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: 'success', title, message, duration }),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: 'error', title, message, duration }),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: 'warning', title, message, duration }),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast({ type: 'info', title, message, duration }),
    [showToast]
  );

  const announcementToast = useCallback(
    (
      title: string,
      message?: string,
      badge = '📢 AVÈTISMAN OFISYÈL LEGLIZ LA',
      duration = 8000
    ) => showToast({ type: 'announcement', title, message, duration, badge }),
    [showToast]
  );

  const urgent = useCallback(
    (title: string, message?: string, duration = 9000) =>
      showToast({ type: 'urgent', title, message, duration, badge: '🚨 MESAJ IJAN' }),
    [showToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        warning,
        info,
        announcementToast,
        urgent,
        removeToast,
        clearAll,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastCard: React.FC<{
  toast: ToastItem;
  onRemove: () => void;
}> = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'announcement':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0 shadow-sm">
            <Megaphone className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
        );
      case 'urgent':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0 shadow-sm">
            <Flame className="w-4 h-4 text-rose-400 animate-bounce" />
          </div>
        );
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />;
    }
  };

  const getBorderAndBg = () => {
    switch (toast.type) {
      case 'announcement':
        return 'border-amber-400/60 bg-gradient-to-br from-[#1E293B]/98 via-[#1E293B]/95 to-amber-950/40 shadow-amber-950/60 ring-1 ring-amber-400/30';
      case 'urgent':
        return 'border-rose-500/70 bg-gradient-to-br from-[#1E293B]/98 via-[#1E293B]/95 to-rose-950/50 shadow-rose-950/60 ring-1 ring-rose-500/40';
      case 'success':
        return 'border-emerald-500/40 bg-[#1E293B]/95 shadow-emerald-950/40';
      case 'error':
        return 'border-rose-500/40 bg-[#1E293B]/95 shadow-rose-950/40';
      case 'warning':
        return 'border-amber-500/40 bg-[#1E293B]/95 shadow-amber-950/40';
      case 'info':
      default:
        return 'border-sky-500/40 bg-[#1E293B]/95 shadow-sky-950/40';
    }
  };

  const getProgressBarColor = () => {
    switch (toast.type) {
      case 'announcement':
        return 'bg-gradient-to-r from-amber-400 to-amber-300';
      case 'urgent':
        return 'bg-rose-400';
      case 'success':
        return 'bg-emerald-400';
      case 'error':
        return 'bg-rose-400';
      case 'warning':
        return 'bg-amber-400';
      case 'info':
      default:
        return 'bg-sky-400';
    }
  };

  const isSpecial = toast.type === 'announcement' || toast.type === 'urgent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: 20, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-md text-slate-200 flex items-start gap-3.5 ${getBorderAndBg()}`}
    >
      <div>{getIcon()}</div>
      <div className="flex-1 min-w-0 pr-1">
        {toast.badge && (
          <div className="mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                toast.type === 'urgent'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
              }`}
            >
              {toast.badge}
            </span>
          </div>
        )}
        <h4
          className={`font-bold text-white leading-snug tracking-tight ${
            isSpecial ? 'text-sm' : 'text-xs'
          }`}
        >
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words font-medium">
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Fèmen notifikasyon"
        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer -mr-1 -mt-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {toast.duration && toast.duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-0 h-[2.5px] opacity-80 ${getProgressBarColor()}`}
        />
      )}
    </motion.div>
  );
};
