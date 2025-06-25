const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Set up the paymentdocs/invoices directory for storing invoice PDFs
const paymentDocsDir = path.join(__dirname, '..', 'paymentdocs');
const invoicesDir = path.join(paymentDocsDir, 'invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

/**
 * Generates an invoice PDF for a booking.
 * @param {Object} booking - The booking details.
 * @param {Object} tour - The tour details.
 * @param {string} outputPath - The path where the PDF will be saved (optional).
 * @returns {Promise<string>} - The path to the generated PDF.
 */
const generateInvoicePDF = (booking, tour, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Validate inputs
      if (!booking || !booking._id || !booking.bookingNumber) {
        throw new Error('Invalid booking details: booking, booking._id, and bookingNumber are required');
      }
      if (!tour || !tour.name) {
        throw new Error('Invalid tour details: tour and tour.name are required');
      }

      // If outputPath is not provided, generate it using bookingId
      const invoiceFileName = outputPath
        ? path.basename(outputPath)
        : `invoice_${booking.bookingNumber}_${booking._id}.pdf`;
      const finalOutputPath = outputPath || path.join(invoicesDir, invoiceFileName);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const writeStream = fs.createWriteStream(finalOutputPath);
      doc.pipe(writeStream);

      // Register fonts for consistent styling
      doc.registerFont('Helvetica', 'Helvetica');
      doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');

      // Helper function to format dates
      const formatDate = (date) => {
        if (!date) return 'N/A';
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      };

      // Header: Company logo and details
      const logoPath = path.join(__dirname, '..', 'public', 'img', 'logo_2x.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { width: 100 });
      } else {
        console.warn('Logo file not found at:', logoPath);
      }

      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text('www.dejavutours.in', 50, 120);
      doc.text('+91 8511178991, +91 7405199687', 50, 135);
      doc.text('travel@dejavutours.in', 50, 150);

      doc.font('Helvetica-Bold').fontSize(12).text('Deja-vu Outdoors Private Limited', 350, 50, { align: 'right' });
      doc.font('Helvetica').fontSize(10);
      doc.text('CIN: U63090GJ2019PTC110667', 350, 70, { align: 'right' });
      doc.text('GST: 24AAHCD4984A1ZT', 350, 85, { align: 'right' });

      doc.moveTo(50, 170).lineTo(545, 170).stroke();

      // Booking Confirmed Section
      const userName = `${booking.personDetails[0].firstName} ${booking.personDetails[0].surname}`.trim();
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1a4b8e')
        .text('Booking Confirmed', 50, 190);
      doc.font('Helvetica').fontSize(12).fillColor('#333333')
        .text(`Dear ${userName},`, 50, 210)
        .text(`Your booking with ID ${booking.bookingNumber} has been confirmed. Thank you for choosing Deja-vu Outdoors Private Limited!`, 50, 225, { width: 495 });

      // Trip Details Section
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a4b8e')
        .text('Trip Details', 50, 260);
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text(`Trip Name: ${tour.name}`, 50, 280);
      doc.text(`Booking ID: ${booking.bookingNumber}`, 50, 295);
      doc.text(`Pickup at: ${booking.joiningFrom} on ${formatDate(new Date(booking.tripStartDate))}`, 50, 310);
      doc.text(`Drop at: ${booking.joiningFrom} on ${formatDate(new Date(booking.tripEndDate))}`, 50, 325);

      // Bill To Section
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a4b8e')
        .text('Bill To', 350, 260);
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text(`Billed to: ${userName}`, 350, 280);
      doc.text(`Contact: ${booking.personDetails[0].phone}`, 350, 295);
      doc.text(`Email: ${booking.email || 'N/A'}`, 350, 310);

      // Pricing Section
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a4b8e')
        .text('Pricing', 50, 350);

      const city = tour.deptcities.find(c => c.City === booking.joiningFrom);
      const transport = city.price.find(t => t.transferType === booking.transportType);
      const adultPrice = transport.adultPrice || 0;
      const childPrice = transport.childPrice || 0;
      const adultCount = booking.totalPerson.adult || 0;
      const childCount = booking.totalPerson.child || 0;
      const subtotal = booking.totalTripCost || 0; // Excluding GST
      const gst = booking.totalTripCostWithGST - subtotal || 0;
      const grandTotal = booking.totalTripCostWithGST || 0;
      const paidAmount = booking.paidAmount || 0;

      // Pricing Table
      const tableTop = 370;
      const tableLeft = 50;
      const tableWidth = 495;
      const cellPadding = 10; // Increased padding for better spacing
      const descWidth = tableWidth * 0.6; // 60% for Description
      const rateWidth = tableWidth * 0.2; // 20% for Rate
      const amountWidth = tableWidth * 0.2; // 20% for Amount

      // Table Header
      doc.rect(tableLeft, tableTop, tableWidth, 20).fill('#1a4b8e');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
      doc.text('Description', tableLeft + cellPadding, tableTop + 6, { width: descWidth - cellPadding * 2 });
      doc.text('Rate', tableLeft + descWidth + cellPadding, tableTop + 6, { width: rateWidth - cellPadding * 2 });
      doc.text('Amount', tableLeft + descWidth + rateWidth + cellPadding, tableTop + 6, { width: amountWidth - cellPadding * 2, align: 'right' });

      // Table Rows
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      let currentY = tableTop + 20;

      // Adult Row
      if (adultCount > 0) {
        doc.rect(tableLeft, currentY, tableWidth, 20).stroke();
        const adultText = `Adult x ${adultCount}`;
        doc.text(adultText, tableLeft + cellPadding, currentY + cellPadding, { width: descWidth - cellPadding * 2, ellipsis: true });
        doc.text(`Rs.${Number(adultPrice).toFixed(2)}`, tableLeft + descWidth + cellPadding, currentY + cellPadding, { width: rateWidth - cellPadding * 2 });
        doc.text(`Rs.${Number(adultCount * adultPrice).toFixed(2)}`, tableLeft + descWidth + rateWidth + cellPadding, currentY + cellPadding, { width: amountWidth - cellPadding * 2, align: 'right' });
        currentY += 20;
      }

      // Child Row
      if (childCount > 0) {
        doc.rect(tableLeft, currentY, tableWidth, 20).stroke();
        const childText = `Child x ${childCount}`;
        doc.text(childText, tableLeft + cellPadding, currentY + cellPadding, { width: descWidth - cellPadding * 2, ellipsis: true });
        doc.text(`Rs.${Number(childPrice).toFixed(2)}`, tableLeft + descWidth + cellPadding, currentY + cellPadding, { width: rateWidth - cellPadding * 2 });
        doc.text(`Rs.${Number(childCount * childPrice).toFixed(2)}`, tableLeft + descWidth + rateWidth + cellPadding, currentY + cellPadding, { width: amountWidth - cellPadding * 2, align: 'right' });
        currentY += 20;
      }

      // Subtotal
      doc.rect(tableLeft, currentY, tableWidth, 20).stroke();
      doc.font('Helvetica-Bold').text('Subtotal', tableLeft + cellPadding, currentY + cellPadding, { width: descWidth - cellPadding * 2 });
      doc.text('', tableLeft + descWidth + cellPadding, currentY + cellPadding, { width: rateWidth - cellPadding * 2 }); // Empty Rate
      doc.text(`Rs.${Number(subtotal).toFixed(2)}`, tableLeft + descWidth + rateWidth + cellPadding, currentY + cellPadding, { width: amountWidth - cellPadding * 2, align: 'right' });
      currentY += 20;

      // GST
      doc.rect(tableLeft, currentY, tableWidth, 20).stroke();
      doc.font('Helvetica').text('GST (5%)', tableLeft + cellPadding, currentY + cellPadding, { width: descWidth - cellPadding * 2 });
      doc.text('', tableLeft + descWidth + cellPadding, currentY + cellPadding, { width: rateWidth - cellPadding * 2 }); // Empty Rate
      doc.text(`Rs.${Number(gst).toFixed(2)}`, tableLeft + descWidth + rateWidth + cellPadding, currentY + cellPadding, { width: amountWidth - cellPadding * 2, align: 'right' });
      currentY += 20;

      // Grand Total
      doc.rect(tableLeft, currentY, tableWidth, 20).stroke();
      doc.font('Helvetica-Bold').text('Grand Total', tableLeft + cellPadding, currentY + cellPadding, { width: descWidth - cellPadding * 2 });
      doc.text('', tableLeft + descWidth + cellPadding, currentY + cellPadding, { width: rateWidth - cellPadding * 2 }); // Empty Rate
      doc.text(`Rs.${Number(grandTotal).toFixed(2)}`, tableLeft + descWidth + rateWidth + cellPadding, currentY + cellPadding, { width: amountWidth - cellPadding * 2, align: 'right' });
      currentY += 20;

      // Paid Amount
      doc.rect(tableLeft, currentY, tableWidth, 20).stroke();
      doc.text(`Total Paid Amount${booking.paymentStatus === 'Paid' && booking.duePayment === 0 ? ' (include 5% GST)' : ''}`, tableLeft + cellPadding, currentY + cellPadding, { width: descWidth - cellPadding * 2 });
      doc.text('', tableLeft + descWidth + cellPadding, currentY + cellPadding, { width: rateWidth - cellPadding * 2 }); // Empty Rate
      doc.text(`Rs.${Number(paidAmount).toFixed(2)}`, tableLeft + descWidth + rateWidth + cellPadding, currentY + cellPadding, { width: amountWidth - cellPadding * 2, align: 'right' });
      currentY += 20;

      // Due Amount
      doc.rect(tableLeft, currentY, tableWidth, 20).stroke();
      doc.text('Due Amount', tableLeft + cellPadding, currentY + cellPadding, { width: descWidth - cellPadding * 2 });
      doc.text('', tableLeft + descWidth + cellPadding, currentY + cellPadding, { width: rateWidth - cellPadding * 2 }); // Empty Rate
      doc.text(`Rs.${Number(booking.duePayment).toFixed(2)}`, tableLeft + descWidth + rateWidth + cellPadding, currentY + cellPadding, { width: amountWidth - cellPadding * 2, align: 'right' });

      // Information Section
      doc.font('Helvetica').fontSize(10).fillColor('#333333')
        .text('Additional Information', 50, currentY + 40, { underline: true });
      doc.text(
        'Additional information such as team captain, pick up drop location and time will be shared in person or in a WhatsApp, few days before the departure date. See you on the trip! - Thank you.',
        50, currentY + 55, { width: 495 }
      );

      // Footer
      doc.font('Helvetica').fontSize(8).fillColor('#333333')
        .text(
          'A - 610, Titanium City Centre, Opp. Seema Hall, Nr. Shyamal Char Rasta, Ahmedabad - 380015',
          50, 780, { align: 'center', width: 495 }
        );

      doc.end();

      writeStream.on('finish', () => resolve(finalOutputPath));
      writeStream.on('error', (err) => reject(new Error(`Failed to write PDF to ${finalOutputPath}: ${err.message}`)));
    } catch (err) {
      reject(new Error(`Error generating invoice PDF: ${err.message}`));
    }
  });
};

module.exports = generateInvoicePDF;