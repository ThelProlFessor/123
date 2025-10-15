
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { EditableWorksheetData } from '../types';
import { generateWorksheetReportHtml } from '../services/analysisService';

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    worksheet: EditableWorksheetData;
}

const EditableReportField: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; className?: string }> = ({ value, onChange, className }) => (
    <input
        type="text"
        value={value}
        onChange={onChange}
        className={`w-full bg-transparent p-0 m-0 border-none focus:ring-0 focus:outline-none focus:bg-primary/10 rounded-sm ${className}`}
    />
);

const EditableReportTextarea: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; className?: string, rows?: number }> = ({ value, onChange, className, rows=3 }) => (
    <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        className={`w-full bg-transparent p-0 m-0 border-none focus:ring-0 focus:outline-none focus:bg-primary/10 rounded-sm resize-none ${className}`}
    />
);

const GenotypeCircles: React.FC<{ worksheet: EditableWorksheetData, t: (key: string) => string }> = ({ worksheet, t }) => {
    if (worksheet.hpvDetection === 'Not Detected' || (worksheet.highRiskGenotypes.length === 0 && worksheet.lowRiskGenotypes.length === 0)) {
        return null;
    }
    return (
        <section className="genotype-circles">
            <h5>{t('worksheet.report.detectedGenotypesTitle')}</h5>
            {worksheet.highRiskGenotypes.length > 0 && (
                <>
                    <h5 style={{ marginTop: '10px', fontSize: '9pt' }}>{t('worksheet.report.highRiskTitle')}</h5>
                    <div className="circle-container">
                        {worksheet.highRiskGenotypes.map(g => <div key={g.genotype} className="genotype-circle hr-circle">{g.genotype}</div>)}
                    </div>
                </>
            )}
            {worksheet.lowRiskGenotypes.length > 0 && (
                 <>
                    <h5 style={{ marginTop: '10px', fontSize: '9pt' }}>{t('worksheet.report.lowRiskTitle')}</h5>
                    <div className="circle-container">
                        {worksheet.lowRiskGenotypes.map(g => <div key={g.genotype} className="genotype-circle lr-circle">{g.genotype}</div>)}
                    </div>
                </>
            )}
        </section>
    );
};


