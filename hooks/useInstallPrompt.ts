
import { useState, useEffect } from 'react';

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (PWA)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);
    
    // On iOS, show prompt automatically after delay IF NOT DISMISSED
    if (isIosDevice) {
        const isDismissed = localStorage.getItem('tacbook_install_dismissed');
        if (!isDismissed) {
            setTimeout(() => setShowPrompt(true), 3000);
        }
    }

    // Handle Android/Desktop Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Only auto-show if not dismissed
      const isDismissed = localStorage.getItem('tacbook_install_dismissed');
      if (!isDismissed) {
          setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (isIos) {
        setShowPrompt(true); // Re-open instructions
        return;
    }
    
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const closePrompt = () => {
      setShowPrompt(false);
      localStorage.setItem('tacbook_install_dismissed', 'true');
  };

  return {
      isIos,
      isInstallable: !!deferredPrompt || isIos,
      isStandalone,
      showPrompt,
      setShowPrompt, // Allow manual toggle
      handleInstall,
      closePrompt
  };
};
