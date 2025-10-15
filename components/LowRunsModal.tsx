import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';

// Icons for contact info
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const FaxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 17h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2a2 2 0 0 1-2-2V3a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Z"/><path d="M15 9h-5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5Z"/></svg>;
const EmailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const WebsiteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const AddressIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const CheckIcon = () => <svg className="w-5 h-5 text-primary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;


const LowRunsModal: React.FC = () => {
    const { isLowRunsModalOpen, setIsLowRunsModalOpen, t, logoUrlDark } = useContext(AppContext);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isLowRunsModalOpen) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        }
    }, [isLowRunsModalOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => setIsLowRunsModalOpen(false), 300); // Match duration-300
    };

    if (!isLowRunsModalOpen) return null;

    // FIX: Added `{ returnObjects: true }` to `t` calls to correctly parse arrays and objects from translation files.
    const info = t('lowRunsModal.company', { returnObjects: true }) || {};
    const benefits = t('lowRunsModal.benefits', { returnObjects: true }) || [];

    return (
        <div 
            className={`fixed inset-0 bg-black z-50 flex justify-center items-center p-4 transition-opacity duration-300 ease-out ${isVisible ? 'bg-opacity-60' : 'bg-opacity-0'}`} 
            onClick={handleClose}
        >
            <div 
                className={`bg-surface rounded-2xl shadow-2xl w-full max-w-4xl m-4 flex flex-col max-h-[95vh] overflow-hidden transition-all duration-300 ease-out ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="grid md:grid-cols-2">
                    {/* Left Side - Persuasive Content */}
                    <div className="p-8 bg-surface-alt flex flex-col items-center text-center">
                         {logoUrlDark && (
                          <img src={logoUrlDark} alt="Company Logo" className="h-16 w-auto max-w-[240px] object-contain mb-6" />
                        )}
                        <h2 className="text-2xl font-extrabold text-text-primary mb-3">{t('lowRunsModal.title')}</h2>
                        <p className="text-text-secondary leading-relaxed mb-6">{t('lowRunsModal.message')}</p>

                        <div className="space-y-3 text-start w-full">
                            {Array.isArray(benefits) && benefits.map((benefit: string, index: number) => (
                                <div key={index} className="flex items-start gap-x-3">
                                    <CheckIcon />
                                    <span className="text-text-secondary font-medium">{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side - Contact Info */}
                    <div className="p-8 flex flex-col">
                        <h3 className="text-lg font-bold text-text-primary mb-4">{t('lowRunsModal.contactTitle')}</h3>
                        <div className="space-y-4 text-sm flex-grow">
                             <div className="flex items-start gap-x-3">
                                <span className="text-primary pt-0.5"><PhoneIcon/></span>
                                <div>
                                    <p className="font-semibold text-text-secondary">{t('lowRunsModal.phone')}:</p>
                                    <div className="flex flex-col items-start gap-y-1 mt-1">
                                      {Array.isArray(info.phones) && info.phones.map((phone: string) => <a key={phone} href={`tel:${phone.replace(/-/g, '')}`} className="text-text-primary hover:underline">{phone}</a>)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-x-3">
                               <span className="text-primary pt-0.5"><FaxIcon/></span>
                                <div>
                                    <p className="font-semibold text-text-secondary">{t('lowRunsModal.fax')}:</p>
                                    <p className="text-text-primary mt-1">{info.fax}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-x-3">
                               <span className="text-primary pt-0.5"><EmailIcon/></span>
                                <div>
                                    <p className="font-semibold text-text-secondary">{t('lowRunsModal.email')}:</p>
                                    <a href={`mailto:${info.email}`} className="text-primary hover:underline break-all">{info.email}</a>
                                </div>
                            </div>
                             <div className="flex items-start gap-x-3">
                               <span className="text-primary pt-0.5"><WebsiteIcon/></span>
                                <div>
                                    <p className="font-semibold text-text-secondary">{t('lowRunsModal.website')}:</p>
                                    <a href={info.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{info.website}</a>
                                </div>
                            </div>
                            <div className="flex items-start gap-x-3">
                               <span className="text-primary pt-0.5"><AddressIcon/></span>
                                <div>
                                    <p className="font-semibold text-text-secondary">{t('lowRunsModal.address')}:</p>
                                    <p className="text-text-primary mt-1">{info.address}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end items-center gap-x-4 mt-6">
                            <button onClick={handleClose} className="px-5 py-2.5 bg-surface-alt text-text-secondary font-semibold rounded-lg hover:bg-border transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95">{t('common.close')}</button>
                            <a href={info.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-x-2 px-6 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-primary/30">
                                {t('lowRunsModal.ctaButton')}
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LowRunsModal;