import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none w-full max-w-md px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bg = 'bg-[#212121] text-white';
          let icon = <CheckCircle2 className="w-5 h-5 text-[#81c784] shrink-0" />;

          if (toast.type === 'error' || toast.text.includes('❌') || toast.text.includes('Error')) {
            bg = 'bg-[#c62828] text-white';
            icon = <XCircle className="w-5 h-5 text-white shrink-0" />;
          } else if (toast.type === 'warning' || toast.text.includes('⚠️')) {
            bg = 'bg-[#e65100] text-white';
            icon = <AlertTriangle className="w-5 h-5 text-[#ffe082] shrink-0" />;
          } else if (toast.type === 'info') {
            bg = 'bg-[#1565c0] text-white';
            icon = <Info className="w-5 h-5 text-[#90caf9] shrink-0" />;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${bg} max-w-full border border-white/10`}
              onClick={() => onDismiss(toast.id)}
            >
              {icon}
              <span className="leading-snug">{toast.text.replace(/^[✅❌⚠️ℹ️]\s*/, '')}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
