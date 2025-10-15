
import React, { useState, useMemo, useContext } from 'react';
import Card from '../components/Card';
import { HistoryRecord } from '../types';
import { AppContext } from '../contexts/AppContext';

const ITEMS_PER_PAGE = 10;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
  let specificClasses = '';
  if (status === 'Detected') {
    specificClasses = 'bg-danger/20 text-red-800 dark:text-red-300 border border-danger/50';
  } else {
    specificClasses = 'bg-success/20 text-green-800 dark:text-green-300 border border-success/50';
  }
  return <span className={`${baseClasses} ${specificClasses}`}>{status}</span>;
};

const HistoryPage: React.FC = () => {
  const { history, isHistoryLoading, t, language, analyzedPatients } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

  const filteredHistory = useMemo(() => {
    return history.filter(record =>
      record.PatientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.NationalID.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [history, searchTerm]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE)), [filteredHistory]);

  const paginatedHistory = useMemo(() => {
    if (currentPage > totalPages) {
        setCurrentPage(totalPages);
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredHistory, currentPage, totalPages]);

  const DetailModal: React.FC<{ record: HistoryRecord; onClose: () => void }> = ({ record, onClose }) => {
    const detailedPatientInfo = useMemo(() => {
        return analyzedPatients.find(p => p.id === record.AdmissionID);
    }, [analyzedPatients, record.AdmissionID]);

    const allGenotypes = useMemo(() => {
        if (!detailedPatientInfo) return [];
        const hr = detailedPatientInfo.highRiskGenotypes.map(g => ({ ...g, risk: 'High' }));
        const lr = detailedPatientInfo.lowRiskGenotypes.map(g => ({ ...g, risk: 'Low' }));
        // Sort by risk type and then genotype number
        return [...hr, ...lr].sort((a, b) => {
            if (a.risk === 'High' && b.risk === 'Low') return -1;
            if (a.risk === 'Low' && b.risk === 'High') return 1;
            // Handle non-numeric genotypes like 'IC'
            const aNum = parseInt(a.genotype, 10);
            const bNum = parseInt(b.genotype, 10);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }
            return a.genotype.localeCompare(b.genotype);
        });
    }, [detailedPatientInfo]);


    return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-2xl m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-text-primary">{t('history.modal.title')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-3xl leading-none transition-colors">&times;</button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between p-2 bg-surface-alt rounded">
            <span className="font-semibold text-text-secondary">{t('history.modal.patientName')}:</span>
            <span className="text-text-primary">{record.PatientName}</span>
          </div>
          <div className="flex justify-between p-2 bg-surface-alt rounded">
            <span className="font-semibold text-text-secondary">{t('history.modal.patientId')}:</span>
            <span className="text-text-primary">{record.NationalID}</span>
          </div>
          <div className="flex justify-between p-2 bg-surface-alt rounded">
            <span className="font-semibold text-text-secondary">{t('history.modal.date')}:</span>
            <span className="text-text-primary">{new Date(record.DateOfRecord).toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US')}</span>
          </div>
          <div className="border-t border-border my-2"></div>
          <div className="flex justify-between p-2">
            <span className="font-semibold text-text-secondary">{t('history.modal.overallStatus')}:</span>
            <StatusBadge status={record.HPVDetectionStatus} />
          </div>
           <div className="flex justify-between p-2">
            <span className="font-semibold text-text-secondary">{t('history.modal.hrStatus')}:</span>
            <StatusBadge status={record.HPVHighRiskStatus} />
          </div>
           <div className="flex justify-between p-2">
            <span className="font-semibold text-text-secondary">{t('history.modal.lrStatus')}:</span>
            <StatusBadge status={record.HPVLowRiskStatus} />
          </div>
          
           {allGenotypes.length > 0 && (
            <div className="pt-3 mt-3 border-t border-border">
                <h3 className="font-bold text-text-primary mb-2">{t('history.modal.detailedGenotypes')}</h3>
                <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs text-start border border-border rounded-md table-fixed">
                        <thead className="bg-surface-alt sticky top-0 z-10">
                            <tr>
                                <th className="p-2 w-1/3 font-semibold text-start border-b border-border">{t('history.modal.genotype')}</th>
                                <th className="p-2 w-1/3 font-semibold text-start border-b border-border">{t('history.modal.ctValue')}</th>
                                <th className="p-2 w-1/3 font-semibold text-start border-b border-border">{t('history.modal.riskType')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allGenotypes.map(g => (
                                <tr key={g.genotype} className="border-b border-border-light last:border-b-0">
                                    <td className={`p-2 font-mono font-semibold ${g.risk === 'High' ? 'text-danger' : 'text-yellow-600 dark:text-yellow-400'}`}>{g.genotype}</td>
                                    <td className="p-2 font-mono">{g.ct}</td>
                                    <td className="p-2">
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                                            g.risk === 'High' 
                                            ? 'bg-danger/20 text-red-800 dark:text-red-300' 
                                            : 'bg-warning/20 text-yellow-800 dark:text-yellow-300'
                                        }`}>
                                            {g.risk === 'High' ? t('history.modal.highRisk') : t('history.modal.lowRisk')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}
        </div>
        <div className="text-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">{t('common.close')}</button>
        </div>
      </div>
    </div>
  )};

  return (
    <div className="space-y-8">
      {selectedRecord && <DetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
      <h1 className="text-3xl font-extrabold text-text-primary">{t('history.title')}</h1>
      <Card>
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            placeholder={t('history.searchPlaceholder')}
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full max-w-xs"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start text-text-secondary">
            <thead className="text-xs text-text-primary uppercase bg-surface-alt">
              <tr>
                <th scope="col" className="p-4 whitespace-nowrap">{t('history.table.patientName')}</th>
                <th scope="col" className="p-4 whitespace-nowrap">{t('history.table.date')}</th>
                <th scope="col" className="p-4 whitespace-nowrap">{t('history.table.hpvStatus')}</th>
                <th scope="col" className="p-4 whitespace-nowrap">{t('history.table.highRisk')}</th>
                <th scope="col" className="p-4 whitespace-nowrap">{t('history.table.lowRisk')}</th>
              </tr>
            </thead>
            <tbody>
              {isHistoryLoading ? (
                <tr>
                    <td colSpan={5} className="text-center p-8 text-text-muted">{t('history.loading')}</td>
                </tr>
              ) : paginatedHistory.length > 0 ? (
                paginatedHistory.map(record => (
                  <tr
                    key={record.AdmissionID + record.DateOfRecord}
                    onClick={() => setSelectedRecord(record)}
                    className="border-b border-border-light hover:bg-surface-alt cursor-pointer transition-colors duration-200"
                  >
                    <td className="p-4 font-semibold text-text-primary whitespace-nowrap">{record.PatientName}</td>
                    <td className="p-4 whitespace-nowrap">{new Date(record.DateOfRecord).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-CA')}</td>
                    <td className="p-4 whitespace-nowrap"><StatusBadge status={record.HPVDetectionStatus} /></td>
                    <td className="p-4 whitespace-nowrap"><StatusBadge status={record.HPVHighRiskStatus} /></td>
                    <td className="p-4 whitespace-nowrap"><StatusBadge status={record.HPVLowRiskStatus} /></td>
                  </tr>
                ))
               ) : (
                  <tr>
                      <td colSpan={5} className="text-center p-8 text-text-muted">
                          {searchTerm ? t('history.noResults') : t('history.noHistory')}
                      </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border-light">
            <span className="text-sm text-text-muted">
              {t('common.page')} {currentPage} {t('common.of')} {totalPages}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95"
              >
                {t('common.previous')}
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default HistoryPage;
