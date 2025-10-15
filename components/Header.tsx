import React, { useContext } from 'react';
import { useDateTime } from '../hooks/useDateTime';
import { AppContext } from '../contexts/AppContext';
import LicenseGauge from './LicenseGauge';


const Header: React.FC = () => {
  const { theme, logoUrlLight, logoUrlDark, currentUser, t, showLowRunsWarningIcon, isLowRunsModalOpen, setIsLowRunsModalOpen, logoSize } = useContext(AppContext);
  const formattedDateTime = useDateTime();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('header.greeting.morning');
    if (hour < 18) return t('header.greeting.afternoon');
    return t('header.greeting.evening');
  };

  const currentLogoUrl = theme === 'light' ? logoUrlLight : logoUrlDark;

  return (
    <header className="absolute top-0 start-0 end-0 flex items-center h-20 px-8 bg-surface/75 dark:bg-surface/75 backdrop-blur-lg border-b border-border z-40">
      <div className="flex-1 flex items-center gap-x-6">
        <div>
          <h1 className="text-lg font-bold text-text-primary">{getGreeting()}, {currentUser?.username || t('header.user')}</h1>
          <p className="text-sm text-text-secondary">{formattedDateTime}</p>
        </div>
        <LicenseGauge />
        {showLowRunsWarningIcon && !isLowRunsModalOpen && (
            <button
              onClick={() => setIsLowRunsModalOpen(true)}
              className="relative text-warning animate-pulse"
              title={t('header.lowRunsWarningTooltip')}
              aria-label={t('header.lowRunsWarningTooltip')}
            >
              <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
            </button>
        )}
      </div>

      <div className="flex-1 flex justify-end items-center space-x-6">
        {currentLogoUrl ? (
          <img src={currentLogoUrl} alt="Custom Logo" className="w-auto max-w-[220px] object-contain" style={{ height: `${logoSize}px` }} />
        ) : (
          <div className="text-2xl font-extrabold text-primary bg-primary-light px-4 py-2 rounded-lg">
            AP-RAD
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;