

import React, { useState, useCallback, useContext, useMemo } from 'react';
import { PatientSample } from '../types';
import { DEVICE_LIMIT } from '../constants';
import Card from '../components/Card';
import PatientTable from '../components/PatientTable';
import { generateFinalList, generateXml } from '../services/rotorGeneService';
import { AppContext } from '../contexts/AppContext';

// --- Icons ---
const PositiveIcon = () => (
  <svg xmlns="http://www.w.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
);
const NegativeIcon = () => (
  <svg xmlns="http://www.w.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
);
const NtcIcon = () => (
  <svg xmlns="http://www.w.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>
);
const RemoveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const ClearIcon = () => <svg xmlns="http://www.w.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const SearchIcon = () => <svg className="w-5 h-5 text-text-muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;


interface ControlToggleButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  activeClasses: string;
}

const ControlToggleButton: React.FC<ControlToggleButtonProps> = ({ label, icon, isActive, onClick, activeClasses }) => {
  const baseClasses = "flex flex-col items-center justify-center w-full h-24 text-center p-2 border-2 rounded-lg cursor-pointer transition-all duration-200 transform hover:-translate-y-1 active:scale-95 active:translate-y-0";
  const inactiveClasses = "bg-surface text-text-secondary border-border hover:border-text-primary hover:shadow-lg";
  const activeStateClasses = `shadow-xl ${activeClasses}`;

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${isActive ? activeStateClasses : inactiveClasses}`}
    >
      <div className="mb-1.5">{icon}</div>
      <span className="font-semibold text-xs leading-tight">{label}</span>
    </button>
  );
};


const PatientsPage: React.FC = () => {
  const { samples, setSamples, showNotification, t } = useContext(AppContext);
  const [patientInput, setPatientInput] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewList, setPreviewList] = useState<string[]>([]);
  const [controls, setControls] = useState({
    positive: true,
    negative: true,
    ntc: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const filteredSamples = useMemo(() => {
    if (!searchTerm) return samples;
    return samples.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [samples, searchTerm]);

  const addSample = useCallback((name: string) => {
    if (samples.length >= DEVICE_LIMIT) {
      showNotification(t('patients.notifications.limitReached'), 'error');
      return;
    }
    if (name) {
      const newSample: PatientSample = { id: `${Date.now()}-${name}`, name };
      setSamples(prev => [...prev, newSample]);
    }
  }, [samples.length, setSamples, showNotification, t]);

  const handleAddPatient = () => {
    const trimmedName = patientInput.trim();
    if (trimmedName) {
      addSample(trimmedName);
      setPatientInput('');
    } else {
      showNotification(t('patients.notifications.emptyId'), 'error');
    }
  };
  
  const removeSelectedSamples = () => {
    setSamples(prev => prev.filter(sample => !selectedRows.has(sample.id)));
    setSelectedRows(new Set());
  };

  const clearAllSamples = () => {
    setSamples([]);
    setSelectedRows(new Set());
  };

  const handleGenerateFile = () => {
    try {
      const patientSamples = samples.map(s => s.name);
      const finalSampleNames = generateFinalList(patientSamples, controls);
      
      if (finalSampleNames.length > DEVICE_LIMIT) {
        showNotification(t('patients.notifications.runLimitExceeded', { count: finalSampleNames.length, limit: DEVICE_LIMIT }), 'error');
        return;
      }
      
      if (finalSampleNames.length === 0) {
         showNotification(t('patients.notifications.emptyRun'), 'error');
        return;
      }

      setPreviewList(finalSampleNames);
      setIsPreviewOpen(true);

    } catch (error: any) {
      console.error("Failed to generate Rotor-Gene file list:", error);
      showNotification(error.message || t('patients.notifications.generateFail'), 'error');
    }
  };

  const confirmAndDownload = () => {
    try {
      const xmlContent = generateXml(previewList);
      const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(0, -4);
      a.href = url;
      a.download = `RotorGene_Run_${timestamp}.smp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification(t('patients.notifications.generateSuccess'), 'success');
    } catch (error: any) {
       console.error("Failed to download Rotor-Gene file:", error);
       showNotification(error.message || t('patients.notifications.generateFail'), 'error');
    } finally {
      setIsPreviewOpen(false);
    }
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    e.preventDefault();
    if (draggedItemId !== id) {
        setDragOverItemId(id);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    if (!draggedItemId || !dragOverItemId || draggedItemId === dragOverItemId) {
        setDraggedItemId(null);
        setDragOverItemId(null);
        return;
    }
    
    const dragIndex = samples.findIndex(s => s.id === draggedItemId);
    const dropIndex = samples.findIndex(s => s.id === dragOverItemId);

    if (dragIndex === -1 || dropIndex === -1) {
        setDraggedItemId(null);
        setDragOverItemId(null);
        return;
    };

    const newSamples = [...samples];
    const [draggedItem] = newSamples.splice(dragIndex, 1);
    newSamples.splice(dropIndex, 0, draggedItem);
    
    setSamples(newSamples);
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  const PreviewModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4 flex flex-col max-h-[90vh]">
        <h2 className="text-xl font-bold text-text-primary mb-4">{t('patients.modal.title')}</h2>
        <p className="text-sm text-text-secondary mb-4">{t('patients.modal.message', {count: previewList.length})}</p>
        <div className="flex-grow overflow-y-auto border border-border rounded-md bg-surface-alt p-2 text-sm font-mono">
          <ol className="list-decimal list-inside">
            {previewList.map((name, index) => <li key={index} className="whitespace-pre truncate">{index + 1}: {name}</li>)}
          </ol>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
            <button type="button" onClick={() => setIsPreviewOpen(false)} className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">{t('common.cancel')}</button>
            <button type="button" onClick={confirmAndDownload} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">{t('patients.modal.downloadButton')}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {isPreviewOpen && <PreviewModal />}
      <h1 className="text-3xl font-extrabold text-text-primary">{t('patients.title')}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title={t('patients.configureRunCard.title')} className="lg:col-span-1">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">{t('patients.configureRunCard.platformLabel')}</label>
              <p className="px-4 py-3 bg-surface-alt rounded-lg font-bold">Rotor-Gene</p>
            </div>
            <div>
              <label htmlFor="patientId" className="block text-sm font-semibold text-text-primary mb-2">{t('patients.configureRunCard.patientIdLabel')}</label>
              <div className="flex space-x-2">
                <input
                  id="patientId"
                  type="text"
                  value={patientInput}
                  onChange={(e) => setPatientInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPatient()}
                  placeholder={t('patients.configureRunCard.patientIdPlaceholder')}
                />
                <button onClick={handleAddPatient} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">{t('common.add')}</button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">{t('patients.configureRunCard.controlsLabel')}</label>
              <div className="grid grid-cols-3 gap-3">
                <ControlToggleButton
                  label={t('patients.configureRunCard.positiveControl')}
                  icon={<PositiveIcon />}
                  isActive={controls.positive}
                  onClick={() => setControls(prev => ({ ...prev, positive: !prev.positive }))}
                  activeClasses="border-success/50 text-success bg-success/10 shadow-success/20 dark:bg-success/20 dark:shadow-success/25"
                />
                <ControlToggleButton
                  label={t('patients.configureRunCard.negativeControl')}
                  icon={<NegativeIcon />}
                  isActive={controls.negative}
                  onClick={() => setControls(prev => ({ ...prev, negative: !prev.negative }))}
                  activeClasses="border-danger/50 text-danger bg-danger/10 shadow-danger/20 dark:bg-danger/20 dark:shadow-danger/25"
                />
                <ControlToggleButton
                  label={t('patients.configureRunCard.ntcControl')}
                  icon={<NtcIcon />}
                  isActive={controls.ntc}
                  onClick={() => setControls(prev => ({ ...prev, ntc: !prev.ntc }))}
                  activeClasses="border-sky-500/50 text-sky-600 dark:text-sky-400 bg-sky-500/10 shadow-sky-500/20 dark:bg-sky-500/20 dark:shadow-sky-500/25"
                />
              </div>
            </div>
            
            <div className="pt-4 space-y-3">
              <button onClick={handleGenerateFile} className="w-full px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                 {t('patients.configureRunCard.generateButton')}
              </button>
            </div>
          </div>
        </Card>
        <Card title={t('patients.patientSamplesCard.title')} className="lg:col-span-2">
           <div className="flex flex-col h-full">
            <div className="relative mb-4">
                <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                    <SearchIcon />
                </span>
                <input
                  type="text"
                  aria-label={t('patients.patientSamplesCard.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-2 pe-3 ps-10"
                />
            </div>
            <PatientTable
              samples={filteredSamples}
              totalSampleCount={samples.length}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              draggedItemId={draggedItemId}
              dragOverItemId={dragOverItemId}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
            <div className="flex justify-end items-center gap-2 mt-4 pt-4 border-t border-border-light">
              <button onClick={removeSelectedSamples} disabled={selectedRows.size === 0} className="flex items-center gap-2 px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                <RemoveIcon />
                <span>{t('patients.patientSamplesCard.removeSelected')}</span>
              </button>
              <button onClick={clearAllSamples} disabled={samples.length === 0} className="flex items-center gap-2 px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                <ClearIcon />
                <span>{t('patients.patientSamplesCard.clearAll')}</span>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default React.memo(PatientsPage);