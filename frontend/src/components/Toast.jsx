import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-200 animate-slide-up bg-white">
      {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
      {isError && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
      {!isSuccess && !isError && <Info className="w-5 h-5 text-indigo-500 shrink-0" />}
      
      <span className={isSuccess ? 'text-slate-800' : isError ? 'text-rose-900' : 'text-slate-800'}>
        {toast.message}
      </span>

      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 ml-2 p-1 rounded-md hover:bg-slate-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
