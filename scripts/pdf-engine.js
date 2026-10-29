const fs = require('fs');
const PDFDocument = require('pdfkit');

class PdfEngine {
  constructor(docTitle, options = {}) {
    this.docTitle = docTitle;
    this.doc = new PDFDocument({
      size: 'A4',
      margin: 42,
      bufferPages: true,
      autoFirstPage: false,
      ...options,
    });

    this.pageWidth = 595.28;
    this.pageHeight = 841.89;
    this.margin = 42;
    this.printableWidth = this.pageWidth - this.margin * 2; // 511.28 pt
    this.maxContentY = 780;
    this.headerY = 28;
    this.footerY = 806;
    this.startContentY = 56;

    // Register high-quality TrueType fonts with full Unicode & currency symbol support
    this.doc.registerFont('SegoeUI', 'C:\\Windows\\Fonts\\segoeui.ttf');
    this.doc.registerFont('SegoeUI-Bold', 'C:\\Windows\\Fonts\\segoeuib.ttf');
    this.doc.registerFont('SegoeUI-Semibold', 'C:\\Windows\\Fonts\\seguisb.ttf');
    this.doc.registerFont('Consolas', 'C:\\Windows\\Fonts\\consola.ttf');

    this.chapterMap = new Map();
  }

  ensureSpace(height) {
    if (this.doc.y + height > this.maxContentY) {
      this.addContentPage();
    }
  }

  addContentPage() {
    this.doc.addPage();
    this.doc.y = this.startContentY;
  }

  coverPage({ badge, title, subtitle, description, metadata, themeColor = '#0284C7' }) {
    this.doc.addPage();
    const doc = this.doc;

    // Dark sleek background
    doc.rect(0, 0, this.pageWidth, this.pageHeight).fill('#090D16');

    // Accent line top
    doc.rect(0, 0, this.pageWidth, 6).fill(themeColor);

    // Badge
    const badgeW = 260;
    doc.rect(42, 60, badgeW, 24).fill('#0E7490');
    doc.fillColor('#E0F2FE').fontSize(9).font('SegoeUI-Bold')
       .text(badge.toUpperCase(), 48, 67);

    // Title & Subtitle
    doc.fillColor('#38BDF8').fontSize(34).font('SegoeUI-Bold')
       .text(title, 42, 110);
    doc.fillColor('#94A3B8').fontSize(14).font('SegoeUI')
       .text(subtitle, 42, 155, { width: 500 });

    doc.rect(42, 215, this.printableWidth, 2).fill('#1E293B');

    // Description text
    doc.fillColor('#CBD5E1').fontSize(10).font('SegoeUI')
       .text(description, 42, 235, { width: this.printableWidth, lineGap: 4 });

    // Metadata card
    const metaCardY = 370;
    doc.rect(42, metaCardY, this.printableWidth, 150).fill('#0F172A').strokeColor('#1E293B').stroke();
    doc.fillColor('#38BDF8').fontSize(10.5).font('SegoeUI-Bold').text('DOCUMENT SPECIFICATIONS & CONTROL', 56, metaCardY + 14);

    let curY = metaCardY + 36;
    metadata.forEach(([k, v]) => {
      doc.fillColor('#64748B').fontSize(9).font('SegoeUI-Bold').text(k, 56, curY);
      doc.fillColor('#F8FAFC').fontSize(9).font('SegoeUI').text(v, 210, curY, { width: 320 });
      curY += 17;
    });

    // Confidentiality / Notice
    doc.rect(42, 680, this.printableWidth, 70).fill('#0B132B').strokeColor('#1E293B').stroke();
    doc.fillColor('#38BDF8').fontSize(8.5).font('SegoeUI-Bold').text('OFFICIAL PROJECT DOCUMENTATION', 56, 692);
    doc.fillColor('#94A3B8').fontSize(8).font('SegoeUI').text(
      'This document represents the definitive reference manual for the TrackingCrypt real-time platform. All code samples, architectures, metrics, and workflows reflect the active codebase.',
      56,
      708,
      { width: this.printableWidth - 28, lineGap: 2 }
    );
  }