const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, worksheet }) => {
    const { t, language, theme, logoUrlLight, logoUrlDark, labInfo, showNotification } = useContext(AppContext);
    const [isVisible, setIsVisible] = useState(false);
    const [editableData, setEditableData] = useState<EditableWorksheetData>(worksheet);

    useEffect(() => {
        if (isOpen) {
            const collectedDate = new Date(worksheet.date).toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
            
            // Automatic interpretation logic
            const isType16Detected = worksheet.highRiskGenotypes.some(g => g.genotype === '16');
            const isType18Detected = worksheet.highRiskGenotypes.some(g => g.genotype === '18');
            const areOtherHighRiskTypesDetected = worksheet.highRiskStatus === 'Detected' && !isType16Detected && !isType18Detected;

            let interpretationKey;
            if (isType16Detected || isType18Detected) {
                interpretationKey = 'worksheet.report.interpretation.hr_16_18';
            } else if (areOtherHighRiskTypesDetected) {
                interpretationKey = 'worksheet.report.interpretation.hr_other';
            } else if (worksheet.lowRiskStatus === 'Detected') {
                interpretationKey = 'worksheet.report.interpretation.lr_only';
            } else {
                interpretationKey = 'worksheet.report.interpretation.negative';
            }

            const defaults = {
                reportBirthDate: '1980-10-10',
                reportGender: 'F',
                reportAge: '34',
                reportOrderNumber: worksheet.id.split('-')[0],
                reportPhysician: 'CLIENT, CLIENT',
                reportSpecimenSource: 'CERVIX',
                reportInterpretation: t(interpretationKey),
                reportAdditionalInfo: t('worksheet.report.interpretationText1'),
                reportStatus: 'Final',
                reportAccountInfo: 'C7028846 DLMP Rochester',
                reportMcr: 'MCR',
                reportNotes: '',
                reportReceivedDate: collectedDate,
                reportReportedDate: collectedDate,
                reportVerifiedBy: labInfo.director || 'Lab Director',
                reportVerifiedByTitle: t('worksheet.report.labDirector'),
            };
            
            const newEditableData = { ...worksheet };
            for (const key in defaults) {
                const k = key as keyof typeof defaults;
                if (newEditableData[k] === undefined || newEditableData[k] === null) {
                    newEditableData[k] = defaults[k];
                }
            }
            setEditableData(newEditableData);

            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        }
    }, [isOpen, worksheet, t, language, labInfo.director]);

    const handleFieldChange = (field: keyof EditableWorksheetData, value: string) => {
        setEditableData(prev => ({ ...prev, [field]: value }));
    };

    const handlePrint = () => {
        const currentLogo = theme === 'light' ? logoUrlLight : logoUrlDark;
        const distributorInfo = t('settings.labInfo.distributor', { returnObjects: true });
        const reportHtml = generateWorksheetReportHtml(editableData, t, currentLogo, language, labInfo, distributorInfo);
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(reportHtml);
            reportWindow.document.close();
        } else {
            showNotification(t('analysis.notifications.popupBlocked'), 'error');
        }
        handleClose();
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300);
    };

    if (!isOpen) return null;

    const currentLogo = theme === 'light' ? logoUrlLight : logoUrlDark;
    const distributorInfo = t('settings.labInfo.distributor', { returnObjects: true });


    return (
        <div 
            className={`fixed inset-0 bg-black z-50 flex justify-center items-center transition-opacity duration-300 ease-out ${isVisible ? 'bg-opacity-60' : 'bg-opacity-0'}`} 
            onClick={handleClose}
        >
            <div 
                className={`bg-surface rounded-lg shadow-xl w-full max-w-5xl m-4 flex flex-col max-h-[95vh] transition-all duration-300 ease-out ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
                    <h2 className="text-xl font-bold text-text-primary">{t('worksheet.previewTitle')}</h2>
                    <div>
                         <button onClick={handleClose} className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 me-2">{t('common.cancel')}</button>
                         <button onClick={handlePrint} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">{t('common.confirm')} & {t('worksheet.report.print')}</button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto bg-surface-alt">
                    <div className="bg-white shadow-lg mx-auto" style={{ width: '21cm', minHeight: '29.7cm' }}>
                       <div dangerouslySetInnerHTML={{__html: `<style>:root { --blue-color: #0D69AB; } body { font-family: ${language === 'fa' ? "'Vazirmatn', sans-serif" : "'Inter', sans-serif"}, Arial, sans-serif; font-size: 10pt; background-color: #fff; color: #000;} .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; } .header .logo img { max-height: 50px; } .header .logo-text { font-size: 14pt; font-weight: 800; } .header .header-info { text-align: right; color: var(--blue-color); } .header .header-info h2 { font-size: 18pt; font-weight: 800; margin: 0; } .header .header-info h3 { font-size: 11pt; font-weight: normal; margin: 4px 0; } .header .header-info p { font-size: 10pt; font-weight: bold; margin: 0; } .patient-info-container { border: 1px solid #000; margin-top: 1rem; } .patient-info-grid { display: grid; grid-template-columns: 1.5fr 2fr 1.5fr 1fr 0.8fr; width: 100%; border-collapse: collapse; } .patient-info-grid > div { padding: 3px 6px; font-size: 9pt; border-right: 1px solid #ccc; border-top: 1px solid #ccc; } .patient-info-grid > div:last-child { border-right: none; } .patient-info-grid .label { font-weight: 400; font-size: 8pt; } .patient-info-grid .value { font-weight: 700; } .patient-info-grid .span-2 { grid-column: span 2; } .section-title { color: var(--blue-color); font-weight: bold; font-size: 11pt; border-bottom: 2px solid var(--blue-color); padding-bottom: 2px; margin: 1.5rem 0 0.5rem 0; } .specimen-info { margin-top: 0.5rem; font-size: 9pt; display: flex; justify-content: space-between; } .specimen-info .label { font-weight: bold; color: var(--blue-color); } .results-section { margin-top: 1rem; } .result-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #eee; } .result-main { flex-basis: 70%; } .result-test-name { color: var(--blue-color); font-weight: bold; } .result-value { font-size: 14pt; font-weight: bold; margin-top: 4px; } .result-reference { flex-basis: 30%; text-align: right; } .result-reference .label { font-weight: bold; } .interpretation-section { margin-top: 1.5rem; font-size: 9pt; } .interpretation-section h4 { color: var(--blue-color); font-weight: bold; font-size: 10pt; margin: 0 0 5px 0; } .interpretation-section p { margin: 0; line-height: 1.5; white-space: pre-wrap; } .interpretation-section.info h4 { color: #000; } .timestamps { display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 5px; margin-top: 2rem; font-size: 9pt; } .footer { margin-top: auto; padding-top: 1rem; font-size: 8pt; color: #333; } .footer-grid { display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #000; padding-top: 5px; } .signature-block { text-align: center; border-top: 1.5px solid #000; padding-top: 5px; width: 250px; } .genotype-circles { margin-top: 1.5rem; } .genotype-circles h5 { color: #000; font-weight: bold; font-size: 10pt; margin: 0 0 10px 0; } .circle-container { display: flex; flex-wrap: wrap; gap: 6px; padding: 5px 0; } .genotype-circle { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 9pt; } .hr-circle { background-color: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); } .lr-circle { background-color: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.5); } </style>`}} />
                        <div className="p-10 flex flex-col min-h-full" style={{ direction: language === 'fa' ? 'rtl' : 'ltr' }}>
                            <div style={{ borderBottom: '3px solid var(--blue-color)' }}>
                              <header className="header">
                                <div className="logo">
                                  {currentLogo ? <img src={currentLogo} alt="Lab Logo" /> : <div className="logo-text">{labInfo.name || 'MAYO CLINIC LABORATORIES'}</div>}
                                </div>
                                <div className="header-info">
                                  <p>{distributorInfo.phones[0] || '1-800-533-1710'}</p>
                                  <h2>HPVP</h2>
                                  <h3>HPVG PCR w/ Pap Reflex, ThinPrep</h3>
                                </div>
                              </header>
                            </div>

                            <section className="patient-info-container">
                              <div className="patient-info-grid">
                                <div><div className="label">Patient ID</div><div className="value"><EditableReportField value={editableData.editableId} onChange={e => handleFieldChange('editableId', e.target.value)} /></div></div>
                                <div><div className="label">Patient Name</div><div className="value"><EditableReportField value={editableData.editableName} onChange={e => handleFieldChange('editableName', e.target.value)} /></div></div>
                                <div><div className="label">Birth Date</div><div className="value"><EditableReportField value={editableData.reportBirthDate || ''} onChange={e => handleFieldChange('reportBirthDate', e.target.value)} /></div></div>
                                <div><div className="label">Gender</div><div className="value"><EditableReportField value={editableData.reportGender || ''} onChange={e => handleFieldChange('reportGender', e.target.value)} /></div></div>
                                <div><div className="label">Age</div><div className="value"><EditableReportField value={editableData.reportAge || ''} onChange={e => handleFieldChange('reportAge', e.target.value)} /></div></div>
                              </div>
                               <div className="patient-info-grid" style={{ borderTop: '1px solid #000' }}>
                                 <div><div className="label">Order Number</div><div className="value"><EditableReportField value={editableData.reportOrderNumber || ''} onChange={e => handleFieldChange('reportOrderNumber', e.target.value)} /></div></div>
                                 <div className="span-2"><div className="label">Ordering Physician</div><div className="value"><EditableReportField value={editableData.reportPhysician || ''} onChange={e => handleFieldChange('reportPhysician', e.target.value)} /></div></div>
                                 <div className="span-2"><div className="label">Report Notes</div><div className="value"><EditableReportField value={editableData.reportNotes || ''} onChange={e => handleFieldChange('reportNotes', e.target.value)} /></div></div>
                              </div>
                              <div className="patient-info-grid" style={{ borderTop: '1px solid #000' }}>
                                <div><div className="label">Account Information</div><div className="value"><EditableReportField value={editableData.reportAccountInfo || ''} onChange={e => handleFieldChange('reportAccountInfo', e.target.value)} /></div></div>
                                <div className="span-2"><div className="label">Collected</div><div className="value">{new Date(worksheet.date).toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')}</div></div>
                                <div className="span-2"><div className="label"></div><div className="value">&nbsp;</div></div>
                              </div>
                            </section>

                            <h3 className="section-title">HPVG PCR w/ Pap Reflex, ThinPrep</h3>
                            <div className="specimen-info">
                              <div><span className="label">Specimen Source</span><br /><EditableReportField value={editableData.reportSpecimenSource || ''} onChange={e => handleFieldChange('reportSpecimenSource', e.target.value)} /></div>
                              <div><EditableReportField value={editableData.reportMcr || ''} onChange={e => handleFieldChange('reportMcr', e.target.value)} className="text-right" /></div>
                            </div>
                            
                            <section className="results-section">
                                <div className="result-item"><div className="result-main"><div className="result-test-name">{t('worksheet.report.testName.amplification')}</div><div className="result-value">{worksheet.hpvDetection === 'Detected' ? t('analysis.report.detected') : 'Negative'}</div></div><div className="result-reference"><div className="label">Reference Value</div><div>Negative</div></div></div>
                                <div className="result-item"><div className="result-main"><div className="result-test-name">{t('worksheet.report.testName.lowRisk')}</div><div className="result-value">{worksheet.lowRiskStatus === 'Detected' ? t('analysis.report.detected') : 'Negative'}</div></div><div className="result-reference"><div className="label">Reference Value</div><div>Negative</div></div></div>
                                <div className="result-item"><div className="result-main"><div className="result-test-name">{t('worksheet.report.testName.medHighRisk')}</div><div className="result-value">{worksheet.highRiskStatus === 'Detected' ? t('analysis.report.detected') : 'Negative'}</div></div><div className="result-reference"><div className="label">Reference Value</div><div>Negative</div></div></div>
                            </section>

                            <GenotypeCircles worksheet={worksheet} t={t} />
                            
                            <section className="interpretation-section">
                                <h4>{t('worksheet.report.interpretationTitle')}</h4>
                                <EditableReportTextarea value={editableData.reportInterpretation || ''} onChange={e => handleFieldChange('reportInterpretation', e.target.value)} rows={4} />
                            </section>
                            
                            <section className="interpretation-section info" style={{ marginTop: '2rem' }}>
                                <h4>ADDITIONAL INFORMATION</h4>
                                <EditableReportTextarea value={editableData.reportAdditionalInfo || ''} onChange={e => handleFieldChange('reportAdditionalInfo', e.target.value)} rows={4} />
                            </section>

                             <div className="timestamps">
                                <span><strong>Received:</strong> <EditableReportField value={editableData.reportReceivedDate || ''} onChange={e => handleFieldChange('reportReceivedDate', e.target.value)} className="inline-block w-auto" /></span>
                                <span><strong>Reported:</strong> <EditableReportField value={editableData.reportReportedDate || ''} onChange={e => handleFieldChange('reportReportedDate', e.target.value)} className="inline-block w-auto" /></span>
                            </div>

                            <footer className="footer">
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <div className="signature-block">
                                        <p style={{ margin:0, fontWeight: 'bold' }}><EditableReportField value={editableData.reportVerifiedBy || ''} onChange={e => handleFieldChange('reportVerifiedBy', e.target.value)} className="text-center" /></p>
                                        <p style={{ margin:0, fontSize: '8pt' }}><EditableReportField value={editableData.reportVerifiedByTitle || ''} onChange={e => handleFieldChange('reportVerifiedByTitle', e.target.value)} className="text-center" /></p>
                                    </div>
                                </div>
                                <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '9pt' }}><strong>Report Status: </strong><EditableReportField value={editableData.reportStatus || ''} onChange={e => handleFieldChange('reportStatus', e.target.value)} className="inline-block w-auto" /></div>
                                <div className="footer-grid" style={{ marginTop: '1rem' }}>
                                    <span>Printed: {new Date().toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-CA')}</span>
                                    <span style={{ fontSize: '7pt' }}>Received and reported dates and times are reported in US Central Time.</span>
                                    <span>Page 1 of 1</span>
                                </div>
                            </footer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintPreviewModal;
