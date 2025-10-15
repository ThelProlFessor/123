import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { AnalyzedPatient, PatientSample, SqlJsDatabase, User, HistoryRecord } from '../types';
import { getAnalyzedPatients, addAnalyzedPatients as saveAnalyzedPatientsToDb } from '../services/analyzedPatientService';
import * as dbStorage from '../services/dbStorageService';
import * as authService from '../services/authService';
import { getHistory } from '../services/historyService';
import { validateLicenseKey } from '../services/licenseService';
import * as licenseKeyStoreService from '../services/licenseKeyStoreService';

const DEFAULT_LOGO_URL_LIGHT = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMjAiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAyMjAgNDgiPjxyZWN0IHdpZHRoPSIyMjAiIGhlaWdodD0iNDgiIHJ4PSI4IiBmaWxsPSIjZGJlYWZlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaGyPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMxZDRlZDgiPkFQLVJBRDwvdGV4dD48L3N2Zz4=';
const DEFAULT_LOGO_URL_DARK = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMjAiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAyMjAgNDgiPjxyZWN0IHdpZHRoPSIyMjAiIGhlaWdodD0iNDgiIHJ4PSI4IiBmaWxsPSIjMzA0MTU5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaGyPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiNkYmVhZmUiPkFQLVJBRDwvdGV4dD48L3N2Zz4=';

type Theme = 'light' | 'dark';
type DbStatus = 'unloaded' | 'loading' | 'loaded' | 'error';
type Language = 'en' | 'fa';

declare const initSqlJs: (config: { locateFile: (file: string) => string }) => Promise<any>;

