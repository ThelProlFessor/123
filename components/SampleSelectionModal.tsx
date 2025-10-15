
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';

interface SampleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: string[];
  limit: number;
  onConfirm: (selectedSamples: string[]) => void;
}

const SampleSelectionModal: React.FC<SampleSelectionModalProps> = ({ isOpen, onClose, samples, limit, onConfirm }) => {
  const { t } = useContext(AppContext);
  const [selectedSamples, setSelectedSamples] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const preSelected = new Set(samples.slice(0, limit));
      setSelectedSamples(preSelected);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, samples, limit]);

  const handleToggleSample = (sampleName: string) => {
    setSelectedSamples(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sampleName)) {
        newSet.delete(sampleName);
      } else {
        if (newSet.size < limit) {
          newSet.add(sampleName);
        }
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedSamples));
    handleClose();
  };

  const handleClose = () => {
      setIsVisible(false);
      setTimeout(() => {
          onClose();
          setSelectedSamples(new Set());
      }, 300);
  };
  
  if (!isOpen) return null;

  const isLimitReached = selectedSamples.size >= limit;

  return (
    <div 
        className={`fixed inset-0 bg-black z-50 flex justify-center items-center transition-opacity duration-300 ease-out ${isVisible ? 'bg-opacity-60' : 'bg-opacity-0'}`} 
        onClick={handleClose}
    >
        <div 
            className={`bg-surface rounded-lg shadow-xl w-full max-w-lg m-4 flex flex-col max-h-[90vh] transition-all duration-300 ease-out ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`} 
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
                <h2 className="text-xl font-bold text-text-primary">{t('sampleSelectionModal.title')}</h2>
                <button onClick={handleClose} className="text-text-muted hover:text-text-primary text-3xl leading-none transition-colors">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
                <p className="text-text-secondary">
                    {t('sampleSelectionModal.message', { total: samples.length, remaining: limit })}
                </p>
                <div className="p-3 bg-surface-alt rounded-lg border border-border text-center font-semibold">
                    {t('sampleSelectionModal.selectedCount', { selected: selectedSamples.size, limit: limit })}
                </div>
                <div className="max-h-60 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                    {samples.map(sample => {
                        const isChecked = selectedSamples.has(sample);
                        const isDisabled = !isChecked && isLimitReached;
                        return (
                            <label key={sample} className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${isChecked ? 'bg-primary-light' : 'hover:bg-surface-alt'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={() => handleToggleSample(sample)}
                                    className="me-3"
                                />
                                <span className="font-medium text-text-primary">{sample}</span>
                            </label>
                        )
                    })}
                </div>
            </div>

            <div className="p-4 bg-surface-alt border-t border-border flex justify-end items-center gap-x-4">
                <button onClick={handleClose} className="px-4 py-2 bg-surface text-text-secondary font-semibold rounded-lg hover:bg-border transition-all duration-200">{t('common.cancel')}</button>
                <button onClick={handleConfirm} disabled={selectedSamples.size === 0} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all duration-200 disabled:opacity-50">
                    {t('sampleSelectionModal.confirmButton', { count: selectedSamples.size })}
                </button>
            </div>
        </div>
    </div>
  );
};
export default SampleSelectionModal;
