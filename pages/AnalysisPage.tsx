
import React, { useState, useCallback, useContext, useRef } from 'react';
import Card from '../components/Card';
import { ReconciledData, ReconciliationStatus, HistoryRecord, AnalyzedPatient, QcResult, AnalysisSample } from '../types';
import { processRawCsv, aggregateResults, generateHtmlReport } from '../services/analysisService';
import { runQcChecks } from '../services/qualityControlService';
import { addHistoryRecords } from '../services/historyService';
import ReconciliationTable from '../components/ReconciliationTable';
import { AppContext } from '../contexts/AppContext';
import QcStatusDisplay from '../components/QcStatusDisplay';
import { ICONS } from '../constants';
import SampleSelectionModal from '../components/SampleSelectionModal';

type QcStatus = 'waiting' | 'checking' | 'passed' | 'failed';

const AnalysisPage: React.FC = () => {
  const { samples: configuredSamples, showNotification, addAnalyzedPatients, db, refreshHistory, t, remainingTests, consumeTestRuns } = useContext(AppContext);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [reconciliationData, setReconciliationData] = useState<ReconciledData[]>([]);
  const [selectedReportRows, setSelectedReportRows] = useState<Set<string>>(new Set());
  const [isQcEnabled, setIsQcEnabled] = useState(true);
  const [qcStatus, setQcStatus] = useState<QcStatus>('waiting');
  const [qcResult, setQcResult] = useState<QcResult | null>(null);
  const [isSampleSelectionModalOpen, setIsSampleSelectionModalOpen] = useState(false);
  const [sampleSelectionProps, setSampleSelectionProps] = useState<{ samples: string[]; analysisData: AnalysisSample[] }>({ samples: [], analysisData: [] });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.name.toLowerCase().endsWith('.csv') || selectedFile.name.toLowerCase().endsWith('.txt')) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        } else {
            showNotification(t('analysis.notifications.invalidFileType'), 'error');
        }
    }
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, over: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(over);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.toLowerCase().endsWith('.csv') || droppedFile.name.toLowerCase().endsWith('.txt'))) {
        setFile(droppedFile);
        setFileName(droppedFile.name);
    } else {
        showNotification(t('analysis.notifications.invalidFileType'), 'error');
    }
  };

  const handleClear = () => {
    setFile(null);
    setFileName('');
    setReconciliationData([]);
    setSelectedReportRows(new Set());
    setQcStatus('waiting');
    setQcResult(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const proceedWithAnalysis = useCallback(async (dataToAnalyze: AnalysisSample[]) => {
    setIsProcessing(true);
    setQcStatus('checking');

    try {
        const sampleCount = new Set(dataToAnalyze.map(s => s.Name.trim())).size;
        
        const runsConsumed = await consumeTestRuns(sampleCount);
        if (!runsConsumed) {
          setIsProcessing(false);
          setQcStatus('waiting');
          return;
        }

        if (isQcEnabled) {
          const qc = runQcChecks(dataToAnalyze, t);
          setQcResult(qc);
          setQcStatus(qc.status === 'Passed' ? 'passed' : 'failed');
          if (qc.status === 'Failed') {
              showNotification(t('analysis.notifications.qcFailed'), 'error');
          }
        } else {
          setQcStatus('waiting');
          setQcResult(null);
        }

        const aggregatedData = aggregateResults(dataToAnalyze);

        const reconciled = Object.entries(aggregatedData).map(([name, data], index) => {
          const matchedSample = configuredSamples.find(s => s.name === name);
          const status = name.startsWith('POS-') || name.includes('NEG Cont') || name === 'NTC'
            ? ReconciliationStatus.Control
            : matchedSample ? ReconciliationStatus.Matched : ReconciliationStatus.Unmatched;

          return {
            id: `${name}-${index}`,
            name,
            status,
            matchedPatientName: matchedSample?.name,
            ...data,
          };
        });
        setReconciliationData(reconciled);
        showNotification(t('analysis.notifications.processSuccess', { count: sampleCount }), 'success');

    } catch(error: any) {
        console.error("Analysis failed:", error);
        showNotification(error.message || t('analysis.notifications.processFail'), 'error');
        setQcStatus('failed');
        setQcResult({ status: 'Failed', issues: [{ type: 'error', message: error.message || 'An unknown error occurred.' }] });
    } finally {
        setIsProcessing(false);
    }
  }, [consumeTestRuns, isQcEnabled, configuredSamples, showNotification, t]);

  const handleProcessRequest = useCallback(async () => {
    if (!file) {
      showNotification(t('analysis.notifications.noFile'), 'error');
      return;
    }

    setIsProcessing(true);
    setReconciliationData([]);
    setSelectedReportRows(new Set());
    setQcStatus('waiting');
    setQcResult(null);

    try {
      const fileContent = await file.text();

      if (!fileContent.trim()) {
          showNotification(t('analysis.notifications.emptyFile'), 'error');
          setIsProcessing(false);
          return;
      }
      
      const analysisData = processRawCsv(fileContent, t);
      
      const uniqueSamples = Array.from(new Set(analysisData.map(sample => sample.Name.trim())));
      const sampleCount = uniqueSamples.length;

      if (sampleCount === 0) {
          showNotification(t('analysis.notifications.noSamplesInFile'), 'error');
          setIsProcessing(false);
          return;
      }
      
      if (sampleCount > remainingTests) {
          setSampleSelectionProps({ samples: uniqueSamples, analysisData });
          setIsSampleSelectionModalOpen(true);
          setIsProcessing(false);
          return;
      }

      await proceedWithAnalysis(analysisData);

    } catch (error: any) {
      console.error("Processing failed:", error);
      showNotification(error.message || t('analysis.notifications.processFail'), 'error');
      setIsProcessing(false);
    }
  }, [file, showNotification, t, remainingTests, proceedWithAnalysis]);

  const handleConfirmSampleSelection = (selectedSampleNames: string[]) => {
    const { analysisData } = sampleSelectionProps;
    const filteredData = analysisData.filter(row => selectedSampleNames.includes(row.Name.trim()));
    setIsSampleSelectionModalOpen(false);
    proceedWithAnalysis(filteredData);
  };


  const handleGenerateReport = () => {
    const selectedData = reconciliationData.filter(row => selectedReportRows.has(row.id));
    if (selectedData.length === 0) {
      showNotification(t('analysis.notifications.noRowsForReport'), 'error');
      return;
    }
    try {
      const htmlContent = generateHtmlReport(selectedData, t);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const reportWindow = window.open(url, '_blank');
      if (!reportWindow) {
          showNotification(t('analysis.notifications.popupBlocked'), 'error');
      }
      // URL is not revoked immediately to allow the new window to load
    } catch (error: any) {
      showNotification(t('analysis.notifications.reportFail'), 'error');
      console.error("Failed to generate report:", error);
    }
  };

  const handleSaveToHistory = async () => {
    if (!db) {
      showNotification(t('notifications.dbNotReady'), 'error');
      return;
    }

    const selectedData = reconciliationData.filter(row => selectedReportRows.has(row.id));
    if (selectedData.length === 0) {
      showNotification(t('analysis.notifications.noRowsForHistory'), 'error');
      return;
    }

    try {
      const newHistoryRecords: HistoryRecord[] = selectedData
        .filter(r => r.status !== ReconciliationStatus.Control)
        .map(r => ({
          NationalID: r.matchedPatientName || r.name,
          AdmissionID: r.id,
          PatientName: r.matchedPatientName || r.name,
          DateOfRecord: new Date().toISOString(),
          HPVDetectionStatus: r.hpvDetection,
          HPVHighRiskStatus: r.highRiskStatus,
          HPVHighRiskTypes: r.highRiskTypes,
          HPVLowRiskStatus: r.lowRiskStatus,
          HPVLowRiskTypes: r.lowRiskTypes,
          SourceOfRecord: fileName,
        }));

      const newAnalyzedPatients: AnalyzedPatient[] = selectedData
        .filter(r => r.status !== ReconciliationStatus.Control)
        .map(r => ({
          id: r.id,
          name: r.matchedPatientName || r.name,
          date: new Date().toISOString(),
          hpvDetection: r.hpvDetection,
          highRiskStatus: r.highRiskStatus,
          highRiskGenotypes: r.highRiskGenotypesDetailed,
          lowRiskStatus: r.lowRiskStatus,
          lowRiskGenotypes: r.lowRiskGenotypesDetailed,
        }));

      await addHistoryRecords(db, newHistoryRecords);
      await addAnalyzedPatients(newAnalyzedPatients);
      await refreshHistory(); // await to ensure history is fresh before notification
      showNotification(t('analysis.notifications.historySaveSuccess', { count: newHistoryRecords.length }), 'success');
    } catch (error: any) {
      showNotification(t('analysis.notifications.historySaveFail'), 'error');
      console.error("Failed to save to history:", error);
    }
  };
  
  return (
    <div className="space-y-8">
      <SampleSelectionModal
        isOpen={isSampleSelectionModalOpen}
        onClose={() => setIsSampleSelectionModalOpen(false)}
        samples={sampleSelectionProps.samples}
        limit={remainingTests}
        onConfirm={handleConfirmSampleSelection}
      />
      <h1 className="text-3xl font-extrabold text-text-primary">{t('analysis.title')}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <Card title={t('analysis.uploadCard.title')}>
            <div className="space-y-4">
              <div
                onDragOver={(e) => handleDragEvents(e, true)}
                onDragEnter={(e) => handleDragEvents(e, true)}
                onDragLeave={(e) => handleDragEvents(e, false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${isDragOver ? 'border-primary bg-primary-light scale-105' : 'border-border hover:border-text-secondary'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.txt" className="hidden" />
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isDragOver ? 'bg-primary/20' : 'bg-surface-alt'}`}>
                  <span className={`w-8 h-8 transition-transform transform ${isDragOver ? 'scale-110' : ''} text-text-secondary`}>
                    {ICONS.upload}
                  </span>
                </div>
                <p className="font-semibold text-text-secondary mt-4">{t('analysis.uploadCard.dragDrop')}</p>
                <p className="text-sm text-text-muted mt-1">{t('analysis.uploadCard.fileType')}</p>
                {fileName && <p className="font-semibold text-primary mt-2 break-all">{fileName}</p>}
              </div>
              <div className="flex justify-between items-center pt-2">
                <p className="text-sm font-semibold text-text-secondary">{t('analysis.remainingTests', { count: remainingTests })}</p>
                <div className="flex space-x-2">
                  <button onClick={handleClear} disabled={!file && reconciliationData.length === 0} className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">{t('common.clear')}</button>
                  <button onClick={handleProcessRequest} disabled={!file || isProcessing} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                    {isProcessing ? t('analysis.buttons.processing') : t('analysis.buttons.process')}
                  </button>
                </div>
              </div>
            </div>
          </Card>
          <Card title={t('analysis.qcCheck.title')}>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isQcEnabled}
                  onChange={() => setIsQcEnabled(!isQcEnabled)}
                  className="toggle-switch"
                />
                <span className="font-semibold text-text-primary">{t('analysis.qcCheck.enable')}</span>
              </label>
              {isQcEnabled && <QcStatusDisplay status={qcStatus} result={qcResult} t={t} />}
            </div>
          </Card>
        </div>
        <Card title={t('analysis.reconciliationCard.title')} className="lg:col-span-2">
          <div className="flex flex-col h-full min-h-[500px]">
            <p className="text-sm text-text-secondary mb-4">{t('analysis.reconciliationCard.description')}</p>
            <ReconciliationTable data={reconciliationData} selectedRows={selectedReportRows} setSelectedRows={setSelectedReportRows} />
            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-border-light">
              <button onClick={handleGenerateReport} disabled={selectedReportRows.size === 0} className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                {t('analysis.buttons.generateReport')}
              </button>
              <button onClick={handleSaveToHistory} disabled={selectedReportRows.size === 0} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                {t('analysis.buttons.saveToHistory')}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AnalysisPage;
