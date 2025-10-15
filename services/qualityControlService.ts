
import { AnalysisSample, QcResult, QcIssue } from '../types';
import { INTERNAL_CONTROL_NAME } from '../analysisConstants';
import { aggregateResults } from './analysisService';

const POS_CT_THRESHOLD = 35;
const IC_CT_THRESHOLD = 35;

export const runQcChecks = (
  analysisResults: AnalysisSample[], 
  t: (key: string, options?: any) => string
): QcResult => {
  const issues: QcIssue[] = [];

  // 1. Check Positive Controls
  const positiveControls = analysisResults.filter(r => r.Name.startsWith("POS-"));
  positiveControls.forEach(pc => {
    // We ignore the IC channel for this primary check, as it's evaluated separately.
    if (pc['HPV Type'] !== INTERNAL_CONTROL_NAME) {
        const ctVal = parseFloat(pc.Ct);
        if (isNaN(ctVal) || ctVal > POS_CT_THRESHOLD || pc['Detection Status'] !== 'Detected') {
          issues.push({
            type: 'error',
            message: t('analysis.qcCheck.posCtFailDetail', { name: pc.Name, channel: pc.Channel, ct: pc.Ct || 'N/A' })
          });
        }
    }
  });

  // 2. Check Negative Controls
  const negativeControls = analysisResults.filter(r => r.Name.includes("NEG Cont"));
  negativeControls.forEach(nc => {
    // We ignore the IC channel for this check, as it's expected to amplify.
    if (nc['Detection Status'] === 'Detected' && nc['HPV Type'] !== INTERNAL_CONTROL_NAME) {
       issues.push({
        type: 'error',
        message: t('analysis.qcCheck.negCtFailDetail', { channel: nc.Channel, ct: nc.Ct })
      });
    }
  });

  // 3. Check NTC
  const ntcSamples = analysisResults.filter(r => r.Name === "NTC");
  ntcSamples.forEach(ntc => {
    if (ntc['Detection Status'] === 'Detected') {
      issues.push({
        type: 'error',
        message: t('analysis.qcCheck.ntcCtFailDetail', { channel: ntc.Channel, ct: ntc.Ct })
      });
    }
  });

  // 4. Check Internal Controls (RNase P)
  const aggregated = aggregateResults(analysisResults);
  const negativePatientNames = new Set(
    Object.entries(aggregated)
      .filter(([, data]) => data.hpvDetection === 'Not Detected')
      .map(([name]) => name)
  );
  
  const controlNames = new Set(
    analysisResults
      .filter(r => r.Name.startsWith("POS-") || r.Name.includes("NEG Cont"))
      .map(r => r.Name)
  );

  const icResults = analysisResults.filter(r => r['HPV Type'] === INTERNAL_CONTROL_NAME);

  icResults.forEach(ic => {
    const isNegativePatient = negativePatientNames.has(ic.Name);
    const isControl = controlNames.has(ic.Name);
    
    if (isNegativePatient || isControl) {
      const ctVal = parseFloat(ic.Ct);
      if (isNaN(ctVal) || ctVal > IC_CT_THRESHOLD || ic['Detection Status'] !== 'Detected') {
        issues.push({
          type: 'error',
          message: t('analysis.qcCheck.icFailDetail', { name: ic.Name, ct: ic.Ct || 'N/A' })
        });
      }
    }
  });

  return {
    status: issues.length > 0 ? 'Failed' : 'Passed',
    issues,
  };
};