interface Notification {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface LotModalState {
    isOpen: boolean;
    key: string | null;
    testsToAdd: number | null;
}

interface LabInfo {
    name: string;
    director: string;
    contact: string;
    address: string;
}

interface AppContextType {
  samples: PatientSample[];
  setSamples: React.Dispatch<React.SetStateAction<PatientSample[]>>;
  logoUrlLight: string | null;
  setLogoUrlLight: (url: string | null) => void;
  hasCustomLogoLight: boolean;
  logoUrlDark: string | null;
  setLogoUrlDark: (url: string | null) => void;
  hasCustomLogoDark: boolean;
  logoSize: number;
  setLogoSize: (size: number) => void;
  notification: Notification | null;
  showNotification: (message: string, type: 'success' | 'error') => void;
  analyzedPatients: AnalyzedPatient[];
  addAnalyzedPatients: (newPatients: AnalyzedPatient[]) => Promise<void>;
  theme: Theme;
  toggleTheme: () => void;
  db: SqlJsDatabase | null;
  dbStatus: DbStatus;
  setDbDirty: (isDirty: boolean) => void;
  exportDbToFile: () => void;
  importDbFromFile: (file: File) => void;
  resetDb: () => void;
  isAuthenticated: boolean;
  currentUser: User | null;
  loginUser: (username: string, password: string) => Promise<void>;
  logoutUser: () => void;
  history: HistoryRecord[];
  isHistoryLoading: boolean;
  refreshHistory: () => Promise<void>;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, options?: any) => any;
  isTranslationsLoading: boolean;
  licenseKey: string | null;
  remainingTests: number;
  maxTests: number;
  activateLicense: (key: string) => Promise<void>;
  consumeTestRuns: (count: number) => Promise<boolean>;
  lotModalState: LotModalState;
  setLotModalState: React.Dispatch<React.SetStateAction<LotModalState>>;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLowRunsModalOpen: boolean;
  setIsLowRunsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showLowRunsWarningIcon: boolean;
  confirmAndActivateLicense: (lotNumber: string) => Promise<boolean>;
  labInfo: LabInfo;
  saveLabInfo: (info: LabInfo) => Promise<void>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

const createDbTables = (db: SqlJsDatabase) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        NationalID TEXT, AdmissionID TEXT, PatientName TEXT, DateOfRecord TEXT,
        HPVDetectionStatus TEXT, HPVHighRiskStatus TEXT, HPVHighRiskTypes TEXT,
        HPVLowRiskStatus TEXT, HPVLowRiskTypes TEXT, SourceOfRecord TEXT,
        PRIMARY KEY (AdmissionID, DateOfRecord)
      );
      CREATE TABLE IF NOT EXISTS analyzed_patients (
        id TEXT PRIMARY KEY, name TEXT, date TEXT, hpvDetection TEXT,
        highRiskStatus TEXT, lowRiskStatus TEXT
      );
      CREATE TABLE IF NOT EXISTS analyzed_genotypes (
        patient_id TEXT NOT NULL, type TEXT NOT NULL, genotype TEXT NOT NULL, ct TEXT,
        FOREIGN KEY(patient_id) REFERENCES analyzed_patients(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS settings ( key TEXT PRIMARY KEY, value TEXT );
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT
      );
      CREATE TABLE IF NOT EXISTS used_licenses ( key TEXT PRIMARY KEY );
    `);

    // --- Schema Migration for User Authentication ---
    // This ensures that older databases without the 'salt' column are updated.
    try {
        const tableInfo = db.exec("PRAGMA table_info(users);");
        const hasSaltColumn = tableInfo[0].values.some(column => column[1] === 'salt');
        
        if (!hasSaltColumn) {
            db.exec("ALTER TABLE users ADD COLUMN salt TEXT;");
        }
    } catch (e) {
        // This might fail if the users table doesn't exist yet (e.g., first run), which is expected.
        console.warn("Could not check for users table migration, probably first run.", e);
    }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [samples, setSamples] = useState<PatientSample[]>([]);
  const [logoUrlLight, setLogoUrlLightState] = useState<string | null>(DEFAULT_LOGO_URL_LIGHT);
  const [logoUrlDark, setLogoUrlDarkState] = useState<string | null>(DEFAULT_LOGO_URL_DARK);
  const [hasCustomLogoLight, setHasCustomLogoLight] = useState(!!localStorage.getItem('customLogoLight'));
  const [hasCustomLogoDark, setHasCustomLogoDark] = useState(!!localStorage.getItem('customLogoDark'));
  const [logoSize, setLogoSizeState] = useState<number>(() => {
    const savedSize = localStorage.getItem('logoSize');
    return savedSize ? parseInt(savedSize, 10) : 48; // Default size 48px
  });
  const [notification, setNotification] = useState<Notification | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<Notification[]>([]);
  const [analyzedPatients, setAnalyzedPatients] = useState<AnalyzedPatient[]>([]);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'en');
  
  const [translations, setTranslations] = useState<{ [key in Language]?: any }>({});
  const [isTranslationsLoading, setIsTranslationsLoading] = useState(true);

  const [SQL, setSQL] = useState<any>(null);
  const [db, setDb] = useState<SqlJsDatabase | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus>('unloaded');
  const isDbDirty = useRef(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [remainingTests, setRemainingTests] = useState<number>(0);
  const [maxTests, setMaxTests] = useState<number>(0);
  const [lotModalState, setLotModalState] = useState<LotModalState>({ isOpen: false, key: null, testsToAdd: null });
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLowRunsModalOpen, setIsLowRunsModalOpen] = useState(false);
  const [showLowRunsWarningIcon, setShowLowRunsWarningIcon] = useState(false);
  const [labInfo, setLabInfo] = useState<LabInfo>({ name: '', director: '', contact: '', address: '' });


  // Notification handler
  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    const newNotif = { message, type, id: Date.now() };
    setNotificationQueue(prev => [...prev, newNotif]);
  }, []);

  // Load translations
  useEffect(() => {
    const fetchTranslations = async () => {
      setIsTranslationsLoading(true);
      try {
        const enUrl = new URL('../locales/en.json', import.meta.url).href;
        const faUrl = new URL('../locales/fa.json', import.meta.url).href;
        const [enRes, faRes] = await Promise.all([
          fetch(enUrl),
          fetch(faUrl)
        ]);
        if (!enRes.ok || !faRes.ok) {
          throw new Error(`HTTP error! status: ${enRes.status}, ${faRes.status}`);
        }
        const enData = await enRes.json();
        const faData = await faRes.json();
        setTranslations({ en: enData, fa: faData });
      } catch (error) {
        console.error("Error loading translations:", error);
        showNotification('Failed to load language files. Some text may not appear correctly.', 'error');
        setTranslations({ en: {}, fa: {} }); 
      } finally {
        setIsTranslationsLoading(false);
      }
    };
    fetchTranslations();
  }, [showNotification]);


  // FIX: Updated `t` function to handle `returnObjects: true` option to get arrays/objects from translation files.
  const t = useCallback((key: string, options?: any): any => {
    const langFile = translations[language];
    
    // Fallback logic if translations are not ready
    if (!langFile || Object.keys(langFile).length === 0) {
      const fallbackLangFile = translations['en'];
      if (fallbackLangFile && Object.keys(fallbackLangFile).length > 0) {
        let fallbackText = key.split('.').reduce((obj: any, k: string) => obj && obj[k], fallbackLangFile);
        if (options?.returnObjects) return fallbackText;
        if (typeof fallbackText === 'string') return fallbackText;
      }
      return key;
    }
  
    let text = key.split('.').reduce((obj: any, k: string) => obj && obj[k], langFile);
  
    if (options?.returnObjects) {
        return text;
    }

    if (typeof text !== 'string') {
      console.warn(`Translation key '${key}' not found for language '${language}'.`);
      return key;
    }
  
    if (options) {
      text = Object.keys(options).reduce((currentText, optKey) => {
        const regex = new RegExp(`{${optKey}}`, 'g');
        return currentText.replace(regex, options[optKey]);
      }, text);
    }
  
    return text;
  }, [language, translations]);

  // Use a ref to hold the latest `t` function to prevent effects from re-running on language change
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    setLanguage(language);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on initial load

  // Initialize sql.js
  useEffect(() => {
    initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}` })
      .then(sqlModule => setSQL(sqlModule))
      .catch(err => {
        console.error("Failed to load sql.js:", err);
        showNotification(tRef.current('notifications.dbEngineFailed'), 'error');
        setDbStatus('error');
      });
  }, [showNotification]);

  const refreshHistory = useCallback(async () => {
    if (db) {
      setIsHistoryLoading(true);
      const historyData = await getHistory(db);
      setHistory(historyData);
      setIsHistoryLoading(false);
    }
  }, [db]);

  // Load database from storage, runs only once when SQL is ready
  useEffect(() => {
    if (!SQL) return;
    setDbStatus('loading');
    dbStorage.loadDb()
      .then(async (dbFile) => {
        const newDb = new SQL.Database(dbFile || undefined);
        createDbTables(newDb);
        // On first run, create a default admin user.
        const users = newDb.exec("SELECT count(*) FROM users");
        if (users[0].values[0][0] === 0) {
            await authService.addUser(newDb, 'admin', 'admin123', tRef.current);
        }
        setDb(newDb);
        setDbStatus('loaded');
      })
      .catch(err => {
        console.error("Failed to initialize database:", err);
        showNotification(tRef.current('notifications.dbInitFailed'), 'error');
        setDbStatus('error');
      });
  }, [SQL, showNotification]);
  
  // After DB is loaded, load other data
  useEffect(() => {
    if (dbStatus !== 'loaded' || !db) return;

    const loadData = async () => {
        try {
            const storedSamples = localStorage.getItem('patientSamples');
            if (storedSamples) {
                setSamples(JSON.parse(storedSamples));
            }
        } catch (e) {
            console.error("Could not parse patient samples from localStorage, resetting.", e);
            setSamples([]);
            localStorage.setItem('patientSamples', '[]');
        }
        
        const storedLogoLight = localStorage.getItem('customLogoLight');
        if (storedLogoLight) setLogoUrlLightState(storedLogoLight);
        const storedLogoDark = localStorage.getItem('customLogoDark');
        if (storedLogoDark) setLogoUrlDarkState(storedLogoDark);
      
        try {
            const settingsKeys = ['licenseKey', 'remainingTests', 'maxTests', 'labName', 'labDirector', 'labContact', 'labAddress'];
            const results = db.exec(`SELECT key, value FROM settings WHERE key IN (${settingsKeys.map(k => `'${k}'`).join(',')})`);
            
            if (results.length > 0 && results[0].values.length > 0) {
                const settings = new Map(results[0].values.map(row => [row[0], row[1]]));
                const remaining = parseInt(settings.get('remainingTests') as string || '0', 10);
                setLicenseKey(settings.get('licenseKey') as string || null);
                setRemainingTests(remaining);
                setMaxTests(parseInt(settings.get('maxTests') as string || '0', 10));

                setLabInfo({
                    name: settings.get('labName') as string || '',
                    director: settings.get('labDirector') as string || '',
                    contact: settings.get('labContact') as string || '',
                    address: settings.get('labAddress') as string || '',
                });

                const LOW_RUNS_THRESHOLD = 10;
                if (remaining > 0 && remaining <= LOW_RUNS_THRESHOLD) {
                    setShowLowRunsWarningIcon(true);
                }
            }
        } catch (e) {
            console.error("Could not load settings from DB.", e);
        }

        // Now load analyzed patients from DB
        const dbAnalyzedPatients = await getAnalyzedPatients(db);
        setAnalyzedPatients(dbAnalyzedPatients);

        refreshHistory();
    };
    
    loadData();
  }, [dbStatus, db, refreshHistory]);

  const setDbDirty = useCallback((isDirty: boolean) => {
    isDbDirty.current = isDirty;
  }, []);

  // Autosave DB when dirty
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isDbDirty.current && db) {
        try {
          const binaryDb = db.export();
          await dbStorage.saveDb(binaryDb);
          isDbDirty.current = false;
        } catch (error) {
          console.error("Autosave failed:", error);
          showNotification(tRef.current('notifications.autoSaveFailed'), 'error');
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [db, showNotification]);

  useEffect(() => {
    if (notificationQueue.length > 0 && !notification) {
      const nextNotif = notificationQueue[0];
      setNotification(nextNotif);
      setNotificationQueue(prev => prev.slice(1));
      setTimeout(() => setNotification(null), 5000);
    }
  }, [notificationQueue, notification]);

  // State persistence
  useEffect(() => {
    localStorage.setItem('patientSamples', JSON.stringify(samples));
  }, [samples]);

  const setLogoUrlLight = (url: string | null) => {
    setLogoUrlLightState(url || DEFAULT_LOGO_URL_LIGHT);
    setHasCustomLogoLight(!!url);
    if (url) localStorage.setItem('customLogoLight', url);
    else localStorage.removeItem('customLogoLight');
  };
  
  const setLogoUrlDark = (url: string | null) => {
    setLogoUrlDarkState(url || DEFAULT_LOGO_URL_DARK);
    setHasCustomLogoDark(!!url);
    if (url) localStorage.setItem('customLogoDark', url);
    else localStorage.removeItem('customLogoDark');
  };

  const setLogoSize = (size: number) => {
    setLogoSizeState(size);
    localStorage.setItem('logoSize', size.toString());
  };

  const addAnalyzedPatients = async (newPatients: AnalyzedPatient[]) => {
    await saveAnalyzedPatientsToDb(db, newPatients);
    setDbDirty(true);
    // Refresh state from DB to ensure consistency
    const updatedPatients = await getAnalyzedPatients(db);
    setAnalyzedPatients(updatedPatients);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  const exportDbToFile = async () => {
    if (!db) {
        showNotification(t('notifications.dbEngineNotReady'), 'error');
        return;
    }
    try {
        const binaryDb = db.export();
        const blob = new Blob([binaryDb], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(0, -4);
        a.href = url;
        a.download = `AP-RAD_Backup_${timestamp}.sqlite`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification(t('notifications.dbExportSuccess'), 'success');
    } catch(e) {
        showNotification(t('notifications.dbExportFailed'), 'error');
    }
  };

  const importDbFromFile = (file: File) => {
     if (!SQL) {
        showNotification(t('notifications.dbEngineNotReady'), 'error');
        return;
     }
     const reader = new FileReader();
     reader.onload = async (e) => {
         try {
             const uInt8Array = new Uint8Array(e.target?.result as ArrayBuffer);
             await dbStorage.saveDb(uInt8Array); // Save to IndexedDB
             showNotification(t('notifications.dbImportSuccess', {fileName: file.name}), 'success');
             setTimeout(() => window.location.reload(), 2000);
         } catch(err) {
             showNotification(t('notifications.dbImportFailed'), 'error');
         }
     };
     reader.readAsArrayBuffer(file);
  };
  
  const resetDb = async () => {
    try {
        await dbStorage.deleteDb();
        showNotification(t('notifications.appResetSuccess'), 'success');
        setTimeout(() => window.location.reload(), 2000);
    } catch(e) {
        showNotification(t('notifications.appResetFailed'), 'error');
    }
  };

  // Auth methods
  const loginUser = async (username: string, password: string) => {
    if (!db) throw new Error(t('login.dbNotReady'));
    const user = await authService.login(db, username, password, t, setDbDirty);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };
  
  const logoutUser = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  };
  
  const consumeTestRuns = useCallback(async (count: number): Promise<boolean> => {
    if (!db) return false;
    if (remainingTests < count) {
      showNotification(tRef.current('analysis.notifications.notEnoughTestsRemaining', { count, remaining: remainingTests }), 'error');
      return false;
    }
    const newCount = remainingTests - count;
    try {
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        stmt.run(['remainingTests', newCount.toString()]);
        stmt.free();
        setRemainingTests(newCount);
        setDbDirty(true);

        const LOW_RUNS_THRESHOLD = 10;
        const hasBeenShown = sessionStorage.getItem('lowRunsModalShown');

        if (newCount > 0 && newCount <= LOW_RUNS_THRESHOLD) {
            setShowLowRunsWarningIcon(true);
            if (!hasBeenShown) {
                setIsLowRunsModalOpen(true);
                sessionStorage.setItem('lowRunsModalShown', 'true');
            }
        }

        return true;
    } catch (e) {
        console.error("Failed to update remaining tests in DB", e);
        showNotification(tRef.current('notifications.license.updateFailed'), 'error');
        return false;
    }
  }, [db, remainingTests, showNotification, setDbDirty]);

  const activateLicense = useCallback(async (key: string) => {
    if (!db) {
        showNotification(tRef.current('login.dbNotReady'), 'error');
        return;
    }
    
    // 0. Check persistent store first
    const isPermanentlyUsed = await licenseKeyStoreService.isKeyUsed(key);
    if (isPermanentlyUsed) {
        showNotification(tRef.current('notifications.license.alreadyUsedOnDevice'), 'error');
        return;
    }

    // 1. Validate key format
    const result = validateLicenseKey(key, tRef.current);
    if (!result.isValid || !result.testCount) {
        showNotification(tRef.current('notifications.license.invalid', { error: result.error || 'Unknown error' }), 'error');
        return;
    }

    // 2. Check if key has already been used in the current database
    try {
        const stmt = db.prepare("SELECT 1 FROM used_licenses WHERE key = ?");
        stmt.bind([key.toUpperCase()]);
        const isUsedInCurrentDb = stmt.step();
        stmt.free();
        if (isUsedInCurrentDb) {
            showNotification(tRef.current('notifications.license.alreadyUsed'), 'error');
            // Sync to permanent store just in case, to enforce consistency.
            await licenseKeyStoreService.addUsedKey(key);
            return;
        }
    } catch (e) {
        console.error("DB error checking for used license:", e);
        showNotification(tRef.current('common.error'), 'error');
        return;
    }

    // 3. Open Lot Number modal for the next step
    setLotModalState({ isOpen: true, key: key.toUpperCase(), testsToAdd: result.testCount });

  }, [db, showNotification]);

  const confirmAndActivateLicense = useCallback(async (lotNumber: string): Promise<boolean> => {
    const { key, testsToAdd } = lotModalState;
    if (!db || !key || !testsToAdd) return false;

    // 1. Validate Lot Number format
    const lotRegex = /^\d{2}31HPVKA\d{1,3}$/i;
    if (!lotRegex.test(lotNumber)) {
      showNotification(tRef.current('notifications.license.invalidLotFormat'), 'error');
      return false;
    }

    // 2. All checks passed, activate the license
    let settingsStmt;
    let usedLicenseStmt;
    try {
      const newTotalTests = remainingTests + testsToAdd;
      
      db.exec("BEGIN TRANSACTION;");
      settingsStmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('remainingTests', ?), ('licenseKey', ?), ('maxTests', ?)");
      usedLicenseStmt = db.prepare("INSERT INTO used_licenses (key) VALUES (?)");
      
      settingsStmt.run([newTotalTests.toString(), key, newTotalTests.toString()]);
      usedLicenseStmt.run([key]);
      db.exec("COMMIT;");

      setRemainingTests(newTotalTests);
      setMaxTests(newTotalTests);
      setLicenseKey(key);
      setDbDirty(true);

      // Persistently store the used key in the separate DB
      try {
        await licenseKeyStoreService.addUsedKey(key);
      } catch(e) {
          console.error("Failed to add key to persistent license store:", e);
          // This is not a critical failure for the user's current session, but it means
          // the license might be reusable if they reset. We'll just log it.
      }

      const LOW_RUNS_THRESHOLD = 10;
      if (newTotalTests > LOW_RUNS_THRESHOLD) {
          setShowLowRunsWarningIcon(false);
          sessionStorage.removeItem('lowRunsModalShown');
      }

      showNotification(tRef.current('notifications.license.activationComplete', { count: testsToAdd }), 'success');
      return true;
    } catch (e) {
      db.exec("ROLLBACK;");
      console.error("Failed to activate license in DB", e);
      showNotification(tRef.current('notifications.license.saveFailed'), 'error');
      return false;
    } finally {
        if (settingsStmt) settingsStmt.free();
        if (usedLicenseStmt) usedLicenseStmt.free();
    }
  }, [db, lotModalState, remainingTests, showNotification, setDbDirty]);
  
  const saveLabInfo = async (info: LabInfo) => {
    if (!db) return;
    try {
        db.exec("BEGIN TRANSACTION;");
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        Object.entries(info).forEach(([key, value]) => {
            const dbKey = `lab${key.charAt(0).toUpperCase() + key.slice(1)}`;
            stmt.run([dbKey, value]);
        });
        stmt.free();
        db.exec("COMMIT;");
        setLabInfo(info);
        setDbDirty(true);
        showNotification(tRef.current('settings.labInfo.notifications.saveSuccess'), 'success');
    } catch (e) {
        db.exec("ROLLBACK;");
        console.error("Failed to save lab info", e);
        showNotification(tRef.current('common.error'), 'error');
    }
  };


  const value = {
    samples,
    setSamples,
    logoUrlLight,
    setLogoUrlLight,
    hasCustomLogoLight,
    logoUrlDark,
    setLogoUrlDark,
    hasCustomLogoDark,
    logoSize,
    setLogoSize,
    notification,
    showNotification,
    analyzedPatients,
    addAnalyzedPatients,
    theme,
    toggleTheme,
    db,
    dbStatus,
    setDbDirty,
    exportDbToFile,
    importDbFromFile,
    resetDb,
    isAuthenticated,
    currentUser,
    loginUser,
    logoutUser,
    history,
    isHistoryLoading,
    refreshHistory,
    language,
    setLanguage,
    t,
    isTranslationsLoading,
    licenseKey,
    remainingTests,
    maxTests,
    activateLicense,
    consumeTestRuns,
    lotModalState,
    setLotModalState,
    confirmAndActivateLicense,
    isHelpModalOpen,
    setIsHelpModalOpen,
    isLowRunsModalOpen,
    setIsLowRunsModalOpen,
    showLowRunsWarningIcon,
    labInfo,
    saveLabInfo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};