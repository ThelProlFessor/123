
export enum Page {
  Dashboard = 'Dashboard',
  Patients = 'Patients',
  Analysis = 'Analysis',
  Worksheet = 'Worksheet',
  History = 'History',
  Settings = 'Settings',
}

export interface PatientSample {
  id: string; 
  name: string;
}

export interface AnalysisSample {
  Channel: string;
  Name: string;
  Ct: string;
  'Detection Status': string;
  'HPV Type': string;
  HighR: string;
  LowR: string;
  HType: string;
  LType: string;
}

export enum ReconciliationStatus {
  Matched = 'Matched',
  Unmatched = 'Unmatched',
  Control = 'Control'
}

export interface DetectedGenotype {
  genotype: string;
  ct: string;
}

export interface ReconciledData {
  id: string; // Unique ID for the table row
  name: string;
  status: ReconciliationStatus;
  hpvDetection: string;
  highRiskStatus: string;
  highRiskTypes: string;
  lowRiskStatus: string;
  lowRiskTypes: string;
  matchedPatientName?: string;
  highRiskGenotypesDetailed: DetectedGenotype[];
  lowRiskGenotypesDetailed: DetectedGenotype[];
}

export interface HistoryRecord {
  NationalID: string;
  AdmissionID: string;
  PatientName: string;
  DateOfRecord: string; // ISO 8601 format
  HPVDetectionStatus: string;
  HPVHighRiskStatus: string;
  HPVHighRiskTypes: string;
  HPVLowRiskStatus: string;
  HPVLowRiskTypes: string;
  SourceOfRecord: string;
}

export interface AnalyzedPatient {
  id: string;
  name: string;
  date: string; // ISO 8601 format
  hpvDetection: string;
  highRiskStatus: string;
  highRiskGenotypes: DetectedGenotype[];
  lowRiskStatus: string;
  lowRiskGenotypes: DetectedGenotype[];
}

export type CalendarType = 'gregorian' | 'solar';

export interface EditableWorksheetData extends AnalyzedPatient {
  editableName: string;
  editableId: string;
  displayDate: string;
  calendarType: CalendarType;
  // New fields for the editable print preview
  reportBirthDate?: string;
  reportGender?: string;
  reportAge?: string;
  reportOrderNumber?: string;
  reportPhysician?: string;
  reportSpecimenSource?: string;
  reportInterpretation?: string;
  reportAdditionalInfo?: string;
  reportVerifiedBy?: string;
  reportVerifiedByTitle?: string;
  reportStatus?: string;
  reportAccountInfo?: string;
  reportMcr?: string;
  reportNotes?: string;
  reportReceivedDate?: string;
  reportReportedDate?: string;
}

export interface User {
  id: number;
  username: string;
}

// Add a declaration for the sql.js Database type
export interface SqlJsDatabase {
  exec(sql: string): {columns: string[], values: any[][]}[];
  prepare(sql: string): SqlJsStatement;
  export(): Uint8Array;
  close(): void;
}

export interface SqlJsStatement {
  bind(values: (string | number | null)[]): void;
  step(): boolean;
  get(): any[];
  free(): void;
  run(values?: (string | number | null)[]): void;
}

export interface QcIssue {
  type: 'error' | 'warning';
  message: string;
}

export interface QcResult {
  status: 'Passed' | 'Failed';
  issues: QcIssue[];
}