  chapterHeader(num, title) {
    this.ensureSpace(70);
    const doc = this.doc;
    const startY = doc.y + 10;

    // Record page for TOC
    const currentPage = doc.bufferedPageRange().count;
    this.chapterMap.set(num, currentPage);

    // Accent bar
    doc.rect(42, startY, 4, 22).fill('#0284C7');

    doc.fillColor('#0284C7').fontSize(14).font('SegoeUI-Bold')
       .text(`Chapter ${num}: ${title}`, 52, startY + 2);

    doc.rect(42, startY + 26, this.printableWidth, 1).fill('#E2E8F0');
    doc.y = startY + 34;
  }

  sectionHeader(title) {
    this.ensureSpace(45);
    const doc = this.doc;
    doc.fillColor('#0F172A').fontSize(11.5).font('SegoeUI-Bold')
       .text(title, 42, doc.y + 6);
    doc.y += 4;
  }

  subSectionHeader(title) {
    this.ensureSpace(35);
    const doc = this.doc;
    doc.fillColor('#0369A1').fontSize(10).font('SegoeUI-Semibold')
       .text(title, 42, doc.y + 4);
    doc.y += 3;
  }

  paragraph(text) {
    this.ensureSpace(30);
    const doc = this.doc;
    doc.fillColor('#334155').fontSize(9).font('SegoeUI')
       .text(text, 42, doc.y, { width: this.printableWidth, lineGap: 3.2 });
    doc.y += 6;
  }

  bullet(label, desc) {
    this.ensureSpace(22);
    const doc = this.doc;
    const bulletY = doc.y;

    doc.fillColor('#0284C7').fontSize(9).font('SegoeUI-Bold').text('•', 44, bulletY);
    doc.fillColor('#0F172A').fontSize(9).font('SegoeUI-Bold').text(label + ': ', 54, bulletY, { continued: true });
    doc.fillColor('#334155').fontSize(9).font('SegoeUI').text(desc, { width: this.printableWidth - 14, lineGap: 2 });
    doc.y += 4;
  }

  callout(title, text, type = 'info') {
    this.ensureSpace(55);
    const doc = this.doc;
    const colors = {
      info: { bg: '#F0F9FF', border: '#0284C7', title: '#0369A1', text: '#0C4A6E' },
      warning: { bg: '#FFFBEB', border: '#F59E0B', title: '#B45309', text: '#78350F' },
      danger: { bg: '#FEF2F2', border: '#EF4444', title: '#B91C1C', text: '#7F1D1D' },
      success: { bg: '#F0FDF4', border: '#10B981', title: '#047857', text: '#064E3B' },
    }[type];

    const boxY = doc.y;
    // Estimate text height
    const textHeight = doc.fontSize(8.5).heightOfString(text, { width: this.printableWidth - 28 });
    const boxHeight = Math.max(48, textHeight + 28);

    doc.rect(42, boxY, this.printableWidth, boxHeight).fill(colors.bg);
    doc.rect(42, boxY, 4, boxHeight).fill(colors.border);

    doc.fillColor(colors.title).fontSize(9.5).font('SegoeUI-Bold').text(title, 54, boxY + 7);
    doc.fillColor(colors.text).fontSize(8.5).font('SegoeUI').text(text, 54, boxY + 22, {
      width: this.printableWidth - 24,
      lineGap: 2.5,
    });

    doc.y = boxY + boxHeight + 8;
  }

  codeBlock(title, codeString) {
    const doc = this.doc;
    const lines = codeString.trim().split('\n');
    const blockHeight = lines.length * 12 + 24;
    this.ensureSpace(Math.min(blockHeight, 200));

    const boxY = doc.y;
    const actualHeight = Math.min(blockHeight, this.maxContentY - boxY);

    doc.rect(42, boxY, this.printableWidth, actualHeight).fill('#0B1120');
    doc.rect(42, boxY, this.printableWidth, actualHeight).strokeColor('#1E293B').stroke();

    if (title) {
      doc.rect(42, boxY, this.printableWidth, 18).fill('#1E293B');
      doc.fillColor('#38BDF8').fontSize(7.5).font('SegoeUI-Bold').text(title, 48, boxY + 4);
    }

    let lineY = boxY + (title ? 24 : 8);
    doc.font('Consolas').fontSize(7.5);

    lines.forEach((l) => {
      if (lineY < boxY + actualHeight - 10) {
        doc.fillColor('#E2E8F0').text(l, 50, lineY, { width: this.printableWidth - 16 });
        lineY += 12;
      }
    });

    doc.y = boxY + actualHeight + 8;
  }

