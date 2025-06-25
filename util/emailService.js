// util/emailService.js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD//'vbkx zspn oodm mjkj',
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendBookingConfirmation(booking, tour, paymentLog = null) {
    try {
      const isPartialPayment = booking.paymentStatus === 'Partial';
      const attachments = [];
      
      // Add invoice if full payment
      if (!isPartialPayment && booking.invoicePath && fs.existsSync(booking.invoicePath)) {
        attachments.push({
          filename: `Invoice_${booking.bookingNumber}.pdf`,
          path: booking.invoicePath
        });
      }
      
      // Add receipt if payment was made
      if (paymentLog && paymentLog.receiptPath && fs.existsSync(paymentLog.receiptPath)) {
        attachments.push({
          filename: `Receipt_${paymentLog._id}.pdf`,
          path: paymentLog.receiptPath
        });
      }

      const mailOptions = {
        from: `Deja-vu Tours <${process.env.GMAIL_USER}>`,
        to: booking.email,
        cc: process.env.GMAIL_USER, // Send copy to admin
        subject: `Booking Confirmation: ${tour.name} (${booking.bookingNumber})`,
        html: this.generateBookingConfirmationHtml(booking, tour, paymentLog),
        attachments
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      throw error;
    }
  }

  async sendAdminNotification(booking, tour, paymentLog = null) {
    try {
      const mailOptions = {
        from: `Deja-vu Tours <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: `New Booking: ${tour.name} (${booking.bookingNumber})`,
        html: this.generateAdminNotificationHtml(booking, tour, paymentLog)
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending admin notification email:', error);
      throw error;
    }
  }

  async sendManualEmail(to, subject, body, attachments = []) {
    try {
      const mailOptions = {
        from: `Deja-vu Tours <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html: body,
        attachments: attachments.map(att => ({
          filename: att.filename,
          path: att.path
        }))
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending manual email:', error);
      throw error;
    }
  }

  generateBookingConfirmationHtml(booking, tour, paymentLog) {
    const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    
    const paymentStatus = booking.paymentStatus === 'Partial' ? 
      `Partial Payment (₹${paymentLog?.amount || 0}) - Remaining: ₹${booking.duePayment}` : 
      'Full Payment Completed';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a4b8e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; }
          .booking-details { margin: 20px 0; }
          .detail-row { display: flex; margin-bottom: 10px; }
          .detail-label { font-weight: bold; width: 150px; }
          .thank-you { font-size: 18px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmation</h1>
          </div>
          <div class="content">
            <p>Dear ${booking.personDetails[0].firstName},</p>
            <p>Thank you for booking with Deja-vu Tours! Your trip has been confirmed.</p>
            
            <div class="booking-details">
              <div class="detail-row">
                <div class="detail-label">Booking Number:</div>
                <div>${booking.bookingNumber}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Trip Name:</div>
                <div>${tour.name}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Travel Dates:</div>
                <div>${formatDate(booking.tripStartDate)} to ${formatDate(booking.tripEndDate)}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Joining From:</div>
                <div>${booking.joiningFrom}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Travelers:</div>
                <div>${booking.totalPerson.adult} Adult(s), ${booking.totalPerson.child} Child(ren)</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Total Cost:</div>
                <div>₹${booking.totalTripCostWithGST} (including 5% GST)</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Payment Status:</div>
                <div>${paymentStatus}</div>
              </div>
            </div>
            
            <p class="thank-you">We look forward to serving you on this amazing journey!</p>
            <p>For any queries, please contact us at travel@dejavutours.in or call +91 8511178991.</p>
          </div>
          <div class="footer">
            <p>Deja-vu Outdoors Private Limited</p>
            <p>CIN: U63090GJ2019PTC110667 | GST: 24AAHCD4984A1ZT</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateAdminNotificationHtml(booking, tour, paymentLog) {
    const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a4b8e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .booking-details { margin: 20px 0; }
          .detail-row { display: flex; margin-bottom: 10px; }
          .detail-label { font-weight: bold; width: 150px; }
          .alert { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #1a4b8e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Booking Notification</h1>
          </div>
          <div class="content">
            <p>A new booking has been received:</p>
            
            <div class="booking-details">
              <div class="detail-row">
                <div class="detail-label">Booking Number:</div>
                <div>${booking.bookingNumber}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Customer:</div>
                <div>${booking.personDetails[0].firstName} ${booking.personDetails[0].surname}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Contact:</div>
                <div>${booking.personDetails[0].phone}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Trip Name:</div>
                <div>${tour.name}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Travel Dates:</div>
                <div>${formatDate(booking.tripStartDate)} to ${formatDate(booking.tripEndDate)}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Joining From:</div>
                <div>${booking.joiningFrom}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Travelers:</div>
                <div>${booking.totalPerson.adult} Adult(s), ${booking.totalPerson.child} Child(ren)</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Total Cost:</div>
                <div>₹${booking.totalTripCostWithGST}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Payment Status:</div>
                <div>${booking.paymentStatus}</div>
              </div>
              ${paymentLog ? `
              <div class="detail-row">
                <div class="detail-label">Payment Amount:</div>
                <div>₹${paymentLog.amount}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Payment Method:</div>
                <div>${paymentLog.paymentMethod}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="alert">
              <p>Please review this booking in the admin panel and prepare necessary arrangements.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();