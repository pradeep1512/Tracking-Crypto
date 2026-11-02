'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'admin';
  children: React.ReactNode;
}

export function SubmitButton({
  loading = false,
  loadingText = 'Processing...',
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}: SubmitButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={`w-full py-3 px-6 rounded-lg font-bold text-sm shadow-lg transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-[0.99] cursor-pointer ${
        isPrimary
          ? 'bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold focus:ring-yellow-400/50 shadow-yellow-500/20'
          : 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white focus:ring-purple-500/50'
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
