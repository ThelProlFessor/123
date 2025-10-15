
import React from 'react';
import { QcResult } from '../types';

type QcStatus = 'waiting' | 'checking' | 'passed' | 'failed';

interface QcStatusDisplayProps {
  status: QcStatus;
  result: QcResult | null;
  t: (key: string, options?: any) => string;
}

// Icons for different states
const WaitingIcon = () => (
    <svg className="w-12 h-12 text-text-muted" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m10 8 4 4-4 4"/></svg>
);

const CheckingIcon = () => (
    <svg className="w-12 h-12 text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PassedIcon = () => (
    <svg className="w-12 h-12 text-success" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const FailedIcon = () => (
    <svg className="w-12 h-12 text-danger" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);


const QcStatusDisplay: React.FC<QcStatusDisplayProps> = ({ status, result, t }) => {

    const renderContent = () => {
        switch (status) {
            case 'waiting':
                return (
                    <>
                        <WaitingIcon />
                        <p className="mt-4 text-center text-text-muted text-sm">{t('analysis.qcCheck.waiting')}</p>
                    </>
                );
            case 'checking':
                 return (
                    <>
                        <CheckingIcon />
                        <p className="mt-4 text-center text-primary font-semibold">{t('analysis.qcCheck.checking')}</p>
                    </>
                );
            case 'passed':
                return (
                     <>
                        <PassedIcon />
                        <h3 className="mt-4 text-lg font-bold text-success">{t('analysis.qcCheck.passed')}</h3>
                        <p className="text-center text-text-secondary text-sm">{t('analysis.qcCheck.passedMessage')}</p>
                    </>
                );
            case 'failed':
                 if (!result || result.status !== 'Failed') return null;
                return (
                    <>
                        <FailedIcon />
                        <h3 className="mt-4 text-lg font-bold text-danger">{t('analysis.qcCheck.failed')}</h3>
                        <div className="w-full mt-3 text-start">
                             <p className="text-xs font-semibold text-text-secondary mb-2">{t('analysis.qcCheck.issuesFound', { count: result.issues.length })}</p>
                            <ul className="list-disc ps-5 text-xs space-y-1 text-danger max-h-48 overflow-y-auto bg-surface p-2 rounded-md border border-border-light">
                                {result.issues.map((issue, index) => (
                                    <li key={index}>{issue.message}</li>
                                ))}
                            </ul>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-4 bg-surface-alt rounded-lg min-h-[160px] flex flex-col justify-center items-center text-center transition-all duration-300">
            {renderContent()}
        </div>
    );
};

export default QcStatusDisplay;
