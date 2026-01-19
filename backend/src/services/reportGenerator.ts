import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface ShiftReportData {
  workerName: string;
  clientName: string;
  shiftDate: Date;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  clockInTime: Date | null;
  clockOutTime: Date | null;
  breakMinutes: number;
  totalHours: number;
}

export interface ShiftReportSummary {
  companyName: string;
  startDate: Date;
  endDate: Date;
  shifts: ShiftReportData[];
  totalShifts: number;
  totalHours: number;
  uniqueWorkers: Set<string>;
}

/**
 * Format date to readable format (e.g., "Jan 15, 2024")
 */
export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format time to readable format (e.g., "9:00 AM")
 */
export function formatTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleTimeString('en-US', options);
}

/**
 * Format hours to 2 decimal places
 */
export function formatHours(hours: number): string {
  return hours.toFixed(2);
}

/**
 * Generate PDF shift report as a buffer
 */
export async function generateShiftReportPDF(report: ShiftReportSummary): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        bufferPages: true,
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', (err) => {
        reject(err);
      });

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text(report.companyName, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica').text('Shift Report', { align: 'center' });
      doc.moveDown(1);

      // Date range
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`Report Period: ${formatDate(report.startDate)} to ${formatDate(report.endDate)}`, {
          align: 'center',
        });
      doc.moveDown(1);

      // Check if there are shifts
      if (report.shifts.length === 0) {
        doc.fontSize(12).font('Helvetica').text('No shifts found for the specified date range.', {
          align: 'center',
        });
        doc.end();
        return;
      }

      // Table header
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 140;
      const col3 = 230;
      const col4 = 310;
      const col5 = 380;
      const col6 = 450;
      const col7 = 520;
      const rowHeight = 20;

      // Header background
      doc.rect(col1 - 5, tableTop, 570, rowHeight).fillAndStroke('#E0E0E0', '#000000');

      // Header text
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Worker', col1, tableTop + 5, { width: 85, align: 'left' });
      doc.text('Client', col2, tableTop + 5, { width: 85, align: 'left' });
      doc.text('Date', col3, tableTop + 5, { width: 75, align: 'left' });
      doc.text('Scheduled', col4, tableTop + 5, { width: 65, align: 'center' });
      doc.text('Clock In/Out', col5, tableTop + 5, { width: 65, align: 'center' });
      doc.text('Break', col6, tableTop + 5, { width: 50, align: 'center' });
      doc.text('Hours', col7, tableTop + 5, { width: 50, align: 'right' });

      // Table rows
      let currentY = tableTop + rowHeight + 5;
      let rowCount = 0;

      for (const shift of report.shifts) {
        // Add new page if needed
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }

        const rowBg = rowCount % 2 === 0 ? '#FFFFFF' : '#F5F5F5';
        doc.rect(col1 - 5, currentY - 5, 570, rowHeight).fill(rowBg);

        doc.fillColor('#000000').fontSize(8).font('Helvetica');

        // Worker name (truncate if too long)
        const workerName = shift.workerName.length > 12 ? shift.workerName.substring(0, 12) + '...' : shift.workerName;
        doc.text(workerName, col1, currentY, { width: 85, align: 'left' });

        // Client name (truncate if too long)
        const clientName = shift.clientName.length > 12 ? shift.clientName.substring(0, 12) + '...' : shift.clientName;
        doc.text(clientName, col2, currentY, { width: 85, align: 'left' });

        // Date
        doc.text(formatDate(shift.shiftDate), col3, currentY, { width: 75, align: 'left' });

        // Scheduled times
        const scheduledStart = formatTime(shift.scheduledStartTime);
        const scheduledEnd = formatTime(shift.scheduledEndTime);
        doc.text(`${scheduledStart}`, col4, currentY - 3, { width: 65, align: 'center' });
        doc.text(`${scheduledEnd}`, col4, currentY + 5, { width: 65, align: 'center', fontSize: 7 });

        // Clock in/out times
        const clockIn = shift.clockInTime ? formatTime(shift.clockInTime) : 'N/A';
        const clockOut = shift.clockOutTime ? formatTime(shift.clockOutTime) : 'N/A';
        doc.text(`${clockIn}`, col5, currentY - 3, { width: 65, align: 'center' });
        doc.text(`${clockOut}`, col5, currentY + 5, { width: 65, align: 'center', fontSize: 7 });

        // Break minutes
        doc.text(`${shift.breakMinutes}m`, col6, currentY, { width: 50, align: 'center' });

        // Total hours
        doc.text(formatHours(shift.totalHours), col7, currentY, { width: 50, align: 'right' });

        currentY += rowHeight;
        rowCount++;
      }

      // Summary section
      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica-Bold').text('Summary', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Shifts: ${report.totalShifts}`);
      doc.text(`Total Hours: ${formatHours(report.totalHours)}`);
      doc.text(`Unique Workers: ${report.uniqueWorkers.size}`);

      doc.moveDown(1);
      doc.fontSize(8).font('Helvetica').fillColor('#666666');
      doc.text(
        `Report generated on ${formatDate(new Date())} at ${new Date().toLocaleTimeString('en-US')}`,
        {
          align: 'center',
        },
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
