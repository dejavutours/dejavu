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
      `Partial Payment` : 
      'Full Payment Completed';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - Deja-vu Tours</title>
        <style>
          /* Reset styles */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
          
          /* Container */
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
          
          /* Header */
          .header { position: relative; text-align: center; color: #ffffff; padding: 40px 20px; background: linear-gradient(135deg, #1a4b8e, #2b6cb0); }
          .header img { max-width: 150px; margin-bottom: 20px; }
          .header h1 { font-size: 24px; font-weight: 600; }
          
          /* Hero Image */
          .hero { width: 100%; height: 200px; object-fit: cover; }
          
          /* Content */
          .content { padding: 30px 20px; }
          .greeting { font-size: 18px; font-weight: 500; margin-bottom: 20px; }
          .thank-you { font-size: 16px; color: #4a5568; margin-bottom: 20px; }
          
          /* Booking Details Card */
          .booking-details { background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; flex-wrap: wrap; margin-bottom: 12px; }
          .detail-label { font-weight: 600; width: 150px; color: #2d3748; }
          .detail-value { flex: 1; color: #4a5568; }
          
          /* Call to Action */
          .cta { text-align: center; margin: 30px 0; }
          .cta a { display: inline-block; padding: 12px 24px; background-color: #1a4b8e; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background-color 0.3s ease; }
          .cta a:hover { background-color: #2b6cb0; }
          
          /* Contact Info */
          .contact-info { font-size: 14px; color: #4a5568; text-align: center; margin: 20px 0; }
          .contact-info a { color: #1a4b8e; text-decoration: none; }
          .contact-info a:hover { text-decoration: underline; }
          
          /* Divider */
          .divider { border-top: 1px solid #e2e8f0; margin: 20px 0; }
          
          /* Footer */
          .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; }
          .footer p { margin-bottom: 8px; }
          .social-links { margin-top: 15px; }
          .social-links a { margin: 0 8px; text-decoration: none; }
          .social-links img { width: 24px; height: 24px; }
          
          /* Responsive Design */
          @media (max-width: 600px) {
            .container { max-width: 100%; border-radius: 0; }
            .header { padding: 30px 15px; }
            .header h1 { font-size: 20px; }
            .hero { height: 150px; }
            .content { padding: 20px 15px; }
            .detail-row { flex-direction: column; }
            .detail-label, .detail-value { width: 100%; }
            .detail-label { margin-bottom: 4px; }
            .cta a { padding: 10px 20px; font-size: 14px; }
          }
          
          /* Animations */
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .container { animation: fadeIn 0.5s ease-in; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmation</h1>
          </div>
          <div class="content">
            <p class="greeting">Dear ${booking.personDetails[0].firstName},</p>
            <p class="thank-you">Thank you for choosing Deja-vu Tours! We're thrilled to confirm your booking for an unforgettable adventure.</p>
            
            <div class="booking-details">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 15px;">Booking Details</h2>
              <div class="detail-row">
                <div class="detail-label">Booking Number:</div>
                <div class="detail-value">${booking.bookingNumber}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Trip Name:</div>
                <div class="detail-value">${tour.name}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Travel Dates:</div>
                <div class="detail-value">${formatDate(booking.tripStartDate)} to ${formatDate(booking.tripEndDate)}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Joining From:</div>
                <div class="detail-value">${booking.joiningFrom}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Travelers:</div>
                <div class="detail-value">${booking.totalPerson.adult} Adult(s), ${booking.totalPerson.child} Child(ren)</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Total Cost:</div>
                <div class="detail-value">₹${booking.totalTripCostWithGST} (including 5% GST)</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Payment Status:</div>
                <div class="detail-value">${paymentStatus}</div>
              </div>
            </div>
            
            <div class="cta">
              <a href="https://dejavutours.in" target="_blank">View Your Booking</a>
            </div>
            
            <div class="contact-info">
              <p>Have questions? We're here to help!</p>
              <p>Email: <a href="mailto:travel@dejavutours.in">travel@dejavutours.in</a> | Phone: <a href="tel:+918511178991">+91 8511178991</a></p>
              <p>WhatsApp: <a href="https://wa.me/+918511178991" target="_blank">Chat with Us</a></p>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #4a5568;">We can't wait to make your journey memorable. Stay tuned for your detailed itinerary!</p>
          </div>
          <div class="footer">
            <p>Deja-vu Outdoors Private Limited</p>
            <p>CIN: U63090GJ2019PTC110667 | GST: 24AAHCD4984A1ZT</p>
            <p>123 Adventure Lane, Ahmedabad, Gujarat, India</p>
            <div class="social-links">
              <a class="socialLinks" href="https://www.instagram.com/dejavutours/" target="_blank"><i class="bi bi-instagram"></i></a>
              <a class="socialLinks" href="https://www.facebook.com/dejavutours.in" target="_blank"><i class="bi bi-facebook"></i></a>
              <a class="socialLinks" href="https://www.youtube.com/watch?v=56-u7Pv-cQg" target="_blank"><i class="bi bi-youtube"></i></a>
              <a class="socialLinks" href="https://www.twitter.com" target="_blank"><i class="bi bi-twitter"></i></a>
            </div>
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
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Booking Notification - Deja-vu Tours</title>
        <style>
          /* Reset styles */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #2d3748; background-color: #f7fafc; }
          
          /* Container */
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
          
          /* Header */
          .header { position: relative; text-align: center; color: #ffffff; padding: 30px 20px; background: linear-gradient(135deg, #1a4b8e, #2b6cb0); }
          .header img { max-width: 150px; margin-bottom: 15px; }
          .header h1 { font-size: 22px; font-weight: 600; }
          
          /* Content */
          .content { padding: 25px 20px; }
          .alert { background-color: #fefcbf; border-left: 4px solid #ecc94b; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
          
          /* Booking Details Card */
          .booking-details { background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; flex-wrap: wrap; margin-bottom: 12px; }
          .detail-label { font-weight: 600; width: 150px; color: #2d3748; }
          .detail-value { flex: 1; color: #4a5568; }
          
          /* Call to Action */
          .cta { text-align: center; margin: 25px 0; }
          .cta a { display: inline-block; padding: 12px 24px; background-color: #1a4b8e; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background-color 0.3s ease; }
          .cta a:hover { background-color: #2b6cb0; }
          
          /* Footer */
          .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; }
          .footer p { margin-bottom: 8px; }
          
          /* Responsive Design */
          @media (max-width: 600px) {
            .container { max-width: 100%; border-radius: 0; }
            .header { padding: 25px 15px; }
            .header h1 { font-size: 18px; }
            .content { padding: 20px 15px; }
            .detail-row { flex-direction: column; }
            .detail-label, .detail-value { width: 100%; }
            .detail-label { margin-bottom: 4px; }
            .cta a { padding: 10px 20px; font-size: 14px; }
          }
          
          /* Animations */
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .container { animation: fadeIn 0.5s ease-in; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Booking Notification</h1>
          </div>
          <div class="content">
            <div class="alert">
              <p>A new booking has been received. Please review and prepare necessary arrangements.</p>
            </div>
            
            <div class="booking-details">
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 15px;">Booking Details</h2>
              <div class="detail-row">
                <div class="detail-label">Booking Number:</div>
                <div class="detail-value">${booking.bookingNumber}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Customer:</div>
                <div class="detail-value">${booking.personDetails[0].firstName} ${booking.personDetails[0].surname}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Contact:</div>
                <div class="detail-value">${booking.personDetails[0].phone}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Trip Name:</div>
                <div class="detail-value">${tour.name}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Travel Dates:</div>
                <div class="detail-value">${formatDate(booking.tripStartDate)} to ${formatDate(booking.tripEndDate)}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Joining From:</div>
                <div class="detail-value">${booking.joiningFrom}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Travelers:</div>
                <div class="detail-value">${booking.totalPerson.adult} Adult(s), ${booking.totalPerson.child} Child(ren)</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Total Cost:</div>
                <div class="detail-value">₹${booking.totalTripCostWithGST}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Payment Status:</div>
                <div class="detail-value">${booking.paymentStatus}</div>
              </div>
              ${paymentLog ? `
              <div class="detail-row">
                <div class="detail-label">Payment Amount:</div>
                <div class="detail-value">₹${paymentLog.amount}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Payment Method:</div>
                <div class="detail-value">${paymentLog.paymentMethod}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="cta">
              <a href="https://dejavutours.in/" target="_blank">Review Booking</a>
            </div>
          </div>
          <div class="footer">
            <p>Deja-vu Outdoors Private Limited</p>
            <p>CIN: U63090GJ2019PTC110667 | GST: 24AAHCD4984A1ZT</p>
            <p>123 Adventure Lane, Ahmedabad, Gujarat, India</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();