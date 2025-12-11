import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Camera, CameraOff, CheckCircle, XCircle, RotateCcw, User, MapPin, Calendar, CreditCard, Bus, History, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface TicketInfo {
  ref: string;
  client: string;
  montant: number;
  trajet: string;
  depart: string;
  vehicule: string;
}

interface ScanRecord {
  id: number;
  ticket_reference: string;
  scanned_at: string;
  ticket_data: TicketInfo;
  is_valid: boolean;
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedTicket, setScannedTicket] = useState<TicketInfo | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';

  // Fetch scan history
  const { data: scanHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['ticket-scans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_scans')
        .select('*')
        .eq('scanned_by', user?.id)
        .order('scanned_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        ticket_data: item.ticket_data as unknown as TicketInfo
      })) as ScanRecord[];
    },
    enabled: !!user?.id,
  });

  // Save scan mutation
  const saveScanMutation = useMutation({
    mutationFn: async ({ ticketData, isValid }: { ticketData: TicketInfo; isValid: boolean }) => {
      const { error } = await supabase.from('ticket_scans').insert({
        ticket_reference: ticketData.ref,
        scanned_by: user?.id,
        ticket_data: ticketData as any,
        is_valid: isValid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-scans'] });
    },
  });

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
      await stopScanning();

      const ticketData = JSON.parse(decodedText) as TicketInfo;

      if (!ticketData.ref) {
        throw new Error('QR code invalide - reference manquante');
      }

      setScannedTicket(ticketData);
      setScanStatus('success');

      // Save the scan
      saveScanMutation.mutate({ ticketData, isValid: true });

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
    // Silent failure
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Controle des tickets</h1>
          <p className="text-muted-foreground mt-1">Scannez le QR code du coupon de controle</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <div className="space-y-4">
            {/* Scanner Card */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Scanner QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  id={scannerContainerId} 
                  className={cn(
                    "relative w-full aspect-square max-w-[280px] mx-auto rounded-xl overflow-hidden bg-muted",
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
                        <CheckCircle className="w-6 h-6" />
                        <span className="text-lg font-bold">TICKET VALIDE</span>
                      </div>

                      <div className="bg-background rounded-xl p-4 space-y-2">
                        <div className="text-center pb-2 border-b border-border">
                          <Badge variant="outline" className="text-base px-3 py-0.5">
                            {scannedTicket.ref}
                          </Badge>
                        </div>

                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">Passager:</span>
                            <span className="font-medium">{scannedTicket.client}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            <span className="text-muted-foreground">Trajet:</span>
                            <span className="font-medium">{scannedTicket.trajet || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-green-500" />
                            <span className="text-muted-foreground">Montant:</span>
                            <span className="font-bold">{formatCurrency(scannedTicket.montant)}</span>
                          </div>
                        </div>
                      </div>

                      <Button onClick={resetScan} variant="outline" className="w-full gap-2" size="sm">
                        <RotateCcw className="w-4 h-4" />
                        Scanner un autre ticket
                      </Button>
                    </div>
                  )}

                  {scanStatus === 'error' && (
                    <div className="space-y-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-destructive">
                        <XCircle className="w-6 h-6" />
                        <span className="text-lg font-bold">TICKET INVALIDE</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{errorMessage}</p>
                      <Button onClick={resetScan} variant="outline" className="gap-2" size="sm">
                        <RotateCcw className="w-4 h-4" />
                        Reessayer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* History Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5" />
                Historique des scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : scanHistory && scanHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Reference</TableHead>
                        <TableHead className="text-xs">Passager</TableHead>
                        <TableHead className="text-xs">Heure</TableHead>
                        <TableHead className="text-xs text-center">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scanHistory.map((scan) => (
                        <TableRow key={scan.id}>
                          <TableCell className="font-mono text-xs text-primary">
                            {scan.ticket_reference}
                          </TableCell>
                          <TableCell className="text-xs">
                            {scan.ticket_data?.client || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(scan.scanned_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {scan.is_valid ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun scan effectue</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
                Verifiez les informations et conservez le coupon
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TicketScan;
