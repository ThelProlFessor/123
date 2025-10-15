

import React, { useContext } from 'react';
import { PatientSample } from '../types';
import { AppContext } from '../contexts/AppContext';

interface PatientTableProps {
  samples: PatientSample[];
  totalSampleCount: number;
  selectedRows: Set<string>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  draggedItemId: string | null;
  dragOverItemId: string | null;
  onDragStart: (e: React.DragEvent<HTMLTableRowElement>, id: string) => void;
  onDragEnter: (e: React.DragEvent<HTMLTableRowElement>, id: string) => void;
  onDragOver: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDrop: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragEnd: () => void;
}

const PatientTable: React.FC<PatientTableProps> = ({ 
  samples,
  totalSampleCount,
  selectedRows,
  setSelectedRows,
  draggedItemId,
  dragOverItemId,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd
}) => {
  const { t } = useContext(AppContext);

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

  return (
    <div className="flex-grow overflow-auto border border-border rounded-lg">
      <table className="w-full text-sm text-start text-text-secondary">
        <thead className="text-xs text-text-primary uppercase bg-surface-alt">
          <tr>
            <th scope="col" className="p-4 w-12"></th>
            <th scope="col" className="p-4 w-16">{t('patients.table.number')}</th>
            <th scope="col" className="p-4">{t('patients.table.patientId')}</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((sample, index) => {
            const isSelected = selectedRows.has(sample.id);
            const isDragged = draggedItemId === sample.id;
            const isDragOver = dragOverItemId === sample.id && !isDragged;
            
            const rowClasses = [
              'border-b', 'border-border-light', 'cursor-move',
              'transition-all', 'duration-200',
            ];
            
            if (isDragged) {
              rowClasses.push('opacity-60', 'bg-surface-alt', 'shadow-2xl', 'scale-105', 'relative', 'z-10');
            } else if (isSelected) {
              rowClasses.push('bg-primary-light');
            } else {
              rowClasses.push('bg-surface', 'hover:bg-surface-alt');
            }
            
            if (isDragOver) {
              rowClasses.push('border-t-2', 'border-primary');
            } else {
              rowClasses.push('border-t-2', 'border-transparent');
            }

            return (
              <tr
                key={sample.id}
                draggable
                onDragStart={(e) => onDragStart(e, sample.id)}
                onDragEnter={(e) => onDragEnter(e, sample.id)}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                className={rowClasses.join(' ')}
              >
                <td className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRowSelection(sample.id)}
                  />
                </td>
                <td className="p-4 w-16 text-center font-medium">{index + 1}</td>
                <td className="p-4 font-semibold">{sample.name}</td>
              </tr>
            );
          })}
           {samples.length === 0 && (
              <tr>
                  <td colSpan={3} className="text-center p-8 text-text-muted">
                      {totalSampleCount > 0 
                        ? t('patients.patientSamplesCard.noSearchResults')
                        : t('patients.patientSamplesCard.noSamples')
                      }
                  </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
};

export default PatientTable;
