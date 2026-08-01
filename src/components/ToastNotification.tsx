import React, { useEffect } from 'react';
import { CheckCircle2, X, Sparkles, Tag, ArrowRight } from 'lucide-react';

export interface ToastData {
  id: number;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
  itemInfo?: {
    itemCode: string;
    itemName: string;
    price: string;
  };
}

interface ToastNotificationProps {
  toast: ToastData | null;
  onDismiss: () => void;
  duration?: number;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onDismiss, duration = 2500 }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss, duration]);

  if (!toast) return null;

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 flex items-start gap-3 relative overflow-hidden group">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-400" />

        {/* Success Icon */}
        <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 className="w-5 h-5" />
        </div>

        {/* Toast Body */}
        <div className="flex-1 min-w-0 pr-6 space-y-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <h4 className="text-xs font-bold text-white tracking-wide">
              {toast.title}
            </h4>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug font-medium">
            {toast.message}
          </p>

          {toast.itemInfo && (
            <div className="mt-2 bg-slate-800/90 rounded-xl p-2 border border-slate-700/70 flex items-center justify-between text-[11px] font-mono">
              <span className="text-white font-bold truncate flex items-center gap-1">
                <Tag className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{toast.itemInfo.itemName}</span>
              </span>
              <span className="text-emerald-400 font-bold ml-2 shrink-0">
                {toast.itemInfo.price}
              </span>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
