import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  // Use manual formatting to avoid encoding issues with jsPDF
  const rounded = Math.round(value);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return formatted + ' F CFA';
};

interface TicketData {
  id: number;
  reference?: string;
  customer_name?: string;
  customer_phone?: string;
  price: number;
  total_amount?: number;
  payment_method?: string;
  sold_at?: string;
  seat_number?: string;
  trip?: {
    departure_datetime?: string;
    route?: {
      name?: string;
      departure_agency?: { name?: string };
      arrival_agency?: { name?: string };
    };
    vehicle?: {
      registration_number?: string;
    };
  };
}

interface TripData {
  id: number;
  departure_datetime: string;
  arrival_datetime?: string;
  status: string;
  route?: {
    name?: string;
    departure_agency?: { name?: string };
    arrival_agency?: { name?: string };
    base_price?: number;
  };
  vehicle?: {
    registration_number?: string;
    brand?: string;
    model?: string;
    seats?: number;
  };
  driver?: { full_name?: string };
  assistant?: { full_name?: string };
  tickets?: any[];
}

const getPaymentMethodLabel = (method?: string) => {
  switch (method) {
    case 'cash': return 'Espèces';
    case 'mobile_money': return 'Mobile Money';
    case 'card': return 'Carte bancaire';
    case 'bank_transfer': return 'Virement';
    default: return method || 'Espèces';
  }
};

