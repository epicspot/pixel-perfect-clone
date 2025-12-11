import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "TICKET_SALE"
  | "TICKET_CANCEL"
  | "TICKET_REFUND"
  | "TICKET_PRINT"
  | "TRIP_CREATE"
  | "TRIP_UPDATE"
  | "TRIP_DELETE"
  | "TRIP_STATUS_CHANGE"
  | "CASH_CLOSURE_CREATE"
  | "CASH_CLOSURE_VALIDATE"
  | "EXPENSE_CREATE"
  | "EXPENSE_UPDATE"
  | "EXPENSE_DELETE"
  | "FUEL_ENTRY_CREATE"
  | "FUEL_ENTRY_UPDATE"
  | "FUEL_ENTRY_DELETE"
  | "MAINTENANCE_CREATE"
  | "MAINTENANCE_UPDATE"
  | "PAYROLL_CREATE"
  | "PAYROLL_VALIDATE"
  | "PAYROLL_PAY"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "PDF_EXPORT"
  | "EXCEL_EXPORT"
  // 🚚 Expéditions
  | "SHIPMENT_CREATE"
  | "SHIPMENT_STATUS_CHANGE";

export type EntityType =
  | "ticket"
  | "trip"
  | "cash_closure"
  | "expense"
  | "fuel_entry"
  | "maintenance_order"
  | "payroll_entry"
  | "user"
  | "report"
  // 🚚 Expéditions
  | "shipment";

interface AuditLogParams {
  action: AuditAction;
  entityType?: EntityType;
  entityId?: number;
  description?: string;
  agencyId?: number | null;
}

/**
 * Log an audit entry to the database
 */
export async function logAudit({ action, entityType, entityId, description, agencyId }: AuditLogParams): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("audit_logs").insert({
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      description: description || null,
      user_id: user?.id || null,
      agency_id: agencyId || null,
      ip_address: null, // Could be fetched from an API if needed
      user_agent: navigator.userAgent,
    });

    if (error) {
      console.error("Audit log error:", error);
    }
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
}

/**
 * Helper functions for common audit actions
 */
