

import React, { useContext } from 'react';
import { Page } from '../types';
import { ICONS } from '../constants';
import { AppContext } from '../contexts/AppContext';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  onLogout: () => void;
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, onClick }) => {
  const baseClasses = "flex items-center w-full px-4 py-3 text-start font-semibold rounded-lg transition-all duration-200 transform";
  const activeClasses = "bg-primary text-white shadow-lg shadow-primary/30";
  const inactiveClasses = "text-text-secondary hover:bg-surface hover:text-text-primary hover:-translate-y-0.5 active:scale-95";

  return (
    <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      <span className="ms-0 me-3 h-5 w-5">{icon}</span>
      {label}
    </button>
  );
};

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

const HelpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
);


const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, onLogout }) => {
  const { theme, toggleTheme, t, setIsHelpModalOpen } = useContext(AppContext);

  const navItems = [
    { page: Page.Dashboard, label: t('sidebar.dashboard'), icon: ICONS.dashboard },
    { page: Page.Patients, label: t('sidebar.patients'), icon: ICONS.users },
    { page: Page.Analysis, label: t('sidebar.analysis'), icon: ICONS.chart },
    { page: Page.Worksheet, label: t('sidebar.worksheet'), icon: ICONS.worksheet },
    { page: Page.History, label: t('sidebar.history'), icon: ICONS.history },
    { page: Page.Settings, label: t('sidebar.settings'), icon: ICONS.settings },
  ];

  return (
    <aside className="w-64 bg-background/75 backdrop-blur-lg border-s-0 border-e border-border flex flex-col p-6 flex-shrink-0">
      <div className="mb-10">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest">{t('sidebar.tools')}</h2>
      </div>
      <nav className="flex flex-col space-y-2 bg-surface-alt p-2 rounded-xl border border-border">
        {navItems.map((item) => (
          <NavButton
            key={item.page}
            label={item.label}
            icon={item.icon}
            isActive={currentPage === item.page}
            onClick={() => setCurrentPage(item.page)}
          />
        ))}
      </nav>
      <div className="flex-grow"></div>
       <button 
        onClick={() => setIsHelpModalOpen(true)} 
        className="flex items-center w-full px-4 py-3 text-start font-semibold rounded-lg transition-all duration-200 text-text-secondary hover:bg-surface-alt hover:text-text-primary transform hover:-translate-y-0.5 active:scale-95"
      >
        <span className="ms-0 me-3 h-5 w-5"><HelpIcon /></span>
        <span>{t('sidebar.help')}</span>
      </button>
       <button 
        onClick={toggleTheme} 
        className="flex items-center w-full mt-2 px-4 py-3 text-start font-semibold rounded-lg transition-all duration-200 text-text-secondary hover:bg-surface-alt hover:text-text-primary transform hover:-translate-y-0.5 active:scale-95"
      >
        <span className="ms-0 me-3 h-5 w-5">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</span>
        <span>{theme === 'light' ? t('sidebar.darkMode') : t('sidebar.lightMode')}</span>
      </button>
      <button 
        onClick={onLogout} 
        className="flex items-center w-full mt-2 px-4 py-3 text-start font-semibold rounded-lg transition-all duration-200 text-text-secondary hover:bg-surface-alt hover:text-text-primary transform hover:-translate-y-0.5 active:scale-95"
      >
        <span className="ms-0 me-3 h-5 w-5"><LogoutIcon /></span>
        <span>{t('sidebar.logout')}</span>
      </button>
    </aside>
  );
};

export default Sidebar;