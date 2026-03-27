import React from 'react';
import { cn } from '../../utils/cn';

/**
 * TabSwitcher - Standardized tab navigation component.
 */
const TabSwitcher = ({ tabs, activeTab, onTabChange, className }) => {
  return (
    <div className={cn(
      "flex gap-2 p-2 bg-smartlab-surface rounded-2xl border-2 border-smartlab-border shadow-sm transition-all",
      className
    )}>
      {tabs.map((tab) => (
        <button 
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300",
            activeTab === tab.id 
              ? "bg-smartlab-on-surface text-smartlab-surface shadow-lg" 
              : "text-smartlab-on-surface-variant hover:text-smartlab-on-surface hover:bg-smartlab-surface-low"
          )}
        >
          {tab.icon && (
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
          )}
          {tab.lucideIcon && (
            <tab.lucideIcon size={18} />
          )}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TabSwitcher;
