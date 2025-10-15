
import { AnalysisSample, ReconciledData, DetectedGenotype, AnalyzedPatient, EditableWorksheetData } from '../types';
import { HPV_LOOKUP_TABLE, HIGH_RISK_GENOTYPES, LOW_RISK_GENOTYPES, CHANNEL_NAME_MAP, INTERNAL_CONTROL_NAME } from '../analysisConstants';

// Helper to extract channel from anchor text, ported from Python
const extractChannelFromAnchor = (anchorText: string): string | null => {
    const txt = anchorText.toLowerCase();
    let extractedToken: string | undefined;
    if (txt.includes("cycling a.")) {
        try {
            extractedToken = txt.split("cycling a.")[1].split(/\s+/)[0].replace(/[():.,]/g, "");
        } catch { /* ignore index error */ }
    }
    const potentialChannel = CHANNEL_NAME_MAP.get(extractedToken || '') || (extractedToken ? extractedToken.charAt(0).toUpperCase() + extractedToken.slice(1) : null);
    
    if (potentialChannel && Object.keys(HPV_LOOKUP_TABLE).includes(potentialChannel)) {
        return potentialChannel;
    }
    // Fallback search
    for (const [key, value] of Object.entries(CHANNEL_NAME_MAP)) {
        if (txt.includes(key)) return value;
    }
    return null;
};

// Helper ported from python
const _determineDetectionStatus = (ct: string): string => {
    if (!ct || ct.toLowerCase() === 'nan' || ct.trim() === '') {
        return 'Not Detected';
    }
    const ctVal = parseFloat(ct);
    if (isNaN(ctVal) || ctVal <= 0) {
        return 'Not Detected';
    }
    return 'Detected';
};

// Helper ported from python
const _determineHpvType = (name: string, channel: string, detStatus: string, lastPosCtrl?: string): string => {
    if (name === 'NTC') {
        return detStatus === 'Detected' ? 'N/A (NTC Detected)' : 'N/A';
    }
    if (name.startsWith("POS-")) {
        const hpvType = HPV_LOOKUP_TABLE[channel]?.[name];
        return hpvType ? `POS-${hpvType}` : 'POS-Unknown';
    }
    
    // For regular samples and negative controls
    if (detStatus === 'Detected' && lastPosCtrl && HPV_LOOKUP_TABLE[channel]?.[lastPosCtrl]) {
        return HPV_LOOKUP_TABLE[channel][lastPosCtrl];
    }

    if (name.includes("NEG Cont")) {
        return 'N/A';
    }

    return 'N/A';
};

