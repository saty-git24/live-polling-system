import React from 'react';
import { useToast } from '../context/ToastContext';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`max-w-sm w-full px-4 py-2 rounded shadow-lg text-sm text-white flex items-center justify-between ${t.type === 'error' ? 'bg-red-600' : t.type === 'success' ? 'bg-green-600' : 'bg-blue-600'}`}>
          <div className="flex-1">{t.message}</div>
          <button onClick={() => removeToast(t.id)} className="ml-3 opacity-80 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
