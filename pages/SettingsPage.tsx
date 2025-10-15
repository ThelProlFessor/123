import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import Card from '../components/Card';
import { DEVICE_LIMIT, ICONS } from '../constants';
import { AppContext } from '../contexts/AppContext';
import { User } from '../types';
import * as authService from '../services/authService';
import LicenseGauge from '../components/LicenseGauge';

// Hardcoded password for unlocking the logo controls.
const LOGO_PASSWORD = 'admin123';
const DEFAULT_RESET_PASSWORD = 'Barbod13821382';

// --- Icons ---
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const KeyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 7.5l-7.5 7.5M18 10l-1.5-1.5M12 6l1.5-1.5"/><circle cx="6" cy="18" r="3"/><path d="M21 3l-6 6"/></svg>;
const RemoveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
const AddUserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" x2="16" y1="11" y2="11"/><line x1="19" x2="19" y1="8" y2="14"/></svg>;
const SuccessIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

// --- Confirmation Modal Component ---
interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, confirmText, cancelText, confirmVariant = 'primary', onConfirm, onCancel }) => {
    const confirmButtonClasses = {
        primary: 'bg-primary hover:bg-primary-dark',
        danger: 'bg-danger hover:bg-red-700',
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onCancel}>
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-3">{title}</h2>
                <p className="text-text-secondary mb-6">{message}</p>
                <div className="flex justify-end space-x-3 rtl:space-x-reverse">
                    <button onClick={onCancel} className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-white font-semibold rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 ${confirmButtonClasses[confirmVariant]}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};


