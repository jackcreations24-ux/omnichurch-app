import jsPDF from 'jspdf';
import { Church, Member, AttendanceRecord } from '../types';

interface MemberPdfExportOptions {
  church: Church;
  members: Member[];
  filterLabel?: string;
}

interface AttendancePdfExportOptions {
  church: Church;
  records: AttendanceRecord[];
  serviceTitle?: string;
  filterLabel?: string;
}

interface SingleMemberAttendancePdfOptions {
  church: Church;
  member: Member;
  records: AttendanceRecord[];
}

/**
 * Format date nicely for official church reports
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
}

/**
 * Draw Church Header Banner on a PDF page
 */
function drawHeader(
  pdf: jsPDF,
  church: Church,
  reportTitle: string,
  subTitle: string,
  pageWidth: number,
  margin: number
): number {
  // Top decorative bar
  pdf.setFillColor(15, 23, 42); // #0f172a
  pdf.rect(0, 0, pageWidth, 28, 'F');

  // Gold accent line
  pdf.setFillColor(217, 119, 6); // #d97706
  pdf.rect(0, 28, pageWidth, 2, 'F');

  // Church Name in Header
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(church.name.toUpperCase(), margin, 12);

  // Church Subtitle / Pastor / City
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(203, 213, 225); // #cbd5e1
  const metaLine = [
    church.pastor ? `Pastè: ${church.pastor}` : '',
    church.city ? church.city : '',
    church.phone ? `Tel: ${church.phone}` : '',
    `Kòd: ${church.code || church.id}`,
  ]
    .filter(Boolean)
    .join('  •  ');
  pdf.text(metaLine, margin, 19);

  // Document Title Banner (Below Header)
  let currentY = 38;
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(reportTitle, margin, currentY);

  // Date Generated & Subtitle
  currentY += 5.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139); // #64748b
  const genDate = `Dat Ekstrè: ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  pdf.text(`${subTitle}  |  ${genDate}`, margin, currentY);

  currentY += 6;
  pdf.setDrawColor(226, 232, 240); // #e2e8f0
  pdf.setLineWidth(0.5);
  pdf.line(margin, currentY, pageWidth - margin, currentY);

  return currentY + 6;
}

/**
 * Draw Page Footer with Page Numbers and Disclaimer
 */
function drawFooters(pdf: jsPDF, church: Church, totalPages: number, pageWidth: number, pageHeight: number, margin: number) {
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 10;

    // Divider line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.4);
    pdf.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    // Left info
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`${church.name} — Sistèm Jesyon Eklezyastik`, margin, footerY);

    // Right page number
    const pageStr = `Paj ${i} sou ${totalPages}`;
    const strWidth = pdf.getTextWidth(pageStr);
    pdf.text(pageStr, pageWidth - margin - strWidth, footerY);
  }
}

/**
 * Draw Authorized Signature Block on final page
 */
function drawSignatureBlock(
  pdf: jsPDF,
  church: Church,
  currentY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number
): number {
  const boxWidth = 75;
  const boxHeight = 32;
  const signatureX = pageWidth - margin - boxWidth;

  // If near bottom, add a new page
  if (currentY + boxHeight + 15 > pageHeight - 18) {
    pdf.addPage();
    currentY = 25;
  }

  currentY += 6;

  // Signature box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(signatureX, currentY, boxWidth, boxHeight, 2, 2, 'FD');

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Siyati & Otorizasyon Ofisyèl', signatureX + 6, currentY + 6);

  // If church has electronic signature image, draw it
  if (church.signatureUrl && church.signatureUrl.startsWith('data:image')) {
    try {
      pdf.addImage(church.signatureUrl, 'PNG', signatureX + 10, currentY + 8, 55, 14, undefined, 'FAST');
    } catch {
      // fallback if image drawing fails
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('[Siyati Elektwonik Otorize]', signatureX + 15, currentY + 16);
    }
  } else {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('[Siyati Otorize]', signatureX + 22, currentY + 16);
  }

  // Signer details
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);
  const signerName = church.pastor ? `Pastè: ${church.pastor}` : 'Administrasyon Legliz la';
  pdf.text(signerName, signatureX + 6, currentY + boxHeight - 4);

  return currentY + boxHeight + 6;
}

/**
 * 1. EXPORT LIS MANM YO AN PDF
 */
export async function exportMembersListToPdf(options: MemberPdfExportOptions): Promise<void> {
  const { church, members, filterLabel } = options;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  let currentY = drawHeader(
    pdf,
    church,
    'LIS OFISYÈL MANM LEGLIZ LA',
    filterLabel ? `Filtè: ${filterLabel} (${members.length} Manm)` : `Total: ${members.length} Manm Anrejistre`,
    pageWidth,
    margin
  );

  // Summary Metrics Bar
  const activeCount = members.filter((m) => m.status === 'active').length;
  const inactiveCount = members.length - activeCount;

  pdf.setFillColor(241, 245, 249); // #f1f5f9
  pdf.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);

  const stats = [
    `Total Manm: ${members.length}`,
    `Aktif: ${activeCount}`,
    `Inaktif: ${inactiveCount}`,
    `Depatman: ${Array.from(new Set(members.map((m) => m.department).filter(Boolean))).length}`,
  ].join('     |     ');

  pdf.text(stats, margin + 6, currentY + 7.5);
  currentY += 16;

  // Table Columns Definition
  const cols = [
    { title: '#', width: 8, align: 'center' as const },
    { title: 'ID Manm', width: 26, align: 'left' as const },
    { title: 'Non Konplè', width: 44, align: 'left' as const },
    { title: 'Telefòn', width: 27, align: 'left' as const },
    { title: 'Depatman', width: 33, align: 'left' as const },
    { title: 'Wòl', width: 25, align: 'left' as const },
    { title: 'Stati', width: 15, align: 'center' as const },
  ];

  const rowHeight = 7.5;

  const drawTableHeaders = (y: number) => {
    pdf.setFillColor(30, 41, 59); // #1e293b
    pdf.rect(margin, y, contentWidth, 7, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);

    let x = margin;
    cols.forEach((col) => {
      if (col.align === 'center') {
        pdf.text(col.title, x + col.width / 2, y + 4.8, { align: 'center' });
      } else {
        pdf.text(col.title, x + 2, y + 4.8);
      }
      x += col.width;
    });
    return y + 7;
  };

  currentY = drawTableHeaders(currentY);

  // Render Table Rows
  members.forEach((member, index) => {
    // Check if we need a new page
    if (currentY + rowHeight > pageHeight - 35) {
      pdf.addPage();
      currentY = drawHeader(
        pdf,
        church,
        'LIS OFISYÈL MANM LEGLIZ LA (Suit)',
        filterLabel || `${members.length} Manm`,
        pageWidth,
        margin
      );
      currentY = drawTableHeaders(currentY);
    }

    // Zebra striping
    if (index % 2 === 0) {
      pdf.setFillColor(255, 255, 255);
    } else {
      pdf.setFillColor(248, 250, 252);
    }
    pdf.rect(margin, currentY, contentWidth, rowHeight, 'F');

    // Subtle bottom row line
    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.2);
    pdf.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.2);
    pdf.setTextColor(51, 65, 85);

    let x = margin;

    // # Index
    pdf.text(String(index + 1), x + cols[0].width / 2, currentY + 5, { align: 'center' });
    x += cols[0].width;

    // ID
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(member.memberId || '—', x + 2, currentY + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    x += cols[1].width;

    // Name (truncated if needed)
    const nameText = member.fullName || '—';
    pdf.text(nameText.length > 25 ? nameText.substring(0, 23) + '...' : nameText, x + 2, currentY + 5);
    x += cols[2].width;

    // Phone
    pdf.text(member.phone || '—', x + 2, currentY + 5);
    x += cols[3].width;

    // Department
    const deptText = member.department || 'Général';
    pdf.text(deptText.length > 20 ? deptText.substring(0, 18) + '...' : deptText, x + 2, currentY + 5);
    x += cols[4].width;

    // Role
    const roleText = member.role || 'Manm';
    pdf.text(roleText.length > 15 ? roleText.substring(0, 13) + '...' : roleText, x + 2, currentY + 5);
    x += cols[5].width;

    // Status (Active / Inactive badge)
    if (member.status === 'active') {
      pdf.setTextColor(22, 101, 52); // green
      pdf.text('Aktif', x + cols[6].width / 2, currentY + 5, { align: 'center' });
    } else {
      pdf.setTextColor(185, 28, 28); // red
      pdf.text('Inaktif', x + cols[6].width / 2, currentY + 5, { align: 'center' });
    }

    currentY += rowHeight;
  });

  // Draw Signature Block on final page
  drawSignatureBlock(pdf, church, currentY, pageWidth, pageHeight, margin);

  // Footer for all pages
  const totalPages = (pdf as any).internal.getNumberOfPages();
  drawFooters(pdf, church, totalPages, pageWidth, pageHeight, margin);

  // Save PDF to user device
  const dateStamp = new Date().toISOString().split('T')[0];
  pdf.save(`Lis_Manm_${church.code || 'CH'}_${dateStamp}.pdf`);
}

/**
 * 2. EXPORT RAPÒ ISTWA PREZANS AN PDF
 */
export async function exportAttendanceListToPdf(options: AttendancePdfExportOptions): Promise<void> {
  const { church, records, serviceTitle, filterLabel } = options;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  let currentY = drawHeader(
    pdf,
    church,
    'RAPÒ OFISYÈL PREZANS & SCAN',
    serviceTitle ? `Sèvis: ${serviceTitle}` : `Total: ${records.length} Prezans Anrejistre`,
    pageWidth,
    margin
  );

  // Summary Metrics Bar
  const onTimeCount = records.filter((r) => r.attendanceStatus !== 'late').length;
  const lateCount = records.filter((r) => r.attendanceStatus === 'late').length;
  const qrCount = records.filter((r) => r.checkInMethod === 'qr_scan').length;
  const barcodeCount = records.filter((r) => r.checkInMethod === 'barcode').length;
  const manualCount = records.filter((r) => r.checkInMethod === 'manual').length;

  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);

  const stats = [
    `Total Prezans: ${records.length}`,
    `Alè: ${onTimeCount}`,
    `Reta: ${lateCount}`,
    `QR Scan: ${qrCount}`,
    `Barcode: ${barcodeCount}`,
    `Manyèl: ${manualCount}`,
    filterLabel ? `Filtè: ${filterLabel}` : '',
  ]
    .filter(Boolean)
    .join('   |   ');

  pdf.text(stats, margin + 4, currentY + 7.5);
  currentY += 16;

  // Table Columns Definition
  const cols = [
    { title: '#', width: 7, align: 'center' as const },
    { title: 'Dat & Lè', width: 25, align: 'left' as const },
    { title: 'ID Manm', width: 25, align: 'left' as const },
    { title: 'Non Konplè Manm', width: 44, align: 'left' as const },
    { title: 'Sèvis / Aktivite', width: 40, align: 'left' as const },
    { title: 'Metòd', width: 20, align: 'center' as const },
    { title: 'Estati', width: 25, align: 'center' as const },
  ];

  const rowHeight = 7.5;

  const drawTableHeaders = (y: number) => {
    pdf.setFillColor(30, 41, 59); // #1e293b
    pdf.rect(margin, y, contentWidth, 7, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);

    let x = margin;
    cols.forEach((col) => {
      if (col.align === 'center') {
        pdf.text(col.title, x + col.width / 2, y + 4.8, { align: 'center' });
      } else {
        pdf.text(col.title, x + 2, y + 4.8);
      }
      x += col.width;
    });
    return y + 7;
  };

  currentY = drawTableHeaders(currentY);

  // Render Table Rows
  records.forEach((record, index) => {
    if (currentY + rowHeight > pageHeight - 35) {
      pdf.addPage();
      currentY = drawHeader(
        pdf,
        church,
        'RAPÒ OFISYÈL PREZANS & SCAN (Suit)',
        serviceTitle || `${records.length} Prezans`,
        pageWidth,
        margin
      );
      currentY = drawTableHeaders(currentY);
    }

    // Zebra striping
    if (index % 2 === 0) {
      pdf.setFillColor(255, 255, 255);
    } else {
      pdf.setFillColor(248, 250, 252);
    }
    pdf.rect(margin, currentY, contentWidth, rowHeight, 'F');

    // Line
    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.2);
    pdf.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.2);
    pdf.setTextColor(51, 65, 85);

    let x = margin;

    // # Index
    pdf.text(String(index + 1), x + cols[0].width / 2, currentY + 5, { align: 'center' });
    x += cols[0].width;

    // Dat & Lè
    const dateFormatted = record.timestamp
      ? formatDateTime(record.timestamp)
      : record.serviceDate || '—';
    pdf.text(dateFormatted, x + 2, currentY + 5);
    x += cols[1].width;

    // ID Manm
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(record.memberId || '—', x + 2, currentY + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    x += cols[2].width;

    // Nom Complet
    const nameText = record.memberName || '—';
    pdf.text(nameText.length > 24 ? nameText.substring(0, 22) + '...' : nameText, x + 2, currentY + 5);
    x += cols[3].width;

    // Sèvis
    const sTitle = record.serviceTitle || 'Sèvis Eklezyastik';
    pdf.text(sTitle.length > 24 ? sTitle.substring(0, 22) + '...' : sTitle, x + 2, currentY + 5);
    x += cols[4].width;

    // Metòd Scan
    const methodMap: Record<string, string> = {
      qr_scan: 'QR Scan',
      barcode: 'Barcode',
      manual: 'Manyèl',
    };
    pdf.setTextColor(14, 116, 144);
    pdf.text(methodMap[record.checkInMethod] || record.checkInMethod, x + cols[5].width / 2, currentY + 5, {
      align: 'center',
    });
    x += cols[5].width;

    // Estati (Alè vs Reta)
    if (record.attendanceStatus === 'late') {
      pdf.setTextColor(180, 83, 9);
      pdf.setFont('helvetica', 'bold');
      const lateTxt = record.lateMinutes ? `Reta (+${record.lateMinutes}m)` : 'Reta';
      pdf.text(lateTxt, x + cols[6].width / 2, currentY + 5, { align: 'center' });
    } else {
      pdf.setTextColor(22, 101, 52);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Alè ✓', x + cols[6].width / 2, currentY + 5, { align: 'center' });
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);

    currentY += rowHeight;
  });

  // Draw Signature Block on final page
  drawSignatureBlock(pdf, church, currentY, pageWidth, pageHeight, margin);

  // Footer for all pages
  const totalPages = (pdf as any).internal.getNumberOfPages();
  drawFooters(pdf, church, totalPages, pageWidth, pageHeight, margin);

  const dateStamp = new Date().toISOString().split('T')[0];
  pdf.save(`Rapò_Prezans_${church.code || 'CH'}_${dateStamp}.pdf`);
}

export interface AbsenteesPdfExportOptions {
  church: Church;
  absentees: Member[];
  serviceTitle?: string;
  serviceDate?: string;
}

export async function exportAbsenteesListToPdf(options: AbsenteesPdfExportOptions): Promise<void> {
  const { church, absentees, serviceTitle, serviceDate } = options;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  let currentY = drawHeader(
    pdf,
    church,
    'RAPÒ OFISYÈL MANM KI ABSAN',
    serviceTitle ? `Kilt: ${serviceTitle} (${serviceDate || ''})` : `Total: ${absentees.length} Manm Absan`,
    pageWidth,
    margin
  );

  // Summary Metrics Bar
  pdf.setFillColor(254, 242, 242);
  pdf.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(159, 18, 57);

  const stats = [
    `Total Manm Absan: ${absentees.length}`,
    serviceTitle ? `Sèvis: ${serviceTitle}` : '',
    serviceDate ? `Dat: ${serviceDate}` : '',
  ]
    .filter(Boolean)
    .join('     |     ');

  pdf.text(stats, margin + 6, currentY + 7.5);
  currentY += 16;

  // Table Columns Definition
  const cols = [
    { title: '#', width: 8, align: 'center' as const },
    { title: 'ID Manm', width: 28, align: 'left' as const },
    { title: 'Non Konplè', width: 50, align: 'left' as const },
    { title: 'Telefòn', width: 35, align: 'left' as const },
    { title: 'Depatman', width: 40, align: 'left' as const },
    { title: 'Stati', width: 25, align: 'center' as const },
  ];

  const rowHeight = 7.5;

  const drawTableHeaders = (y: number) => {
    pdf.setFillColor(30, 41, 59);
    pdf.rect(margin, y, contentWidth, 7, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);

    let x = margin;
    cols.forEach((col) => {
      if (col.align === 'center') {
        pdf.text(col.title, x + col.width / 2, y + 4.8, { align: 'center' });
      } else {
        pdf.text(col.title, x + 2, y + 4.8);
      }
      x += col.width;
    });
    return y + 7;
  };

  currentY = drawTableHeaders(currentY);

  absentees.forEach((member, index) => {
    if (currentY + rowHeight > pageHeight - 35) {
      pdf.addPage();
      currentY = drawHeader(
        pdf,
        church,
        'RAPÒ OFISYÈL MANM KI ABSAN (Suit)',
        serviceTitle || `${absentees.length} Absans`,
        pageWidth,
        margin
      );
      currentY = drawTableHeaders(currentY);
    }

    if (index % 2 === 0) {
      pdf.setFillColor(255, 255, 255);
    } else {
      pdf.setFillColor(254, 242, 242);
    }
    pdf.rect(margin, currentY, contentWidth, rowHeight, 'F');

    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.2);
    pdf.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.2);
    pdf.setTextColor(51, 65, 85);

    let x = margin;

    // # Index
    pdf.text(String(index + 1), x + cols[0].width / 2, currentY + 5, { align: 'center' });
    x += cols[0].width;

    // ID Manm
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(member.memberId || '—', x + 2, currentY + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    x += cols[1].width;

    // Non Konplè
    pdf.text(member.fullName.length > 28 ? member.fullName.substring(0, 26) + '...' : member.fullName, x + 2, currentY + 5);
    x += cols[2].width;

    // Telefòn
    pdf.text(member.phone || '—', x + 2, currentY + 5);
    x += cols[3].width;

    // Depatman
    const dept = member.department || 'Manm Jeneral';
    pdf.text(dept.length > 20 ? dept.substring(0, 18) + '...' : dept, x + 2, currentY + 5);
    x += cols[4].width;

    // Stati
    pdf.setTextColor(190, 18, 60);
    pdf.text('Absan', x + cols[5].width / 2, currentY + 5, { align: 'center' });

    currentY += rowHeight;
  });

  drawSignatureBlock(pdf, church, currentY, pageWidth, pageHeight, margin);
  const totalPages = (pdf as any).internal.getNumberOfPages();
  drawFooters(pdf, church, totalPages, pageWidth, pageHeight, margin);

  const dateStamp = new Date().toISOString().split('T')[0];
  pdf.save(`Rapò_Absans_${church.code || 'CH'}_${dateStamp}.pdf`);
}

/**
 * 3. EXPORT ISTWA PREZANS YON MANM ENDIVIDYÈL AN PDF (Dosye Pèsonèl)
 */
export async function exportSingleMemberAttendanceToPdf(options: SingleMemberAttendancePdfOptions): Promise<void> {
  const { church, member, records } = options;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  let currentY = drawHeader(
    pdf,
    church,
    'DOSYE & ISTWA PREZANS MANM',
    `${member.fullName} (${member.memberId})`,
    pageWidth,
    margin
  );

  // Member Bio Card on PDF
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`${member.fullName} ${member.role ? `• [${member.role}]` : ''}`, margin + 6, currentY + 6.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);

  const line1 = [
    `ID: ${member.memberId}`,
    `Depatman: ${member.department || 'Général'}`,
    `Telefòn: ${member.phone || '—'}`,
    `Imèl: ${member.email || '—'}`,
  ].join('   |   ');
  pdf.text(line1, margin + 6, currentY + 12);

  const line2 = [
    `Dat Antre: ${formatDate(member.joinedDate)}`,
    `Batèm: ${formatDate(member.baptismDate)}`,
    `Total Prezans: ${records.length}`,
    `Stati: ${member.status === 'active' ? 'Aktif' : 'Inaktif'}`,
  ].join('   |   ');
  pdf.text(line2, margin + 6, currentY + 17.5);

  currentY += 28;

  // Table Columns
  const cols = [
    { title: '#', width: 10, align: 'center' as const },
    { title: 'Dat Sèvis', width: 30, align: 'left' as const },
    { title: 'Lè Egzak (Scan)', width: 30, align: 'left' as const },
    { title: 'Sèvis Eklezyastik', width: 66, align: 'left' as const },
    { title: 'Kategori', width: 28, align: 'left' as const },
    { title: 'Metòd', width: 22, align: 'center' as const },
  ];

  const rowHeight = 8;

  const drawTableHeaders = (y: number) => {
    pdf.setFillColor(30, 41, 59);
    pdf.rect(margin, y, contentWidth, 7, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);

    let x = margin;
    cols.forEach((col) => {
      if (col.align === 'center') {
        pdf.text(col.title, x + col.width / 2, y + 4.8, { align: 'center' });
      } else {
        pdf.text(col.title, x + 2, y + 4.8);
      }
      x += col.width;
    });
    return y + 7;
  };

  currentY = drawTableHeaders(currentY);

  if (records.length === 0) {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(margin, currentY, contentWidth, 14, 'F');
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Pa gen okenn istwa prezans anrejistre pou manm sa a jiska prezan.', margin + contentWidth / 2, currentY + 9, {
      align: 'center',
    });
    currentY += 14;
  } else {
    records.forEach((record, index) => {
      if (currentY + rowHeight > pageHeight - 35) {
        pdf.addPage();
        currentY = drawHeader(
          pdf,
          church,
          'DOSYE PREZANS MANM (Suit)',
          `${member.fullName} (${member.memberId})`,
          pageWidth,
          margin
        );
        currentY = drawTableHeaders(currentY);
      }

      if (index % 2 === 0) {
        pdf.setFillColor(255, 255, 255);
      } else {
        pdf.setFillColor(248, 250, 252);
      }
      pdf.rect(margin, currentY, contentWidth, rowHeight, 'F');

      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.2);
      pdf.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(51, 65, 85);

      let x = margin;

      // #
      pdf.text(String(index + 1), x + cols[0].width / 2, currentY + 5.5, { align: 'center' });
      x += cols[0].width;

      // Dat
      pdf.text(formatDate(record.serviceDate), x + 2, currentY + 5.5);
      x += cols[1].width;

      // Time
      const timeStr = record.timestamp
        ? new Date(record.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '—';
      pdf.text(timeStr, x + 2, currentY + 5.5);
      x += cols[2].width;

      // Sèvis
      pdf.text(record.serviceTitle || 'Sèvis Eklezyastik', x + 2, currentY + 5.5);
      x += cols[3].width;

      // Kategori
      pdf.text(record.serviceCategory || 'Général', x + 2, currentY + 5.5);
      x += cols[4].width;

      // Metòd
      const methodMap: Record<string, string> = {
        qr_scan: 'QR Scan',
        barcode: 'Barcode',
        manual: 'Manyèl',
      };
      pdf.text(methodMap[record.checkInMethod] || record.checkInMethod, x + cols[5].width / 2, currentY + 5.5, {
        align: 'center',
      });

      currentY += rowHeight;
    });
  }

  // Signature Block
  drawSignatureBlock(pdf, church, currentY, pageWidth, pageHeight, margin);

  // Footers
  const totalPages = (pdf as any).internal.getNumberOfPages();
  drawFooters(pdf, church, totalPages, pageWidth, pageHeight, margin);

  const dateStamp = new Date().toISOString().split('T')[0];
  pdf.save(`Prezans_${member.memberId}_${dateStamp}.pdf`);
}
