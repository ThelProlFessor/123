

import React, { useState, useContext } from 'react';
import { Page } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';
import { AppProvider, AppContext } from './contexts/AppContext';
import Notification from './components/Notification';
import WorksheetPage from './pages/WorksheetPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import LowRunsModal from './components/LowRunsModal';

const AccordionItem: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; onClick: () => void; }> = ({ title, children, isOpen, onClick }) => {
  return (
    <div className="border-b border-border">
      <button onClick={onClick} className="w-full flex justify-between items-center text-start p-4 font-semibold text-text-primary hover:bg-surface-alt transition-colors duration-200">
        <span>{title}</span>
        <svg className={`w-5 h-5 transition-transform text-text-muted ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {isOpen && (
        <div className="p-4 pt-0 text-text-secondary text-sm space-y-2">
            {children}
        </div>
      )}
    </div>
  );
};

const HelpModal: React.FC = () => {
    const { isHelpModalOpen, setIsHelpModalOpen, t } = useContext(AppContext);
    const [openSection, setOpenSection] = useState<string | null>('dashboard');

    if (!isHelpModalOpen) return null;

    const sections = ['dashboard', 'patients', 'analysis', 'worksheet', 'history', 'settings'];
    
    const renderContent = (contentKey: string) => {
        return t(contentKey).split('\n').map((paragraph: string, index: number) => (
            <p key={index} className="mb-2 last:mb-0 leading-relaxed">{paragraph}</p>
        ));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={() => setIsHelpModalOpen(false)}>
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-3xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
                    <h2 className="text-xl font-bold text-text-primary">{t('helpModal.title')}</h2>
                    <button onClick={() => setIsHelpModalOpen(false)} className="text-text-muted hover:text-text-primary text-3xl leading-none transition-colors">&times;</button>
                </div>
                
                <div className="p-6 bg-surface-alt border-b border-border">
                    <h3 className="text-lg font-semibold text-text-primary mb-4 text-center">{t('helpModal.workflow.title')}</h3>
                    <div className="w-full max-w-2xl mx-auto">
                        <svg viewBox="0 0 420 90" className="w-full h-auto">
                          <style>
                            {`
                              .box { fill: rgb(var(--color-surface)); stroke: rgb(var(--color-border)); rx: 8; }
                              .text-main, .text-sub { font-family: inherit; }
                              .text-main { font-size: 10px; font-weight: bold; fill: rgb(var(--color-text-primary)); }
                              .text-sub { font-size: 8px; fill: rgb(var(--color-text-secondary)); }
                              .arrow-head { fill: rgb(var(--color-text-muted)); }
                              .arrow-line { stroke: rgb(var(--color-text-muted)); stroke-width: 1.5; }
                            `}
                          </style>
                          <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-head" />
                            </marker>
                          </defs>

                          {/* Step 1: Patients */}
                          <g transform="translate(10, 20)">
                            <rect className="box" width="120" height="50" />
                            <text x="60" y="22" textAnchor="middle" className="text-main">{t('helpModal.workflow.step1_title')}</text>
                            <text x="60" y="38" textAnchor="middle" className="text-sub">{t('helpModal.workflow.step1_page')}</text>
                          </g>
                          <line className="arrow-line" x1="135" y1="45" x2="155" y2="45" markerEnd="url(#arrow)" />

                          {/* Step 2: Analysis */}
                          <g transform="translate(160, 20)">
                            <rect className="box" width="120" height="50" />
                            <text x="60" y="22" textAnchor="middle" className="text-main">{t('helpModal.workflow.step2_title')}</text>
                            <text x="60" y="38" textAnchor="middle" className="text-sub">{t('helpModal.workflow.step2_page')}</text>
                          </g>
                          <line className="arrow-line" x1="285" y1="45" x2="305" y2="45" markerEnd="url(#arrow)" />

                          {/* Step 3: Save/View */}
                           <g transform="translate(310, 20)">
                            <rect className="box" width="100" height="50" />
                            <text x="50" y="22" textAnchor="middle" className="text-main">{t('helpModal.workflow.step3_title')}</text>
                            <text x="50" y="38" textAnchor="middle" className="text-sub">{t('helpModal.workflow.step3_pages')}</text>
                          </g>
                        </svg>
                    </div>
                </div>

                <div className="overflow-y-auto flex-grow">
                    {sections.map(section => (
                        <AccordionItem
                            key={section}
                            title={t(`helpModal.${section}.title`)}
                            isOpen={openSection === section}
                            onClick={() => setOpenSection(openSection === section ? null : section)}
                        >
                            {renderContent(`helpModal.${section}.content`)}
                        </AccordionItem>
                    ))}
                </div>
            </div>
        </div>
    );
};

const pageMap: { [key in Page]: React.ReactNode } = {
  [Page.Dashboard]: <DashboardPage />,
  [Page.Patients]: <PatientsPage />,
  [Page.Analysis]: <AnalysisPage />,
  [Page.Worksheet]: <WorksheetPage />,
  [Page.History]: <HistoryPage />,
  [Page.Settings]: <SettingsPage />,
};

const PageContent: React.FC<{ currentPage: Page }> = ({ currentPage }) => {
  return (
    <>
      {(Object.keys(pageMap) as Page[]).map((page) => (
        <div
          key={page}
          style={{ display: page === currentPage ? 'block' : 'none' }}
          className={page === currentPage ? 'animate-pageTransition' : ''}
        >
          {pageMap[page]}
        </div>
      ))}
    </>
  );
};

const AppContent: React.FC = () => {
  const { language, logoutUser } = useContext(AppContext);
  const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);

  return (
    <div className={`flex h-screen ${language === 'fa' ? 'font-vazir' : 'font-sans'}`}>
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={logoutUser} />
      <main className="flex-1 overflow-y-auto relative isolate">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background main-background-gradient" />
        <Header />
        <div className="pt-28 pb-10 px-8">
          <PageContent currentPage={currentPage} />
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppWithContext />
    </AppProvider>
  );
};

const AppWithContext: React.FC = () => {
  const { isAuthenticated, dbStatus, t, language, isTranslationsLoading } = useContext(AppContext);
  const fontClass = language === 'fa' ? 'font-vazir' : 'font-sans';

  if (isTranslationsLoading || (dbStatus !== 'loaded' && dbStatus !== 'error')) {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center bg-background text-text-primary ${fontClass}`}>
        <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-semibold">{isTranslationsLoading ? 'Loading languages...' : 'Initializing database...'}</p>
      </div>
    );
  }

  if (dbStatus === 'error') {
     return (
        <div className={`h-screen w-screen flex flex-col items-center justify-center bg-background text-text-primary text-center p-4 ${fontClass}`}>
            <h1 className="text-2xl font-bold text-danger mb-4">Application Error</h1>
            <p>{t('notifications.dbEngineFailed')}</p>
            <p className="mt-2 text-sm text-text-muted">Please try refreshing the page. If the problem persists, contact support.</p>
        </div>
     );
  }
  
  // Conditionally render based on authentication
  const MainComponent = isAuthenticated ? AppContent : LoginPage;

  return (
    <div className={fontClass}>
      <MainComponent />
      <Notification />
      <HelpModal />
      <LowRunsModal />
    </div>
  );
};

export default App;
