import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import QRCode from 'qrcode';

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
    case 'cash': return 'Especes';
    case 'mobile_money': return 'Mobile Money';
    case 'card': return 'Carte bancaire';
    case 'bank_transfer': return 'Virement';
    default: return method || 'Especes';
  }
};

// Generate QR code as base64 data URL
const generateQRCode = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data, {
      width: 100,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch (error) {
    console.error('QR Code generation error:', error);
    return '';
  }
};

// Company info interface for tickets
interface TicketCompanyInfo {
  name: string;
  logoUrl?: string | null;
  address?: string;
  phone?: string;
  email?: string;
}

// Generate individual ticket receipt with tear-off stub and QR code
export const generateTicketPdf = async (ticket: TicketData, company: TicketCompanyInfo = { name: 'Transport Express' }) => {
  const doc = new jsPDF({
    format: [80, 320], // Longer receipt format for stub and seat display with company info
    unit: 'mm',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 10;

  // ========== MAIN TICKET SECTION ==========
  
  // Logo (if available)
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', (pageWidth - 12) / 2, y, 12, 12);
      y += 14;
    } catch (e) {
      console.warn('Could not add logo to PDF:', e);
    }
  }

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Company address & contact
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (company.address) {
    doc.text(company.address, pageWidth / 2, y, { align: 'center' });
    y += 3;
  }
  if (company.phone) {
    doc.text('Tel: ' + company.phone, pageWidth / 2, y, { align: 'center' });
    y += 3;
  }
  if (company.email) {
    doc.text(company.email, pageWidth / 2, y, { align: 'center' });
    y += 3;
  }
  y += 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('TICKET DE TRANSPORT', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Ticket reference
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(ticket.reference || `#${ticket.id}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // ========== PROMINENT SEAT NUMBER DISPLAY ==========
  if (ticket.seat_number) {
    y += 2;
    // Draw seat number box
    const boxWidth = 50;
    const boxHeight = 18;
    const boxX = (pageWidth - boxWidth) / 2;
    
    doc.setDrawColor(0);
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(boxX, y, boxWidth, boxHeight, 3, 3, 'FD');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('SIEGE N°', pageWidth / 2, y + 5, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(ticket.seat_number, pageWidth / 2, y + 13, { align: 'center' });
    
    y += boxHeight + 4;
  }

  // Divider
  doc.setDrawColor(200);
  doc.setTextColor(0);
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
    doc.text('Tel:', 5, y);
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
      doc.text('Depart:', 5, y);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(ticket.trip.departure_datetime), 'dd/MM/yyyy HH:mm'), 25, y);
      y += 5;
    }

    if (ticket.trip.vehicle) {
      doc.setFont('helvetica', 'bold');
      doc.text('Vehicule:', 5, y);
      doc.setFont('helvetica', 'normal');
      doc.text(ticket.trip.vehicle.registration_number || '-', 25, y);
      y += 5;
    }
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

  // Footer main section
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('PARTIE PASSAGER - A conserver', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Imprime le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // ========== TEAR LINE (DASHED) ==========
  doc.setTextColor(0);
  doc.setDrawColor(0);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(0, y, pageWidth, y);
  y += 3;
  
  // Scissors icon text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DETACHER ICI LORS DE L\'EMBARQUEMENT', pageWidth / 2, y, { align: 'center' });
  y += 3;
  
  doc.line(0, y, pageWidth, y);
  doc.setLineDashPattern([], 0); // Reset to solid line
  y += 8;

  // ========== BOARDING STUB SECTION (For Convoyeur) ==========
  
  // Header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('SOUCHE EMBARQUEMENT', pageWidth / 2, y, { align: 'center' });
  y += 5;
  
  // QR Code
  const qrData = JSON.stringify({
    ref: ticket.reference || `TKT-${ticket.id}`,
    client: ticket.customer_name || 'Anonyme',
    montant: ticket.price || ticket.total_amount || 0,
    trajet: ticket.trip?.route?.name || '',
    depart: ticket.trip?.departure_datetime || '',
    vehicule: ticket.trip?.vehicle?.registration_number || '',
  });

  const qrCodeDataUrl = await generateQRCode(qrData);
  
  if (qrCodeDataUrl) {
    const qrSize = 22;
    doc.addImage(qrCodeDataUrl, 'PNG', (pageWidth - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 4;
  }

  // Stub ticket info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(ticket.reference || `#${ticket.id}`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Seat number on stub (prominent display)
  if (ticket.seat_number) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`SIEGE ${ticket.seat_number}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(ticket.customer_name || 'Anonyme', pageWidth / 2, y, { align: 'center' });
  y += 4;

  if (ticket.trip?.route) {
    doc.text(ticket.trip.route.name || '-', pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  if (ticket.trip?.departure_datetime) {
    doc.text(format(new Date(ticket.trip.departure_datetime), 'dd/MM/yyyy HH:mm'), pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  if (ticket.trip?.vehicle) {
    doc.text(`Vehicule: ${ticket.trip.vehicle.registration_number || '-'}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(ticket.price || ticket.total_amount || 0), pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Stub footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('CONVOYEUR: Conserver cette souche', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('Scanner le QR pour controle', pageWidth / 2, y, { align: 'center' });

  // Save
  const filename = `ticket_${ticket.reference || ticket.id}.pdf`;
  doc.save(filename);
};

// Company info interface
interface CompanyInfo {
  name: string;
  logoUrl?: string | null;
  address?: string;
  phone?: string;
  email?: string;
}

// Generate trip manifest
export const generateTripManifestPdf = (trip: TripData, tickets: any[], company: CompanyInfo = { name: 'Transport Express' }) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Logo (if available)
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', (pageWidth - 20) / 2, y, 20, 20);
      y += 22;
    } catch (e) {
      console.warn('Could not add logo to PDF:', e);
    }
  }

  // Header with company info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Company address & contact
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (company.address) {
    doc.text(company.address, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  if (company.phone || company.email) {
    const contactInfo = [company.phone, company.email].filter(Boolean).join(' | ');
    doc.text(contactInfo, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  y += 4;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MANIFESTE DE VOYAGE', pageWidth / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
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
  company: CompanyInfo = { name: 'Transport Express' }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Logo (if available)
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', (pageWidth - 20) / 2, y, 20, 20);
      y += 22;
    } catch (e) {
      console.warn('Could not add logo to PDF:', e);
    }
  }

  // Header with company info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Company address & contact
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (company.address) {
    doc.text(company.address, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  if (company.phone || company.email) {
    const contactInfo = [company.phone, company.email].filter(Boolean).join(' | ');
    doc.text(contactInfo, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  y += 4;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT JOURNALIER DES VENTES', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${format(date, 'EEEE dd MMMM yyyy', { locale: fr })}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Summary stats
  const totalSales = tickets.reduce((sum, t) => sum + (t.price || t.total_amount || 0), 0);
  const cashSales = tickets.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + (t.price || 0), 0);
  const mobileSales = tickets.filter(t => t.payment_method === 'mobile_money').reduce((sum, t) => sum + (t.price || 0), 0);
  const cardSales = tickets.filter(t => t.payment_method === 'card').reduce((sum, t) => sum + (t.price || 0), 0);

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

// Shipment receipt/waybill PDF
interface ShipmentData {
  id: number;
  reference: string;
  type: 'excess_baggage' | 'unaccompanied_baggage' | 'parcel' | 'express';
  sender_name: string;
  sender_phone?: string | null;
  receiver_name: string;
  receiver_phone?: string | null;
  description?: string | null;
  weight_kg: number;
  quantity: number;
  price_per_kg: number;
  base_price: number;
  total_amount: number;
  status: string;
  created_at: string;
  departure_agency?: { name?: string } | null;
  arrival_agency?: { name?: string } | null;
  trip?: {
    departure_datetime?: string;
    route?: { name?: string };
  } | null;
  ticket?: {
    reference?: string;
    customer_name?: string;
  } | null;
}

const shipmentTypeLabels: Record<string, string> = {
  excess_baggage: 'Bagage excedentaire',
  unaccompanied_baggage: 'Bagage non accompagne',
  parcel: 'Colis',
  express: 'Courrier express',
};

export const generateShipmentPdf = async (shipment: ShipmentData, company: CompanyInfo = { name: 'Transport Express' }) => {
  const doc = new jsPDF({
    format: [80, 240],
    unit: 'mm',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 10;

  // Logo
  if (company.logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = company.logoUrl;
      });
      const logoWidth = 20;
      const logoHeight = (img.height / img.width) * logoWidth;
      doc.addImage(img, 'PNG', (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
      y += logoHeight + 3;
    } catch (e) {
      console.error('Failed to load logo for shipment PDF:', e);
    }
  }

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Company address & contact
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (company.address) {
    doc.text(company.address, pageWidth / 2, y, { align: 'center' });
    y += 3;
  }
  if (company.phone) {
    doc.text('Tel: ' + company.phone, pageWidth / 2, y, { align: 'center' });
    y += 3;
  }
  if (company.email) {
    doc.text(company.email, pageWidth / 2, y, { align: 'center' });
    y += 3;
  }
  y += 2;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text("BORDEREAU D'EXPEDITION", pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Reference
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(shipment.reference, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Type badge
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(shipmentTypeLabels[shipment.type] || shipment.type, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Divider
  doc.setDrawColor(200);
  doc.line(5, y, pageWidth - 5, y);
  y += 5;

  // Sender info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EXPEDITEUR', 5, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(shipment.sender_name, 5, y);
  y += 4;
  if (shipment.sender_phone) {
    doc.text('Tel: ' + shipment.sender_phone, 5, y);
    y += 4;
  }
  y += 2;

  // Receiver info
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATAIRE', 5, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(shipment.receiver_name, 5, y);
  y += 4;
  if (shipment.receiver_phone) {
    doc.text('Tel: ' + shipment.receiver_phone, 5, y);
    y += 4;
  }
  y += 2;

  // Route info
  doc.setDrawColor(200);
  doc.line(5, y, pageWidth - 5, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text('TRAJET', 5, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  
  if (shipment.trip?.route?.name) {
    doc.text(shipment.trip.route.name, 5, y);
    y += 4;
  } else if (shipment.departure_agency?.name && shipment.arrival_agency?.name) {
    doc.text(shipment.departure_agency.name + ' -> ' + shipment.arrival_agency.name, 5, y);
    y += 4;
  }

  if (shipment.trip?.departure_datetime) {
    doc.text('Depart: ' + format(new Date(shipment.trip.departure_datetime), 'dd/MM/yyyy HH:mm'), 5, y);
    y += 4;
  }
  y += 2;

  // Content description
  if (shipment.description) {
    doc.setDrawColor(200);
    doc.line(5, y, pageWidth - 5, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('CONTENU', 5, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    
    const splitDescription = doc.splitTextToSize(shipment.description, pageWidth - 10);
    doc.text(splitDescription, 5, y);
    y += splitDescription.length * 4;
  }
  y += 2;

  // Details
  doc.setDrawColor(200);
  doc.line(5, y, pageWidth - 5, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  doc.text('Poids: ' + shipment.weight_kg + ' kg', 5, y);
  doc.text('Qte: ' + shipment.quantity, pageWidth - 5, y, { align: 'right' });
  y += 4;
  
  doc.text('Prix/kg: ' + shipment.price_per_kg.toLocaleString('fr-FR') + ' F', 5, y);
  doc.text('Frais: ' + shipment.base_price.toLocaleString('fr-FR') + ' F', pageWidth - 5, y, { align: 'right' });
  y += 6;

  // Total
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(5, y, pageWidth - 5, y);
  y += 5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 5, y);
  doc.text(formatCurrency(shipment.total_amount), pageWidth - 5, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(0);
  doc.line(5, y, pageWidth - 5, y);
  y += 5;

  // QR Code
  const qrData = JSON.stringify({
    ref: shipment.reference,
    exp: shipment.sender_name,
    dest: shipment.receiver_name,
    montant: shipment.total_amount,
    type: shipment.type,
  });

  const qrCodeDataUrl = await generateQRCode(qrData);
  if (qrCodeDataUrl) {
    const qrSize = 20;
    doc.addImage(qrCodeDataUrl, 'PNG', (pageWidth - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 4;
  }

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Conserver ce bordereau', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('Emis le ' + format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm'), pageWidth / 2, y, { align: 'center' });

  // Save
  const filename = 'bordereau_' + shipment.reference + '.pdf';
  doc.save(filename);
};

// Shipments Report PDF
interface ShipmentReportData {
  id: number;
  reference: string;
  type: string;
  sender_name: string;
  receiver_name: string;
  weight_kg: number;
  total_amount: number;
  status: string;
  created_at: string;
  departure_agency?: { name: string } | null;
  arrival_agency?: { name: string } | null;
}

interface ReportFilters {
  startDate: string;
  endDate: string;
  typeFilter?: string;
  agencyFilter?: string;
}

interface ReportStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
  totalWeight: number;
  byType: Record<string, number>;
}

const reportTypeLabels: Record<string, string> = {
  excess_baggage: 'Bagage excedentaire',
  unaccompanied_baggage: 'Bagage non accompagne',
  parcel: 'Colis',
  express: 'Courrier express',
};

const reportStatusLabels: Record<string, string> = {
  pending: 'En attente',
  in_transit: 'En transit',
  delivered: 'Livre',
  cancelled: 'Annule',
};

export const generateShipmentsReportPdf = async (
  shipments: ShipmentReportData[],
  filters: ReportFilters,
  stats: ReportStats,
  company: CompanyInfo = { name: 'Transport Express' }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let headerY = 15;

  // Logo
  if (company.logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = company.logoUrl;
      });
      const logoHeight = 15;
      const logoWidth = (img.width / img.height) * logoHeight;
      doc.addImage(img, 'PNG', (pageWidth - logoWidth) / 2, headerY, logoWidth, logoHeight);
      headerY += logoHeight + 3;
    } catch (e) {
      console.error('Failed to load logo for shipments report:', e);
    }
  }

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, pageWidth / 2, headerY, { align: 'center' });
  headerY += 5;

  // Company address & contact
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (company.address) {
    doc.text(company.address, pageWidth / 2, headerY, { align: 'center' });
    headerY += 4;
  }
  if (company.phone || company.email) {
    const contactInfo = [company.phone, company.email].filter(Boolean).join(' | ');
    doc.text(contactInfo, pageWidth / 2, headerY, { align: 'center' });
    headerY += 4;
  }
  headerY += 4;

  // Filters info
  let filterText = '';
  if (filters.typeFilter) filterText += 'Type: ' + filters.typeFilter + ' | ';
  if (filters.agencyFilter) filterText += 'Agence: ' + filters.agencyFilter;
  if (filterText) {
    doc.setFontSize(9);
    doc.text(filterText, pageWidth / 2, headerY, { align: 'center' });
    headerY += 6;
  }
  headerY += 4;

  // Summary stats
  let y = headerY;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resume', 20, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Stats in two columns
  const col1 = 25;
  const col2 = pageWidth / 2 + 10;

  doc.text('Total expeditions: ' + stats.total, col1, y);
  doc.text('En attente: ' + stats.pending, col2, y);
  y += 5;
  doc.text('En transit: ' + stats.inTransit, col1, y);
  doc.text('Livres: ' + stats.delivered, col2, y);
  y += 5;
  doc.text('Annules: ' + stats.cancelled, col1, y);
  doc.text('Poids total: ' + stats.totalWeight.toFixed(1) + ' kg', col2, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Recettes totales: ' + formatCurrency(stats.totalRevenue), col1, y);
  y += 10;

  // Type breakdown
  doc.setFont('helvetica', 'bold');
  doc.text('Repartition par type', 20, y);
  y += 6;
  doc.setFont('helvetica', 'normal');

  Object.entries(stats.byType).forEach(([type, count]) => {
    doc.text('- ' + (reportTypeLabels[type] || type) + ': ' + count, 25, y);
    y += 5;
  });

  y += 5;

  // Shipments table
  autoTable(doc, {
    startY: y,
    head: [['Date', 'Ref', 'Type', 'Expediteur', 'Trajet', 'Poids', 'Montant', 'Statut']],
    body: shipments.map(s => [
      format(new Date(s.created_at), 'dd/MM'),
      s.reference,
      reportTypeLabels[s.type] || s.type,
      s.sender_name.substring(0, 15),
      (s.departure_agency?.name?.substring(0, 8) || '') + ' > ' + (s.arrival_agency?.name?.substring(0, 8) || ''),
      s.weight_kg + ' kg',
      formatCurrency(s.total_amount),
      reportStatusLabels[s.status] || s.status,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 30 },
      5: { cellWidth: 15 },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 18 },
    },
  });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text('Document genere le ' + format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr }), pageWidth / 2, 285, { align: 'center' });

  // Save
  const filename = 'rapport_expeditions_' + filters.startDate + '_' + filters.endDate + '.pdf';
  doc.save(filename);
};
