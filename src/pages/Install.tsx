import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Wifi, WifiOff, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    // Online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-4 shadow-lg">
            <Smartphone className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">TransPort</h1>
          <p className="text-muted-foreground">Gestion de Transport</p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  En ligne
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-orange-500" />
                  Hors ligne
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isOnline 
                ? "Connecté au serveur" 
                : "Mode hors-ligne activé - Les données seront synchronisées à la reconnexion"
              }
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Install Card */}
        <Card>
          <CardHeader>
            <CardTitle>Installer l'application</CardTitle>
            <CardDescription>
              Installez TransPort sur votre appareil pour un accès rapide et le mode hors-ligne
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstalled ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <Check className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Application installée</p>
                  <p className="text-sm text-green-600 dark:text-green-400">TransPort est prêt à être utilisé</p>
                </div>
              </div>
            ) : isIOS ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pour installer sur iPhone/iPad :
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Appuyez sur le bouton <strong>Partager</strong> (carré avec flèche)</li>
                  <li>Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil"</strong></li>
                  <li>Appuyez sur <strong>Ajouter</strong></li>
                </ol>
              </div>
            ) : deferredPrompt ? (
              <Button onClick={handleInstallClick} className="w-full" size="lg">
                <Download className="w-5 h-5 mr-2" />
                Installer TransPort
              </Button>
            ) : (
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  L'installation est disponible via le menu de votre navigateur
                </p>
              </div>
            )}

            {/* Features list */}
            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium">Avantages de l'installation :</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Accès rapide depuis l'écran d'accueil
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Fonctionnement hors-ligne
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Chargement plus rapide
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Interface plein écran
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Back button */}
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'application
        </Button>
      </div>
    </div>
  );
};

export default Install;