  table(headers, rows, colWidths) {
    const doc = this.doc;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    const drawHeader = () => {
      const headerY = doc.y;
      doc.rect(42, headerY, tableWidth, 20).fill('#0F172A');
      let curX = 42;
      doc.fillColor('#FFFFFF').fontSize(8).font('SegoeUI-Bold');
      headers.forEach((h, i) => {
        doc.text(h, curX + 5, headerY + 5, { width: colWidths[i] - 10 });
        curX += colWidths[i];
      });
      doc.y = headerY + 20;
    };

    this.ensureSpace(45);
    drawHeader();

    rows.forEach((row, rowIndex) => {
      // Calculate row height based on content
      doc.font('SegoeUI').fontSize(7.5);
      let maxCellH = 18;
      row.forEach((cell, i) => {
        const h = doc.heightOfString(String(cell), { width: colWidths[i] - 10 });
        if (h + 8 > maxCellH) maxCellH = h + 8;
      });

      if (doc.y + maxCellH > this.maxContentY) {
        this.addContentPage();
        drawHeader();
      }

      const rowY = doc.y;
      if (rowIndex % 2 === 0) {
        doc.rect(42, rowY, tableWidth, maxCellH).fill('#F8FAFC');
      }

      doc.rect(42, rowY, tableWidth, maxCellH).strokeColor('#E2E8F0').stroke();

      let cellX = 42;
      doc.fillColor('#1E293B');
      row.forEach((cell, i) => {
        doc.text(String(cell), cellX + 5, rowY + 4, {
          width: colWidths[i] - 10,
          lineGap: 1.5,
        });
        cellX += colWidths[i];
      });

      doc.y = rowY + maxCellH;
    });

    doc.y += 8;
  }

  renderToc(tocItems) {
    this.doc.addPage();
    const doc = this.doc;

    doc.fillColor('#0284C7').fontSize(16).font('SegoeUI-Bold').text('Table of Contents', 42, 45);
    doc.rect(42, 66, this.printableWidth, 2).fill('#0284C7');

    doc.y = 78;

    tocItems.forEach((item) => {
      if (doc.y > this.maxContentY - 20) {
        this.addContentPage();
        doc.y = this.startContentY;
      }

      const itemY = doc.y;
      const pageNum = this.chapterMap.get(item.num) || item.page || '—';

      doc.fillColor('#0F172A').fontSize(8.5).font('SegoeUI-Bold')
         .text(`Chapter ${item.num}: ${item.title}`, 42, itemY, { width: 440 });

      // Dot leaders
      doc.fillColor('#94A3B8').fontSize(8.5).font('SegoeUI')
         .text(`Page ${pageNum}`, 480, itemY, { align: 'right', width: 73 });

      doc.y = itemY + 16;
    });

    doc.y += 15;
  }

  finalize(outputPath) {
    return new Promise((resolve, reject) => {
      const doc = this.doc;
      const range = doc.bufferedPageRange();
      const totalPages = range.count;

      console.log(`Finalizing ${this.docTitle}: Total Pages = ${totalPages}`);

      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);

        if (i === 0) continue; // Skip cover page

        // Running Header
        doc.fillColor('#64748B').fontSize(7.5).font('SegoeUI')
           .text(this.docTitle.toUpperCase(), 42, this.headerY);
        doc.fillColor('#94A3B8').fontSize(7.5).font('SegoeUI')
           .text('TRACKINGCRYPT PRODUCTION PLATFORM', 350, this.headerY, { align: 'right', width: 203 });
        doc.rect(42, this.headerY + 12, this.printableWidth, 0.5).fill('#E2E8F0');

        // Running Footer
        doc.rect(42, this.footerY - 8, this.printableWidth, 0.5).fill('#E2E8F0');
        doc.fillColor('#64748B').fontSize(7.5).font('SegoeUI')
           .text('Confidential & Proprietary • TrackingCrypt Platform', 42, this.footerY);
        doc.fillColor('#0284C7').fontSize(8).font('SegoeUI-Bold')
           .text(`Page ${i + 1} of ${totalPages}`, 450, this.footerY, { align: 'right', width: 103 });
      }

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      doc.end();

      stream.on('finish', () => {
        const stats = fs.statSync(outputPath);
        console.log(`✓ Created: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB, ${totalPages} pages)`);
        resolve(totalPages);
      });
      stream.on('error', reject);
    });
  }
}

module.exports = PdfEngine;
