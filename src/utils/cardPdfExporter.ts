import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { Member, Church } from '../types';
import { CardStyleDefinition } from '../data/cardStyles';

export type PdfExportLayout = 'a4_grid' | 'letter_grid' | 'cr80_single';

export interface PdfExportProgress {
  current: number;
  total: number;
  percent: number;
  stage: string;
}

export interface PdfExportOptions {
  church: Church;
  members: Member[];
  side: 'both' | 'front' | 'back';
  layout: PdfExportLayout;
  showCropMarks: boolean;
  onProgress?: (progress: PdfExportProgress) => void;
}

/**
 * High-definition batch exporter for church member ID cards.
 * Generates external-printer ready PDF files in A4/Letter multi-card sheets or CR80 card formats.
 */
export async function exportCardsToPdf(
  cardsContainerElement: HTMLElement,
  options: PdfExportOptions
): Promise<Blob> {
  const { church, members, side, layout, onProgress } = options;

  // Query all card node containers in the DOM
  // Each PrintableCardUnit has front and/or back cards
  const cardElements: HTMLElement[] = Array.from(
    cardsContainerElement.querySelectorAll<HTMLElement>('[data-card-face]')
  );

  if (cardElements.length === 0) {
    throw new Error('Pa gen okenn kat idantite jwenn nan zòn enpresyon an.');
  }

  const totalCards = cardElements.length;
  let processedCount = 0;

  // Initialize jsPDF document based on selected layout
  let pdf: jsPDF;
  if (layout === 'cr80_single') {
    // CR80 Standard ISO 7810 ID-1: 85.6mm x 54mm
    pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54],
      compress: true,
    });
  } else if (layout === 'letter_grid') {
    // US Letter: 215.9mm x 279.4mm (8.5 x 11 in)
    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
      compress: true,
    });
  } else {
    // Standard A4: 210mm x 297mm
    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
  }

  // Grid layout parameters for A4 / Letter
  const isA4 = layout === 'a4_grid';
  const pageWidth = isA4 ? 210 : 215.9;
  const pageHeight = isA4 ? 297 : 279.4;

  const cardWidth = 85.6;
  const cardHeight = 54;
  const cols = 2;
  const rows = isA4 ? 5 : 4; // 10 cards per A4 page (5x2), or 8 cards per Letter page (4x2)
  const cardsPerPage = cols * rows;

  const horizMargin = (pageWidth - cols * cardWidth) / (cols + 1);
  const vertMargin = (pageHeight - rows * cardHeight) / (rows + 1);

  // Capture each card with html2canvas and place into PDF
  let currentPageCardIndex = 0;

  for (let i = 0; i < cardElements.length; i++) {
    const cardEl = cardElements[i];
    const memberName = cardEl.getAttribute('data-member-name') || `Kat #${i + 1}`;
    const faceType = cardEl.getAttribute('data-card-face') || 'Rèkto';

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: totalCards,
        percent: Math.round(((i + 1) / totalCards) * 90),
        stage: `Kaptire ${faceType} pou: ${memberName} (${i + 1}/${totalCards})...`,
      });
    }

    // High DPI Snapshot using native browser SVG/canvas engine (Full OKLCH and modern CSS support)
    const imgData = await toPng(cardEl, {
      pixelRatio: 2.5, // 2.5x resolution for 300+ DPI external printing sharpness
      cacheBust: true,
    });

    if (layout === 'cr80_single') {
      if (i > 0) {
        pdf.addPage([85.6, 54], 'landscape');
      }
      pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54, undefined, 'FAST');
    } else {
      // Grid placement on A4 / Letter sheet
      if (currentPageCardIndex >= cardsPerPage) {
        pdf.addPage(isA4 ? 'a4' : 'letter', 'portrait');
        currentPageCardIndex = 0;
      }

      const colIndex = currentPageCardIndex % cols;
      const rowIndex = Math.floor(currentPageCardIndex / cols);

      const posX = horizMargin + colIndex * (cardWidth + horizMargin);
      const posY = vertMargin + rowIndex * (cardHeight + vertMargin);

      // Draw subtle cutting guideline borders around card if requested
      if (options.showCropMarks) {
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.15);
        // Corner tick marks
        const tickLength = 2.5;
        // Top Left
        pdf.line(posX - tickLength, posY, posX, posY);
        pdf.line(posX, posY - tickLength, posX, posY);
        // Top Right
        pdf.line(posX + cardWidth, posY, posX + cardWidth + tickLength, posY);
        pdf.line(posX + cardWidth, posY - tickLength, posX + cardWidth, posY);
        // Bottom Left
        pdf.line(posX - tickLength, posY + cardHeight, posX, posY + cardHeight);
        pdf.line(posX, posY + cardHeight, posX, posY + cardHeight + tickLength);
        // Bottom Right
        pdf.line(posX + cardWidth, posY + cardHeight, posX + cardWidth + tickLength, posY + cardHeight);
        pdf.line(posX + cardWidth, posY + cardHeight, posX + cardWidth, posY + cardHeight + tickLength);
      }

      pdf.addImage(imgData, 'PNG', posX, posY, cardWidth, cardHeight, undefined, 'FAST');
      currentPageCardIndex++;
    }

    processedCount++;
    // Small timeout to allow UI updates and prevent thread blocking
    await new Promise((resolve) => setTimeout(resolve, 15));
  }

  if (onProgress) {
    onProgress({
      current: totalCards,
      total: totalCards,
      percent: 100,
      stage: 'N ap konpile fichye PDF HD a...',
    });
  }

  return pdf.output('blob');
}
