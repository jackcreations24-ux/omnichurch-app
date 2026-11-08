import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('OmniChurch Uncaught Application Error:', error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReset = () => {
    try {
      // Clear relevant keys without touching developer master configs
      const keysToClear = [
        'app_legiz_active_church_id_v1',
        'app_legiz_active_role_v1',
        'app_legiz_active_member_id_v1',
      ];
      keysToClear.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F172A] text-slate-200 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-[#1E293B] rounded-3xl border border-rose-500/40 p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Yon Ti Pwoblèm Rive nan Aplikasyon an
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Aplikasyon an te rankontre yon ti erè pandan l ap chaje. Ou ka rekòmanse li kounye a.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-left overflow-x-auto max-h-32 text-[11px] font-mono text-rose-300">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Rekòmanse Aplikasyon an</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReset}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Netwaye Sesyon & Rekonèkte</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
