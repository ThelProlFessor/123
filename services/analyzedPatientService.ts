

import { AnalyzedPatient, DetectedGenotype, SqlJsDatabase } from '../types';

export const getAnalyzedPatients = async (db: SqlJsDatabase | null): Promise<AnalyzedPatient[]> => {
  if (!db) return [];
  try {
    const patientsRes = db.exec("SELECT * FROM analyzed_patients");
    if (patientsRes.length === 0 || patientsRes[0].values.length === 0) {
      return [];
    }
    
    const patients = patientsRes[0].values.map(row => {
      const patient: any = {};
      patientsRes[0].columns.forEach((col, index) => {
        patient[col] = row[index];
      });
      return patient as Omit<AnalyzedPatient, 'highRiskGenotypes' | 'lowRiskGenotypes'>;
    });

    const genotypeStmt = db.prepare("SELECT type, genotype, ct FROM analyzed_genotypes WHERE patient_id = ?");
    
    const fullPatients = patients.map(p => {
      const highRiskGenotypes: DetectedGenotype[] = [];
      const lowRiskGenotypes: DetectedGenotype[] = [];

      genotypeStmt.bind([p.id]);
      while(genotypeStmt.step()) {
        const [type, genotype, ct] = genotypeStmt.get() as [string, string, string];
        if (type === 'high') {
          highRiskGenotypes.push({ genotype, ct });
        } else {
          lowRiskGenotypes.push({ genotype, ct });
        }
      }
      // FIX: A statement must be reset before it can be re-bound with new values.
      // The `reset()` method clears bindings and prepares the statement for another execution.
      // Although not in the provided `SqlJsStatement` interface, it is part of the sql.js API and essential for reusing statements in a loop.
      // The provided code was likely using an incomplete type definition.
      (genotypeStmt as any).reset();

      return {
        ...p,
        highRiskGenotypes,
        lowRiskGenotypes,
      };
    });

    genotypeStmt.free();
    return fullPatients;

  } catch (error) {
    console.error("Failed to get analyzed patients from DB", error);
    return [];
  }
};

export const addAnalyzedPatients = async (db: SqlJsDatabase | null, newPatients: AnalyzedPatient[]): Promise<void> => {
  if (!db || newPatients.length === 0) return;

  const patientStmt = db.prepare(`
    INSERT OR REPLACE INTO analyzed_patients (id, name, date, hpvDetection, highRiskStatus, lowRiskStatus) 
    VALUES (?, ?, ?, ?, ?, ?);
  `);
  const deleteGenotypesStmt = db.prepare("DELETE FROM analyzed_genotypes WHERE patient_id = ?");
  const genotypeStmt = db.prepare("INSERT INTO analyzed_genotypes (patient_id, type, genotype, ct) VALUES (?, ?, ?, ?)");
  
  try {
    // Note: sql.js does not support transactions around async operations.
    // We perform these operations sequentially for each patient.
    newPatients.forEach(p => {
      patientStmt.run([p.id, p.name, p.date, p.hpvDetection, p.highRiskStatus, p.lowRiskStatus]);
      deleteGenotypesStmt.run([p.id]);
      
      p.highRiskGenotypes.forEach(g => {
        genotypeStmt.run([p.id, 'high', g.genotype, g.ct]);
      });
      p.lowRiskGenotypes.forEach(g => {
        genotypeStmt.run([p.id, 'low', g.genotype, g.ct]);
      });
    });
  } catch (error) {
    console.error("Failed to save analyzed patients to DB", error);
    throw error;
  } finally {
    patientStmt.free();
    deleteGenotypesStmt.free();
    genotypeStmt.free();
  }
};