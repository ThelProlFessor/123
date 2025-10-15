

import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import Card from '../components/Card';
import { AnalyzedPatient, EditableWorksheetData, CalendarType } from '../types';
import { HIGH_RISK_GENOTYPES } from '../analysisConstants';
import PrintPreviewModal from '../components/PrintPreviewModal';


// --- Calendar Conversion Utilities ---
function gregorianToJalali(gy, gm, gd) {
    var g_d_m, jy, jm, jd, gy2, days;
    g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    gy2 = (gm > 2) ? (gy + 1) : gy;
    days = 355666 + (365 * gy) + ~~((gy2 + 3) / 4) - ~~((gy2 + 99) / 100) + ~~((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
    jy = -1595 + (33 * ~~(days / 12053));
    days %= 12053;
    jy += 4 * ~~(days / 1461);
    days %= 1461;
    if (days > 365) {
        jy += ~~((days - 1) / 365);
        days = (days - 1) % 365;
    }
    jm = (days < 186) ? 1 + ~~(days / 31) : 7 + ~~((days - 186) / 30);
    jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return { jy, jm, jd };
}

function jalaliToGregorian(jy, jm, jd) {
    var gy, gm, gd, days;
    jy += 1595;
    days = -355668 + (365 * jy) + (~~(jy / 33) * 8) + ~~(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy = 400 * ~~(days / 146097);
    days %= 146097;
    if (days > 36524) {
        gy += 100 * ~~(--days / 36524);
        days %= 36524;
        if (days >= 365) days++;
    }
    gy += 4 * ~~(days / 1461);
    days %= 1461;
    if (days > 365) {
        gy += ~~((days - 1) / 365);
        days = (days - 1) % 365;
    }
    gd = days + 1;
    const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
    return { gy, gm, gd };
}

function convertDate(dateStr, from, to) {
    if (from === to || !dateStr) return dateStr;
    const parts = dateStr.match(/(\d+)/g);
    if (!parts || parts.length < 3) return dateStr;
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

    if (from === 'gregorian' && to === 'solar') {
        const { jy, jm, jd } = gregorianToJalali(year, month, day);
        return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
    }
    if (from === 'solar' && to === 'gregorian') {
        const { gy, gm, gd } = jalaliToGregorian(year, month, day);
        return `${gy}/${String(gm).padStart(2, '0')}/${String(gd).padStart(2, '0')}`;
    }
    return dateStr;
}

function formatDate(date, type) {
    if (type === 'gregorian') {
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    } else {
        const { jy, jm, jd } = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
        return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
    }
}
// --- Reusable Styled Components for the Worksheet ---
const ResultCheckbox: React.FC<{ label: string; isChecked: boolean; color: 'blue' | 'red' }> = ({ label, isChecked, color }) => {
    const colorClasses = {
        blue: 'text-blue-600 dark:text-blue-400',
        red: 'text-red-600 dark:text-red-500',
    };

    let checkBg = 'bg-surface border-border';
    if (isChecked) {
        if (color === 'red') {
            checkBg = 'bg-red-500 border-red-500 shadow-lg shadow-red-500/50 dark:shadow-red-400/40';
        } else {
            checkBg = 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/50 dark:shadow-blue-400/40';
        }
    }
    
    return (
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${checkBg}`}>
                {isChecked && <svg className="w-3 h-3 text-white" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"/></svg>}
            </div>
            <span className={`font-bold ${colorClasses[color]}`}>{label}</span>
        </div>
    );
};

const GenotypeCell: React.FC<{ number: string | number; ctValue?: string; color: 'green' | 'yellow' | 'orange' | 'red' }> = ({ number, ctValue, color }) => {
    const hasCt = ctValue && ctValue.trim() !== '';
    
    const defaultColors = {
        green: 'bg-green-50 dark:bg-green-900/40 text-green-800 dark:text-green-300/80',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300/80',
        orange: 'bg-orange-50 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300/80',
        red: 'bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-300/80',
    };

    const detectedColors = {
        green: 'bg-green-500 text-white shadow-[0_0_12px_2px_rgba(34,197,94,0.5)]',
        yellow: 'bg-yellow-500 text-white shadow-[0_0_12px_2px_rgba(234,179,8,0.5)]',
        orange: 'bg-orange-500 text-white shadow-[0_0_12px_2px_rgba(249,115,22,0.5)]',
        red: 'bg-red-500 text-white shadow-[0_0_12px_2px_rgba(239,68,68,0.5)]',
    };
    
    const cellClasses = hasCt ? detectedColors[color] : defaultColors[color];
    const transformClass = hasCt ? 'scale-105 z-10 relative' : '';

    return (
        <td className={`p-1 border border-border text-center align-middle w-16 h-16 transition-all duration-300 ease-in-out transform ${transformClass} ${cellClasses}`}>
            <div className={`text-lg font-bold ${!hasCt ? 'opacity-70' : ''}`}>{number}</div>
            <div className={`text-xs mt-1 font-semibold ${!hasCt ? 'opacity-60' : 'opacity-90'}`}>
                {hasCt ? `Ct: ${ctValue}` : 'Ct:'}
            </div>
        </td>
    );
};

const EditableField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <div>
        <p className="text-text-muted font-medium">{label}:</p>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="font-bold text-text-primary mt-1 bg-surface-alt border border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-md p-1 w-full transition-colors"
        />
    </div>
);

interface WorksheetForPatientProps {
    worksheet: EditableWorksheetData | null;
    onUpdate: (id: string, field: keyof EditableWorksheetData, value: any) => void;
    t: (key: string, options?: any) => string;
    language: 'en' | 'fa';
}

const WorksheetForPatient: React.FC<WorksheetForPatientProps> = ({ worksheet, onUpdate, t, language }) => {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const genotypeCtMap = useMemo(() => {
        const map = new Map<string, string>();
        if (!worksheet) return map;

        worksheet.highRiskGenotypes.forEach(g => map.set(g.genotype, g.ct));
        worksheet.lowRiskGenotypes.forEach(g => map.set(g.genotype, g.ct));
        return map;
    }, [worksheet]);
    
    const detectedGenotypes = useMemo(() => {
        if (!worksheet || worksheet.hpvDetection === 'Not Detected') return [];
        return [
            ...worksheet.highRiskGenotypes.map(g => g.genotype),
            ...worksheet.lowRiskGenotypes.map(g => g.genotype)
        ].map(g => parseInt(g, 10)).filter(g => !isNaN(g)).sort((a, b) => a - b);
    }, [worksheet]);

    return (
        <>
            {worksheet && isPreviewOpen && (
                <PrintPreviewModal
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    worksheet={worksheet}
                />
            )}
            <div className="bg-surface p-4 sm:p-6 rounded-2xl shadow-lg border border-border transition-all duration-300 hover:shadow-xl hover:border-primary/30">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-extrabold text-primary dark:text-primary">
                        {t('worksheet.mainTitle')}
                    </h2>
                    {worksheet && (
                        <button 
                            onClick={() => setIsPreviewOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                            <span>{t('worksheet.report.print')}</span>
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="border-collapse border-border text-xs text-text-primary mx-auto min-w-[800px]">
                        <thead className="bg-primary text-white">
                            <tr>
                                <th className="p-2 border border-blue-500 font-bold w-48 align-middle" rowSpan={2}>{t('worksheet.patientInfo')}</th>
                                <th className="p-2 border border-blue-500 font-bold w-20 align-middle" rowSpan={2}>{t('worksheet.mix')}</th>
                                <th className="p-2 border border-blue-500 font-bold text-red-300" colSpan={4}>HPV High-risk</th>
                                <th className="p-2 border border-blue-500 font-bold text-yellow-300" colSpan={4}>HPV Low-risk</th>
                                <th className="p-2 border border-blue-500 font-bold w-60 align-middle" rowSpan={2}>{t('worksheet.finalResult')}</th>
                            </tr>
                            <tr>
                                {[1,2,3,4,5,6,7,8].map(n => <th key={n} className="p-2 border border-blue-500 font-bold">{n}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="p-1 border border-border align-top" rowSpan={4}>
                                    <div className="p-3 space-y-3 text-start h-full flex flex-col justify-around text-sm">
                                        {worksheet ? (
                                            <>
                                                <div>
                                                    <p className="text-text-muted font-medium">{t('info.date')}:</p>
                                                    <div className="flex items-center space-x-1 rtl:space-x-reverse mt-1">
                                                        <button onClick={() => onUpdate(worksheet.id, 'calendarType', 'gregorian')} className={`px-2 py-1 text-xs rounded-md ${worksheet.calendarType === 'gregorian' ? 'bg-primary text-white' : 'bg-surface-alt hover:bg-border'}`}>Gregorian</button>
                                                        <button onClick={() => onUpdate(worksheet.id, 'calendarType', 'solar')} className={`px-2 py-1 text-xs rounded-md ${worksheet.calendarType === 'solar' ? 'bg-primary text-white' : 'bg-surface-alt hover:bg-border'}`}>Solar</button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={worksheet.displayDate}
                                                        onChange={e => onUpdate(worksheet.id, 'displayDate', e.target.value)}
                                                        className="font-bold text-text-primary mt-1 bg-surface-alt border border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-md p-1 w-full transition-colors"
                                                        placeholder="YYYY/MM/DD"
                                                    />
                                                </div>
                                                <EditableField label={t('info.name')} value={worksheet.editableName} onChange={val => onUpdate(worksheet.id, 'editableName', val)} />
                                                <EditableField label={t('info.id')} value={worksheet.editableId} onChange={val => onUpdate(worksheet.id, 'editableId', val)} />
                                            </>
                                        ) : (
                                            <div className="text-center text-text-muted opacity-50 p-4">{t('common.na')}</div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-1 border border-border text-center align-middle font-extrabold bg-green-300 dark:bg-green-800/60 text-green-900 dark:text-green-100">FAM</td>
                                <GenotypeCell number={51} ctValue={genotypeCtMap.get('51')} color="green" />
                                <GenotypeCell number={52} ctValue={genotypeCtMap.get('52')} color="green" />
                                <GenotypeCell number={39} ctValue={genotypeCtMap.get('39')} color="green" />
                                <GenotypeCell number={33} ctValue={genotypeCtMap.get('33')} color="green" />
                                <GenotypeCell number={62} ctValue={genotypeCtMap.get('62')} color="green" />
                                <GenotypeCell number={67} ctValue={genotypeCtMap.get('67')} color="green" />
                                <GenotypeCell number={43} ctValue={genotypeCtMap.get('43')} color="green" />
                                <GenotypeCell number={54} ctValue={genotypeCtMap.get('54')} color="green" />
                                <td className="p-1 border border-border align-top" rowSpan={4}>
                                    <div className="p-4 space-y-4 text-start h-full">
                                        <ResultCheckbox label={t('worksheet.result.nonDetected')} isChecked={!worksheet || worksheet.hpvDetection === 'Not Detected'} color="blue" />
                                        <ResultCheckbox label={t('worksheet.result.hrDetected')} isChecked={worksheet?.highRiskStatus === 'Detected' ?? false} color="red" />
                                        <ResultCheckbox label={t('worksheet.result.lrDetected')} isChecked={worksheet?.lowRiskStatus === 'Detected' ?? false} color="red" />
                                        <div className="pt-4 mt-4 border-t border-border-light">
                                            <p className="font-semibold text-text-secondary mb-2">{t('worksheet.result.detectedGenotypes')}</p>
                                            <div className="flex flex-wrap gap-2 min-h-[4rem] items-center">
                                                {detectedGenotypes.length > 0 ? (
                                                    detectedGenotypes.map(g => (
                                                        <span key={g} className="px-2.5 py-1 bg-primary-light text-primary font-bold text-sm rounded-full">
                                                            {g}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-text-muted italic">{t('common.na')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td className="p-1 border border-border text-center align-middle font-extrabold bg-yellow-300 dark:bg-yellow-800/60 text-yellow-900 dark:text-yellow-100">JOE</td>
                                <GenotypeCell number={16} ctValue={genotypeCtMap.get('16')} color="yellow" />
                                <GenotypeCell number={31} ctValue={genotypeCtMap.get('31')} color="yellow" />
                                <GenotypeCell number={59} ctValue={genotypeCtMap.get('59')} color="yellow" />
                                <GenotypeCell number={68} ctValue={genotypeCtMap.get('68')} color="yellow" />
                                <GenotypeCell number={11} ctValue={genotypeCtMap.get('11')} color="yellow" />
                                <GenotypeCell number={6} ctValue={genotypeCtMap.get('6')} color="yellow" />
                                <GenotypeCell number={42} ctValue={genotypeCtMap.get('42')} color="yellow" />
                                <GenotypeCell number={84} ctValue={genotypeCtMap.get('84')} color="yellow" />
                            </tr>
                            <tr>
                                <td className="p-1 border border-border text-center align-middle font-extrabold bg-orange-300 dark:bg-orange-800/60 text-orange-900 dark:text-orange-100">ROX</td>
                                <GenotypeCell number={18} ctValue={genotypeCtMap.get('18')} color="orange" />
                                <GenotypeCell number={53} ctValue={genotypeCtMap.get('53')} color="orange" />
                                <GenotypeCell number={45} ctValue={genotypeCtMap.get('45')} color="orange" />
                                <GenotypeCell number={66} ctValue={genotypeCtMap.get('66')} color="orange" />
                                <GenotypeCell number={44} ctValue={genotypeCtMap.get('44')} color="orange" />
                                <GenotypeCell number={91} ctValue={genotypeCtMap.get('91')} color="orange" />
                                <GenotypeCell number={40} ctValue={genotypeCtMap.get('40')} color="orange" />
                                <GenotypeCell number={61} ctValue={genotypeCtMap.get('61')} color="orange" />
                            </tr>
                            <tr>
                                <td className="p-1 border border-border text-center align-middle font-extrabold bg-red-300 dark:bg-red-800/60 text-red-900 dark:text-red-100">Cy5</td>
                                <GenotypeCell number={58} ctValue={genotypeCtMap.get('58')} color="red" />
                                <GenotypeCell number={56} ctValue={genotypeCtMap.get('56')} color="red" />
                                <GenotypeCell number={35} ctValue={genotypeCtMap.get('35')} color="red" />
                                <GenotypeCell number={73} ctValue={genotypeCtMap.get('73')} color="red" />
                                <GenotypeCell number={83} ctValue={genotypeCtMap.get('83')} color="red" />
                                <GenotypeCell number={90} ctValue={genotypeCtMap.get('90')} color="red" />
                                <GenotypeCell number={'IC'} ctValue={genotypeCtMap.get('IC')} color="red" />
                                <GenotypeCell number={81} ctValue={genotypeCtMap.get('81')} color="red" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};


const WorksheetPage: React.FC = () => {
    const { analyzedPatients, t, language } = useContext(AppContext);
    const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
    const [editableWorksheets, setEditableWorksheets] = useState<Map<string, EditableWorksheetData>>(new Map());

    const sortedAnalyzedPatients = useMemo(() => {
        return [...analyzedPatients].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [analyzedPatients]);

    // Effect to clean up stale worksheet edits from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('worksheetEdits');
            if (!saved) return;
            
            const allOverrides = JSON.parse(saved);
            if (typeof allOverrides !== 'object' || allOverrides === null || Array.isArray(allOverrides)) {
                localStorage.removeItem('worksheetEdits');
                return;
            }

            const patientIds = new Set(analyzedPatients.map(p => p.id));
            const cleanedOverrides: Record<string, any> = {};

            for (const id in allOverrides) {
                if (Object.prototype.hasOwnProperty.call(allOverrides, id) && patientIds.has(id)) {
                    const override = (allOverrides as Record<string, any>)[id];
                    if (override && typeof override === 'object' && !Array.isArray(override)) {
                       cleanedOverrides[id] = override;
                    }
                }
            }
            localStorage.setItem('worksheetEdits', JSON.stringify(cleanedOverrides));
        } catch(e) {
            console.error("Failed to clean worksheet edits:", e);
            localStorage.removeItem('worksheetEdits');
        }
    }, [analyzedPatients]);

    // Effect to populate editable worksheets based on selection and localStorage
    useEffect(() => {
        // FIX: Correctly type `savedOverrides` to prevent type errors when accessing its properties.
        let savedOverrides: Record<string, Partial<EditableWorksheetData>> = {};
        try {
            const saved = localStorage.getItem('worksheetEdits');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    savedOverrides = parsed;
                }
            }
        } catch (e) {
            console.error("Failed to parse worksheet edits:", e);
        }

        const newWorksheets = new Map<string, EditableWorksheetData>();
        const allPatientsMap = new Map(analyzedPatients.map(p => [p.id, p]));

        selectedPatientIds.forEach(id => {
            const patient = allPatientsMap.get(id);
            if (patient) {
                const override = savedOverrides[id];
                // FIX: Check for the existence of `override` instead of performing unsafe type checks.
                // A robust check ensures we are dealing with an object before accessing properties.
                if (override && typeof override === 'object' && !Array.isArray(override)) {
                    newWorksheets.set(id, {
                        ...patient,
                        editableName: override.editableName ?? patient.name,
                        editableId: override.editableId ?? patient.name,
                        displayDate: override.displayDate ?? formatDate(new Date(patient.date), 'gregorian'),
                        calendarType: override.calendarType ?? 'gregorian',
                        reportBirthDate: override.reportBirthDate,
                        reportGender: override.reportGender,
                        reportAge: override.reportAge,
                        reportOrderNumber: override.reportOrderNumber,
                        reportPhysician: override.reportPhysician,
                        reportSpecimenSource: override.reportSpecimenSource,
                        reportInterpretation: override.reportInterpretation,
                        reportAdditionalInfo: override.reportAdditionalInfo,
                        reportVerifiedBy: override.reportVerifiedBy,
                        reportVerifiedByTitle: override.reportVerifiedByTitle,
                        reportStatus: override.reportStatus,
                        reportAccountInfo: override.reportAccountInfo,
                        reportMcr: override.reportMcr,
                        reportNotes: override.reportNotes,
                        reportReceivedDate: override.reportReceivedDate,
                        reportReportedDate: override.reportReportedDate,
                    });
                } else {
                    newWorksheets.set(id, {
                        ...patient,
                        editableName: patient.name,
                        editableId: patient.name,
                        displayDate: formatDate(new Date(patient.date), 'gregorian'),
                        calendarType: 'gregorian',
                    });
                }
            }
        });
        setEditableWorksheets(newWorksheets);
    }, [selectedPatientIds, analyzedPatients]);

    const handleWorksheetUpdate = (patientId: string, field: keyof EditableWorksheetData, value: any) => {
        setEditableWorksheets(prev => {
            const newMap = new Map(prev);
            const currentData = newMap.get(patientId);
            if (currentData) {
                const updatedData: EditableWorksheetData = {
                    ...currentData,
                    [field]: value,
                };

                if (field === 'calendarType') {
                    const newCalendarType = value as CalendarType;
                    const oldCalendarType = currentData.calendarType;
                    updatedData.displayDate = convertDate(currentData.displayDate, oldCalendarType, newCalendarType);
                }
                newMap.set(patientId, updatedData);

                try {
                    const saved = localStorage.getItem('worksheetEdits');
                    // FIX: Correctly type `allOverrides` to ensure type safety when parsing from localStorage.
                    let allOverrides: Record<string, Partial<EditableWorksheetData>> = {};
                    if (saved) {
                        try {
                            const parsed = JSON.parse(saved);
                            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                                allOverrides = parsed;
                            }
                        } catch (e) {
                            console.error("Failed to parse worksheet edits on save:", e);
                        }
                    }
                    const overridableData: Partial<EditableWorksheetData> = {
                        editableName: updatedData.editableName,
                        editableId: updatedData.editableId,
                        displayDate: updatedData.displayDate,
                        calendarType: updatedData.calendarType,
                        reportBirthDate: updatedData.reportBirthDate,
                        reportGender: updatedData.reportGender,
                        reportAge: updatedData.reportAge,
                        reportOrderNumber: updatedData.reportOrderNumber,
                        reportPhysician: updatedData.reportPhysician,
                        reportSpecimenSource: updatedData.reportSpecimenSource,
                        reportInterpretation: updatedData.reportInterpretation,
                        reportAdditionalInfo: updatedData.reportAdditionalInfo,
                        reportVerifiedBy: updatedData.reportVerifiedBy,
                        reportVerifiedByTitle: updatedData.reportVerifiedByTitle,
                        reportStatus: updatedData.reportStatus,
                        reportAccountInfo: updatedData.reportAccountInfo,
                        reportMcr: updatedData.reportMcr,
                        reportNotes: updatedData.reportNotes,
                        reportReceivedDate: updatedData.reportReceivedDate,
                        reportReportedDate: updatedData.reportReportedDate,
                    };

                    allOverrides[patientId] = overridableData;
                    localStorage.setItem('worksheetEdits', JSON.stringify(allOverrides));
                } catch (e) {
                    console.error("Failed to save worksheet edits:", e);
                }
            }
            return newMap;
        });
    };

    const worksheetsToRender = useMemo(() => {
        return sortedAnalyzedPatients
            .filter(p => selectedPatientIds.has(p.id))
            .map(p => editableWorksheets.get(p.id))
            .filter((w): w is EditableWorksheetData => !!w);
    }, [sortedAnalyzedPatients, selectedPatientIds, editableWorksheets]);
    
    const handleSelectionChange = (patientId: string, isSelected: boolean) => {
        setSelectedPatientIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(patientId);
            } else {
                newSet.delete(patientId);
            }
            return newSet;
        });
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-extrabold text-text-primary">{t('sidebar.worksheet')}</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card title={t('worksheet.savedResultsTitle')} className="lg:col-span-1">
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                        {sortedAnalyzedPatients.length > 0 ? (
                            sortedAnalyzedPatients.map(patient => (
                                <label key={patient.id} className="flex items-center p-3 rounded-lg hover:bg-surface-alt cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedPatientIds.has(patient.id)}
                                        onChange={(e) => handleSelectionChange(patient.id, e.target.checked)}
                                        className="me-3"
                                    />
                                    <div className="flex-grow">
                                        <p className="font-semibold text-text-primary">{patient.name}</p>
                                        <p className="text-xs text-text-muted">{new Date(patient.date).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-CA')}</p>
                                    </div>
                                </label>
                            ))
                        ) : (
                            <p className="text-center text-text-muted p-4">{t('worksheet.noPatients')}</p>
                        )}
                    </div>
                </Card>
                <div className="lg:col-span-2 space-y-8">
                    {worksheetsToRender.length > 0 ? (
                        worksheetsToRender.map(worksheet => (
                            <WorksheetForPatient
                                key={worksheet.id}
                                worksheet={worksheet}
                                onUpdate={handleWorksheetUpdate}
                                t={t}
                                language={language}
                            />
                        ))
                    ) : (
                        <div className="opacity-50 pointer-events-none">
                            <WorksheetForPatient
                                worksheet={null}
                                onUpdate={() => {}}
                                t={t}
                                language={language}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorksheetPage;