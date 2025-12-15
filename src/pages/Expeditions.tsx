import { useState, useEffect, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, Truck, Search, Eye, CheckCircle, XCircle, Printer, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { generateShipmentPdf } from "@/lib/documentPdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type ShipmentType = "excess_baggage" | "unaccompanied_baggage" | "parcel" | "express";
type ShipmentStatus = "pending" | "in_transit" | "delivered" | "cancelled";

interface Shipment {
  id: number;
  reference: string;
  type: ShipmentType;
  trip_id: number | null;
  ticket_id: number | null;
  departure_agency_id: number | null;
  arrival_agency_id: number | null;
  sender_name: string;
  sender_phone: string | null;
  receiver_name: string;
  receiver_phone: string | null;
  description: string | null;
  weight_kg: number;
  quantity: number;
  price_per_kg: number;
  base_price: number;
  total_amount: number;
  status: ShipmentStatus;
  is_excess_baggage: boolean;
  created_at: string;
  delivered_at: string | null;
  trip?: {
    id: number;
    departure_datetime: string;
    route?: {
      name: string;
      departure_agency?: {
        id: number;
        code: string;
      };
    };
  };
  departure_agency?: {
    name: string;
  };
  arrival_agency?: {
    name: string;
  };
}

interface CompanySettings {
  company_name: string;
  logo_url: string | null;
  address?: string;
  phone?: string;
  email?: string;
  rccm?: string;
  ifu?: string;
}

const shipmentTypeLabels: Record<ShipmentType, string> = {
  excess_baggage: "Bagage excédentaire",
  unaccompanied_baggage: "Bagage non accompagné",
  parcel: "Colis",
  express: "Courrier express",
};

const shipmentTypeColors: Record<ShipmentType, string> = {
  excess_baggage: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  unaccompanied_baggage: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  parcel: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  express: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<ShipmentStatus, string> = {
  pending: "En attente",
  in_transit: "En transit",
  delivered: "Livré",
  cancelled: "Annulé",
};

const statusColors: Record<ShipmentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_transit: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// Génère une référence unique
function generateReference(type: ShipmentType, agencyCode: string): string {
  const prefix = type === "express" ? "EXP" : type === "parcel" ? "COL" : "BAG";
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `${prefix}-${agencyCode}-${year}-${random}`;
}

export default function Expeditions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Liste des expéditions
  const { data: shipments, isLoading } = useQuery({
    queryKey: ["shipments", statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("shipments")
        .select(
          `
          *,
          trip:trips(id, departure_datetime, route:routes(name, departure_agency:agencies!routes_departure_agency_id_fkey(id, code))),
          departure_agency:agencies!shipments_departure_agency_id_fkey(name),
          arrival_agency:agencies!shipments_arrival_agency_id_fkey(name)
        `,
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as ShipmentStatus);
      }
      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter as ShipmentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Shipment[];
    },
  });

  // Agences via API Laravel
  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => api.getAgencies(),
  });

  // Voyages (Supabase)
  const { data: trips = [] } = useQuery({
    queryKey: ["trips-for-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          `
          id,
          departure_datetime,
          status,
          route:routes(name, departure_agency:agencies!routes_departure_agency_id_fkey(id, code))
        `,
        )
        .in("status", ["planned", "boarding"])
        .order("departure_datetime", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  // Company settings
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("company_name, logo_url, address, phone, email, rccm, ifu")
        .limit(1)
        .single();
      if (error) throw error;
      return data as CompanySettings;
    },
  });

  // Création d'une expédition
  const createShipment = useMutation({
    mutationFn: async (data: {
      type: ShipmentType;
      trip_id: number | null;
      departure_agency_id: number;
      arrival_agency_id: number;
      sender_name: string;
      sender_phone?: string;
      receiver_name: string;
      receiver_phone?: string;
      description?: string;
      weight_kg: number;
      quantity: number;
      price_per_kg: number;
      base_price: number;
      is_excess_baggage: boolean;
      ticket_id?: number | null;
    }) => {
      const agency = agencies.find((a: any) => a.id === data.departure_agency_id);
      const agencyCode = (agency as any)?.code || "XXX";

      const reference = generateReference(data.type, agencyCode);
      const total_amount = data.weight_kg * data.price_per_kg + data.base_price;

      const { data: result, error } = await supabase
        .from("shipments")
        .insert({
          ...data,
          reference,
          total_amount,
          created_by: user?.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return result as Shipment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      toast.success("Expédition créée avec succès");
      logAudit({
        action: "SHIPMENT_CREATE",
        entityType: "shipment",
        entityId: data.id,
        description: `Expédition ${data.reference} créée - ${data.total_amount} F`,
      });
      setIsNewDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });

  // Mise à jour de statut
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ShipmentStatus }) => {
      const updates: any = { status };
      if (status === "delivered") {
        updates.delivered_at = new Date().toISOString();
        updates.delivered_by = user?.id;
      }

      const { error } = await supabase.from("shipments").update(updates).eq("id", id);

      if (error) throw error;
      return { id, status };
    },
    onSuccess: ({ id, status }) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      toast.success(`Statut mis à jour: ${statusLabels[status]}`);
      logAudit({
        action: "SHIPMENT_STATUS_CHANGE",
        entityType: "shipment",
        entityId: id,
        description: `Expédition statut changé: ${statusLabels[status]}`,
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });

  // Stats sécurisées
  const pendingCount = Array.isArray(shipments) ? shipments.filter((s) => s.status === "pending").length : 0;
  const inTransitCount = Array.isArray(shipments) ? shipments.filter((s) => s.status === "in_transit").length : 0;
  const deliveredCount = Array.isArray(shipments) ? shipments.filter((s) => s.status === "delivered").length : 0;
  const totalRevenue = Array.isArray(shipments)
    ? shipments.reduce((sum, s) => sum + (s.status !== "cancelled" ? s.total_amount : 0), 0)
    : 0;

  // Filtrage texte
  const filteredShipments = shipments?.filter((s) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      s.reference.toLowerCase().includes(search) ||
      s.sender_name.toLowerCase().includes(search) ||
      s.receiver_name.toLowerCase().includes(search) ||
      s.sender_phone?.toLowerCase().includes(search) ||
      s.receiver_phone?.toLowerCase().includes(search)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Expéditions</h1>
            <p className="text-muted-foreground">Gestion des bagages et courriers</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/expeditions/dashboard">
                <BarChart3 className="w-4 h-4" />
                Tableau de bord
              </Link>
            </Button>
            <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nouvelle expédition
                </Button>
              </DialogTrigger>
              <NewShipmentDialog
                onSubmit={(data) => createShipment.mutate(data)}
                isLoading={createShipment.isPending}
                agencies={agencies}
                trips={trips}
              />
            </Dialog>
          </div>
        </div>

        {/* Cards stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Package className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inTransitCount}</p>
                  <p className="text-xs text-muted-foreground">En transit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{deliveredCount}</p>
                  <p className="text-xs text-muted-foreground">Livrés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalRevenue.toLocaleString("fr-FR")} F</p>
                  <p className="text-xs text-muted-foreground">Recettes totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par référence, expéditeur, destinataire..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="excess_baggage">Bagage excédentaire</SelectItem>
                  <SelectItem value="unaccompanied_baggage">Bagage non accompagné</SelectItem>
                  <SelectItem value="parcel">Colis</SelectItem>
                  <SelectItem value="express">Courrier express</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_transit">En transit</SelectItem>
                  <SelectItem value="delivered">Livré</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des expéditions */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des expéditions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !filteredShipments || filteredShipments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune expédition trouvée</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Expéditeur</TableHead>
                      <TableHead>Destinataire</TableHead>
                      <TableHead>Trajet</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-mono text-sm">{shipment.reference}</TableCell>
                        <TableCell>
                          <Badge className={shipmentTypeColors[shipment.type]}>
                            {shipmentTypeLabels[shipment.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{shipment.sender_name}</p>
                            {shipment.sender_phone && (
                              <p className="text-xs text-muted-foreground">{shipment.sender_phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{shipment.receiver_name}</p>
                            {shipment.receiver_phone && (
                              <p className="text-xs text-muted-foreground">{shipment.receiver_phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {shipment.trip?.route?.name ? (
                            shipment.trip.route.name
                          ) : (
                            <span className="text-muted-foreground">
                              {shipment.departure_agency?.name} → {shipment.arrival_agency?.name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {shipment.total_amount.toLocaleString("fr-FR")} F
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[shipment.status]}>{statusLabels[shipment.status]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedShipment(shipment)}
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => generateShipmentPdf(shipment as any, { name: companySettings?.company_name || 'Transport Express', logoUrl: companySettings?.logo_url, address: companySettings?.address, phone: companySettings?.phone, email: companySettings?.email, rccm: companySettings?.rccm, ifu: companySettings?.ifu })}
                              title="Imprimer bordereau"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            {shipment.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  updateStatus.mutate({
                                    id: shipment.id,
                                    status: "in_transit",
                                  })
                                }
                                title="Marquer en transit"
                              >
                                <Truck className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                            {shipment.status === "in_transit" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  updateStatus.mutate({
                                    id: shipment.id,
                                    status: "delivered",
                                  })
                                }
                                title="Marquer comme livré"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            {(shipment.status === "pending" || shipment.status === "in_transit") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  updateStatus.mutate({
                                    id: shipment.id,
                                    status: "cancelled",
                                  })
                                }
                                title="Annuler"
                              >
                                <XCircle className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Détails */}
        {selectedShipment && (
          <ShipmentDetailDialog shipment={selectedShipment} onClose={() => setSelectedShipment(null)} />
        )}
      </div>
    </DashboardLayout>
  );
}

type NewShipmentDialogProps = {
  onSubmit: (data: any) => void;
  isLoading: boolean;
  agencies: any[];
  trips: any[];
};

function NewShipmentDialog({ onSubmit, isLoading, agencies, trips }: NewShipmentDialogProps) {
  const [type, setType] = useState<ShipmentType>("parcel");
  const [tripId, setTripId] = useState<string>("none");
  const [departureAgencyId, setDepartureAgencyId] = useState<string>("");
  const [arrivalAgencyId, setArrivalAgencyId] = useState<string>("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [description, setDescription] = useState("");
  const [weightKg, setWeightKg] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [pricePerKg, setPricePerKg] = useState("500");
  const [basePrice, setBasePrice] = useState("1000");

  // Tarifs
  const { data: pricingData = [] } = useQuery({
    queryKey: ["shipment-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipment_pricing").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const pricing = (pricingData as any[]).find((p) => p.type === type);
    if (pricing) {
      setPricePerKg(String(pricing.price_per_kg));
      setBasePrice(String(pricing.base_price));
    }
  }, [type, pricingData]);

  const totalAmount = (parseFloat(weightKg) || 0) * (parseFloat(pricePerKg) || 0) + (parseFloat(basePrice) || 0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!senderName || !receiverName || (tripId === "none" && (!departureAgencyId || !arrivalAgencyId))) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    onSubmit({
      type,
      trip_id: tripId === "none" ? null : parseInt(tripId, 10),
      departure_agency_id: parseInt(departureAgencyId, 10),
      arrival_agency_id: parseInt(arrivalAgencyId, 10),
      sender_name: senderName,
      sender_phone: senderPhone || undefined,
      receiver_name: receiverName,
      receiver_phone: receiverPhone || undefined,
      description: description || undefined,
      weight_kg: parseFloat(weightKg) || 0,
      quantity: parseInt(quantity, 10) || 1,
      price_per_kg: parseFloat(pricePerKg) || 0,
      base_price: parseFloat(basePrice) || 0,
      is_excess_baggage: type === "excess_baggage",
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nouvelle expédition</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="parcel" onValueChange={(v) => setType(v as ShipmentType)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="parcel">Colis</TabsTrigger>
            <TabsTrigger value="express">Express</TabsTrigger>
            <TabsTrigger value="excess_baggage">Excédent</TabsTrigger>
            <TabsTrigger value="unaccompanied_baggage">Non accompagné</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-2 gap-4">
          {/* Voyage */}
          <div className="col-span-2">
            <Label>Voyage associé (optionnel)</Label>
            <Select
              value={tripId}
              onValueChange={(v) => {
                setTripId(v);
                if (v === "none") return;
                const trip = trips.find((t: any) => t.id.toString() === v);
                if (trip?.route?.departure_agency) {
                  setDepartureAgencyId(trip.route.departure_agency.id.toString());
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un voyage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun voyage</SelectItem>
                {trips.map((trip: any) => (
                  <SelectItem key={trip.id} value={trip.id.toString()}>
                    {trip.route?.name} - {format(new Date(trip.departure_datetime), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agences */}
          <div>
            <Label>Agence départ *</Label>
            <Select value={departureAgencyId} onValueChange={setDepartureAgencyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency: any) => (
                  <SelectItem key={agency.id} value={agency.id.toString()}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Agence arrivée *</Label>
            <Select value={arrivalAgencyId} onValueChange={setArrivalAgencyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency: any) => (
                  <SelectItem key={agency.id} value={agency.id.toString()}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expéditeur */}
          <div>
            <Label>Nom expéditeur *</Label>
            <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Nom complet" />
          </div>
          <div>
            <Label>Téléphone expéditeur</Label>
            <Input value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="Numéro" />
          </div>

          {/* Destinataire */}
          <div>
            <Label>Nom destinataire *</Label>
            <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Nom complet" />
          </div>
          <div>
            <Label>Téléphone destinataire</Label>
            <Input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} placeholder="Numéro" />
          </div>

          {/* Description */}
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du contenu..."
              rows={2}
            />
          </div>

          {/* Tarifs */}
          <div>
            <Label>Poids (kg)</Label>
            <Input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
          <div>
            <Label>Quantité</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label>Prix/kg (F CFA)</Label>
            <Input type="number" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} />
          </div>
          <div>
            <Label>Frais de base (F CFA)</Label>
            <Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          </div>

          {/* Total */}
          <div className="col-span-2 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Montant total</span>
              <span className="text-2xl font-bold text-primary">{totalAmount.toLocaleString("fr-FR")} F CFA</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Création..." : "Créer l'expédition"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ShipmentDetailDialog({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Détails de l&apos;expédition</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg">{shipment.reference}</span>
            <Badge className={statusColors[shipment.status]}>{statusLabels[shipment.status]}</Badge>
          </div>

          <Badge className={shipmentTypeColors[shipment.type]}>{shipmentTypeLabels[shipment.type]}</Badge>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Expéditeur</p>
              <p className="font-medium">{shipment.sender_name}</p>
              {shipment.sender_phone && <p className="text-sm">{shipment.sender_phone}</p>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Destinataire</p>
              <p className="font-medium">{shipment.receiver_name}</p>
              {shipment.receiver_phone && <p className="text-sm">{shipment.receiver_phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Départ</p>
              <p className="font-medium">{shipment.departure_agency?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Arrivée</p>
              <p className="font-medium">{shipment.arrival_agency?.name}</p>
            </div>
          </div>

          {shipment.description && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">Description</p>
              <p>{shipment.description}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Poids</p>
              <p className="font-medium">{shipment.weight_kg} kg</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quantité</p>
              <p className="font-medium">{shipment.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Montant</p>
              <p className="font-bold text-primary">{shipment.total_amount.toLocaleString("fr-FR")} F</p>
            </div>
          </div>

          <div className="pt-4 border-t text-sm text-muted-foreground">
            <p>Créé le {format(new Date(shipment.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            {shipment.delivered_at && (
              <p>Livré le {format(new Date(shipment.delivered_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