const UserManagementCard: React.FC = () => {
    const { db, showNotification, currentUser, setDbDirty, t } = useContext(AppContext);
    const [users, setUsers] = useState<User[]>([]);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; props: ConfirmationModalProps | null }>({ isOpen: false, props: null });

    const fetchUsers = useCallback(async () => {
        if (!db) return;
        const userList = await authService.getUsers(db);
        setUsers(userList);
    }, [db]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        if (!newUsername.trim() || !newPassword.trim()) {
            showNotification(t('settings.userManagement.notifications.emptyFields'), 'error');
            return;
        }
        if (newPassword.length < 8) {
             showNotification(t('settings.userManagement.notifications.passwordTooShort'), 'error');
            return;
        }
        try {
            await authService.addUser(db, newUsername, newPassword, t);
            showNotification(t('settings.userManagement.notifications.userAdded', { username: newUsername }), 'success');
            setNewUsername('');
            setNewPassword('');
            fetchUsers();
            setDbDirty(true);
        } catch (error: any) {
            showNotification(error.message, 'error');
        }
    };

    const confirmRemoveUser = (userId: number, username: string) => {
        setModalConfig({
            isOpen: true,
            props: {
                title: t('settings.userManagement.modals.removeTitle'),
                message: t('settings.userManagement.modals.removeMessage', { username }),
                confirmText: t('settings.userManagement.removeUser'),
                cancelText: t('common.cancel'),
                confirmVariant: "danger",
                onConfirm: () => handleRemoveUser(userId, username),
                onCancel: () => setModalConfig({ isOpen: false, props: null }),
            }
        });
    };

    const handleRemoveUser = async (userId: number, username: string) => {
        if (!db) return;
        try {
            await authService.removeUser(db, userId);
            showNotification(t('settings.userManagement.notifications.userRemoved', { username }), 'success');
            fetchUsers();
            setDbDirty(true);
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setModalConfig({ isOpen: false, props: null });
        }
    };
    
    const confirmResetPassword = (userId: number, username: string) => {
        setModalConfig({
            isOpen: true,
            props: {
                title: t('settings.userManagement.modals.resetTitle'),
                message: t('settings.userManagement.modals.resetMessage', { username, password: DEFAULT_RESET_PASSWORD }),
                confirmText: t('settings.userManagement.modals.resetButton'),
                cancelText: t('common.cancel'),
                confirmVariant: "primary",
                onConfirm: () => handleResetPassword(userId, username),
                onCancel: () => setModalConfig({ isOpen: false, props: null }),
            }
        });
    };

    const handleResetPassword = async (userId: number, username: string) => {
        if (!db) return;
        try {
            await authService.resetPassword(db, userId, DEFAULT_RESET_PASSWORD);
            showNotification(t('settings.userManagement.notifications.passwordReset', { username }), 'success');
            setDbDirty(true);
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setModalConfig({ isOpen: false, props: null });
        }
    };


    return (
        <>
        {modalConfig.isOpen && modalConfig.props && <ConfirmationModal {...modalConfig.props} />}
        <Card title={t('settings.userManagement.title')}>
            <div className="space-y-6">
                <div>
                    <p className="font-semibold text-text-primary mb-2 text-sm">{t('settings.userManagement.existingUsers')}</p>
                    <div className="max-h-48 overflow-y-auto pe-2 space-y-2 border border-border rounded-lg p-2 bg-surface-alt">
                        {users.length > 0 ? users.map(user => (
                            <div key={user.id} className="flex justify-between items-center p-2 bg-surface rounded-md shadow-sm">
                                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                   <span className="text-text-muted"><UserIcon /></span>
                                   <span className="font-medium text-text-primary">{user.username}</span>
                                </div>
                                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                   <button onClick={() => confirmResetPassword(user.id, user.username)} className="p-2 text-text-secondary hover:text-primary rounded-full hover:bg-primary-light transition-all duration-200" title={t('settings.userManagement.resetPassword')}>
                                      <KeyIcon />
                                   </button>
                                   <button onClick={() => confirmRemoveUser(user.id, user.username)} disabled={user.id === currentUser?.id} className="p-2 text-text-secondary hover:text-danger rounded-full hover:bg-danger/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200" title={t('settings.userManagement.removeUser')}>
                                      <RemoveIcon />
                                   </button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-text-muted text-sm p-4">{t('settings.userManagement.noUsers')}</div>
                        )}
                    </div>
                </div>
                <div>
                    <p className="font-semibold text-text-primary mb-2 text-sm">{t('settings.userManagement.addUser')}</p>
                    <form onSubmit={handleAddUser} className="space-y-3">
                        <input
                            type="text"
                            placeholder={t('settings.userManagement.username')}
                            value={newUsername}
                            onChange={e => setNewUsername(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder={t('settings.userManagement.password')}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                        <button type="submit" className="w-full flex justify-center items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                            <AddUserIcon />
                            <span>{t('settings.userManagement.addUserButton')}</span>
                        </button>
                    </form>
                </div>
            </div>
        </Card>
        </>
    );
};

const LanguageCard: React.FC = () => {
    const { language, setLanguage, t } = useContext(AppContext);

    return (
        <Card title={t('settings.languageCard.title')}>
            <div className="flex space-x-4 rtl:space-x-reverse">
                <button
                    onClick={() => setLanguage('en')}
                    className={`flex-1 p-4 rounded-lg border-2 font-semibold transition-all ${language === 'en' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' : 'bg-surface-alt border-border hover:border-primary'}`}
                >
                    {t('settings.languageCard.english')}
                </button>
                <button
                    onClick={() => setLanguage('fa')}
                    className={`flex-1 p-4 rounded-lg border-2 font-semibold transition-all ${language === 'fa' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' : 'bg-surface-alt border-border hover:border-primary'}`}
                >
                    {t('settings.languageCard.persian')}
                </button>
            </div>
        </Card>
    );
};

const LotNumberModal: React.FC = () => {
    const { t, lotModalState, setLotModalState, confirmAndActivateLicense } = useContext(AppContext);
    const [lotNumber, setLotNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleClose = useCallback(() => {
        if (isLoading) return;
        setLotModalState({ isOpen: false, key: null, testsToAdd: null });
        // Reset state for next time
        setTimeout(() => {
            setLotNumber('');
            setIsLoading(false);
            setIsSuccess(false);
        }, 300); // delay to allow modal to fade out
    }, [isLoading, setLotModalState]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const success = await confirmAndActivateLicense(lotNumber);
        if (success) {
            setIsSuccess(true);
            setTimeout(handleClose, 2000); // Show success message for 2 seconds
        } else {
            setIsLoading(false);
        }
    };

    if (!lotModalState.isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={handleClose}>
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                {isSuccess ? (
                    <div className="text-center p-4">
                        <span className="text-success inline-block"><SuccessIcon /></span>
                        <h2 className="text-xl font-bold text-text-primary mt-3">{t('settings.license.activationSuccessTitle')}</h2>
                        <p className="text-text-secondary mt-2">{t('settings.license.kitNameMessage')}</p>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-bold text-text-primary mb-3">{t('settings.license.lotModalTitle')}</h2>
                        <p className="text-text-secondary mb-4 text-sm">{t('settings.license.lotModalMessage')}</p>
                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                placeholder={t('settings.license.lotNumberPlaceholder')}
                                value={lotNumber}
                                onChange={e => setLotNumber(e.target.value.toUpperCase())}
                                className="font-mono text-center"
                                autoFocus
                                required
                            />
                            <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-6">
                                <button type="button" onClick={handleClose} disabled={isLoading} className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50">
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50">
                                    {isLoading ? `${t('common.loading')}...` : t('settings.license.confirmActivationButton')}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};


const LicenseCard: React.FC = () => {
    const { activateLicense, t } = useContext(AppContext);
    const [licenseInput, setLicenseInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleActivate = async () => {
        setIsLoading(true);
        await activateLicense(licenseInput);
        setIsLoading(false);
        setLicenseInput('');
    };

    return (
        <>
            <LotNumberModal />
            <Card title={t('settings.license.title')}>
                <div className="space-y-6">
                    <div>
                        <p className="font-semibold text-text-primary mb-2 text-sm">{t('settings.license.statusTitle')}</p>
                        <div className="flex items-center justify-center p-4 bg-surface-alt rounded-lg">
                           <LicenseGauge />
                        </div>
                    </div>
                    <div>
                        <p className="font-semibold text-text-primary mb-2 text-sm">{t('settings.license.enterKey')}</p>
                        <div className="flex space-x-2 rtl:space-x-reverse">
                            <input
                                type="text"
                                placeholder="AP-XXXXX-RAD"
                                value={licenseInput}
                                onChange={e => setLicenseInput(e.target.value.toUpperCase())}
                                className="font-mono"
                            />
                            <button onClick={handleActivate} disabled={isLoading} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50">
                            {isLoading ? `${t('common.loading')}...` : t('settings.license.activateButton')}
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
        </>
    );
}

const LaboratoryInfoCard: React.FC = () => {
    const { t, labInfo, saveLabInfo } = useContext(AppContext);
    const [currentInfo, setCurrentInfo] = useState(labInfo);

    useEffect(() => {
        setCurrentInfo(labInfo);
    }, [labInfo]);

    const handleSave = () => {
        saveLabInfo(currentInfo);
    };
    
    const distributorInfo = t('settings.labInfo.distributor', { returnObjects: true });

    return (
        <Card title={t('settings.labInfo.title')} className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Distributor Info */}
                <div className="space-y-4">
                    <h4 className="font-bold text-text-primary">{t('settings.labInfo.distributorTitle')}</h4>
                    <p className="text-lg font-semibold text-primary">{distributorInfo.name}</p>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-x-3">
                            <span className="text-text-muted pt-0.5">{ICONS.phone}</span>
                            <div>
                                <p className="font-semibold text-text-secondary">{t('settings.labInfo.labels.phone')}:</p>
                                <div className="flex flex-col items-start gap-y-1 mt-1 text-text-primary">
                                    {distributorInfo.phones.map((phone: string) => <span key={phone}>{phone}</span>)}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-x-3">
                            <span className="text-text-muted pt-0.5">{ICONS.fax}</span>
                            <div>
                                <p className="font-semibold text-text-secondary">{t('settings.labInfo.labels.fax')}:</p>
                                <p className="text-text-primary mt-1">{distributorInfo.fax}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-x-3">
                            <span className="text-text-muted pt-0.5">{ICONS.email}</span>
                            <div>
                                <p className="font-semibold text-text-secondary">{t('settings.labInfo.labels.email')}:</p>
                                <a href={`mailto:${distributorInfo.email}`} className="text-primary hover:underline break-all">{distributorInfo.email}</a>
                            </div>
                        </div>
                        <div className="flex items-start gap-x-3">
                            <span className="text-text-muted pt-0.5">{ICONS.website}</span>
                            <div>
                                <p className="font-semibold text-text-secondary">{t('settings.labInfo.labels.website')}:</p>
                                <a href={distributorInfo.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{distributorInfo.website}</a>
                            </div>
                        </div>
                        <div className="flex items-start gap-x-3">
                           <span className="text-text-muted pt-0.5">{ICONS.address}</span>
                            <div>
                                <p className="font-semibold text-text-secondary">{t('settings.labInfo.labels.address')}:</p>
                                <p className="text-text-primary mt-1">{distributorInfo.address}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Lab Info */}
                <div className="space-y-4">
                    <h4 className="font-bold text-text-primary">{t('settings.labInfo.userLabTitle')}</h4>
                    <div>
                        <label className="text-sm font-semibold text-text-primary mb-1 block">{t('settings.labInfo.fields.labName')}</label>
                        <input type="text" value={currentInfo.name} onChange={e => setCurrentInfo(p => ({...p, name: e.target.value}))} />
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-text-primary mb-1 block">{t('settings.labInfo.fields.labDirector')}</label>
                        <input type="text" value={currentInfo.director} onChange={e => setCurrentInfo(p => ({...p, director: e.target.value}))} />
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-text-primary mb-1 block">{t('settings.labInfo.fields.labContact')}</label>
                        <input type="text" value={currentInfo.contact} onChange={e => setCurrentInfo(p => ({...p, contact: e.target.value}))} />
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-text-primary mb-1 block">{t('settings.labInfo.fields.labAddress')}</label>
                        <textarea value={currentInfo.address} onChange={e => setCurrentInfo(p => ({...p, address: e.target.value}))} rows={3}></textarea>
                    </div>
                    <div className="pt-2 text-end">
                        <button onClick={handleSave} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                           {t('settings.labInfo.saveButton')}
                        </button>
                    </div>
                </div>
            </div>
        </Card>
    );
};


const SettingsPage: React.FC = () => {
  const { 
    logoUrlLight, setLogoUrlLight, hasCustomLogoLight,
    logoUrlDark, setLogoUrlDark, hasCustomLogoDark,
    logoSize, setLogoSize,
    showNotification, exportDbToFile, importDbFromFile, resetDb, t 
  } = useContext(AppContext);
  
  const fileInputRefLight = useRef<HTMLInputElement>(null);
  const fileInputRefDark = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLocked, setIsLocked] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [dbModalConfig, setDbModalConfig] = useState<{ isOpen: boolean; props: ConfirmationModalProps | null }>({ isOpen: false, props: null });


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, theme: 'light' | 'dark') => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        showNotification(t('settings.appSettings.notifications.fileTooLarge'), 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (theme === 'light') {
          setLogoUrlLight(result);
        } else {
          setLogoUrlDark(result);
        }
        showNotification(t('settings.appSettings.notifications.logoUpdated', { theme }), 'success');
      };
      reader.onerror = () => {
        showNotification(t('settings.appSettings.notifications.fileReadError'), 'error');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = (theme: 'light' | 'dark') => {
    if (theme === 'light') {
      fileInputRefLight.current?.click();
    } else {
      fileInputRefDark.current?.click();
    }
  };

  const handleRemoveClick = (theme: 'light' | 'dark') => {
    if (theme === 'light') {
      setLogoUrlLight(null);
      if (fileInputRefLight.current) fileInputRefLight.current.value = "";
    } else {
      setLogoUrlDark(null);
      if (fileInputRefDark.current) fileInputRefDark.current.value = "";
    }
    showNotification(t('settings.appSettings.notifications.logoRemoved', { theme }), 'success');
  };
  
  const handleUnlockClick = () => {
    setShowPasswordModal(true);
    setPasswordError('');
    setPasswordInput('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === LOGO_PASSWORD) {
      setIsLocked(false);
      setShowPasswordModal(false);
      showNotification(t('notifications.controlsUnlocked'), 'success');
    } else {
      setPasswordError(t('settings.appSettings.passwordModal.incorrect'));
    }
  };
  
  const handleImportClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
       setDbModalConfig({
            isOpen: true,
            props: {
                title: t('settings.dbManagement.modals.importTitle'),
                message: t('settings.dbManagement.modals.importMessage', { fileName: file.name }),
                confirmText: t('settings.dbManagement.modals.importButton'),
                cancelText: t('common.cancel'),
                confirmVariant: "danger",
                onConfirm: () => {
                    importDbFromFile(file);
                    setDbModalConfig({ isOpen: false, props: null });
                },
                onCancel: () => setDbModalConfig({ isOpen: false, props: null }),
            }
        });
      event.target.value = '';
    }
  };

  const handleReset = () => {
    setDbModalConfig({
        isOpen: true,
        props: {
            title: t('settings.dbManagement.modals.resetTitle'),
            message: t('settings.dbManagement.modals.resetMessage'),
            confirmText: t('settings.dbManagement.modals.resetButton'),
            cancelText: t('common.cancel'),
            confirmVariant: "danger",
            onConfirm: () => {
                resetDb();
                setDbModalConfig({ isOpen: false, props: null });
            },
            onCancel: () => setDbModalConfig({ isOpen: false, props: null }),
        }
    });
  };

  const PasswordModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-sm m-4">
        <h2 className="text-lg font-bold text-text-primary mb-4">{t('settings.appSettings.passwordModal.title')}</h2>
        <p className="text-sm text-text-secondary mb-4">{t('settings.appSettings.passwordModal.message')}</p>
        <form onSubmit={handlePasswordSubmit}>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder={t('settings.appSettings.passwordModal.placeholder')}
            autoFocus
          />
          {passwordError && <p className="text-danger text-sm mt-2">{passwordError}</p>}
          <div className="flex justify-end space-x-2 rtl:space-x-reverse mt-6">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95"
            >
              {t('settings.appSettings.passwordModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {showPasswordModal && <PasswordModal />}
      {dbModalConfig.isOpen && dbModalConfig.props && <ConfirmationModal {...dbModalConfig.props} />}
      <LotNumberModal />

      <h1 className="text-3xl font-extrabold text-text-primary">{t('settings.title')}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <UserManagementCard />
        <LanguageCard />
        <LicenseCard />
        <Card title={t('settings.dbManagement.title')} className="lg:col-span-1">
            <div className="space-y-4 divide-y divide-border-light">
                <div className="pt-4 first:pt-0">
                    <p className="text-sm text-text-secondary mb-4">
                        {t('settings.dbManagement.description')}
                    </p>
                </div>
                <div className="pt-4 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-text-primary">{t('settings.dbManagement.backupRestore')}</p>
                        <p className="text-xs text-text-muted">{t('settings.dbManagement.backupRestoreDesc')}</p>
                    </div>
                    <div className="flex space-x-2 rtl:space-x-reverse">
                        <input type="file" ref={importFileInputRef} onChange={handleImportFileSelect} accept=".sqlite,.db" className="hidden" />
                        <button onClick={handleImportClick} className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">{t('settings.dbManagement.importButton')}</button>
                        <button onClick={exportDbToFile} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">{t('settings.dbManagement.exportButton')}</button>
                    </div>
                </div>
                <div className="pt-4 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-text-primary text-danger">{t('settings.dbManagement.resetApp')}</p>
                        <p className="text-xs text-text-muted">{t('settings.dbManagement.resetAppDesc')}</p>
                    </div>
                    <button onClick={handleReset} className="px-4 py-2 bg-danger text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">{t('settings.dbManagement.resetButton')}</button>
                </div>
            </div>
        </Card>
        <LaboratoryInfoCard />
        <Card title={t('settings.appSettings.title')} className="lg:col-span-2">
          <div className="space-y-4 divide-y divide-border-light">
            <div className="pt-4 first:pt-0 grid grid-cols-2">
              <div>
                <p className="font-semibold text-text-primary">{t('settings.appSettings.version')}</p>
                <p className="text-text-secondary">{t('settings.appSettings.versionInfo')}</p>
              </div>
               <div>
                <p className="font-semibold text-text-primary">{t('settings.appSettings.deviceLimit')}</p>
                <p className="text-text-secondary">{t('settings.appSettings.deviceLimitInfo', {limit: DEVICE_LIMIT})}</p>
              </div>
            </div>
            
            <div className="pt-4">
              <p className="font-semibold text-text-primary mb-2">{t('settings.appSettings.customLogos')}</p>
              {isLocked ? (
                  <div className="flex justify-center p-4 bg-surface-alt rounded-lg">
                    <button onClick={handleUnlockClick} className="px-4 py-2 bg-warning text-white font-semibold rounded-lg hover:bg-yellow-600 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                        {t('settings.appSettings.unlockButton')}
                    </button>
                  </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Light Theme Logo */}
                    <div>
                      <p className="text-sm font-medium text-text-secondary mb-2">{t('settings.appSettings.lightLogo')}</p>
                      <div className="flex items-center space-x-4 rtl:space-x-reverse">
                        <div className="w-32 h-16 bg-slate-100 rounded-md flex items-center justify-center border border-border">
                          {logoUrlLight ? (
                            <img src={logoUrlLight} alt="Light Logo Preview" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-xs text-text-muted">{t('settings.appSettings.noLogo')}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <input type="file" ref={fileInputRefLight} onChange={(e) => handleFileChange(e, 'light')} accept="image/png, image/jpeg, image/svg+xml, image/gif" className="hidden" />
                          <button onClick={() => handleUploadClick('light')} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                            {hasCustomLogoLight ? t('settings.appSettings.change') : t('settings.appSettings.upload')}
                          </button>
                          {hasCustomLogoLight && (
                            <button onClick={() => handleRemoveClick('light')} className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                              {t('settings.appSettings.remove')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                     {/* Dark Theme Logo */}
                    <div>
                      <p className="text-sm font-medium text-text-secondary mb-2">{t('settings.appSettings.darkLogo')}</p>
                      <div className="flex items-center space-x-4 rtl:space-x-reverse">
                        <div className="w-32 h-16 bg-slate-800 rounded-md flex items-center justify-center border border-border">
                          {logoUrlDark ? (
                            <img src={logoUrlDark} alt="Dark Logo Preview" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-xs text-text-muted">{t('settings.appSettings.noLogo')}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <input type="file" ref={fileInputRefDark} onChange={(e) => handleFileChange(e, 'dark')} accept="image/png, image/jpeg, image/svg+xml, image/gif" className="hidden" />
                          <button onClick={() => handleUploadClick('dark')} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                            {hasCustomLogoDark ? t('settings.appSettings.change') : t('settings.appSettings.upload')}
                          </button>
                          {hasCustomLogoDark && (
                            <button onClick={() => handleRemoveClick('dark')} className="px-4 py-2 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">
                              {t('settings.appSettings.remove')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-border-light">
                    <label htmlFor="logo-size-slider" className="block text-sm font-medium text-text-secondary mb-2">{t('settings.appSettings.logoSize')}</label>
                    <div className="flex items-center gap-4">
                        <input
                            id="logo-size-slider"
                            type="range"
                            min="32"
                            max="80"
                            step="1"
                            value={logoSize}
                            onChange={(e) => setLogoSize(parseInt(e.target.value, 10))}
                            className="w-full"
                        />
                        <span className="font-mono text-sm text-text-primary bg-surface-alt px-2 py-1 rounded-md">{logoSize}px</span>
                    </div>
                  </div>
                </>
              )}
              <p className="text-xs text-text-muted mt-2">{t('settings.appSettings.logoSpecs')}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;