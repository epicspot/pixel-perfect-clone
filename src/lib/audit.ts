import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createShipment, getShipments, updateShipmentStatus } from "@/services/shipments";
import { logAudit } from "@/lib/audit";

const statusLabels: Record<string, string> = {
  pending: "En attente",
  in_transit: "En cours",
  delivered: "Livrée",
  canceled: "Annulée",
};

export default function Expeditions() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [reference, setReference] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [statusUpdateId, setStatusUpdateId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState("");

  // Charger la liste
  useEffect(() => {
    loadShipments();
  }, []);

  async function loadShipments() {
    setLoading(true);
    const data = await getShipments();
    setShipments(data || []);
    setLoading(false);
  }

  // Création d'expédition
  async function handleCreateShipment() {
    if (!reference || !recipient || !amount) return;

    const data = await createShipment({
      reference,
      recipient,
      total_amount: Number(amount),
    });

    if (data) {
      await logAudit({
        action: "SHIPMENT_CREATE",
        entityType: "shipment",
        entityId: data.id,
        description: `Expédition ${data.reference} créée - ${data.total_amount} F`,
      });

      setReference("");
      setRecipient("");
      setAmount("");
      loadShipments();
    }
  }

  // Changer le statut
  async function handleStatusUpdate() {
    if (!statusUpdateId || !newStatus) return;

    const updated = await updateShipmentStatus(statusUpdateId, newStatus);

    if (updated) {
      await logAudit({
        action: "SHIPMENT_STATUS_CHANGE",
        entityType: "shipment",
        entityId: statusUpdateId,
        description: `Statut expédition mis à jour: ${statusLabels[newStatus]}`,
      });

      setStatusUpdateId(null);
      setNewStatus("");
      loadShipments();
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestion des Expéditions</h1>

      {/* Formulaire de création */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Input placeholder="Référence" value={reference} onChange={(e) => setReference(e.target.value)} />
        <Input placeholder="Destinataire" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <Input placeholder="Montant (F CFA)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />

        <Button onClick={handleCreateShipment}>Créer l’expédition</Button>
      </div>

      {/* Statut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input
          placeholder="ID expédition"
          type="number"
          value={statusUpdateId || ""}
          onChange={(e) => setStatusUpdateId(Number(e.target.value))}
        />

        <Select onValueChange={(v) => setNewStatus(v)}>
          <option value="">-- Choisir un statut --</option>
          <option value="pending">En attente</option>
          <option value="in_transit">En cours</option>
          <option value="delivered">Livrée</option>
          <option value="canceled">Annulée</option>
        </Select>

        <Button onClick={handleStatusUpdate}>Mettre à jour</Button>
      </div>

      {/* Liste */}
      <div className="border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Expéditions</h2>

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th>ID</th>
                <th>Référence</th>
                <th>Destinataire</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-b">
                  <td>{s.id}</td>
                  <td>{s.reference}</td>
                  <td>{s.recipient}</td>
                  <td>{s.total_amount} F</td>
                  <td>{statusLabels[s.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