// Main function to process raw CSV content
export const processRawCsv = (csvContent: string, t: (key: string) => string): AnalysisSample[] => {
    // Early check for file validity to provide a better error message.
    if (!csvContent.includes("Quantitative analysis of")) {
        throw new Error(t('analysis.notifications.invalidRotorGeneFile'));
    }

    const lines = csvContent.split(/\r?\n/);
    let allRows: { [key: string]: string }[] = [];
    let masterHeader: string[] = [];
    let currentChannel: string | null = null;
    let expectingHeader = false;
    let processingData = false;

    lines.forEach(line => {
        if (!line.trim()) return;
        // Handles both comma-separated and tab-separated values
        const columns = line.split(/,|\t/).map(cell => cell.trim().replace(/"/g, ''));
        const firstCell = columns[0] || "";

        if (firstCell.startsWith("Quantitative analysis of")) {
            currentChannel = extractChannelFromAnchor(firstCell);
            expectingHeader = true;
            processingData = false;
            return;
        }

        if (expectingHeader && currentChannel && firstCell.startsWith("No.")) {
            expectingHeader = false;
            processingData = true;
            if (masterHeader.length === 0) {
                masterHeader = ["Channel", ...columns];
            }
            return;
        }

        if (processingData && currentChannel && masterHeader.length > 0) {
            const rowData: { [key: string]: string } = {};
            masterHeader.forEach((header, i) => {
                if (i === 0) {
                    rowData[header] = currentChannel!;
                } else {
                    rowData[header] = columns[i - 1] || "";
                }
            });
            allRows.push(rowData);
        }
    });

    if (allRows.length === 0) {
        throw new Error(t('analysis.notifications.noDataInCsv'));
    }

    return enrichData(allRows, t);
};

// Data enrichment logic, ported from Python
const enrichData = (rows: { [key: string]: string }[], t: (key: string) => string): AnalysisSample[] => {
    if (rows.length === 0) return [];

    const enrichedRows: AnalysisSample[] = [];
    const lastPosCtrlByChannel: { [key: string]: string } = {};

    const rowKeys = Object.keys(rows[0]);
    const nameKey = rowKeys.find(k => ['name', 'sample name'].includes(k.toLowerCase().trim()));
    const ctKey = rowKeys.find(k => ['ct', 'ct value'].includes(k.toLowerCase().trim()));

    if (!nameKey) {
        throw new Error(t('analysis.notifications.noNameColumn'));
    }

    rows.forEach(row => {
        const channel = row.Channel;
        const name = row[nameKey!];
        const ctStr = ctKey ? row[ctKey] : "";

        if (!name) return;

        const detStatus = _determineDetectionStatus(ctStr);
        const lastPosCtrl = lastPosCtrlByChannel[channel];
        const hpvType = _determineHpvType(name, channel, detStatus, lastPosCtrl);
        
        let highR = "Not Detected", lowR = "Not Detected";
        let hType = "", lType = "";

        if (hpvType && !["N/A", "N/A (NTC Detected)", INTERNAL_CONTROL_NAME].includes(hpvType) && !hpvType.startsWith("POS")) {
            const cleanHpvType = hpvType.match(/\d+/)?.[0] || '';
            if (cleanHpvType) {
                if (HIGH_RISK_GENOTYPES.has(cleanHpvType)) {
                    highR = "Detected";
                    hType = cleanHpvType;
                } else if (LOW_RISK_GENOTYPES.has(cleanHpvType)) {
                    lowR = "Detected";
                    lType = cleanHpvType;
                }
            }
        }

        if (name.startsWith("POS-")) {
            lastPosCtrlByChannel[channel] = name;
        }

        const enrichedSample: AnalysisSample = {
            Channel: channel,
            Name: name,
            Ct: ctStr,
            'Detection Status': detStatus,
            'HPV Type': hpvType,
            HighR: highR,
            LowR: lowR,
            HType: hType,
            LType: lType,
        };
        enrichedRows.push(enrichedSample);
    });

    return enrichedRows;
};

export const aggregateResults = (enrichedData: AnalysisSample[]): { [key: string]: Omit<ReconciledData, 'id' | 'name' | 'status' | 'matchedPatientName'> } => {
    const groupedByName: { [key: string]: AnalysisSample[] } = {};
    enrichedData.forEach(row => {
        if (!groupedByName[row.Name]) {
            groupedByName[row.Name] = [];
        }
        groupedByName[row.Name].push(row);
    });

    const finalResults: { [key: string]: Omit<ReconciledData, 'id' | 'name' | 'status' | 'matchedPatientName'> } = {};

    for (const name in groupedByName) {
        const rows = groupedByName[name];
        
        const highRiskDetected = rows.some(r => r.HighR === 'Detected');
        const lowRiskDetected = rows.some(r => r.LowR === 'Detected');
        
        const highRiskGenotypes = rows.filter(r => r.HighR === 'Detected').map(r => r.HType).filter(Boolean);
        const lowRiskGenotypes = rows.filter(r => r.LowR === 'Detected').map(r => r.LType).filter(Boolean);
        
        const highRiskGenotypesDetailed: DetectedGenotype[] = rows
            .filter(r => r.HighR === 'Detected' && r.HType)
            .map(r => ({ genotype: r.HType, ct: r.Ct }));
            
        const lowRiskGenotypesDetailed: DetectedGenotype[] = rows
            .filter(r => r.LowR === 'Detected' && r.LType)
            .map(r => ({ genotype: r.LType, ct: r.Ct }));

        finalResults[name] = {
            hpvDetection: (highRiskDetected || lowRiskDetected) ? 'Detected' : 'Not Detected',
            highRiskStatus: highRiskDetected ? 'Detected' : 'Not Detected',
            highRiskTypes: [...new Set(highRiskGenotypes)].join(', '),
            lowRiskStatus: lowRiskDetected ? 'Detected' : 'Not Detected',
            lowRiskTypes: [...new Set(lowRiskGenotypes)].join(', '),
            highRiskGenotypesDetailed,
            lowRiskGenotypesDetailed
        };
    }

    return finalResults;
};

export const generateHtmlReport = (data: ReconciledData[], t: (key: string, options?: any) => string): string => {
    const reportDate = new Date().toLocaleString(t('common.locale', { useFallback: true, fallback: 'en-US' }));
    const lang = t('common.lang', { useFallback: true, fallback: 'en' });
    const dir = t('common.dir', { useFallback: true, fallback: 'ltr' });
    
    const tableRows = data.map(row => `
        <tr>
            <td>${row.name}</td>
            <td>${row.status === 'Matched' ? row.matchedPatientName : t('common.na')}</td>
            <td>${t(row.hpvDetection === 'Detected' ? 'analysis.report.detected' : 'analysis.report.notDetected')}</td>
            <td>${t(row.highRiskStatus === 'Detected' ? 'analysis.report.detected' : 'analysis.report.notDetected')}</td>
            <td>${row.highRiskTypes || t('analysis.report.none')}</td>
            <td>${t(row.lowRiskStatus === 'Detected' ? 'analysis.report.detected' : 'analysis.report.notDetected')}</td>
            <td>${row.lowRiskTypes || t('analysis.report.none')}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html lang="${lang}" dir="${dir}">
        <head>
            <meta charset="UTF-8">
            <title>${t('analysis.report.title')}</title>
            <style>
                body { font-family: sans-serif; margin: 2rem; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                h1, h2 { text-align: center; }
                .print-button { display: block; margin: 2rem auto; padding: 10px 20px; font-size: 16px; }
                @media print { .print-button { display: none; } }
            </style>
        </head>
        <body>
            <h1>${t('analysis.report.title')}</h1>
            <h2>${t('analysis.report.generatedDate')}: ${reportDate}</h2>
            <button class="print-button" onclick="window.print()">${t('analysis.report.print')}</button>
            <table>
                <thead>
                    <tr>
                        <th>${t('analysis.report.sampleName')}</th>
                        <th>${t('analysis.report.matchedPatient')}</th>
                        <th>${t('analysis.report.overallHPV')}</th>
                        <th>${t('analysis.report.hrStatus')}</th>
                        <th>${t('analysis.report.hrGenotypes')}</th>
                        <th>${t('analysis.report.lrStatus')}</th>
                        <th>${t('analysis.report.lrGenotypes')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </body>
        </html>
    `;
};


export const generateWorksheetReportHtml = (
    worksheet: EditableWorksheetData, 
    t: (key: string, options?: any) => any, 
    logoUrl: string | null, 
    language: 'en' | 'fa',
    labInfo: any,
    distributorInfo: any
): string => {
    
    const dir = language === 'fa' ? 'rtl' : 'ltr';
    const fontFamily = language === 'fa' ? "'Vazirmatn', sans-serif" : "'Inter', sans-serif";
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
      
    // Use editable fields from the worksheet object with fallbacks
    const interpretationText = worksheet.reportInterpretation || t(interpretationKey);
    const additionalInfo = worksheet.reportAdditionalInfo || t('worksheet.report.interpretationText1');
    const birthDate = worksheet.reportBirthDate || '1980-10-10';
    const gender = worksheet.reportGender || 'F';
    const age = worksheet.reportAge || '34';
    const orderNumber = worksheet.reportOrderNumber || worksheet.id.split('-')[0];
    const physician = worksheet.reportPhysician || 'CLIENT, CLIENT';
    const specimenSource = worksheet.reportSpecimenSource || 'CERVIX';
    const reportStatus = worksheet.reportStatus || 'Final';
    const accountInfo = worksheet.reportAccountInfo || 'C7028846 DLMP Rochester';
    const mcr = worksheet.reportMcr || 'MCR';
    const notes = worksheet.reportNotes || '&nbsp;';
    const receivedDate = worksheet.reportReceivedDate || collectedDate;
    const reportedDate = worksheet.reportReportedDate || collectedDate;
    const verifiedBy = worksheet.reportVerifiedBy || labInfo.director || 'Lab Director';
    const verifiedByTitle = worksheet.reportVerifiedByTitle || t('worksheet.report.labDirector');

    return `
    <!DOCTYPE html>
    <html lang="${language}" dir="${dir}">
    <head>
      <meta charset="UTF-8">
      <title>HPV Report - ${worksheet.editableName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        :root { --blue-color: #0D69AB; }
        body { font-family: ${fontFamily}, Arial, sans-serif; font-size: 10pt; margin: 0; padding: 0; background-color: #fff; color: #000; -webkit-print-color-adjust: exact; color-adjust: exact; }
        .page { width: 21cm; min-height: 29.7cm; margin: auto; padding: 1.5cm; box-sizing: border-box; display: flex; flex-direction: column; background: #fff; }
        @media print { .page { box-shadow: none; border: none; } .print-button { display: none; } }
        .print-button { position: fixed; top: 20px; right: 20px; padding: 10px 15px; background-color: var(--blue-color); color: white; border: none; border-radius: 5px; cursor: pointer; z-index: 100; font-family: sans-serif; }
        
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; }
        .header .logo img { max-height: 50px; }
        .header .logo-text { font-size: 14pt; font-weight: 800; }
        .header .header-info { text-align: right; color: var(--blue-color); }
        .header .header-info h2 { font-size: 18pt; font-weight: 800; margin: 0; }
        .header .header-info h3 { font-size: 11pt; font-weight: normal; margin: 4px 0; }
        .header .header-info p { font-size: 10pt; font-weight: bold; margin: 0; }
        
        .patient-info-container { border: 1px solid #000; margin-top: 1rem; }
        .patient-info-grid { display: grid; grid-template-columns: 1.5fr 2fr 1.5fr 1fr 0.8fr; width: 100%; border-collapse: collapse; }
        .patient-info-grid > div { padding: 3px 6px; font-size: 9pt; border-right: 1px solid #ccc; border-top: 1px solid #ccc; }
        .patient-info-grid > div:last-child { border-right: none; }
        .patient-info-grid .label { font-weight: 400; font-size: 8pt; }
        .patient-info-grid .value { font-weight: 700; }
        .patient-info-grid .full-row { grid-column: 1 / -1; }
        .patient-info-grid .span-2 { grid-column: span 2; }
        .patient-info-grid .span-3 { grid-column: span 3; }

        .section-title { color: var(--blue-color); font-weight: bold; font-size: 11pt; border-bottom: 2px solid var(--blue-color); padding-bottom: 2px; margin: 1.5rem 0 0.5rem 0; }
        
        .specimen-info { margin-top: 0.5rem; font-size: 9pt; display: flex; justify-content: space-between; }
        .specimen-info .label { font-weight: bold; color: var(--blue-color); }

        .results-section { margin-top: 1rem; }
        .result-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #eee; }
        .result-main { flex-basis: 70%; }
        .result-test-name { color: var(--blue-color); font-weight: bold; }
        .result-value { font-size: 14pt; font-weight: bold; margin-top: 4px; }
        .result-reference { flex-basis: 30%; text-align: right; }
        .result-reference .label { font-weight: bold; }
        
        .interpretation-section { margin-top: 1.5rem; font-size: 9pt; }
        .interpretation-section h4 { color: var(--blue-color); font-weight: bold; font-size: 10pt; margin: 0 0 5px 0; }
        .interpretation-section p { margin: 0; line-height: 1.5; white-space: pre-wrap; }
        .interpretation-section.info h4 { color: #000; }

        .timestamps { display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 5px; margin-top: 2rem; font-size: 9pt; }

        .footer { margin-top: auto; padding-top: 1rem; font-size: 8pt; color: #333; }
        .footer-grid { display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #000; padding-top: 5px; }
        .signature-block { text-align: center; border-top: 1.5px solid #000; padding-top: 5px; width: 250px; }

        .genotype-circles { margin-top: 1.5rem; }
        .genotype-circles h5 { color: #000; font-weight: bold; font-size: 10pt; margin: 0 0 10px 0; }
        .circle-container { display: flex; flex-wrap: wrap; gap: 6px; padding: 5px 0; }
        .genotype-circle { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 9pt; }
        .hr-circle { background-color: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
        .lr-circle { background-color: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.5); }

      </style>
    </head>
    <body>
      <button class="print-button" onclick="window.print()">${t('analysis.report.print')}</button>
      <div class="page">
        <div style="border-bottom: 3px solid var(--blue-color);">
          <header class="header">
            <div class="logo">
              ${logoUrl ? `<img src="${logoUrl}" alt="Lab Logo">` : `<div class="logo-text">${labInfo.name || 'MAYO CLINIC LABORATORIES'}</div>`}
            </div>
            <div class="header-info">
              <p>${distributorInfo.phones[0] || '1-800-533-1710'}</p>
              <h2>HPVP</h2>
              <h3>HPVG PCR w/ Pap Reflex, ThinPrep</h3>
            </div>
          </header>
        </div>

        <section class="patient-info-container">
          <div class="patient-info-grid">
            <div><div class="label">Patient ID</div><div class="value">${worksheet.editableId}</div></div>
            <div><div class="label">Patient Name</div><div class="value">${worksheet.editableName}</div></div>
            <div><div class="label">Birth Date</div><div class="value">${birthDate}</div></div>
            <div><div class="label">Gender</div><div class="value">${gender}</div></div>
            <div><div class="label">Age</div><div class="value">${age}</div></div>
          </div>
          <div class="patient-info-grid" style="border-top: 1px solid #000;">
             <div><div class="label">Order Number</div><div class="value">${orderNumber}</div></div>
             <div class="span-2"><div class="label">Ordering Physician</div><div class="value">${physician}</div></div>
             <div class="span-2"><div class="label">Report Notes</div><div class="value">${notes}</div></div>
          </div>
          <div class="patient-info-grid" style="border-top: 1px solid #000;">
            <div><div class="label">Account Information</div><div class="value">${accountInfo}</div></div>
            <div class="span-2"><div class="label">Collected</div><div class="value">${collectedDate}</div></div>
            <div class="span-2"><div class="label"></div><div class="value">&nbsp;</div></div>
          </div>
        </section>

        <h3 class="section-title">HPVG PCR w/ Pap Reflex, ThinPrep</h3>
        <div class="specimen-info">
          <div><span class="label">Specimen Source</span><br>${specimenSource}</div>
          <div>${mcr}</div>
        </div>

        <section class="results-section">
          <div class="result-item">
            <div class="result-main">
              <div class="result-test-name">${t('worksheet.report.testName.amplification')}</div>
              <div class="result-value">${worksheet.hpvDetection === 'Detected' ? t('analysis.report.detected') : 'Negative'}</div>
            </div>
            <div class="result-reference">
              <div class="label">Reference Value</div>
              <div>Negative</div>
            </div>
          </div>
          <div class="result-item">
            <div class="result-main">
              <div class="result-test-name">${t('worksheet.report.testName.lowRisk')}</div>
              <div class="result-value">${worksheet.lowRiskStatus === 'Detected' ? t('analysis.report.detected') : 'Negative'}</div>
            </div>
            <div class="result-reference">
              <div class="label">Reference Value</div>
              <div>Negative</div>
            </div>
          </div>
          <div class="result-item">
            <div class="result-main">
              <div class="result-test-name">${t('worksheet.report.testName.medHighRisk')}</div>
              <div class="result-value">${worksheet.highRiskStatus === 'Detected' ? t('analysis.report.detected') : 'Negative'}</div>
            </div>
            <div class="result-reference">
              <div class="label">Reference Value</div>
              <div>Negative</div>
            </div>
          </div>
        </section>

        ${(worksheet.highRiskGenotypes.length > 0 || worksheet.lowRiskGenotypes.length > 0) ? `
          <section class="genotype-circles">
            <h5>${t('worksheet.report.detectedGenotypesTitle')}</h5>
            ${worksheet.highRiskGenotypes.length > 0 ? `
                <h5 style="margin-top: 10px; font-size: 9pt;">${t('worksheet.report.highRiskTitle')}</h5>
                <div class="circle-container">
                    ${worksheet.highRiskGenotypes.map(g => `<div class="genotype-circle hr-circle">${g.genotype}</div>`).join('')}
                </div>` : ''}
            ${worksheet.lowRiskGenotypes.length > 0 ? `
                <h5 style="margin-top: 10px; font-size: 9pt;">${t('worksheet.report.lowRiskTitle')}</h5>
                <div class="circle-container">
                    ${worksheet.lowRiskGenotypes.map(g => `<div class="genotype-circle lr-circle">${g.genotype}</div>`).join('')}
                </div>` : ''}
          </section>
        ` : ''}

        <section class="interpretation-section">
          <h4>${t('worksheet.report.interpretationTitle')}</h4>
          <p>${interpretationText}</p>
        </section>

        <section class="interpretation-section info" style="margin-top: 2rem;">
          <h4>ADDITIONAL INFORMATION</h4>
          <p>${additionalInfo}</p>
        </section>
        
        <div class="timestamps">
          <span><strong>Received:</strong> ${receivedDate}</span>
          <span><strong>Reported:</strong> ${reportedDate}</span>
        </div>

        <footer class="footer">
            <div style="margin-top: 2rem; display: flex; justify-content: flex-end;">
                <div class="signature-block">
                    <p style="margin:0; font-weight: bold;">${verifiedBy}</p>
                    <p style="margin:0; font-size: 8pt;">${verifiedByTitle}</p>
                </div>
            </div>
            <div style="margin-top: 1rem; text-align: center; font-size: 9pt;"><strong>Report Status: ${reportStatus}</strong></div>
            <div class="footer-grid" style="margin-top: 1rem;">
                <span>Printed: ${new Date().toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-CA')}</span>
                <span style="font-size: 7pt;">Received and reported dates and times are reported in US Central Time.</span>
                <span>Page 1 of 1</span>
            </div>
        </footer>
      </div>
    </body>
    </html>
    `;
};
