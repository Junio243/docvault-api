'use client';
import { useState } from 'react';

interface Toast { id: number; type: 'success' | 'error' | 'info'; message: string; }

let toastListeners: ((t: Toast[]) => void)[] = [];
let toastState: Toast[] = [];

export function showToast(message: string, type: Toast['type'] = 'info') {
  const t: Toast = { id: Date.now(), type, message };
  toastState = [...toastState, t];
  toastListeners.forEach(fn => fn(toastState));
  setTimeout(() => {
    toastState = toastState.filter(x => x.id !== t.id);
    toastListeners.forEach(fn => fn(toastState));
  }, 4000);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  if (!toastListeners.includes(setToasts)) toastListeners.push(setToasts);

  const icon = (t: Toast['type']) => t === 'success' ? '✓' : t === 'error' ? '✕' : 'ℹ';
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{icon(t.type)}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
