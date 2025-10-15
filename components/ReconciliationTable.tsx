
import React, { useContext } from 'react';
import { ReconciledData, ReconciliationStatus } from '../types';
import { AppContext } from '../contexts/AppContext';

const ReconciliationTable: React.FC<{
  data: ReconciledData[];
  selectedRows: Set<string>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
}> = ({ data, selectedRows, setSelectedRows }) => {
  const { t } = useContext(AppContext);

  const statusBadgeClasses: { [key in ReconciliationStatus]: string } = {
    [ReconciliationStatus.Matched]: 'bg-success/20 text-green-800 dark:text-green-300 dark:bg-success/25 border border-success/50',
    [ReconciliationStatus.Unmatched]: 'bg-warning/20 text-yellow-800 dark:text-yellow-300 dark:bg-warning/25 border border-warning/50',
    [ReconciliationStatus.Control]: 'bg-sky-100 text-sky-800 dark:text-sky-300 dark:bg-primary/25 border border-sky-200 dark:border-primary/50',
  };

  const getStatusText = (status: ReconciliationStatus) => {
    switch (status) {
      case ReconciliationStatus.Matched:
        return t('analysis.statuses.matched');
      case ReconciliationStatus.Unmatched:
        return t('analysis.statuses.unmatched');
      case ReconciliationStatus.Control:
        return t('analysis.statuses.control');
      default:
        return status;
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(new Set(data.map(item => item.id)));
    } else {
      setSelectedRows(new Set());
    }
  };
  
  const isAllSelected = selectedRows.size === data.length && data.length > 0;

  return (
    <div className="flex-grow overflow-auto border border-border rounded-lg">
      <table className="w-full text-sm text-start text-text-secondary">
        <thead className="text-xs text-text-primary uppercase bg-surface-alt">
          <tr>
            <th scope="col" className="p-4 w-12">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
              />
            </th>
            <th scope="col" className="p-4">{t('analysis.table.sampleName')}</th>
            <th scope="col" className="p-4">{t('analysis.table.status')}</th>
            <th scope="col" className="p-4">{t('analysis.table.matchedPatient')}</th>
            <th scope="col" className="p-4">{t('analysis.table.highRisk')}</th>
            <th scope="col" className="p-4">{t('analysis.table.lowRisk')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const isSelected = selectedRows.has(item.id);
            return (
              <tr
                key={item.id}
                className={`border-b border-border-light transition-colors ${isSelected ? 'bg-primary-light' : 'bg-surface hover:bg-surface-alt'}`}
              >
                <td className="p-4 w-12">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRowSelection(item.id)}
                  />
                </td>
                <td className="p-4 font-semibold text-text-primary">{item.name}</td>
                <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadgeClasses[item.status]}`}>
                        {getStatusText(item.status)}
                    </span>
                </td>
                <td className="p-4 italic text-text-muted">{item.matchedPatientName || t('common.na')}</td>
                <td className={`p-4 font-medium ${item.highRiskStatus === 'Detected' ? 'text-danger' : ''}`}>
                    {item.highRiskTypes || item.highRiskStatus}
                </td>
                <td className={`p-4 font-medium ${item.lowRiskStatus === 'Detected' ? 'text-warning' : ''}`}>
                    {item.lowRiskTypes || item.lowRiskStatus}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ReconciliationTable;