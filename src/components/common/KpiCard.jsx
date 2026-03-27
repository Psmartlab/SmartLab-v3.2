import React from 'react';
import { cn } from '../../utils/cn';

/**
 * KpiCard - A standardized card for dashboard metrics.
 * Supports light/dark modes through CSS variables.
 */
const KpiCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  status = 'default', 
  onClick, 
  isExpanded = false,
  className,
  style
}) => {
  const statusStyles = {
    default: 'border-smartlab-border hover:border-smartlab-on-surface-variant',
    primary: 'border-primary ring-4 ring-primary/5',
    warning: 'border-warning ring-4 ring-warning/5',
    danger: 'border-danger ring-4 ring-danger/5',
    success: 'border-success ring-4 ring-success/5',
    info: 'border-blue-500 ring-4 ring-blue-500/5',
  };

  const iconStyles = {
    default: 'bg-smartlab-surface-low text-smartlab-on-surface-variant',
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    success: 'bg-success/10 text-success',
    info: 'bg-blue-500/10 text-blue-500',
  };

  return (
    <div 
      onClick={onClick}
      style={style}
      className={cn(
        "bg-smartlab-surface p-6 rounded-[24px] shadow-sm border-2 transition-all cursor-pointer group flex flex-col justify-between h-full hover:-translate-y-1 hover:shadow-xl",
        status !== 'default' && isExpanded ? statusStyles[status] : statusStyles.default,
        isExpanded && "ring-4 ring-smartlab-on-surface/5 border-smartlab-on-surface",
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "p-2 rounded-xl transition-colors",
          isExpanded ? "bg-smartlab-on-surface text-smartlab-surface" : iconStyles[status] || iconStyles.default
        )}>
          {typeof Icon === 'string' ? (
            <span className="material-symbols-outlined">{Icon}</span>
          ) : (
            <Icon size={24} />
          )}
        </div>
        <span className="font-black text-[10px] uppercase tracking-widest text-smartlab-on-surface-variant">
          {title}
        </span>
      </div>
      <div>
        <p className="text-4xl font-black text-smartlab-on-surface tracking-tighter leading-none">
          {value}
        </p>
        <h3 className="text-smartlab-on-surface-variant font-bold text-[10px] uppercase tracking-[0.2em] mt-2">
          {subtitle}
        </h3>
      </div>
    </div>
  );
};

export default KpiCard;
