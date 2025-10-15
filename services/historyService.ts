
import { HistoryRecord, SqlJsDatabase } from '../types';

const historyColumns = [
    'NationalID', 'AdmissionID', 'PatientName', 'DateOfRecord', 
    'HPVDetectionStatus', 'HPVHighRiskStatus', 'HPVHighRiskTypes', 
    'HPVLowRiskStatus', 'HPVLowRiskTypes', 'SourceOfRecord'
];

export const getHistory = async (db: SqlJsDatabase | null): Promise<HistoryRecord[]> => {
    if (!db) return [];
    try {
        const results = db.exec("SELECT * FROM history ORDER BY DateOfRecord DESC");
        if (results.length === 0 || results[0].values.length === 0) {
            return [];
        }

        const records: HistoryRecord[] = results[0].values.map(row => {
            const record: any = {};
            results[0].columns.forEach((col, index) => {
                record[col] = row[index];
            });
            return record as HistoryRecord;
        });
        return records;
    } catch (error) {
        console.error("Failed to get patient history from DB", error);
        return [];
    }
};

export const addHistoryRecords = async (db: SqlJsDatabase | null, newRecords: HistoryRecord[]): Promise<void> => {
    if (!db || newRecords.length === 0) return;

    // Using prepared statements to prevent SQL injection.
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO history (
            NationalID, AdmissionID, PatientName, DateOfRecord, HPVDetectionStatus,
            HPVHighRiskStatus, HPVHighRiskTypes, HPVLowRiskStatus, HPVLowRiskTypes, SourceOfRecord
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    try {
        newRecords.forEach(record => {
            stmt.run([
                record.NationalID,
                record.AdmissionID,
                record.PatientName,
                record.DateOfRecord,
                record.HPVDetectionStatus,
                record.HPVHighRiskStatus,
                record.HPVHighRiskTypes,
                record.HPVLowRiskStatus,
                record.HPVLowRiskTypes,
                record.SourceOfRecord
            ]);
        });
    } catch (error) {
        console.error("Failed to save patient history to DB", error);
    } finally {
        // Free the statement to avoid memory leaks.
        stmt.free();
    }
};
