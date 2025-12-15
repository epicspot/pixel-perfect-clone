import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PayrollEntry {
  id: number;
  staff_id: number;
  base_salary: number;
  bonuses: number;
  allowances: number;
  deductions: number;
  net_salary: number;
}

interface PayrollPeriod {
  id: number;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Staff {
  id: number;
  full_name: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F CFA';

// Company info interface for payroll documents
interface PayrollCompanyInfo {
  name: string;
  logoUrl?: string | null;
  address?: string;
  phone?: string;
  email?: string;
}

export const generatePayslipPdf = async (
  entry: PayrollEntry,
  period: PayrollPeriod,
  staffName: string,
  company: PayrollCompanyInfo = { name: 'Transport Express' }
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
      headerY += logoHeight + 5;
    } catch (e) {
      console.error('Failed to load logo for payslip:', e);
    }
  }

  // Company name
  doc.setFontSize(12);
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

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHE DE PAIE', pageWidth / 2, headerY, { align: 'center' });
  headerY += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période: ${period.label}`, pageWidth / 2, headerY, { align: 'center' });
  headerY += 7;
  doc.text(
    `Du ${format(new Date(period.start_date), 'dd/MM/yyyy')} au ${format(new Date(period.end_date), 'dd/MM/yyyy')}`,
    pageWidth / 2,
    headerY,
    { align: 'center' }
  );
  headerY += 15;

  // Employee info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Employé:', 20, headerY);
  doc.setFont('helvetica', 'normal');
  doc.text(staffName, 55, headerY);
  headerY += 15;

  // Salary details table
  autoTable(doc, {
    startY: headerY,
    head: [['Rubrique', 'Montant']],
    body: [
      ['Salaire de base', formatCurrency(entry.base_salary)],
      ['Primes', formatCurrency(entry.bonuses)],
      ['Indemnités', formatCurrency(entry.allowances)],
      ['Retenues', `- ${formatCurrency(entry.deductions)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 11 },
  });

  // Net salary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setDrawColor(59, 130, 246);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(20, finalY, pageWidth - 40, 25, 3, 3, 'FD');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NET À PAYER:', 30, finalY + 16);
  doc.setFontSize(16);
  doc.text(formatCurrency(entry.net_salary), pageWidth - 30, finalY + 16, { align: 'right' });

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text(`Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, 280, {
    align: 'center',
  });

  // Save
  const filename = `fiche_paie_${staffName.replace(/\s+/g, '_')}_${period.label.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};

export const generatePeriodSummaryPdf = async (
  period: PayrollPeriod,
  entries: PayrollEntry[],
  staffList: Staff[],
  company: PayrollCompanyInfo = { name: 'Transport Express' }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let headerY = 15;

  const getStaffName = (id: number) => staffList.find((s) => s.id === id)?.full_name || '-';

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
      headerY += logoHeight + 5;
    } catch (e) {
      console.error('Failed to load logo for period summary:', e);
    }
  }

  // Company name
  doc.setFontSize(12);
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

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉCAPITULATIF DE PAIE', pageWidth / 2, headerY, { align: 'center' });
  headerY += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période: ${period.label}`, pageWidth / 2, headerY, { align: 'center' });
  headerY += 7;
  doc.text(
    `Du ${format(new Date(period.start_date), 'dd/MM/yyyy')} au ${format(new Date(period.end_date), 'dd/MM/yyyy')}`,
    pageWidth / 2,
    headerY,
    { align: 'center' }
  );
  headerY += 10;

  // Summary stats
  const totalBase = entries.reduce((sum, e) => sum + e.base_salary, 0);
  const totalBonuses = entries.reduce((sum, e) => sum + e.bonuses, 0);
  const totalAllowances = entries.reduce((sum, e) => sum + e.allowances, 0);
  const totalDeductions = entries.reduce((sum, e) => sum + e.deductions, 0);
  const totalNet = entries.reduce((sum, e) => sum + e.net_salary, 0);

  // Stats boxes
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nombre de fiches: ${entries.length}`, 20, headerY);
  doc.text(`Masse salariale: ${formatCurrency(totalNet)}`, pageWidth - 20, headerY, { align: 'right' });
  headerY += 10;

  // Entries table
  autoTable(doc, {
    startY: headerY,
    head: [['Employé', 'Salaire base', 'Primes', 'Indemnités', 'Retenues', 'Net']],
    body: entries.map((entry) => [
      getStaffName(entry.staff_id),
      formatCurrency(entry.base_salary),
      formatCurrency(entry.bonuses),
      formatCurrency(entry.allowances),
      formatCurrency(entry.deductions),
      formatCurrency(entry.net_salary),
    ]),
    foot: [
      [
        'TOTAL',
        formatCurrency(totalBase),
        formatCurrency(totalBonuses),
        formatCurrency(totalAllowances),
        formatCurrency(totalDeductions),
        formatCurrency(totalNet),
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    footStyles: { fillColor: [229, 231, 235], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text(`Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, 280, {
    align: 'center',
  });

  // Save
  const filename = `recap_paie_${period.label.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};

export const generateAllPeriodsStatsPdf = async (
  periods: PayrollPeriod[],
  allEntries: any[],
  agencies: { id: number; name: string }[],
  staffList: Staff[],
  company: PayrollCompanyInfo = { name: 'Transport Express' }
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
      headerY += logoHeight + 5;
    } catch (e) {
      console.error('Failed to load logo for payroll stats:', e);
    }
  }

  // Company name
  doc.setFontSize(12);
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

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT STATISTIQUES PAIE', pageWidth / 2, headerY, { align: 'center' });
  headerY += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, pageWidth / 2, headerY, { align: 'center' });
  headerY += 12;

  // Global KPIs
  const totalPayroll = allEntries.reduce((sum, e) => sum + Number(e.net_salary), 0);
  const uniqueEmployees = new Set(allEntries.map((e) => e.staff_id)).size;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé global', 20, headerY);
  headerY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`• Périodes: ${periods.length}`, 25, headerY);
  headerY += 7;
  doc.text(`• Fiches de paie: ${allEntries.length}`, 25, headerY);
  headerY += 7;
  doc.text(`• Employés payés: ${uniqueEmployees}`, 25, headerY);
  headerY += 7;
  doc.text(`• Masse salariale totale: ${formatCurrency(totalPayroll)}`, 25, headerY);
  headerY += 12;

  // By Period table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Par période', 20, headerY);
  headerY += 5;

  autoTable(doc, {
    startY: headerY,
    head: [['Période', 'Dates', 'Fiches', 'Salaire base', 'Primes', 'Net total', 'Statut']],
    body: periods.map((period) => {
      const periodEntries = allEntries.filter((e) => e.payroll_period_id === period.id);
      const totalBase = periodEntries.reduce((sum, e) => sum + Number(e.base_salary), 0);
      const totalBonuses = periodEntries.reduce((sum, e) => sum + Number(e.bonuses), 0);
      const totalNet = periodEntries.reduce((sum, e) => sum + Number(e.net_salary), 0);
      return [
        period.label,
        `${format(new Date(period.start_date), 'dd/MM')} - ${format(new Date(period.end_date), 'dd/MM/yy')}`,
        periodEntries.length.toString(),
        formatCurrency(totalBase),
        formatCurrency(totalBonuses),
        formatCurrency(totalNet),
        period.status === 'open' ? 'Ouverte' : 'Clôturée',
      ];
    }),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // By Agency table
  const agencyTableY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Par agence', 20, agencyTableY);

  const agencyData = agencies
    .map((agency) => {
      const agencyEntries = allEntries.filter((e: any) => e.staff?.agency_id === agency.id);
      if (agencyEntries.length === 0) return null;
      const uniqueStaff = new Set(agencyEntries.map((e) => e.staff_id)).size;
      const totalNet = agencyEntries.reduce((sum, e) => sum + Number(e.net_salary), 0);
      return [
        agency.name,
        uniqueStaff.toString(),
        agencyEntries.length.toString(),
        formatCurrency(totalNet),
        formatCurrency(uniqueStaff > 0 ? totalNet / uniqueStaff : 0),
      ];
    })
    .filter(Boolean) as string[][];

  autoTable(doc, {
    startY: agencyTableY + 5,
    head: [['Agence', 'Employés', 'Fiches', 'Masse salariale', 'Moyenne/employé']],
    body: agencyData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
    },
  });

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text(`Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, 280, {
    align: 'center',
  });

  doc.save('rapport_statistiques_paie.pdf');
};
