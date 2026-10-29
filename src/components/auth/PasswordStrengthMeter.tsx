'use client';

import React from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  // Calculate score 0 to 4
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password) || password.length >= 12) score++;

  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-emerald-500',
  ];

  const textColors = [
    'text-red-400',
    'text-orange-400',
    'text-amber-400',
    'text-blue-400',
    'text-emerald-400',
  ];

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-muted-foreground">Password strength:</span>
        <span className={`font-semibold ${textColors[score]}`}>
          {strengthLabels[score]}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-full rounded-full transition-all duration-300 ${
              index < score ? strengthColors[score] : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
