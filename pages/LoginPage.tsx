import React, { useState, useContext, FormEvent, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';

// --- "DNA Helix" 3D Background ---

const DnaModel: React.FC<{ duration: number }> = ({ duration }) => {
    const pairColors = ['#a3e635', '#facc15', '#ef4444', '#8b5cf6', '#3b82f6', '#14b8a6'];
    const backboneStyle = 'absolute w-3 h-3 rounded-full bg-indigo-400';
    const pairStyle = 'absolute w-[45px] h-1 rounded-full';
    const text = 'AP-RAD';

    return (
        <div className="w-16 h-48 relative animate-slow-spin-y" style={{ transformStyle: 'preserve-3d', animationDuration: `${duration}s` }}>
            {Array.from({ length: 12 }).map((_, i) => {
                const angle = i * 30;
                return (
                    <React.Fragment key={i}>
                        <div className={backboneStyle} style={{ top: `${i * 8 + 3}%`, left: 'calc(50% - 6px)', transform: `rotateY(${angle}deg) translateZ(20px)` }} />
                        <div className={backboneStyle} style={{ top: `${i * 8 + 3}%`, left: 'calc(50% - 6px)', background: '#4f46e5', transform: `rotateY(${angle + 180}deg) translateZ(20px)` }} />
                        <div className={pairStyle} style={{ top: `${i * 8 + 5}%`, left: 'calc(50% - 22.5px)', background: pairColors[i % pairColors.length], transform: `rotateY(${angle + 90}deg)` }} />
                    </React.Fragment>
                );
            })}
            <div className="absolute inset-0 flex flex-col items-center justify-evenly" style={{ transform: 'translateZ(1px)' }}>
                {text.split('').map((char, index) => (
                    <div key={index} className="text-2xl font-black text-sky-100 animate-text-glow">
                        {char}
                    </div>
                ))}
            </div>
        </div>
    );
};


const DnaHelixBackground: React.FC = () => {
    const helices = useMemo(() => {
        const numHelices = 20;
        const gridX = 5;
        const gridY = 5;

        // Create a list of grid cell coordinates
        const gridCells: {x: number, y: number}[] = [];
        for (let i = 0; i < gridX; i++) {
            for (let j = 0; j < gridY; j++) {
                gridCells.push({ x: i, y: j });
            }
        }

        // Shuffle the cells to randomize positions (Fisher-Yates shuffle)
        for (let i = gridCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gridCells[i], gridCells[j]] = [gridCells[j], gridCells[i]];
        }

        return Array.from({ length: numHelices }).map((_, i) => {
            const scale = 0.5 + Math.random() * 0.7;
            const z = -700 + Math.random() * 650;
            const initialTransform = `scale(${scale}) translateZ(${z}px)`;

            // Define the total area where helices can appear (120% x 120% with a -10% offset)
            const totalWidth = 120;
            const totalHeight = 120;
            const offsetX = -10;
            const offsetY = -10;
            
            const cellWidth = totalWidth / gridX;
            const cellHeight = totalHeight / gridY;
            
            const cell = gridCells[i % gridCells.length]; // Use modulo in case numHelices > grid size

            // Add some random "jitter" within the cell to avoid a perfect grid look
            const jitterX = (Math.random() - 0.5) * cellWidth * 0.6;
            const jitterY = (Math.random() - 0.5) * cellHeight * 0.6;
            
            const left = offsetX + (cell.x * cellWidth) + (cellWidth / 2) + jitterX;
            const top = offsetY + (cell.y * cellHeight) + (cellHeight / 2) + jitterY;

            return {
                id: i,
                initialTransform: initialTransform,
                spinDuration: 15 + Math.random() * 20,
                floatDuration: 25 + Math.random() * 25,
                delay: -Math.random() * 50,
                style: {
                    top: `${top}%`,
                    left: `${left}%`,
                }
            };
        });
    }, []);

    return (
        <div className="absolute inset-0 z-0 bg-transparent overflow-hidden" style={{ perspective: '1000px' }}>
            <div 
                className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.3),rgba(255,255,255,0))]"
            />
            <div
                className="absolute inset-0 animate-stream-flow"
                style={{
                    backgroundImage: `linear-gradient(to bottom, transparent, rgb(15, 23, 42)),
                                      linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '100% 100%, 50px 50px, 50px 50px',
                    maskImage: 'radial-gradient(circle at center, white 0%, transparent 70%)',
                }}
            />
            <div 
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {helices.map(helix => (
                    <div
                        key={helix.id}
                        className="absolute animate-float-and-fade"
                        style={{
                            ...helix.style,
                            animationDuration: `${helix.floatDuration}s`,
                            animationDelay: `${helix.delay}s`,
                        }}
                    >
                       <div
                            style={{
                                transform: helix.initialTransform,
                            }}
                        >
                           <DnaModel duration={helix.spinDuration} />
                       </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- Login Page Component ---
const LoginPage: React.FC = () => {
    const { loginUser, logoUrlDark, language, t, setIsHelpModalOpen } = useContext(AppContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await loginUser(username, password);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
            setIsLoading(false);
        }
    };

    const getAnimationStyle = (delay: number) => ({
        transitionDelay: `${delay}ms`,
        transitionProperty: 'opacity, transform',
        transitionDuration: '500ms',
    });
    
    return (
        <div className={`w-full h-screen flex justify-center items-center relative overflow-hidden bg-slate-900 ${language === 'fa' ? 'font-vazir' : 'font-sans'}`}>
            <DnaHelixBackground />

            <button
                onClick={() => setIsHelpModalOpen(true)}
                className="fixed top-6 right-6 z-30 flex items-center gap-x-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white font-semibold backdrop-blur-md hover:bg-white/20 transition-colors duration-200"
                aria-label={t('login.helpButton')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                <span>{t('login.helpButton')}</span>
            </button>

            <div
                className={`relative z-20 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl shadow-black/30 transition-all ease-in-out
                ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={getAnimationStyle(100)}
            >
                <div className="p-8 md:p-10">
                    <div className="flex justify-center mb-6">
                        {logoUrlDark ? (
                          <img src={logoUrlDark} alt="App Logo" className="h-24 w-auto max-w-[320px] object-contain" />
                        ) : (
                          <div className="text-5xl font-extrabold text-primary bg-primary-light px-8 py-4 rounded-lg">
                            AP-RAD
                          </div>
                        )}
                    </div>

                    <div className={`transition-all ease-in-out ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={getAnimationStyle(200)}>
                        <h2 className="text-3xl font-extrabold text-center text-white">{t('login.welcome')}</h2>
                        <p className="text-center text-slate-300 mt-2">{t('login.signInMessage')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div className={`relative transition-all ease-in-out ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={getAnimationStyle(300)}>
                            <label htmlFor="username" className="text-sm font-bold text-slate-300">{t('login.usernameLabel')}</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full mt-2 px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors placeholder:text-slate-400 text-white"
                                placeholder={t('login.usernamePlaceholder')}
                            />
                        </div>

                        <div className={`relative transition-all ease-in-out ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={getAnimationStyle(400)}>
                            <label htmlFor="password"  className="text-sm font-bold text-slate-300">{t('login.passwordLabel')}</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full mt-2 px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors placeholder:text-slate-400 text-white"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="bg-danger/20 border border-danger/50 text-danger text-sm font-semibold text-center p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className={`transition-all ease-in-out ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={getAnimationStyle(500)}>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full px-6 py-4 text-white font-bold rounded-lg flex justify-center items-center transform hover:-translate-y-1 active:scale-95 transition-all duration-500 bg-gradient-to-r from-primary via-sky-400 to-primary bg-[length:200%_auto] hover:bg-[position:100%_0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : null}
                                <span>{isLoading ? t('common.loading') : t('login.signInButton')}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;