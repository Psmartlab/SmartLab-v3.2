import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Toast({ msg, message, type = 'success', onClose, duration = 4000 }) {
  const displayMessage = msg || message;

  useEffect(() => {
    if (displayMessage && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [displayMessage, onClose, duration]);

  if (!displayMessage) return null;

  const icons = {
    success: <CheckCircle className="text-emerald-500" size={20} />,
    error: <AlertCircle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    warning: <AlertCircle className="text-amber-500" size={20} />,
  };

  const colors = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700',
    error: 'bg-red-500/10 border-red-500/20 text-red-700',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-700',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-700',
  };

  return (
    <div className="fixed bottom-10 right-10 z-[100] animate-in fade-in slide-in-from-right-10 duration-500">
      <div className={cn(
        "flex items-center gap-4 px-6 py-4 rounded-[28px] border-2 backdrop-blur-xl shadow-2xl min-w-[320px]",
        colors[type] || colors.info
      )}>
        <div className="shrink-0">{icons[type] || icons.info}</div>
        <div className="flex-1">
          <p className="font-black text-[11px] uppercase tracking-[0.15em] italic font-headline leading-tight">
            {displayMessage}
          </p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 hover:bg-black/5 rounded-full transition-colors opacity-30 hover:opacity-100"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
