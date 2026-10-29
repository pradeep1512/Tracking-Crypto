'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface AuthSuccessProps {
  message: string | null;
}

export function AuthSuccess({ message }: AuthSuccessProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5 animate-fadeIn"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
      <span className="leading-relaxed font-medium">{message}</span>
    </div>
  );
}
