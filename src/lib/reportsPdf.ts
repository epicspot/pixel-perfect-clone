import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CompanyInfo {
  name: string;
  logoUrl?: string | null;
  address?: string;
  phone?: string;
  email?: string;
  rccm?: string;
  ifu?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F CFA';

// Agency Report PDF
export const generateAgencyReportPdf = (
  data: {
    rows: Array<{
      agency_name: string;
      trips_count: number;
      tickets_sold: number;
      revenue: number;
      fuel_cost: number;
    }>;
    totals: { trips: number; tickets: number; revenue: number; fuel: number };
  },
  period: { start: Date; end: Date },
  companyInfo: CompanyInfo
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapport par Agence', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.text(
    `Période: ${format(period.start, 'dd MMM yyyy', { locale: fr })} - ${format(period.end, 'dd MMM yyyy', { locale: fr })}`,
    pageWidth / 2,
    35,
    { align: 'center' }
  );

  // Summary cards
  const summaryY = 45;
  doc.setFillColor(240, 240, 240);
  doc.rect(14, summaryY, 45, 20, 'F');
  doc.rect(62, summaryY, 45, 20, 'F');
  doc.rect(110, summaryY, 45, 20, 'F');
  doc.rect(158, summaryY, 38, 20, 'F');

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Voyages', 36.5, summaryY + 6, { align: 'center' });
  doc.text('Tickets', 84.5, summaryY + 6, { align: 'center' });
  doc.text('Recettes', 132.5, summaryY + 6, { align: 'center' });
  doc.text('Carburant', 177, summaryY + 6, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(data.totals.trips.toString(), 36.5, summaryY + 15, { align: 'center' });
  doc.text(data.totals.tickets.toString(), 84.5, summaryY + 15, { align: 'center' });
  doc.text(formatCurrency(data.totals.revenue), 132.5, summaryY + 15, { align: 'center' });
  doc.text(formatCurrency(data.totals.fuel), 177, summaryY + 15, { align: 'center' });

  // Table
  autoTable(doc, {
    startY: 75,
    head: [['Agence', 'Voyages', 'Tickets', 'Recettes', 'Carburant', 'Marge']],
    body: data.rows.map((row) => [
      row.agency_name,
      row.trips_count.toString(),
      row.tickets_sold.toString(),
      formatCurrency(row.revenue),
      formatCurrency(row.fuel_cost),
      formatCurrency(row.revenue - row.fuel_cost),
    ]),
    foot: [[
      'TOTAL',
      data.totals.trips.toString(),
      data.totals.tickets.toString(),
      formatCurrency(data.totals.revenue),
      formatCurrency(data.totals.fuel),
      formatCurrency(data.totals.revenue - data.totals.fuel),
    ]],
    headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
    footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Page ${i}/${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  doc.save(`rapport_agences_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// Routes Report PDF
export const generateRoutesReportPdf = (
  data: {
    rows: Array<{
      route_name: string;
      departure: string;
      arrival: string;
      base_price: number;
      trips_count: number;
      tickets_sold: number;
      revenue: number;
      occupancy: number;
    }>;
    totals: { trips: number; tickets: number; revenue: number };
  },
  period: { start: Date; end: Date },
  companyInfo: CompanyInfo
) => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapport par Ligne', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.text(
    `Période: ${format(period.start, 'dd MMM yyyy', { locale: fr })} - ${format(period.end, 'dd MMM yyyy', { locale: fr })}`,
    pageWidth / 2,
    35,
    { align: 'center' }
  );

  // Table
  autoTable(doc, {
    startY: 45,
    head: [['Ligne', 'Départ → Arrivée', 'Prix base', 'Voyages', 'Tickets', 'Taux occup.', 'Recettes']],
    body: data.rows.map((row) => [
      row.route_name,
      `${row.departure} → ${row.arrival}`,
      formatCurrency(row.base_price),
      row.trips_count.toString(),
      row.tickets_sold.toString(),
      `${row.occupancy}%`,
      formatCurrency(row.revenue),
    ]),
    foot: [[
      'TOTAL',
      '',
      '',
      data.totals.trips.toString(),
      data.totals.tickets.toString(),
      '',
      formatCurrency(data.totals.revenue),
    ]],
    headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
    footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 70 },
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'right' },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Page ${i}/${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  doc.save(`rapport_lignes_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// Sales Report PDF
export const generateSalesReportPdf = (
  data: {
    totalTickets: number;
    totalRevenue: number;
    byPaymentMethod: Array<{ method: string; count: number; total: number }>;
    byStatus: Array<{ status: string; count: number; total: number }>;
    dailyStats: Array<{ date: string; count: number; total: number }>;
  },
  period: { start: Date; end: Date },
  companyInfo: CompanyInfo
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapport des Ventes', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.text(
    `Période: ${format(period.start, 'dd MMM yyyy', { locale: fr })} - ${format(period.end, 'dd MMM yyyy', { locale: fr })}`,
    pageWidth / 2,
    35,
    { align: 'center' }
  );

  // Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé', 14, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total tickets vendus: ${data.totalTickets}`, 14, 60);
  doc.text(`Recettes totales: ${formatCurrency(data.totalRevenue)}`, 14, 68);

  // By payment method
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Par mode de paiement', 14, 85);

  autoTable(doc, {
    startY: 90,
    head: [['Mode de paiement', 'Tickets', 'Montant']],
    body: data.byPaymentMethod.map((item) => [
      item.method,
      item.count.toString(),
      formatCurrency(item.total),
    ]),
    headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center' },
      2: { halign: 'right' },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Page ${i}/${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  doc.save(`rapport_ventes_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// Cashiers Report PDF
export const generateCashiersReportPdf = (
  data: {
    rows: Array<{
      cashier_name: string;
      agency_name: string;
      sessions_count: number;
      tickets_sold: number;
      total_sales: number;
      total_discrepancy: number;
    }>;
    totals: { sessions: number; tickets: number; sales: number; discrepancy: number };
  },
  period: { start: Date; end: Date },
  companyInfo: CompanyInfo
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapport des Caissiers', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.text(
    `Période: ${format(period.start, 'dd MMM yyyy', { locale: fr })} - ${format(period.end, 'dd MMM yyyy', { locale: fr })}`,
    pageWidth / 2,
    35,
    { align: 'center' }
  );

  // Table
  autoTable(doc, {
    startY: 45,
    head: [['Caissier', 'Agence', 'Sessions', 'Tickets', 'Ventes', 'Écarts']],
    body: data.rows.map((row) => [
      row.cashier_name,
      row.agency_name,
      row.sessions_count.toString(),
      row.tickets_sold.toString(),
      formatCurrency(row.total_sales),
      formatCurrency(row.total_discrepancy),
    ]),
    foot: [[
      'TOTAL',
      '',
      data.totals.sessions.toString(),
      data.totals.tickets.toString(),
      formatCurrency(data.totals.sales),
      formatCurrency(data.totals.discrepancy),
    ]],
    headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
    footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Page ${i}/${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  doc.save(`rapport_caissiers_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
