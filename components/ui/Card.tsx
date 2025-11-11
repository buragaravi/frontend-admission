import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, title }) => {
  return (
    <div
      className={cn(
        'bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-6',
        'dark:bg-slate-900/70 dark:border-slate-700/70 dark:shadow-lg',
        'hover:shadow-xl hover:border-gray-300/50 dark:hover:border-slate-600/70 transition-all duration-300',
        className
      )}
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
};

