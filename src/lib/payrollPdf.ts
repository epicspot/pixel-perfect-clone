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

export const generatePayslipPdf = (
  entry: PayrollEntry,
  period: PayrollPeriod,
  staffName: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHE DE PAIE', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période: ${period.label}`, pageWidth / 2, 35, { align: 'center' });
  doc.text(
    `Du ${format(new Date(period.start_date), 'dd/MM/yyyy')} au ${format(new Date(period.end_date), 'dd/MM/yyyy')}`,
    pageWidth / 2,
    42,
    { align: 'center' }
  );

  // Employee info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Employé:', 20, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(staffName, 55, 60);

  // Salary details table
  autoTable(doc, {
    startY: 75,
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

export const generatePeriodSummaryPdf = (
  period: PayrollPeriod,
  entries: PayrollEntry[],
  staffList: Staff[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const getStaffName = (id: number) => staffList.find((s) => s.id === id)?.full_name || '-';

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉCAPITULATIF DE PAIE', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période: ${period.label}`, pageWidth / 2, 35, { align: 'center' });
  doc.text(
    `Du ${format(new Date(period.start_date), 'dd/MM/yyyy')} au ${format(new Date(period.end_date), 'dd/MM/yyyy')}`,
    pageWidth / 2,
    42,
    { align: 'center' }
  );

  // Summary stats
  const totalBase = entries.reduce((sum, e) => sum + e.base_salary, 0);
  const totalBonuses = entries.reduce((sum, e) => sum + e.bonuses, 0);
  const totalAllowances = entries.reduce((sum, e) => sum + e.allowances, 0);
  const totalDeductions = entries.reduce((sum, e) => sum + e.deductions, 0);
  const totalNet = entries.reduce((sum, e) => sum + e.net_salary, 0);

  // Stats boxes
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nombre de fiches: ${entries.length}`, 20, 55);
  doc.text(`Masse salariale: ${formatCurrency(totalNet)}`, pageWidth - 20, 55, { align: 'right' });

  // Entries table
  autoTable(doc, {
    startY: 65,
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

export const generateAllPeriodsStatsPdf = (
  periods: PayrollPeriod[],
  allEntries: any[],
  agencies: { id: number; name: string }[],
  staffList: Staff[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT STATISTIQUES PAIE', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, pageWidth / 2, 33, { align: 'center' });

  // Global KPIs
  const totalPayroll = allEntries.reduce((sum, e) => sum + Number(e.net_salary), 0);
  const uniqueEmployees = new Set(allEntries.map((e) => e.staff_id)).size;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé global', 20, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`• Périodes: ${periods.length}`, 25, 56);
  doc.text(`• Fiches de paie: ${allEntries.length}`, 25, 63);
  doc.text(`• Employés payés: ${uniqueEmployees}`, 25, 70);
  doc.text(`• Masse salariale totale: ${formatCurrency(totalPayroll)}`, 25, 77);

  // By Period table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Par période', 20, 92);

  autoTable(doc, {
    startY: 97,
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
