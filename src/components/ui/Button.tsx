'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export default function Button({ variant = 'primary', fullWidth, className = '', children, ...props }: ButtonProps) {
  const base = 'rounded-lg px-6 py-3 font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[#1a3a6e] text-white hover:bg-[#0f2347]',
    secondary: 'border-2 border-[#1a3a6e] text-[#1a3a6e] hover:bg-[#1a3a6e]/10',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
