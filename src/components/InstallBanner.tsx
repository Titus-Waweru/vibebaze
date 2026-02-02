import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallBanner = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('install_banner_dismissed');
    if (dismissed) return;

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Show after delay
    const timer = setTimeout(() => {
      setShow(true);
    }, 5000); // 5 seconds delay

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setShow(false);
      }
      setDeferredPrompt(null);
    } else {
      // For iOS or browsers without support, navigate to install page
      navigate("/install");
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('install_banner_dismissed', 'true');
    setShow(false);
  };

  if (isInstalled || !show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-lg p-4">
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
            <Download className="h-6 w-6 text-primary-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">Install VibeBaze</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {platform === "ios" 
                ? "Tap Share → Add to Home Screen"
                : "Get the full African creator experience"
              }
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-gradient-primary hover:shadow-glow flex-shrink-0"
          >
            {platform === "ios" ? (
              <Share className="h-4 w-4 mr-1" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Install
          </Button>
        </div>
      </div>
    </div>
  );
};
