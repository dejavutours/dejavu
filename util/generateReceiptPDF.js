const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Set up the paymentdocs/receipts directory for storing receipt PDFs
const paymentDocsDir = path.join(__dirname, '..', 'paymentdocs');
const receiptsDir = path.join(paymentDocsDir, 'receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

/**
 * Generates a receipt PDF for a payment associated with a booking.
 * @param {Object} booking - The booking details.
 * @param {Object} tour - The tour details.
 * @param {Object} paymentLog - The payment log details.
 * @param {string} outputPath - The path where the PDF will be saved (optional).
 * @returns {Promise<string>} - The path to the generated PDF.
 */
const generateReceiptPDF = (booking, tour, paymentLog, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Validate inputs
      if (!booking || !booking._id || !booking.bookingNumber) {
        throw new Error('Invalid booking details: booking, booking._id, and bookingNumber are required');
      }
      if (!tour || !tour.name) {
        throw new Error('Invalid tour details: tour and tour.name are required');
      }
      if (!paymentLog || !paymentLog._id || !paymentLog.paymentDate || !paymentLog.amount) {
        throw new Error('Invalid payment log: paymentLog, paymentLog._id, paymentLog.paymentDate, and paymentLog.amount are required');
      }

      // If outputPath is not provided, generate it using bookingId and paymentLog._id
      const receiptFileName = outputPath
        ? path.basename(outputPath)
        : `receipt_${booking.bookingNumber}_${booking._id}_${paymentLog._id}.pdf`;
      const finalOutputPath = outputPath || path.join(receiptsDir, receiptFileName);

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

      // Receipt Title
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1a4b8e')
        .text('Payment Receipt', 50, 190);

      // Customer Details
      const userName = `${booking.personDetails[0].firstName} ${booking.personDetails[0].surname}`.trim();
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a4b8e')
        .text('Billed To', 50, 220);
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text(`Name: ${userName}`, 50, 240);
      doc.text(`Contact: ${booking.personDetails[0].phone}`, 50, 255);
      doc.text(`Email: ${booking.email || 'N/A'}`, 50, 270);

      // Receipt Details
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a4b8e')
        .text('Receipt Details', 50, 300);
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text(`Receipt Date: ${formatDate(new Date(paymentLog.paymentDate))}`, 50, 320);
      doc.text(`Booking ID: ${booking.bookingNumber}`, 50, 335);
      doc.text(`Trip Name: ${tour.name}`, 50, 350);
      doc.text(`Payment Method: ${paymentLog.paymentMethod}`, 50, 365);

      // Transaction Details
      if (paymentLog.paymentMethod === 'razorpay') {
        doc.text(`Order ID: ${paymentLog.transactionDetails.orderId || 'N/A'}`, 50, 380);
        doc.text(`Payment ID: ${paymentLog.transactionDetails.paymentId || 'N/A'}`, 50, 395);
      } else {
        doc.text(`Reference ID: ${paymentLog.transactionDetails.referenceId || 'N/A'}`, 50, 380);
        doc.text(`Notes: ${paymentLog.transactionDetails.notes || 'N/A'}`, 50, 395);
      }

      // Payment Breakdown Table
      const tableTop = 425;
      const tableLeft = 50;
      const tableWidth = 495;
      const cellPadding = 5;

      doc.rect(tableLeft, tableTop, tableWidth, 20).fill('#1a4b8e');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
      doc.text('Description', tableLeft + cellPadding, tableTop + 6);
      doc.text('Amount', tableLeft + 400 + cellPadding, tableTop + 6, { align: 'right' });

      let currentY = tableTop + 20;
      // Amount Paid
      doc.rect(tableLeft, currentY, tableWidth, 20).stroke();
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text('Amount Paid (incl. 5% GST)', tableLeft + cellPadding, currentY + cellPadding);
      doc.text(`₹${paymentLog.amount.toFixed(2)}`, tableLeft + 400 + cellPadding, currentY + cellPadding, { align: 'right' });
      currentY += 20;

      // Total Trip Cost
      doc.rect(tableLeft, currentY, tableWidth, 20).stroke();
      doc.text('Total Trip Cost (incl. 5% GST)', tableLeft + cellPadding, currentY + cellPadding);
      doc.text(`₹${booking.totalTripCostWithGST.toFixed(2)}`, tableLeft + 400 + cellPadding, currentY + cellPadding, { align: 'right' });
      currentY += 20;

      // Due Amount
      doc.rect(tableLeft, currentY, tableWidth, 20).stroke();
      doc.text('Remaining Balance', tableLeft + cellPadding, currentY + cellPadding);
      doc.text(`₹${booking.duePayment.toFixed(2)}`, tableLeft + 400 + cellPadding, currentY + cellPadding, { align: 'right' });

      // Thank You Message
      doc.font('Helvetica').fontSize(10).fillColor('#333333')
        .text('Thank you for choosing Deja-vu Outdoors Private Limited!', 50, currentY + 40, { align: 'center', width: 495 });

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
      reject(new Error(`Error generating receipt PDF: ${err.message}`));
    }
  });
};

module.exports = generateReceiptPDF;