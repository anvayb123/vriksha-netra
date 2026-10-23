const PDFDocument = require('pdfkit');
const TreeLog = require('../models/TreeLog');
const path = require('path');
const fs = require('fs');

// @route  GET /api/certificate?from=2026-01-01&to=2026-07-01
// Query params optional - agar nahi diye to volunteer ka poora record cover hoga
const generateCertificate = async (req, res) => {
  try {
    const { from, to } = req.query;

    // Build date filter
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const query = { user: req.user._id };
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }

    const logs = await TreeLog.find(query).sort({ createdAt: 1 }).lean();
    const totalTrees = logs.reduce((sum, log) => sum + log.count, 0);

    if (totalTrees === 0) {
      return res.status(400).json({ message: 'No tree logs found for this period' });
    }

    const firstDate = logs[0].createdAt;
    const lastDate = logs[logs.length - 1].createdAt;

    // Count unique species
    const uniqueSpecies = new Set(logs.map(l => l.species?.toString()).filter(Boolean)).size;

    const dateFormat = (d) =>
      new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // PDF stream seedha response mein
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=vriksha-netra-certificate.pdf');

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    doc.pipe(res);

    const pageW = doc.page.width;   // 842
    const pageH = doc.page.height;  // 595

    // ─── Background ────────────────────────────────────────────────────
    doc.rect(0, 0, pageW, pageH).fill('#fefdf5');

    // Subtle green header band
    doc.rect(0, 0, pageW, 8).fill('#2d5a27');
    doc.rect(0, pageH - 8, pageW, 8).fill('#2d5a27');

    // ─── Decorative double border ──────────────────────────────────────
    const borderMargin = 30;
    doc
      .rect(borderMargin, borderMargin, pageW - borderMargin * 2, pageH - borderMargin * 2)
      .lineWidth(2)
      .stroke('#2d5a27');

    doc
      .rect(borderMargin + 8, borderMargin + 8, pageW - (borderMargin + 8) * 2, pageH - (borderMargin + 8) * 2)
      .lineWidth(0.5)
      .stroke('#8fbc8f');

    // ─── Corner leaf decorations ───────────────────────────────────────
    const drawLeafCorner = (x, y, angle) => {
      doc.save();
      doc.translate(x, y);
      doc.rotate(angle);
      doc.fontSize(28).fillColor('#2d5a27').text('🌿', -14, -14, { width: 28, align: 'center' });
      doc.restore();
    };

    drawLeafCorner(borderMargin + 20, borderMargin + 20, 0);
    drawLeafCorner(pageW - borderMargin - 20, borderMargin + 20, 90);
    drawLeafCorner(borderMargin + 20, pageH - borderMargin - 20, -90);
    drawLeafCorner(pageW - borderMargin - 20, pageH - borderMargin - 20, 180);

    // ─── Logo ──────────────────────────────────────────────────────────
    const logoPath = path.join(__dirname, '..', '..', 'public', 'AB_logo.png');
    const hasLogo = fs.existsSync(logoPath);

    let currentY = 55;

    if (hasLogo) {
      try {
        doc.image(logoPath, pageW / 2 - 40, currentY, { width: 80, height: 62 });
        currentY += 70;
      } catch (imgErr) {
        console.warn('Could not load logo image:', imgErr.message);
        currentY += 10;
      }
    } else {
      currentY += 10;
    }

    // ─── Title ─────────────────────────────────────────────────────────
    currentY += 5;
    doc
      .fontSize(10)
      .fillColor('#8fbc8f')
      .text('AKSHAR BHARATI NGO', 0, currentY, { align: 'center', width: pageW });

    currentY += 22;
    doc
      .fontSize(32)
      .fillColor('#2d5a27')
      .text('Certificate of Contribution', 0, currentY, { align: 'center', width: pageW });

    // Decorative line under title
    currentY += 44;
    const lineW = 180;
    doc
      .moveTo(pageW / 2 - lineW / 2, currentY)
      .lineTo(pageW / 2 + lineW / 2, currentY)
      .lineWidth(1.5)
      .stroke('#c9a84c');

    // Small diamond at center of line
    const cx = pageW / 2;
    doc
      .moveTo(cx, currentY - 5)
      .lineTo(cx + 5, currentY)
      .lineTo(cx, currentY + 5)
      .lineTo(cx - 5, currentY)
      .closePath()
      .fill('#c9a84c');

    // ─── Body ──────────────────────────────────────────────────────────
    currentY += 20;
    doc
      .fontSize(14)
      .fillColor('#555')
      .text('This is to certify that', 0, currentY, { align: 'center', width: pageW });

    currentY += 28;
    doc
      .fontSize(28)
      .fillColor('#1a3a15')
      .text(req.user.name, 0, currentY, { align: 'center', width: pageW, underline: true });

    currentY += 42;
    doc
      .fontSize(14)
      .fillColor('#555')
      .text('has actively contributed to the green cover of our earth by planting', 0, currentY, { align: 'center', width: pageW });

    // ─── Big tree count ────────────────────────────────────────────────
    currentY += 30;
    doc
      .fontSize(48)
      .fillColor('#2d5a27')
      .text(`${totalTrees}`, 0, currentY, { align: 'center', width: pageW });

    currentY += 55;
    doc
      .fontSize(16)
      .fillColor('#555')
      .text(totalTrees === 1 ? 'Tree' : 'Trees', 0, currentY, { align: 'center', width: pageW });

    // ─── Additional stats row ──────────────────────────────────────────
    currentY += 32;
    const statsY = currentY;
    const colW = 200;
    const col1X = pageW / 2 - colW - 20;
    const col2X = pageW / 2 + 20;

    // Species planted
    if (uniqueSpecies > 0) {
      doc.fontSize(10).fillColor('#8fbc8f').text('Species Identified', col1X, statsY, { width: colW, align: 'center' });
      doc.fontSize(20).fillColor('#2d5a27').text(`${uniqueSpecies}`, col1X, statsY + 14, { width: colW, align: 'center' });
    }

    // Sessions
    doc.fontSize(10).fillColor('#8fbc8f').text('Planting Sessions', col2X, statsY, { width: colW, align: 'center' });
    doc.fontSize(20).fillColor('#2d5a27').text(`${logs.length}`, col2X, statsY + 14, { width: colW, align: 'center' });

    // ─── Date range ────────────────────────────────────────────────────
    currentY += 50;
    doc
      .fontSize(12)
      .fillColor('#777')
      .text(
        `Between ${dateFormat(from || firstDate)} and ${dateFormat(to || lastDate)}`,
        0, currentY, { align: 'center', width: pageW }
      );

    // ─── Decorative line ───────────────────────────────────────────────
    currentY += 25;
    doc
      .moveTo(pageW / 2 - 100, currentY)
      .lineTo(pageW / 2 + 100, currentY)
      .lineWidth(0.5)
      .stroke('#8fbc8f');

    // ─── Footer ────────────────────────────────────────────────────────
    currentY += 18;
    doc
      .fontSize(12)
      .fillColor('#2d5a27')
      .text('Vriksha Netra — Tree Plantation Tracking Initiative', 0, currentY, { align: 'center', width: pageW });

    currentY += 18;
    doc
      .fontSize(9)
      .fillColor('#aaa')
      .text(`Certificate ID: VN-${req.user._id.toString().slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`, 0, currentY, { align: 'center', width: pageW });

    currentY += 14;
    doc
      .fontSize(9)
      .fillColor('#aaa')
      .text(`Generated on ${dateFormat(new Date())}`, 0, currentY, { align: 'center', width: pageW });

    // ─── Tree emoji decorations at bottom ──────────────────────────────
    doc.fontSize(16).fillColor('#8fbc8f');
    doc.text('🌳', 80, pageH - 60, { width: 30, align: 'center' });
    doc.text('🌲', 140, pageH - 55, { width: 30, align: 'center' });
    doc.text('🌳', pageW - 170, pageH - 60, { width: 30, align: 'center' });
    doc.text('🌲', pageW - 110, pageH - 55, { width: 30, align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { generateCertificate };
