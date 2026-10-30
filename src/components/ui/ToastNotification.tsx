'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'warning' | 'error' | 'success' | 'info';

export interface ToastNotificationProps {
  title: string;
  message: string;
  type?: ToastType;
  durationMs?: number;
  onClose?: () => void;
  id?: string;
}

export function ToastNotification({
  title,
  message,
  type = 'warning',
  durationMs = 4000,
  onClose,
  id = 'auth-toast-notification',
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (durationMs <= 0) return;

    const timer = setTimeout(() => {
      handleClose();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs]);

  const handleClose = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  const colorStyles = {
    warning: {
      border: 'border-amber-500/40',
      bg: 'bg-zinc-950/90 shadow-amber-500/10',
      iconBg: 'bg-amber-500/15 text-amber-400',
      title: 'text-amber-300',
      icon: <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    error: {
      border: 'border-red-500/40',
      bg: 'bg-zinc-950/90 shadow-red-500/10',
      iconBg: 'bg-red-500/15 text-red-400',
      title: 'text-red-300',
      icon: <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />,
    },
    success: {
      border: 'border-emerald-500/40',
      bg: 'bg-zinc-950/90 shadow-emerald-500/10',
      iconBg: 'bg-emerald-500/15 text-emerald-400',
      title: 'text-emerald-300',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    info: {
      border: 'border-cyan-500/40',
      bg: 'bg-zinc-950/90 shadow-cyan-500/10',
      iconBg: 'bg-cyan-500/15 text-cyan-400',
      title: 'text-cyan-300',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    },
  }[type];

  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className={`fixed top-6 right-6 z-50 max-w-md w-full transition-all duration-300 transform ${
        isFadingOut
          ? 'opacity-0 -translate-y-3 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100'
      }`}
    >
      <div
        className={`flex items-start gap-3.5 p-4 rounded-xl border backdrop-blur-xl shadow-2xl ${colorStyles.border} ${colorStyles.bg}`}
      >
        <div className={`p-2 rounded-lg shrink-0 ${colorStyles.iconBg}`}>
          {colorStyles.icon}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className={`text-sm font-semibold tracking-tight ${colorStyles.title}`}>
            {title}
          </h4>
          <p className="mt-1 text-xs text-zinc-300 leading-relaxed font-normal">
            {message}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