// Generate individual ticket receipt
export const generateTicketPdf = (ticket: TicketData, companyName = 'Transport Express') => {
  const doc = new jsPDF({
    format: [80, 200], // Receipt format (80mm width)
    unit: 'mm',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 10;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('TICKET DE TRANSPORT', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Ticket reference
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(ticket.reference || `#${ticket.id}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Divider
  doc.setDrawColor(200);
  doc.line(5, y, pageWidth - 5, y);
  y += 5;

  // Client info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Client:', 5, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ticket.customer_name || 'Anonyme', 25, y);
  y += 5;

  if (ticket.customer_phone) {
    doc.setFont('helvetica', 'bold');
    doc.text('Tél:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.customer_phone, 25, y);
    y += 5;
  }

  // Trip info
  if (ticket.trip?.route) {
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('Trajet:', 5, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.trip.route.name || '-', 5, y);
    y += 5;

    if (ticket.trip.departure_datetime) {
      doc.setFont('helvetica', 'bold');
      doc.text('Départ:', 5, y);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(ticket.trip.departure_datetime), 'dd/MM/yyyy HH:mm'), 25, y);
      y += 5;
    }

    if (ticket.trip.vehicle) {
      doc.setFont('helvetica', 'bold');
      doc.text('Véhicule:', 5, y);
      doc.setFont('helvetica', 'normal');
      doc.text(ticket.trip.vehicle.registration_number || '-', 25, y);
      y += 5;
    }
  }

  if (ticket.seat_number) {
    doc.setFont('helvetica', 'bold');
    doc.text('Siège:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.seat_number, 25, y);
    y += 5;
  }

  // Payment info
  y += 3;
  doc.setDrawColor(200);
  doc.line(5, y, pageWidth - 5, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Paiement:', 5, y);
  doc.setFont('helvetica', 'normal');
  doc.text(getPaymentMethodLabel(ticket.payment_method), 25, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 5, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ticket.sold_at ? format(new Date(ticket.sold_at), 'dd/MM/yyyy HH:mm') : '-', 25, y);
  y += 8;

  // Total
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(5, y, pageWidth - 5, y);
  y += 6;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 5, y);
  doc.text(formatCurrency(ticket.price || ticket.total_amount || 0), pageWidth - 5, y, { align: 'right' });
  y += 8;

  doc.setDrawColor(0);
  doc.line(5, y, pageWidth - 5, y);
  y += 6;

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Merci de votre confiance!', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Imprimé le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, y, { align: 'center' });

  // Save
  const filename = `ticket_${ticket.reference || ticket.id}.pdf`;
  doc.save(filename);
};

// Generate trip manifest
export const generateTripManifestPdf = (trip: TripData, tickets: any[], companyName = 'Transport Express') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.text('MANIFESTE DE VOYAGE', pageWidth / 2, 30, { align: 'center' });

  // Trip details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  let y = 45;
  const leftCol = 20;
  const rightCol = pageWidth / 2 + 10;

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Trajet:', leftCol, y);
  doc.setFont('helvetica', 'normal');
  doc.text(trip.route?.name || '-', leftCol + 25, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Départ:', rightCol, y);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(trip.departure_datetime), 'dd/MM/yyyy HH:mm'), rightCol + 25, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Véhicule:', leftCol, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${trip.vehicle?.registration_number || '-'} (${trip.vehicle?.brand || ''} ${trip.vehicle?.model || ''})`, leftCol + 25, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Capacité:', rightCol, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${trip.vehicle?.seats || '-'} places`, rightCol + 25, y);
  y += 7;

  if (trip.driver || trip.assistant) {
    doc.setFont('helvetica', 'bold');
    doc.text('Chauffeur:', leftCol, y);
    doc.setFont('helvetica', 'normal');
    doc.text(trip.driver?.full_name || '-', leftCol + 25, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Assistant:', rightCol, y);
    doc.setFont('helvetica', 'normal');
    doc.text(trip.assistant?.full_name || '-', rightCol + 25, y);
    y += 7;
  }

  y += 5;

  // Passengers table
  doc.setFont('helvetica', 'bold');
  doc.text(`Liste des passagers (${tickets.length})`, 20, y);
  y += 5;

  const totalRevenue = tickets.reduce((sum, t) => sum + (t.price || t.total_amount || 0), 0);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Réf', 'Nom du passager', 'Téléphone', 'Siège', 'Montant']],
    body: tickets.map((t, i) => [
      (i + 1).toString(),
      t.reference || `#${t.id}`,
      t.customer_name || 'Anonyme',
      t.customer_phone || '-',
      t.seat_number || '-',
      formatCurrency(t.price || t.total_amount || 0),
    ]),
    foot: [[
      '', '', '', '', 'TOTAL',
      formatCurrency(totalRevenue),
    ]],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    footStyles: { fillColor: [229, 231, 235], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10 },
      5: { halign: 'right' },
    },
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Passagers: ${tickets.length}/${trip.vehicle?.seats || '-'}`, 20, finalY);
  doc.text(`Recette: ${formatCurrency(totalRevenue)}`, pageWidth - 20, finalY, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text(`Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, 285, { align: 'center' });

  // Save
  const filename = `manifeste_${trip.route?.name?.replace(/\s+/g, '_') || 'voyage'}_${format(new Date(trip.departure_datetime), 'yyyyMMdd')}.pdf`;
  doc.save(filename);
};

// Generate daily sales report
export const generateDailySalesReportPdf = (
  date: Date,
  tickets: any[],
  agencies: { id: number; name: string }[],
  companyName = 'Transport Express'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.text('RAPPORT JOURNALIER DES VENTES', pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${format(date, 'EEEE dd MMMM yyyy', { locale: fr })}`, pageWidth / 2, 40, { align: 'center' });

  // Summary stats
  const totalSales = tickets.reduce((sum, t) => sum + (t.price || t.total_amount || 0), 0);
  const cashSales = tickets.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + (t.price || 0), 0);
  const mobileSales = tickets.filter(t => t.payment_method === 'mobile_money').reduce((sum, t) => sum + (t.price || 0), 0);
  const cardSales = tickets.filter(t => t.payment_method === 'card').reduce((sum, t) => sum + (t.price || 0), 0);

  let y = 55;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé:', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.text(`• Nombre de tickets vendus: ${tickets.length}`, 25, y);
  y += 6;
  doc.text(`• Total des ventes: ${formatCurrency(totalSales)}`, 25, y);
  y += 6;
  doc.text(`• Espèces: ${formatCurrency(cashSales)}`, 25, y);
  doc.text(`• Mobile Money: ${formatCurrency(mobileSales)}`, pageWidth / 2, y);
  y += 6;
  doc.text(`• Carte: ${formatCurrency(cardSales)}`, 25, y);
  y += 10;

  // Tickets table
  autoTable(doc, {
    startY: y,
    head: [['Heure', 'Réf', 'Client', 'Trajet', 'Paiement', 'Montant']],
    body: tickets.map(t => [
      t.sold_at ? format(new Date(t.sold_at), 'HH:mm') : '-',
      t.reference || `#${t.id}`,
      t.customer_name || 'Anonyme',
      t.trip?.route?.name || '-',
      getPaymentMethodLabel(t.payment_method),
      formatCurrency(t.price || t.total_amount || 0),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 15 },
      5: { halign: 'right' },
    },
  });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text(`Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, 285, { align: 'center' });

  // Save
  const filename = `ventes_${format(date, 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
};

// Print document directly (opens print dialog)
export const printDocument = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found for printing');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Could not open print window');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Impression</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; }
        @media print {
          body { padding: 0; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      ${element.innerHTML}
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};
