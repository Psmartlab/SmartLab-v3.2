import React from 'react';
import { cn } from '../../utils/cn';

/**
 * SectionHeader - Standardized header for sections in views.
 */
const SectionHeader = ({ title, subtitle, className, children }) => {
  return (
    <div className={cn("flex flex-col md:flex-row justify-between md:items-end gap-6 mb-8", className)}>
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-smartlab-primary font-headline tracking-tight leading-none">
          {title}
        </h2>
        {subtitle && (
          <p className="text-smartlab-on-surface-variant font-extrabold text-[10px] uppercase tracking-[0.2em] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
};

export default SectionHeader;
