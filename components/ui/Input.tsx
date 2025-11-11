import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${props.name}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-4 py-3 border-2 border-gray-200 rounded-xl',
          'bg-white/80 backdrop-blur-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400',
          'transition-all duration-300 hover:border-gray-300',
          'placeholder:text-gray-400',
          'dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 dark:hover:border-slate-500 dark:focus:ring-blue-500 dark:focus:border-blue-500',
          error && 'border-red-400 focus:ring-red-400 focus:border-red-400 dark:border-red-400',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

