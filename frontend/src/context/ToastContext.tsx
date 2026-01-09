import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

type ToastType = 'info' | 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (t: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const toastKey = `${t.type}:${t.message}`;
    const now = Date.now();
    const lastShown = recentToastsRef.current.get(toastKey);
    
    // Prevent showing the same toast within 1 second
    if (lastShown && now - lastShown < 1000) {
      return '';
    }

    let addedId = '';
    setToasts((currentToasts) => {
      // Double-check: if this exact message already exists in current toasts, don't add
      const exists = currentToasts.some(
        (existing) => existing.message === t.message && existing.type === t.type
      );
      
      if (exists) {
        return currentToasts;
      }

      const id = `toast-${now}-${Math.random().toString(36).slice(2, 8)}`;
      addedId = id;
      const toast: Toast = { id, duration: 4000, ...t };
      
      // Track this toast
      recentToastsRef.current.set(toastKey, now);
      
      // Auto-remove after duration
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
          // Clean up tracking after a bit longer
          setTimeout(() => {
            recentToastsRef.current.delete(toastKey);
          }, 500);
        }, toast.duration);
      }
      
      return [toast, ...currentToasts];
    });

    return addedId;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastProvider;
