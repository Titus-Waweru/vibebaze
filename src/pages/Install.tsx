import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, Apple, Chrome, Share, Plus, MoreVertical, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Install VibeLoop</h1>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center shadow-lg">
            <Download className="w-12 h-12 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold">Get VibeLoop on Your Device</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Install VibeLoop for a faster, app-like experience with offline support and quick access from your home screen.
          </p>
        </div>

        {/* Install Button for supported browsers */}
        {deferredPrompt && !isInstalled && (
          <Card className="border-primary/50 bg-card">
            <CardContent className="p-6">
              <Button
                onClick={handleInstallClick}
                size="lg"
                className="w-full text-lg py-6 bg-primary hover:bg-primary/90"
              >
                <Download className="w-5 h-5 mr-2" />
                Install VibeLoop Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Already Installed */}
        {isInstalled && (
          <Card className="border-green-500/50 bg-green-500/10">
            <CardContent className="p-6 text-center">
              <p className="text-green-500 font-semibold text-lg">
                ✓ VibeLoop is installed on your device!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Platform-specific Instructions */}
        <div className="space-y-6">
          {/* iOS Instructions */}
          {(platform === "ios" || platform === "desktop") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Apple className="w-6 h-6" />
                  iPhone & iPad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Open in Safari</p>
                      <p className="text-sm text-muted-foreground">VibeLoop must be opened in Safari browser</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Tap the Share button</p>
                      <Share className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Tap "Add to Home Screen"</p>
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">4</span>
                    </div>
                    <p className="font-medium">Tap "Add" to confirm</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Android Instructions */}
          {(platform === "android" || platform === "desktop") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6" />
                  Android
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Open in Chrome</p>
                      <Chrome className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Tap the menu button</p>
                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <p className="font-medium">Tap "Install app" or "Add to Home screen"</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">4</span>
                    </div>
                    <p className="font-medium">Tap "Install" to confirm</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desktop Instructions */}
          {platform === "desktop" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Monitor className="w-6 h-6" />
                  Desktop (Chrome, Edge)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <p className="font-medium">Look for the install icon in the address bar</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <p className="font-medium">Click "Install" in the popup</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <p className="font-medium">VibeLoop will open in its own window</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Why Install?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Faster load times and smoother experience</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Works offline - browse cached content anytime</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Quick access from your home screen</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Full-screen experience without browser UI</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Install;
