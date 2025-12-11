import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Camera, CameraOff, CheckCircle, XCircle, RotateCcw, User, MapPin, Calendar, CreditCard, Bus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface TicketInfo {
  ref: string;
  client: string;
  montant: number;
  trajet: string;
  depart: string;
  vehicule: string;
}

const formatCurrency = (value: number) => {
  const rounded = Math.round(value);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return formatted + ' F CFA';
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TicketScan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedTicket, setScannedTicket] = useState<TicketInfo | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';

  const startScanning = async () => {
    try {
      setScannedTicket(null);
      setScanStatus('idle');
      setErrorMessage('');

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanFailure
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      toast({
        title: 'Erreur camera',
        description: err.message || 'Impossible d\'acceder a la camera',
        variant: 'destructive',
      });
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      // Stop scanning immediately
      await stopScanning();

      // Parse the QR code data
      const ticketData = JSON.parse(decodedText) as TicketInfo;

      if (!ticketData.ref) {
        throw new Error('QR code invalide - reference manquante');
      }

      setScannedTicket(ticketData);
      setScanStatus('success');

      toast({
        title: 'Ticket valide',
        description: `Ticket ${ticketData.ref} verifie avec succes`,
      });
    } catch (err: any) {
      console.error('QR parse error:', err);
      setScanStatus('error');
      setErrorMessage(err.message || 'QR code invalide ou corrompu');

      toast({
        title: 'Erreur de lecture',
        description: err.message || 'QR code invalide',
        variant: 'destructive',
      });
    }
  };

  const onScanFailure = (error: string) => {
    // Silent failure - just means no QR code detected in this frame
  };

  const resetScan = () => {
    setScannedTicket(null);
    setScanStatus('idle');
    setErrorMessage('');
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Controle des tickets</h1>
          <p className="text-muted-foreground mt-1">Scannez le QR code du coupon de controle</p>
        </div>

        {/* Scanner Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Scanner QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scanner container */}
            <div 
              id={scannerContainerId} 
              className={cn(
                "relative w-full aspect-square max-w-[300px] mx-auto rounded-xl overflow-hidden bg-muted",
                !isScanning && "flex items-center justify-center"
              )}
            >
              {!isScanning && (
                <div className="text-center text-muted-foreground">
                  <CameraOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Camera inactive</p>
                </div>
              )}
            </div>

            {/* Control buttons */}
            <div className="flex justify-center gap-3">
              {!isScanning ? (
                <Button onClick={startScanning} className="gap-2">
                  <Camera className="w-4 h-4" />
                  Demarrer le scan
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="destructive" className="gap-2">
                  <CameraOff className="w-4 h-4" />
                  Arreter le scan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scan Result */}
        {scanStatus !== 'idle' && (
          <Card className={cn(
            "border-2 transition-colors",
            scanStatus === 'success' && "border-green-500 bg-green-50 dark:bg-green-950/20",
            scanStatus === 'error' && "border-destructive bg-destructive/10"
          )}>
            <CardContent className="pt-6">
              {scanStatus === 'success' && scannedTicket && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-8 h-8" />
                    <span className="text-xl font-bold">TICKET VALIDE</span>
                  </div>

                  {/* Ticket details */}
                  <div className="bg-background rounded-xl p-4 space-y-3">
                    <div className="text-center pb-3 border-b border-border">
                      <Badge variant="outline" className="text-lg px-4 py-1">
                        {scannedTicket.ref}
                      </Badge>
                    </div>

                    <div className="grid gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Passager</p>
                          <p className="font-medium">{scannedTicket.client}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Trajet</p>
                          <p className="font-medium">{scannedTicket.trajet || '-'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Depart</p>
                          <p className="font-medium">{formatDate(scannedTicket.depart)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <Bus className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Vehicule</p>
                          <p className="font-medium">{scannedTicket.vehicule || '-'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Montant paye</p>
                          <p className="font-bold text-lg">{formatCurrency(scannedTicket.montant)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={resetScan} variant="outline" className="w-full gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Scanner un autre ticket
                  </Button>
                </div>
              )}

              {scanStatus === 'error' && (
                <div className="space-y-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-destructive">
                    <XCircle className="w-8 h-8" />
                    <span className="text-xl font-bold">TICKET INVALIDE</span>
                  </div>
                  <p className="text-muted-foreground">{errorMessage}</p>
                  <Button onClick={resetScan} variant="outline" className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Reessayer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Instructions</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                Demandez le coupon de controle au passager
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                Cliquez sur "Demarrer le scan" pour activer la camera
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                Positionnez le QR code dans le cadre de la camera
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                Verifiez les informations affichees et conservez le coupon
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TicketScan;
