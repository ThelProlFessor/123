import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  valueColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, valueColor = 'text-primary' }) => {
  return (
    <div className="bg-surface border border-border rounded-xl shadow-lg shadow-slate-900/5 p-6 flex-1 transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/10 hover:-translate-y-1 dark:shadow-none dark:hover:border-primary/50">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-text-secondary">{title}</p>
                <p className={`text-4xl font-extrabold mt-1 ${valueColor}`}>{value}</p>
            </div>
            {icon && (
                <div className="bg-primary-light p-3 rounded-full text-primary">
                    {icon}
                </div>
            )}
        </div>
        {subtitle && <p className="text-xs text-text-muted mt-2">{subtitle}</p>}
    </div>
  );
};

export default StatCard;