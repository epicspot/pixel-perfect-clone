import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, Route, Bus, Users, Plus, Pencil, Trash2, Loader2, Shield, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel, getRoleColorClasses, UserRole } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { PermissionsManager } from "@/components/admin/PermissionsManager";
import { useIsSiegeUser } from "@/hooks/useIsSiegeUser";

type Tab = "agencies" | "routes" | "vehicles" | "users" | "permissions";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value) + " F";
};

/** Convert Supabase / PostgREST errors into actionable French messages. */
const parseAgencyError = (error: any): { title: string; detail: string } => {
  const code = error?.code || error?.details?.code;
  const msg = (error?.message || "").toLowerCase();
  if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
    return {
      title: "Code agence déjà utilisé",
      detail: "Une autre agence possède déjà ce code. Choisissez un code unique (ex: OUA, BOB, SIE).",
    };
  }
  if (code === "23503" || msg.includes("foreign key") || msg.includes("violates foreign")) {
    return {
      title: "Suppression bloquée",
      detail:
        "Cette agence est rattachée à des lignes, voyages, utilisateurs ou tickets existants. Réaffectez ou supprimez ces données d'abord.",
    };
  }
  if (code === "42501" || msg.includes("permission denied") || msg.includes("rls") || msg.includes("policy")) {
    return {
      title: "Accès refusé",
      detail: "Seuls les administrateurs et le personnel du Siège peuvent gérer les agences.",
    };
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return {
      title: "Erreur réseau",
      detail: "Vérifiez votre connexion internet et réessayez.",
    };
  }
  return {
    title: "Erreur",
    detail: error?.message || "Une erreur inattendue est survenue.",
  };
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState<Tab>("agencies");
  const { profile } = useAuth();
  const { isAdmin, hasSiegeAccess } = useIsSiegeUser();

  if (!hasSiegeAccess) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Accès réservé aux administrateurs et au personnel du Siège.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground mt-1">Configuration des agences, lignes, véhicules et utilisateurs</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TabButton
            icon={Building2}
            label="Agences"
            active={activeTab === "agencies"}
            onClick={() => setActiveTab("agencies")}
          />
          <TabButton
            icon={Route}
            label="Lignes"
            active={activeTab === "routes"}
            onClick={() => setActiveTab("routes")}
          />
          <TabButton
            icon={Bus}
            label="Véhicules"
            active={activeTab === "vehicles"}
            onClick={() => setActiveTab("vehicles")}
          />
          {isAdmin && (
            <>
              <TabButton
                icon={Users}
                label="Utilisateurs"
                active={activeTab === "users"}
                onClick={() => setActiveTab("users")}
              />
              <TabButton
                icon={Shield}
                label="Permissions"
                active={activeTab === "permissions"}
                onClick={() => setActiveTab("permissions")}
              />
            </>
          )}
        </div>

        {activeTab === "agencies" && <AgenciesTab />}
        {activeTab === "routes" && <RoutesTab />}
        {activeTab === "vehicles" && <VehiclesTab />}
        {activeTab === "users" && isAdmin && <UsersTab />}
        {activeTab === "permissions" && isAdmin && (
          <Card className="p-6">
            <PermissionsManager />
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

const TabButton = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <Button variant={active ? "default" : "outline"} size="sm" onClick={onClick} className="gap-2">
    <Icon className="w-4 h-4" />
    {label}
  </Button>
);

/* ---------- AGENCIES TAB ---------- */
const AgenciesTab = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [sort, setSort] = useState<{ key: "name" | "code" | "status"; direction: "asc" | "desc" }>({
    key: "name",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formError, setFormError] = useState<{ title: string; detail: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    is_active: true,
  });

  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ["agencies-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agencies").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Counts of dependencies per agency (routes + users) to inform deletion
  const { data: agencyStats } = useQuery({
    queryKey: ["agencies-admin-stats"],
    queryFn: async () => {
      const [routesRes, profilesRes] = await Promise.all([
        supabase.from("routes").select("id, departure_agency_id, arrival_agency_id"),
        supabase.from("profiles").select("id, agency_id"),
      ]);
      const stats: Record<number, { routes: number; users: number }> = {};
      (routesRes.data || []).forEach((r: any) => {
        [r.departure_agency_id, r.arrival_agency_id].forEach((aid) => {
          if (!aid) return;
          stats[aid] = stats[aid] || { routes: 0, users: 0 };
          stats[aid].routes += 1;
        });
      });
      (profilesRes.data || []).forEach((p: any) => {
        if (!p.agency_id) return;
        stats[p.agency_id] = stats[p.agency_id] || { routes: 0, users: 0 };
        stats[p.agency_id].users += 1;
      });
      return stats;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // ---- Client-side validation ----
      if (!form.name.trim()) throw { __validation: true, title: "Nom requis", detail: "Le nom de l'agence est obligatoire." };
      if (form.name.trim().length < 2)
        throw { __validation: true, title: "Nom trop court", detail: "Le nom doit contenir au moins 2 caractères." };
      if (!form.code.trim())
        throw { __validation: true, title: "Code requis", detail: "Le code de l'agence est obligatoire." };
      if (!/^[A-Z0-9]{2,5}$/.test(form.code.trim().toUpperCase()))
        throw {
          __validation: true,
          title: "Code invalide",
          detail: "Le code doit comporter 2 à 5 caractères alphanumériques (ex: OUA, BOB2).",
        };
      if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
        throw { __validation: true, title: "Email invalide", detail: "Format attendu : nom@domaine.ext" };
      if (form.phone && form.phone.replace(/\D/g, "").length < 6)
        throw { __validation: true, title: "Téléphone invalide", detail: "Le numéro semble trop court." };

      const code = form.code.trim().toUpperCase();

      // Pre-flight duplicate code check (avoids confusing DB error)
      const dup = agencies.find(
        (a: any) => (a.code || "").toUpperCase() === code && (!editing || a.id !== editing.id),
      );
      if (dup)
        throw {
          __validation: true,
          title: "Code agence déjà utilisé",
          detail: `Le code "${code}" est déjà attribué à l'agence "${dup.name}".`,
        };

      const payload = {
        name: form.name.trim(),
        code,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        is_active: form.is_active,
      };

      if (editing) {
        const { data, error } = await supabase
          .from("agencies")
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single();
        if (error) throw error;
        const fields: Array<{ k: keyof typeof payload; label: string }> = [
          { k: "name", label: "nom" },
          { k: "code", label: "code" },
          { k: "city", label: "ville" },
          { k: "address", label: "adresse" },
          { k: "phone", label: "téléphone" },
          { k: "email", label: "email" },
          { k: "is_active", label: "statut" },
        ];
        const changes = fields
          .filter((f) => (editing as any)[f.k] !== (payload as any)[f.k])
          .map((f) => f.label)
          .join(", ");
        await audit.agencyUpdate(data.id, data.name, data.code, changes || undefined);
        return { mode: "update" as const, data, changes };
      } else {
        const { data, error } = await supabase.from("agencies").insert(payload).select().single();
        if (error) throw error;
        await audit.agencyCreate(data.id, data.name, data.code);
        return { mode: "create" as const, data };
      }
    },
    onMutate: () => {
      setFormError(null);
      const toastId = toast.loading(editing ? "Mise à jour de l'agence..." : "Création de l'agence...");
      return { toastId };
    },
    onSuccess: (result, _vars, ctx) => {
      queryClient.invalidateQueries({ queryKey: ["agencies-admin"] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      setDialogOpen(false);
      resetForm();
      if (result.mode === "update") {
        toast.success(`Agence "${result.data.name}" mise à jour`, {
          id: ctx?.toastId,
          description: result.changes ? `Champs modifiés : ${result.changes}` : "Aucun champ modifié.",
        });
      } else {
        toast.success(`Agence "${result.data.name}" créée`, {
          id: ctx?.toastId,
          description: `Code : ${result.data.code}${result.data.city ? ` · ${result.data.city}` : ""}`,
        });
      }
    },
    onError: (error: any, _vars, ctx) => {
      const parsed = error?.__validation
        ? { title: error.title, detail: error.detail }
        : parseAgencyError(error);
      setFormError(parsed);
      toast.error(parsed.title, { id: ctx?.toastId, description: parsed.detail });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (agency: any) => {
      const newStatus = !agency.is_active;
      const { error } = await supabase
        .from("agencies")
        .update({ is_active: newStatus })
        .eq("id", agency.id);
      if (error) throw error;
      await audit.agencyUpdate(
        agency.id,
        agency.name,
        agency.code,
        `statut → ${newStatus ? "actif" : "inactif"}`,
      );
      return { agency, newStatus };
    },
    onMutate: (agency) => {
      const toastId = toast.loading(`Mise à jour du statut de "${agency.name}"...`);
      return { toastId };
    },
    onSuccess: ({ agency, newStatus }, _vars, ctx) => {
      queryClient.invalidateQueries({ queryKey: ["agencies-admin"] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      toast.success(`"${agency.name}" est maintenant ${newStatus ? "active" : "inactive"}`, {
        id: ctx?.toastId,
        description: newStatus
          ? "L'agence apparaîtra dans les sélecteurs opérationnels."
          : "L'agence est masquée des nouvelles opérations.",
      });
    },
    onError: (error: any, _vars, ctx) => {
      const parsed = parseAgencyError(error);
      toast.error(parsed.title, { id: ctx?.toastId, description: parsed.detail });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (agency: any) => {
      const { error } = await supabase.from("agencies").delete().eq("id", agency.id);
      if (error) throw error;
      await audit.agencyDelete(agency.id, agency.name, agency.code);
      return agency;
    },
    onMutate: (agency) => {
      const toastId = toast.loading(`Suppression de "${agency.name}"...`);
      return { toastId };
    },
    onSuccess: (agency, _vars, ctx) => {
      queryClient.invalidateQueries({ queryKey: ["agencies-admin"] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      queryClient.invalidateQueries({ queryKey: ["agencies-admin-stats"] });
      setConfirmDelete(null);
      toast.success(`Agence "${agency.name}" supprimée`, {
        id: ctx?.toastId,
        description: `Code ${agency.code} libéré et réutilisable.`,
      });
    },
    onError: (error: any, _vars, ctx) => {
      const parsed = parseAgencyError(error);
      toast.error(parsed.title, { id: ctx?.toastId, description: parsed.detail });
    },
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", code: "", city: "", address: "", phone: "", email: "", is_active: true });
  };

  const openEdit = (agency: any) => {
    setEditing(agency);
    setForm({
      name: agency.name ?? "",
      code: agency.code ?? "",
      city: agency.city ?? "",
      address: agency.address ?? "",
      phone: agency.phone ?? "",
      email: agency.email ?? "",
      is_active: agency.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const filtered = agencies.filter((a: any) => {
    if (statusFilter === "active" && !a.is_active) return false;
    if (statusFilter === "inactive" && a.is_active) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.name || "").toLowerCase().includes(q) ||
      (a.code || "").toLowerCase().includes(q) ||
      (a.city || "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a: any, b: any) => {
    let cmp = 0;
    if (sort.key === "name") {
      cmp = (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" });
    } else if (sort.key === "code") {
      cmp = (a.code || "").localeCompare(b.code || "", "fr", { sensitivity: "base" });
    } else if (sort.key === "status") {
      cmp = a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
    }
    return sort.direction === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const start = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, sorted.length);

  const toggleSort = (key: "name" | "code" | "status") => {
    setSort((prev) => (prev.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }));
  };

  const SortIcon = ({ column }: { column: "name" | "code" | "status" }) => {
    if (sort.key !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground opacity-50" />;
    return sort.direction === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  };

  const activeCount = agencies.filter((a: any) => a.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-end">
        <div>
          <h2 className="text-lg font-semibold">Agences</h2>
          <p className="text-xs text-muted-foreground">
            {agencies.length} agence(s) · {activeCount} active(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Rechercher (nom, code, ville)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64"
          />
          <Select
            value={statusFilter}
            onValueChange={(v: any) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="active">Actives</SelectItem>
              <SelectItem value="inactive">Inactives</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("code")}>
                    <div className="flex items-center gap-1">Code <SortIcon column="code" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <div className="flex items-center gap-1">Nom <SortIcon column="name" /></div>
                  </TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">Lignes</TableHead>
                  <TableHead className="text-center">Utilisateurs</TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    <div className="flex items-center justify-center gap-1">Statut <SortIcon column="status" /></div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((a: any) => {
                  const stats = agencyStats?.[a.id] || { routes: 0, users: 0 };
                  const hasDeps = stats.routes > 0 || stats.users > 0;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {a.code || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.city || "—"}</TableCell>
                      <TableCell className="text-xs">
                        <div>{a.phone || "—"}</div>
                        {a.email && <div className="text-muted-foreground">{a.email}</div>}
                      </TableCell>
                      <TableCell className="text-center">{stats.routes}</TableCell>
                      <TableCell className="text-center">{stats.users}</TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => toggleActiveMutation.mutate(a)}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            a.is_active
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          title="Cliquer pour basculer"
                        >
                          {a.is_active ? "Active" : "Inactive"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={hasDeps}
                          title={
                            hasDeps
                              ? "Impossible : agence rattachée à des lignes ou utilisateurs"
                              : "Supprimer"
                          }
                          onClick={() => setConfirmDelete(a)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Aucune agence
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
              <div className="text-xs text-muted-foreground">
                Affichage {start}–{end} sur {sorted.length} résultat{sorted.length > 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Par page</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-16 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs px-2">
                    Page {safePage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'agence" : "Nouvelle agence"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nom *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Ouagadougou Centre"
                  maxLength={100}
                />
              </div>
              <div className="grid gap-2">
                <Label>Code (3-5 lettres) *</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase().slice(0, 5) })
                  }
                  placeholder="Ex: OUA"
                  maxLength={5}
                  className="font-mono uppercase"
                />
                <p className="text-[10px] text-muted-foreground">
                  Utilisé pour la numérotation des tickets
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Ville</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Ex: Ouagadougou"
                  maxLength={80}
                />
              </div>
              <div className="grid gap-2">
                <Label>Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex: +226 70 00 00 00"
                  maxLength={30}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Adresse</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ex: Avenue Kwame Nkrumah"
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Ex: ouaga@compagnie.bf"
                maxLength={120}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">Agence active</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name || !form.code || saveMutation.isPending}
              isLoading={saveMutation.isPending}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'agence ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. L'agence <strong>{confirmDelete?.name}</strong> sera
            définitivement supprimée.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(confirmDelete)}
              isLoading={deleteMutation.isPending}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- ROUTES TAB ---------- */
const RoutesTab = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", base_price: "", departure_agency_id: "", arrival_agency_id: "" });

  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agencies").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ["routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select(
          "*, departure_agency:agencies!routes_departure_agency_id_fkey(*), arrival_agency:agencies!routes_arrival_agency_id_fkey(*)",
        )
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        base_price: parseFloat(form.base_price) || 0,
        departure_agency_id: parseInt(form.departure_agency_id) || null,
        arrival_agency_id: parseInt(form.arrival_agency_id) || null,
      };
      if (editing) {
        const { error } = await supabase.from("routes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("routes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setDialogOpen(false);
      setEditing(null);
      setForm({ name: "", base_price: "", departure_agency_id: "", arrival_agency_id: "" });
      toast.success(editing ? "Ligne modifiée" : "Ligne créée");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast.success("Ligne supprimée");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const openEdit = (route: any) => {
    setEditing(route);
    setForm({
      name: route.name,
      base_price: route.base_price.toString(),
      departure_agency_id: route.departure_agency_id?.toString() || "",
      arrival_agency_id: route.arrival_agency_id?.toString() || "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Lignes ({routes.length})</h2>
        <Button
          onClick={() => {
            setEditing(null);
            setForm({ name: "", base_price: "", departure_agency_id: "", arrival_agency_id: "" });
            setDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Départ</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead className="text-right">Prix de base</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.departure_agency?.name || "-"}</TableCell>
                  <TableCell>{r.arrival_agency?.name || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.base_price)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        if (window.confirm(`Supprimer "${r.name}" ?`)) deleteMutation.mutate(r.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {routes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucune ligne
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la ligne" : "Nouvelle ligne"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ouaga → Bobo"
              />
            </div>
            <div className="grid gap-2">
              <Label>Agence départ</Label>
              <Select
                value={form.departure_agency_id}
                onValueChange={(v) => setForm({ ...form, departure_agency_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Agence arrivée</Label>
              <Select value={form.arrival_agency_id} onValueChange={(v) => setForm({ ...form, arrival_agency_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Prix de base (F)</Label>
              <Input
                type="number"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- VEHICLES TAB ---------- */
const VehiclesTab = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    registration_number: "",
    agency_id: "",
    brand: "",
    model: "",
    seats: "50",
    status: "active",
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agencies").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*, agency:agencies(*)")
        .order("registration_number");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        registration_number: form.registration_number,
        agency_id: parseInt(form.agency_id) || null,
        brand: form.brand || null,
        model: form.model || null,
        seats: parseInt(form.seats) || 50,
        status: form.status,
      };
      if (editing) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vehicles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setDialogOpen(false);
      setEditing(null);
      setForm({ registration_number: "", agency_id: "", brand: "", model: "", seats: "50", status: "active" });
      toast.success(editing ? "Véhicule modifié" : "Véhicule créé");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Véhicule supprimé");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const openEdit = (vehicle: any) => {
    setEditing(vehicle);
    setForm({
      registration_number: vehicle.registration_number,
      agency_id: vehicle.agency_id?.toString() || "",
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      seats: vehicle.seats.toString(),
      status: vehicle.status,
    });
    setDialogOpen(true);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Actif";
      case "maintenance":
        return "En maintenance";
      case "inactive":
        return "Inactif";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Véhicules ({vehicles.length})</h2>
        <Button
          onClick={() => {
            setEditing(null);
            setForm({ registration_number: "", agency_id: "", brand: "", model: "", seats: "50", status: "active" });
            setDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Immatriculation</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Marque / Modèle</TableHead>
                <TableHead className="text-center">Places</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.registration_number}</TableCell>
                  <TableCell>{v.agency?.name || "-"}</TableCell>
                  <TableCell>{[v.brand, v.model].filter(Boolean).join(" ") || "-"}</TableCell>
                  <TableCell className="text-center">{v.seats}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        v.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : v.status === "maintenance"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {getStatusLabel(v.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(v)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        if (window.confirm(`Supprimer "${v.registration_number}" ?`)) deleteMutation.mutate(v.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {vehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucun véhicule
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le véhicule" : "Nouveau véhicule"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Immatriculation *</Label>
              <Input
                value={form.registration_number}
                onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                placeholder="BUS-01"
              />
            </div>
            <div className="grid gap-2">
              <Label>Agence</Label>
              <Select value={form.agency_id} onValueChange={(v) => setForm({ ...form, agency_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Marque</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Modèle</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Places</Label>
                <Input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="maintenance">En maintenance</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.registration_number || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- USERS TAB ---------- */
const UsersTab = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "cashier", agency_id: "" });
  const [isCreating, setIsCreating] = useState(false);

  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agencies").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*, agency:agencies(*)").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      // Create user via Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            role: form.role,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Erreur lors de la création de l'utilisateur");

      // Update the profile with agency_id after creation
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          agency_id: form.agency_id ? parseInt(form.agency_id) : null,
        })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      audit.userCreate(form.name, getRoleLabel(form.role));
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setDialogOpen(false);
      resetForm();
      toast.success("Utilisateur créé avec succès");
    },
    onError: (error: any) => {
      if (error.message?.includes("already registered")) {
        toast.error("Cet email est déjà utilisé");
      } else {
        toast.error(error.message);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        role: form.role,
        agency_id: form.agency_id ? parseInt(form.agency_id) : null,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      audit.userUpdate(form.name, `rôle: ${getRoleLabel(form.role)}`);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setDialogOpen(false);
      resetForm();
      toast.success("Profil modifié");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete profile (user won't be able to login anymore)
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Utilisateur supprimé");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setEditing(null);
    setIsCreating(false);
    setForm({ name: "", email: "", password: "", role: "cashier", agency_id: "" });
  };

  const openCreate = () => {
    resetForm();
    setIsCreating(true);
    setDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditing(user);
    setIsCreating(false);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      agency_id: user.agency_id?.toString() || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (user: any) => {
    if (window.confirm(`Supprimer l'utilisateur "${user.name}" ?`)) {
      audit.userDelete(user.name);
      deleteMutation.mutate(user.id);
    }
  };

  const handleSave = () => {
    if (isCreating) {
      createUserMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  const isPending = createUserMutation.isPending || updateMutation.isPending;
  const canSubmit = isCreating ? form.name && form.email && form.password && form.password.length >= 6 : form.name;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Utilisateurs ({users.length})</h2>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColorClasses(u.role)}`}>
                      {getRoleLabel(u.role)}
                    </span>
                  </TableCell>
                  <TableCell>{u.agency?.name || "(Central)"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(u)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreating ? "Nouvel utilisateur" : "Modifier l'utilisateur"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!isCreating}
                className={!isCreating ? "bg-muted" : ""}
              />
            </div>
            {isCreating && (
              <div className="grid gap-2">
                <Label>Mot de passe * (min. 6 caractères)</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Guichetier</SelectItem>
                  <SelectItem value="accountant">Comptable</SelectItem>
                  <SelectItem value="mechanic">Mécanicien</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Agence</Label>
              <Select
                value={form.agency_id || "central"}
                onValueChange={(v) => setForm({ ...form, agency_id: v === "central" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(Central)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="central">Central</SelectItem>
                  {agencies.map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!canSubmit || isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
