
import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, ShieldCheck } from 'lucide-react';

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if we've already shown it recently or if it's already installed
      const lastPrompt = localStorage.getItem('klect_pwa_prompt_dismissed');
      const now = Date.now();
      if (!lastPrompt || now - parseInt(lastPrompt) > 86400000 * 7) { // Show once a week
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('klect_pwa_prompt_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] animate-in slide-in-from-top-4 duration-500">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 p-5 rounded-[2rem] shadow-2xl flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
          <Smartphone size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Tactical Upgrade</p>
          <p className="text-xs font-bold text-white leading-tight">Install KLECT.OPS on home screen for full field access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInstall}
            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl active:scale-95 shadow-lg whitespace-nowrap"
          >
            Install
          </button>
          <button 
            onClick={handleDismiss}
            className="p-2 bg-slate-800 text-slate-500 rounded-xl active:scale-95"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