export const audit = {
  // Authentication
  login: (userId?: string) => logAudit({ action: "LOGIN", description: `Connexion utilisateur` }),

  logout: () => logAudit({ action: "LOGOUT", description: "Déconnexion utilisateur" }),

  // Tickets
  ticketSale: (ticketId: number, reference: string, amount: number, agencyId?: number | null) =>
    logAudit({
      action: "TICKET_SALE",
      entityType: "ticket",
      entityId: ticketId,
      description: `Vente ticket ${reference} - ${amount} F`,
      agencyId,
    }),

  ticketCancel: (ticketId: number, reference: string, reason?: string, agencyId?: number | null) =>
    logAudit({
      action: "TICKET_CANCEL",
      entityType: "ticket",
      entityId: ticketId,
      description: `Annulation ticket ${reference}${reason ? ` - ${reason}` : ""}`,
      agencyId,
    }),

  ticketRefund: (ticketId: number, reference: string, amount: number, agencyId?: number | null) =>
    logAudit({
      action: "TICKET_REFUND",
      entityType: "ticket",
      entityId: ticketId,
      description: `Remboursement ticket ${reference} - ${amount} F`,
      agencyId,
    }),

  ticketPrint: (ticketId: number, reference: string) =>
    logAudit({
      action: "TICKET_PRINT",
      entityType: "ticket",
      entityId: ticketId,
      description: `Impression ticket ${reference}`,
    }),

  // Trips
  tripCreate: (tripId: number, routeName: string, agencyId?: number | null) =>
    logAudit({
      action: "TRIP_CREATE",
      entityType: "trip",
      entityId: tripId,
      description: `Création voyage ${routeName}`,
      agencyId,
    }),

  tripUpdate: (tripId: number, routeName: string, agencyId?: number | null) =>
    logAudit({
      action: "TRIP_UPDATE",
      entityType: "trip",
      entityId: tripId,
      description: `Modification voyage ${routeName}`,
      agencyId,
    }),

  tripDelete: (tripId: number, routeName: string, agencyId?: number | null) =>
    logAudit({
      action: "TRIP_DELETE",
      entityType: "trip",
      entityId: tripId,
      description: `Suppression voyage ${routeName}`,
      agencyId,
    }),

  tripStatusChange: (
    tripId: number,
    routeName: string,
    oldStatus: string,
    newStatus: string,
    agencyId?: number | null,
  ) =>
    logAudit({
      action: "TRIP_STATUS_CHANGE",
      entityType: "trip",
      entityId: tripId,
      description: `Changement statut voyage ${routeName}: ${oldStatus} → ${newStatus}`,
      agencyId,
    }),

  // Cash closures
  cashClosureCreate: (closureId: number, total: number, agencyId?: number | null) =>
    logAudit({
      action: "CASH_CLOSURE_CREATE",
      entityType: "cash_closure",
      entityId: closureId,
      description: `Clôture caisse - Total: ${total} F`,
      agencyId,
    }),

  cashClosureValidate: (closureId: number, agencyId?: number | null) =>
    logAudit({
      action: "CASH_CLOSURE_VALIDATE",
      entityType: "cash_closure",
      entityId: closureId,
      description: `Validation clôture caisse`,
      agencyId,
    }),

  // Expenses
  expenseCreate: (expenseId: number, amount: number, category: string, agencyId?: number | null) =>
    logAudit({
      action: "EXPENSE_CREATE",
      entityType: "expense",
      entityId: expenseId,
      description: `Nouvelle dépense ${category} - ${amount} F`,
      agencyId,
    }),

  expenseDelete: (expenseId: number, amount: number, agencyId?: number | null) =>
    logAudit({
      action: "EXPENSE_DELETE",
      entityType: "expense",
      entityId: expenseId,
      description: `Suppression dépense - ${amount} F`,
      agencyId,
    }),

  // Fuel
  fuelEntryCreate: (entryId: number, vehicleReg: string, liters: number, amount: number, agencyId?: number | null) =>
    logAudit({
      action: "FUEL_ENTRY_CREATE",
      entityType: "fuel_entry",
      entityId: entryId,
      description: `Carburant ${vehicleReg} - ${liters}L / ${amount} F`,
      agencyId,
    }),

  // Maintenance
  maintenanceCreate: (orderId: number, vehicleReg: string, title: string, agencyId?: number | null) =>
    logAudit({
      action: "MAINTENANCE_CREATE",
      entityType: "maintenance_order",
      entityId: orderId,
      description: `Maintenance ${vehicleReg} - ${title}`,
      agencyId,
    }),

  // Payroll
  payrollValidate: (entryId: number, staffName: string, amount: number) =>
    logAudit({
      action: "PAYROLL_VALIDATE",
      entityType: "payroll_entry",
      entityId: entryId,
      description: `Validation paie ${staffName} - ${amount} F`,
    }),

  payrollPay: (entryId: number, staffName: string, amount: number) =>
    logAudit({
      action: "PAYROLL_PAY",
      entityType: "payroll_entry",
      entityId: entryId,
      description: `Paiement ${staffName} - ${amount} F`,
    }),

  // Users
  userCreate: (userName: string, role: string) =>
    logAudit({
      action: "USER_CREATE",
      entityType: "user",
      description: `Création utilisateur ${userName} (${role})`,
    }),

  userUpdate: (userName: string, changes: string) =>
    logAudit({
      action: "USER_UPDATE",
      entityType: "user",
      description: `Modification utilisateur ${userName} - ${changes}`,
    }),

  userDelete: (userName: string) =>
    logAudit({
      action: "USER_DELETE",
      entityType: "user",
      description: `Suppression utilisateur ${userName}`,
    }),

  // Exports
  pdfExport: (reportType: string, details?: string) =>
    logAudit({
      action: "PDF_EXPORT",
      entityType: "report",
      description: `Export PDF ${reportType}${details ? ` - ${details}` : ""}`,
    }),

  excelExport: (reportType: string, details?: string) =>
    logAudit({
      action: "EXCEL_EXPORT",
      entityType: "report",
      description: `Export Excel ${reportType}${details ? ` - ${details}` : ""}`,
    }),

  // 🚚 Expéditions
  shipmentCreate: (shipmentId: number, reference: string, amount: number, agencyId?: number | null) =>
    logAudit({
      action: "SHIPMENT_CREATE",
      entityType: "shipment",
      entityId: shipmentId,
      description: `Expédition ${reference} créée - ${amount} F`,
      agencyId,
    }),

  shipmentStatusChange: (
    shipmentId: number,
    reference: string,
    oldStatus: string,
    newStatus: string,
    agencyId?: number | null,
  ) =>
    logAudit({
      action: "SHIPMENT_STATUS_CHANGE",
      entityType: "shipment",
      entityId: shipmentId,
      description: `Expédition ${reference} statut: ${oldStatus} → ${newStatus}`,
      agencyId,
    }),
};
