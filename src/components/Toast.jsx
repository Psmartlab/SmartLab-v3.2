import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const Toast = ({ msg, type }) => (
  msg ? (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl font-bold text-sm animate-in slide-in-from-bottom-4 ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
      {msg}
    </div>
  ) : null
);

export default Toast;
