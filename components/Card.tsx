import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', titleClassName = '' }) => {
  return (
    <div className={`bg-surface border border-border rounded-xl shadow-lg shadow-slate-900/5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/10 hover:-translate-y-1 dark:shadow-none dark:hover:border-primary/50 ${className}`}>
      <div className="p-6">
        {title && (
          <h3 className={`text-lg font-bold text-text-primary mb-4 ${titleClassName}`}>
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
};

export default Card;