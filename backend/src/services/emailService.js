const { Resend } = require('resend');

// Initialize Resend with API key (only if provided)
let resend = null;
if (process.env.RESEND_API_TOKEN) {
  try {
    resend = new Resend(process.env.RESEND_API_TOKEN);
  } catch (error) {
    console.log('Failed to initialize Resend:', error.message);
    resend = null;
  }
}

// Helper function to check if email service is available
const isEmailServiceAvailable = () => {
  if (!resend) {
    console.log('Email service not configured - RESEND_API_TOKEN not set');
    return false;
  }
  return true;
};

// Email templates
const EMAIL_TEMPLATES = {
  verification: {
    subject: 'Verify Your Email - Mars CMMS System',
    html: (verificationLink, firstName) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 30px 0;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: auto;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 30px 25px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 0;
            color: #222222;
          }
          .content {
            margin-top: 20px;
            font-size: 14px;
            line-height: 1.6;
          }
          .content p {
            margin: 6px 0;
          }
          .highlight {
            font-weight: 600;
          }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 22px;
            background: #007BFF;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777777;
            text-align: center;
            border-top: 1px solid #eeeeee;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Email Verification Required</h2>
          </div>
          
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Thank you for registering with the Mars CMMS System. To complete your registration and activate your account, please verify your email address.</p>
            
            <div style="text-align: center;">
              <a href="${verificationLink}" class="btn">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #e9ecef;">
              ${verificationLink}
            </p>
            
            <p><span class="highlight">Important:</span> This verification link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Mars CMMS System. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  welcome: {
    subject: 'Welcome to Mars CMMS System!',
    html: (firstName) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 30px 0;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: auto;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 30px 25px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 0;
            color: #222222;
          }
          .content {
            margin-top: 20px;
            font-size: 14px;
            line-height: 1.6;
          }
          .content p {
            margin: 6px 0;
          }
          .highlight {
            font-weight: 600;
          }
          .status-green { color: #28a745; }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777777;
            text-align: center;
            border-top: 1px solid #eeeeee;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Welcome to Mars CMMS System</h2>
          </div>
          
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Congratulations! Your email has been successfully verified and your account is now active.</p>
            
            <p><span class="highlight">Account Status:</span> <span class="status-green">Active</span></p>
            
            <p>You can now access the following features:</p>
            <ul>
              <li>Log in to the Mars CMMS System</li>
              <li>Access all features based on your role</li>
              <li>Create and manage tickets</li>
              <li>View reports and analytics</li>
            </ul>
            
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
          </div>
          
          <div class="footer">
            <p>Thank you for using Mars CMMS System!</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  newTicket: {
    subject: 'New Abnormal Finding Ticket Created - Mars CMMS',
    html: (ticketData, reporterName) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Ticket Notification</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 30px 0;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: auto;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 30px 25px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 0;
            color: #222222;
          }
          .content {
            margin-top: 20px;
            font-size: 14px;
            line-height: 1.6;
          }
          .content p {
            margin: 6px 0;
          }
          .highlight {
            font-weight: 600;
          }
          .ticket-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border: 1px solid #e9ecef;
          }
          .priority-high { color: #dc3545; }
          .priority-medium { color: #fd7e14; }
          .priority-low { color: #28a745; }
          .severity-critical { color: #dc3545; }
          .severity-high { color: #fd7e14; }
          .severity-medium { color: #28a745; }
          .severity-low { color: #007BFF; }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 22px;
            background: #007BFF;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777777;
            text-align: center;
            border-top: 1px solid #eeeeee;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Abnormal Finding Ticket</h2>
            <p>Ticket #${ticketData.ticket_number}</p>
          </div>
          
          <div class="content">
            <p>A new abnormal finding has been reported in the Mars CMMS System that requires your attention.</p>
            
            <div class="ticket-info">
              <p><span class="highlight">Case Number:</span> ${ticketData.ticket_number}</p>
              <p><span class="highlight">Asset Name:</span> ${ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset'}</p>
              <p><span class="highlight">Problem:</span> ${ticketData.title || 'No description'}</p>
              <p><span class="highlight">Reported By:</span> ${reporterName}</p>
              <p><span class="highlight">Priority:</span> <span class="priority-${ticketData.priority}">${ticketData.priority?.toUpperCase() || 'NORMAL'}</span></p>
              <p><span class="highlight">Severity:</span> <span class="severity-${ticketData.severity_level}">${ticketData.severity_level?.toUpperCase() || 'MEDIUM'}</span></p>
              ${ticketData.estimated_downtime_hours ? `<p><span class="highlight">Estimated Downtime:</span> ${ticketData.estimated_downtime_hours} hours</p>` : ''}
              <p><span class="highlight">Created:</span> ${new Date(ticketData.created_at).toLocaleString()}</p>
            </div>
            
            <p><span class="highlight">Action Required:</span> Please review this ticket and take appropriate action based on the severity and priority level.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket Details</a>
            </div>
            
            <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #777777;">
              Or copy this link: <br>
              <span style="word-break: break-all; background: #f8f9fa; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 11px; border: 1px solid #e9ecef;">
                ${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}
              </span>
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
  ,
  assignment: {
    subject: 'Ticket Assigned To You - Mars CMMS',
    html: (ticketData, assigneeName) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket Assignment</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 30px 0;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: auto;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 30px 25px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 0;
            color: #222222;
          }
          .content {
            margin-top: 20px;
            font-size: 14px;
            line-height: 1.6;
          }
          .content p {
            margin: 6px 0;
          }
          .highlight {
            font-weight: 600;
          }
          .ticket-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border: 1px solid #e9ecef;
          }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 22px;
            background: #007BFF;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777777;
            text-align: center;
            border-top: 1px solid #eeeeee;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Ticket Assigned</h2>
            <p>Ticket #${ticketData.ticket_number}</p>
          </div>
          
          <div class="content">
            <p>Hello ${assigneeName},</p>
            <p>You have been assigned a ticket that requires your attention.</p>
            
            <div class="ticket-info">
              <p><span class="highlight">Title:</span> ${ticketData.title}</p>
              <p><span class="highlight">Severity:</span> ${ticketData.severity_level?.toUpperCase()}</p>
              <p><span class="highlight">Priority:</span> ${ticketData.priority?.toUpperCase()}</p>
              <p><span class="highlight">Affected Point:</span> ${ticketData.affected_point_name} (${ticketData.affected_point_type})</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket</a>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  statusUpdate: {
    subject: 'Ticket Status Updated - Mars CMMS',
    html: (ticketData, oldStatus, newStatus, changedByName) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket Status Update</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 30px 0;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: auto;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 30px 25px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 0;
            color: #222222;
          }
          .content {
            margin-top: 20px;
            font-size: 14px;
            line-height: 1.6;
          }
          .content p {
            margin: 6px 0;
          }
          .highlight {
            font-weight: 600;
          }
          .ticket-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border: 1px solid #e9ecef;
          }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 22px;
            background: #007BFF;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777777;
            text-align: center;
            border-top: 1px solid #eeeeee;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Ticket Status Updated</h2>
            <p>Ticket #${ticketData.ticket_number}</p>
          </div>
          
          <div class="content">
            <p><span class="highlight">Changed By:</span> ${changedByName}</p>
            <p><span class="highlight">Status:</span> ${oldStatus || 'N/A'} → ${newStatus}</p>
            
            <div class="ticket-info">
              <p><span class="highlight">Title:</span> ${ticketData.title}</p>
              <p><span class="highlight">Severity:</span> ${ticketData.severity_level?.toUpperCase()}</p>
              <p><span class="highlight">Priority:</span> ${ticketData.priority?.toUpperCase()}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket</a>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

class EmailService {
  constructor() {
    // Use Resend's default domain for testing, or your verified domain
    this.fromEmail = process.env.FROM_EMAIL;
  }

  /**
   * Send email verification
   * @param {string} to - Recipient email
   * @param {string} firstName - User's first name
   * @param {string} verificationToken - Verification token
   * @returns {Promise<Object>} - Resend API response
   */
  async sendVerificationEmail(to, firstName, verificationToken) {
    try {
      if (!isEmailServiceAvailable()) {
        return { success: false, message: 'Email service not configured' };
      }

      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: EMAIL_TEMPLATES.verification.subject,
        html: EMAIL_TEMPLATES.verification.html(verificationLink, firstName),
      });

      if (error) {
        console.error('Resend API error:', error);
        throw new Error(`Failed to send verification email: ${error.message}`);
      }

      console.log('Verification email sent successfully:', data);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Send welcome email after verification
   * @param {string} to - Recipient email
   * @param {string} firstName - User's first name
   * @returns {Promise<Object>} - Resend API response
   */
  async sendWelcomeEmail(to, firstName) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: EMAIL_TEMPLATES.welcome.subject,
        html: EMAIL_TEMPLATES.welcome.html(firstName),
      });

      if (error) {
        console.error('Resend API error:', error);
        throw new Error(`Failed to send welcome email: ${error.message}`);
      }

      console.log('Welcome email sent successfully:', data);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Send new ticket notification email to L2 users (can accept/reject)
   * @param {Object} ticketData - Ticket information
   * @param {string} reporterName - Name of the person who reported the ticket
   * @param {Array} approvers - Array of approver objects with email and name
   * @returns {Promise<Object>} - Resend API response
   */
  async sendNewTicketNotification(ticketData, reporterName, notificationUsers = []) {
    try {
      if (!Array.isArray(notificationUsers) || notificationUsers.length === 0) {
        console.warn('No notification users provided for new ticket notification');
        return { success: true, sentCount: 0 };
      }

      // Send to all notification users (L2ForPU + actor)
      const emailPromises = notificationUsers.map(user => {
        if (user.EMAIL && user.EMAIL.trim() !== '') {
          console.log(`Sending email notification to ${user.PERSON_NAME} (${user.EMAIL}) - ${user.notification_reason}`);
          return resend.emails.send({
            from: this.fromEmail,
            to: [user.EMAIL],
            subject: EMAIL_TEMPLATES.newTicket.subject,
            html: EMAIL_TEMPLATES.newTicket.html(ticketData, reporterName),
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(result => result.data && !result.error);
      
      console.log(`Ticket notification emails sent successfully to ${successful.length}/${notificationUsers.length} recipients`);
      return { success: true, sentCount: successful.length };
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Send ticket assignment notification to assignee
   */
  async sendTicketAssignmentNotification(ticketData, assigneeName, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: EMAIL_TEMPLATES.assignment.subject,
        html: EMAIL_TEMPLATES.assignment.html(ticketData, assigneeName),
      });

      if (error) {
        throw new Error(`Failed to send assignment email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email service error (assignment):', error);
      throw error;
    }
  }

  /**
   * Send ticket status update notification (e.g., resolved/closed) to reporter
   */
  async sendTicketStatusUpdateNotification(ticketData, oldStatus, newStatus, changedByName, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: EMAIL_TEMPLATES.statusUpdate.subject,
        html: EMAIL_TEMPLATES.statusUpdate.html(ticketData, oldStatus, newStatus, changedByName),
      });

      if (error) {
        throw new Error(`Failed to send status update email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email service error (status update):', error);
      throw error;
    }
  }

  /**
   * Send ticket accepted notification to requestor
   */
  async sendTicketAcceptedNotification(ticketData, acceptorName, notificationUsers = []) {
    try {
      if (!Array.isArray(notificationUsers) || notificationUsers.length === 0) {
        console.warn('No notification users provided for ticket acceptance notification');
        return { success: true, sentCount: 0 };
      }

      // Send to all notification users (requester + actor)
      const emailPromises = notificationUsers.map(user => {
        if (user.EMAIL && user.EMAIL.trim() !== '') {
          console.log(`Sending acceptance email notification to ${user.PERSON_NAME} (${user.EMAIL}) - ${user.notification_reason}`);
          return resend.emails.send({
            from: this.fromEmail,
            to: [user.EMAIL],
        subject: `Ticket Accepted - ${ticketData.ticket_number}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Accepted</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 30px 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 30px 25px;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                color: #222222;
              }
              .content {
                margin-top: 20px;
                font-size: 14px;
                line-height: 1.6;
              }
              .content p {
                margin: 6px 0;
              }
              .highlight {
                font-weight: 600;
              }
              .ticket-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
                border: 1px solid #e9ecef;
              }
              .status-green { color: #28a745; }
              .btn {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 22px;
                background: #007BFF;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 4px;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #eeeeee;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Ticket Accepted</h2>
                <p>Ticket #${ticketData.ticket_number}</p>
              </div>
              
              <div class="content">
                <p>Your ticket has been accepted and work has started. You will be notified when it's completed.</p>
                
                <div class="ticket-info">
                  <p><span class="highlight">Case Number:</span> ${ticketData.ticket_number}</p>
                  <p><span class="highlight">Asset Name:</span> ${ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset'}</p>
                  <p><span class="highlight">Problem:</span> ${ticketData.title || 'No description'}</p>
                  <p><span class="highlight">Accepted By:</span> ${acceptorName}</p>
                  <p><span class="highlight">Status:</span> <span class="status-green">Work in Progress</span></p>
                  ${ticketData.scheduled_complete ? `<p><span class="highlight">Scheduled Complete:</span> ${new Date(ticketData.scheduled_complete).toLocaleDateString()}</p>` : ''}
                </div>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket Details</a>
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(result => result.data && !result.error);

      console.log(`Ticket acceptance emails sent successfully to ${successful.length}/${notificationUsers.length} recipients`);
      return { success: true, sentCount: successful.length };
    } catch (error) {
      console.error('Email service error (acceptance):', error);
      throw error;
    }
  }

  /**
   * Send ticket rejected notification to requestor
   */
  async sendTicketRejectedNotification(ticketData, rejectorName, rejectionReason, status, notificationUsers = []) {
    try {
      if (!Array.isArray(notificationUsers) || notificationUsers.length === 0) {
        console.warn('No notification users provided for ticket rejection notification');
        return { success: true, sentCount: 0 };
      }

      // Send to all notification users (requester + L3ForPU + actor)
      const emailPromises = notificationUsers.map(user => {
        if (user.EMAIL && user.EMAIL.trim() !== '') {
          console.log(`Sending rejection email notification to ${user.PERSON_NAME} (${user.EMAIL}) - ${user.notification_reason}`);
          return resend.emails.send({
            from: this.fromEmail,
            to: [user.EMAIL],
        subject: `Ticket Rejected - ${ticketData.ticket_number}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Rejected</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 30px 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 30px 25px;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                color: #222222;
              }
              .content {
                margin-top: 20px;
                font-size: 14px;
                line-height: 1.6;
              }
              .content p {
                margin: 6px 0;
              }
              .highlight {
                font-weight: 600;
              }
              .ticket-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
                border: 1px solid #e9ecef;
              }
              .status-red { color: #dc3545; }
              .btn {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 22px;
                background: #007BFF;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 4px;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #eeeeee;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Ticket Rejected</h2>
                <p>Ticket #${ticketData.ticket_number}</p>
              </div>
              
              <div class="content">
                <p>Your ticket has been rejected. ${status === 'rejected_pending_l3_review' ? 'It has been escalated to L3 for review.' : 'This is a final rejection.'}</p>
                
                <div class="ticket-info">
                  <p><span class="highlight">Case Number:</span> ${ticketData.ticket_number}</p>
                  <p><span class="highlight">Asset Name:</span> ${ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset'}</p>
                  <p><span class="highlight">Problem:</span> ${ticketData.title || 'No description'}</p>
                  <p><span class="highlight">Rejected By:</span> ${rejectorName}</p>
                  <p><span class="highlight">Status:</span> <span class="status-red">${status}</span></p>
                  <p><span class="highlight">Reason:</span> ${rejectionReason || 'งานถูกปฏิเสธ'}</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket Details</a>
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(result => result.data && !result.error);

      console.log(`Ticket rejection emails sent successfully to ${successful.length}/${notificationUsers.length} recipients`);
      return { success: true, sentCount: successful.length };
    } catch (error) {
      console.error('Email service error (rejection):', error);
      throw error;
    }
  }

  /**
   * Send job completed notification to requestor
   */
  async sendJobCompletedNotification(ticketData, completerName, completionNotes, downtimeAvoidance, costAvoidance, notificationUsers = []) {
    try {
      if (!Array.isArray(notificationUsers) || notificationUsers.length === 0) {
        console.warn('No notification users provided for job completion notification');
        return { success: true, sentCount: 0 };
      }

      // Send to all notification users (requester + actor)
      const emailPromises = notificationUsers.map(user => {
        if (user.EMAIL && user.EMAIL.trim() !== '') {
          console.log(`Sending completion email notification to ${user.PERSON_NAME} (${user.EMAIL}) - ${user.notification_reason}`);
          return resend.emails.send({
            from: this.fromEmail,
            to: [user.EMAIL],
        subject: `Job Completed - ${ticketData.ticket_number}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Job Completed</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 30px 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 30px 25px;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                color: #222222;
              }
              .content {
                margin-top: 20px;
                font-size: 14px;
                line-height: 1.6;
              }
              .content p {
                margin: 6px 0;
              }
              .highlight {
                font-weight: 600;
              }
              .ticket-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
                border: 1px solid #e9ecef;
              }
              .status-green { color: #28a745; }
              .btn {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 22px;
                background: #007BFF;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 4px;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #eeeeee;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Job Completed</h2>
                <p>Ticket #${ticketData.ticket_number}</p>
              </div>
              
              <div class="content">
                <p>Your ticket has been completed. Please review and close it if you're satisfied with the work.</p>
                
                <div class="ticket-info">
                  <p><span class="highlight">Case Number:</span> ${ticketData.ticket_number}</p>
                  <p><span class="highlight">Asset Name:</span> ${ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset'}</p>
                  <p><span class="highlight">Problem:</span> ${ticketData.title || 'No description'}</p>
                  <p><span class="highlight">Completed By:</span> ${completerName}</p>
                  <p><span class="highlight">Status:</span> <span class="status-green">Completed</span></p>
                  <p><span class="highlight">Cost Avoidance:</span> ${costAvoidance ? `${costAvoidance.toLocaleString()} บาท` : '-'}</p>
                  <p><span class="highlight">Downtime Avoidance:</span> ${downtimeAvoidance ? `${downtimeAvoidance} ชั่วโมง` : '-'}</p>
                  <p><span class="highlight">Failure Mode:</span> ${ticketData.FailureModeName || '-'}</p>
                  ${completionNotes ? `<p><span class="highlight">Notes:</span> ${completionNotes}</p>` : ''}
                </div>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket Details</a>
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(result => result.data && !result.error);

      console.log(`Job completion emails sent successfully to ${successful.length}/${notificationUsers.length} recipients`);
      return { success: true, sentCount: successful.length };
    } catch (error) {
      console.error('Email service error (completion):', error);
      throw error;
    }
  }

  /**
   * Send ticket escalated notification to L3 users (can reassign)
   */
  async sendTicketEscalatedNotification(ticketData, escalatorName, escalationReason, notificationUsers = []) {
    try {
      if (!Array.isArray(notificationUsers) || notificationUsers.length === 0) {
        console.warn('No notification users provided for ticket escalation notification');
        return { success: true, sentCount: 0 };
      }

      // Send to all notification users (requester + L3ForPU + L4ForPU + actor)
      const emailPromises = notificationUsers.map(user => {
        if (user.EMAIL && user.EMAIL.trim() !== '') {
          console.log(`Sending escalation email notification to ${user.PERSON_NAME} (${user.EMAIL}) - ${user.notification_reason}`);
          return resend.emails.send({
            from: this.fromEmail,
            to: [user.EMAIL],
            subject: `Ticket Escalated - ${ticketData.ticket_number}`,
            html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Escalated</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 30px 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 30px 25px;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                color: #222222;
              }
              .content {
                margin-top: 20px;
                font-size: 14px;
                line-height: 1.6;
              }
              .content p {
                margin: 6px 0;
              }
              .highlight {
                font-weight: 600;
              }
              .ticket-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
                border: 1px solid #e9ecef;
              }
              .status-orange { color: #fd7e14; }
              .btn {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 22px;
                background: #007BFF;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 4px;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #eeeeee;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Ticket Escalated</h2>
                <p>Ticket #${ticketData.ticket_number}</p>
              </div>
              
              <div class="content">
                <p>This ticket has been escalated to you for L3 review and handling.</p>
                
                <div class="ticket-info">
                  <p><span class="highlight">Case Number:</span> ${ticketData.ticket_number}</p>
                  <p><span class="highlight">Asset Name:</span> ${ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset'}</p>
                  <p><span class="highlight">Problem:</span> ${ticketData.title || 'No description'}</p>
                  <p><span class="highlight">Escalated By:</span> ${escalatorName}</p>
                  <p><span class="highlight">Status:</span> <span class="status-orange">Escalated to L3</span></p>
                  <p><span class="highlight">Reason:</span> ${escalationReason || 'งานถูกส่งต่อให้หัวหน้างานพิจารณา'}</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket Details</a>
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(result => result.data && !result.error);
      
      console.log(`Ticket escalation emails sent successfully to ${successful.length} L3 approvers`);
      return { success: true, sentCount: successful.length };
    } catch (error) {
      console.error('Email service error (escalation):', error);
      throw error;
    }
  }

  /**
   * Send ticket escalated notification to requestor
   */
  async sendTicketEscalatedToRequestorNotification(ticketData, escalatorName, escalationReason, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: `Ticket Escalated - ${ticketData.ticket_number}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Escalated</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 30px 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 30px 25px;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                color: #222222;
              }
              .content {
                margin-top: 20px;
                font-size: 14px;
                line-height: 1.6;
              }
              .content p {
                margin: 6px 0;
              }
              .highlight {
                font-weight: 600;
              }
              .ticket-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
                border: 1px solid #e9ecef;
              }
              .status-orange { color: #fd7e14; }
              .btn {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 22px;
                background: #007BFF;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 4px;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #eeeeee;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Ticket Escalated</h2>
                <p>Ticket #${ticketData.ticket_number}</p>
              </div>
              
              <div class="content">
                <p>Your ticket has been escalated to L3 for review and handling.</p>
                
                <div class="ticket-info">
                  <p><span class="highlight">Case Number:</span> ${ticketData.ticket_number}</p>
                  <p><span class="highlight">Asset Name:</span> ${ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset'}</p>
                  <p><span class="highlight">Problem:</span> ${ticketData.title || 'No description'}</p>
                  <p><span class="highlight">Escalated By:</span> ${escalatorName}</p>
                  <p><span class="highlight">Status:</span> <span class="status-orange">Escalated to L3</span></p>
                  <p><span class="highlight">Reason:</span> ${escalationReason || 'งานของคุณถูกส่งต่อให้หัวหน้างานพิจารณา'}</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket Details</a>
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        throw new Error(`Failed to send escalation notification email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email service error (escalation notification):', error);
      throw error;
    }
  }

  /**
   * Send ticket closed notification to assignee
   */
  async sendTicketClosedNotification(ticketData, closerName, closeReason, satisfactionRating, notificationUsers = []) {
    try {
      if (!Array.isArray(notificationUsers) || notificationUsers.length === 0) {
        console.warn('No notification users provided for ticket closure notification');
        return { success: true, sentCount: 0 };
      }

      // Send to all notification users (requester + assignee + actor)
      const emailPromises = notificationUsers.map(user => {
        if (user.EMAIL && user.EMAIL.trim() !== '') {
          console.log(`Sending closure email notification to ${user.PERSON_NAME} (${user.EMAIL}) - ${user.notification_reason}`);
          return resend.emails.send({
            from: this.fromEmail,
            to: [user.EMAIL],
        subject: `Ticket Closed - ${ticketData.ticket_number}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Closed</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 30px 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 30px 25px;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                color: #222222;
              }
              .content {
                margin-top: 20px;
                font-size: 14px;
                line-height: 1.6;
              }
              .content p {
                margin: 6px 0;
              }
              .highlight {
                font-weight: 600;
              }
              .ticket-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
                border: 1px solid #e9ecef;
              }
              .status-green { color: #28a745; }
              .btn {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 22px;
                background: #007BFF;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 4px;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #eeeeee;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Ticket Closed</h2>
                <p>Ticket #${ticketData.ticket_number}</p>
              </div>
              
              <div class="content">
                <p>This ticket has been closed by the requestor.</p>
                
                <div class="ticket-info">
                  <p><span class="highlight">Case Number:</span> ${ticketData.ticket_number}</p>
                  <p><span class="highlight">Asset Name:</span> ${ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset'}</p>
                  <p><span class="highlight">Problem:</span> ${ticketData.title || 'No description'}</p>
                  <p><span class="highlight">Closed By:</span> ${closerName}</p>
                  <p><span class="highlight">Status:</span> <span class="status-green">Closed</span></p>
                  ${closeReason ? `<p><span class="highlight">Close Reason:</span> ${closeReason}</p>` : ''}
                  <p><span class="highlight">Satisfaction Rating:</span> ${satisfactionRating ? `${satisfactionRating}/5 ดาว` : 'ไม่ระบุ'}</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket Details</a>
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(result => result.data && !result.error);

      console.log(`Ticket closure emails sent successfully to ${successful.length}/${notificationUsers.length} recipients`);
      return { success: true, sentCount: successful.length };
    } catch (error) {
      console.error('Email service error (closure):', error);
      throw error;
    }
  }

  /**
   * Send ticket reviewed notification 
   */
  async sendTicketReviewedNotification(ticketData, reviewerName, reviewReason, satisfactionRating, notificationUsers = []) {
    try {
      if (!Array.isArray(notificationUsers) || notificationUsers.length === 0) {
        console.warn('No notification users provided for ticket review notification');
        return { success: true, sentCount: 0 };
      }

      // Send to all notification users (assignee + L4ForPU + actor)
      const emailPromises = notificationUsers.map(user => {
        if (user.EMAIL && user.EMAIL.trim() !== '') {
          console.log(`Sending review email notification to ${user.PERSON_NAME} (${user.EMAIL}) - ${user.notification_reason}`);
          return resend.emails.send({
            from: this.fromEmail,
            to: [user.EMAIL],
            subject: `Ticket Reviewed - ${ticketData.ticket_number}`,
            html: `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Ticket Reviewed</title>
                <style>
                  body {
                    font-family: Arial, Helvetica, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 30px 0;
                    color: #333333;
                  }
                  .container {
                    max-width: 600px;
                    margin: auto;
                    background: #ffffff;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    padding: 30px 25px;
                  }
                  .header {
                    text-align: center;
                    margin-bottom: 20px;
                  }
                  h2 {
                    font-size: 20px;
                    font-weight: 600;
                    margin: 0;
                    color: #222222;
                  }
                  .content {
                    margin-top: 20px;
                    font-size: 14px;
                    line-height: 1.6;
                  }
                  .content p {
                    margin: 6px 0;


                  }
                  .highlight {
                    font-weight: 600;
                  }
                  .ticket-info {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 6px;
                    margin: 20px 0;
                    border: 1px solid #e9ecef;
                  }
                  .status-blue { color: #007BFF; }
                  .btn {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 10px 22px;
                    background: #007BFF;
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 4px;
                    font-size: 14px;
                  }
                  .footer {
                    margin-top: 30px;
                    font-size: 12px;
                    color: #777777;
                    text-align: center;
                    border-top: 1px solid #eeeeee;
                    padding-top: 15px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h2>Ticket Reviewed</h2>
                    <p>Ticket #${ticketData.ticket_number}</p>
                  </div>
                  
                  <div class="content">
                    <p>The requestor has reviewed and approved this completed ticket.</p>
                    
                    <div class="ticket-info">
                      <p><span class="highlight">Case Number:</span> ${ticketData.ticket_number}</p>
                      <p><span class="highlight">Asset Name:</span> ${ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset'}</p>
                      <p><span class="highlight">Problem:</span> ${ticketData.title || 'No description'}</p>
                      <p><span class="highlight">Reviewed By:</span> ${reviewerName}</p>
                      <p><span class="highlight">Status:</span> <span class="status-blue">Reviewed</span></p>
                      <p><span class="highlight">Satisfaction Rating:</span> ${satisfactionRating ? `${satisfactionRating}/5 ดาว` : 'ไม่ระบุ'}</p>
                      ${reviewReason ? `<p><span class="highlight">Review Note:</span> ${reviewReason}</p>` : ''}
                    </div>
                    
                    <p><strong>Next Step:</strong> This ticket is now ready for L4 final closure approval.</p>
                    
                    <div style="text-align: center;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket Details</a>
                    </div>
                  </div>
                  
                  <div class="footer">
                    <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(result => result.data && !result.error);

      console.log(`Ticket review emails sent successfully to ${successful.length}/${notificationUsers.length} recipients`);
      return { success: true, sentCount: successful.length };
    } catch (error) {
      console.error('Email service error (review):', error);
      throw error;
    }
  }

  /**
   * Send ticket reopened notification to assignee
   */
  async sendTicketReopenedNotification(ticketData, reopenerName, reopenReason, notificationUsers = []) {
    try {
      if (!Array.isArray(notificationUsers) || notificationUsers.length === 0) {
        console.warn('No notification users provided for ticket reopen notification');
        return { success: true, sentCount: 0 };
      }

      // Send to all notification users (assignee + actor)
      const emailPromises = notificationUsers.map(user => {
        if (user.EMAIL && user.EMAIL.trim() !== '') {
          console.log(`Sending reopen email notification to ${user.PERSON_NAME} (${user.EMAIL}) - ${user.notification_reason}`);
          return resend.emails.send({
            from: this.fromEmail,
            to: [user.EMAIL],
        subject: `Ticket Reopened - ${ticketData.ticket_number}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Reopened</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 30px 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 30px 25px;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                color: #222222;
              }
              .content {
                margin-top: 20px;
                font-size: 14px;
                line-height: 1.6;
              }
              .content p {
                margin: 6px 0;
              }
              .highlight {
                font-weight: 600;
              }
              .status-blue { color: #007BFF; }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #eeeeee;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Ticket Reopened</h2>
                <p>Ticket #${ticketData.ticket_number}</p>
              </div>
              
              <div class="content">
                <p><span class="highlight">Title:</span> ${ticketData.title}</p>
                <p><span class="highlight">Reopened By:</span> ${reopenerName}</p>
                <p><span class="highlight">Status:</span> <span class="status-blue">Reopened</span></p>
                ${reopenReason ? `<p><span class="highlight">Reason:</span> ${reopenReason}</p>` : ''}
                <p>This ticket has been reopened and requires your attention again.</p>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(result => result.data && !result.error);

      console.log(`Ticket reopen emails sent successfully to ${successful.length}/${notificationUsers.length} recipients`);
      return { success: true, sentCount: successful.length };
    } catch (error) {
      console.error('Email service error (reopen):', error);
      throw error;
    }
  }

  /**
   * Send ticket pre-assigned notification to assignee
   */
  async sendTicketPreAssignedNotification(ticketData, reporterName, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: `Ticket Pre-Assigned - ${ticketData.ticket_number}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Pre-Assigned</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 30px 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 30px 25px;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                color: #222222;
              }
              .content {
                margin-top: 20px;
                font-size: 14px;
                line-height: 1.6;
              }
              .content p {
                margin: 6px 0;
              }
              .highlight {
                font-weight: 600;
              }
              .status-blue { color: #007BFF; }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #eeeeee;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Ticket Pre-Assigned</h2>
                <p>Ticket #${ticketData.ticket_number}</p>
              </div>
              
              <div class="content">
                <p><span class="highlight">Title:</span> ${ticketData.title}</p>
                <p><span class="highlight">Reported By:</span> ${reporterName}</p>
                <p><span class="highlight">Priority:</span> ${ticketData.priority?.toUpperCase()}</p>
                <p><span class="highlight">Severity:</span> ${ticketData.severity_level?.toUpperCase()}</p>
                <p><span class="highlight">Status:</span> <span class="status-blue">Pre-Assigned</span></p>
                <p>You have been pre-assigned to this ticket. Please review and accept or reject it.</p>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        throw new Error(`Failed to send pre-assignment email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email service error (pre-assignment):', error);
      throw error;
    }
  }

  /**
   * Send ticket reassigned notification to new assignee
   */
  async sendTicketReassignedNotification(ticketData, reassignerName, reassignmentReason, notificationUsers = []) {
    try {
      if (!Array.isArray(notificationUsers) || notificationUsers.length === 0) {
        console.warn('No notification users provided for ticket reassignment notification');
        return { success: true, sentCount: 0 };
      }

      // Send to all notification users (requester + assignee + actor)
      const emailPromises = notificationUsers.map(user => {
        if (user.EMAIL && user.EMAIL.trim() !== '') {
          console.log(`Sending reassignment email notification to ${user.PERSON_NAME} (${user.EMAIL}) - ${user.notification_reason}`);
          return resend.emails.send({
            from: this.fromEmail,
            to: [user.EMAIL],
        subject: `Ticket Reassigned - ${ticketData.ticket_number}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Reassigned</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 30px 0;
                color: #333333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 30px 25px;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                color: #222222;
              }
              .content {
                margin-top: 20px;
                font-size: 14px;
                line-height: 1.6;
              }
              .content p {
                margin: 6px 0;
              }
              .highlight {
                font-weight: 600;
              }
              .ticket-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
                border: 1px solid #e9ecef;
              }
              .status-blue { color: #007BFF; }
              .btn {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 22px;
                background: #007BFF;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 4px;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777777;
                text-align: center;
                border-top: 1px solid #eeeeee;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Ticket Reassigned</h2>
                <p>Ticket #${ticketData.ticket_number}</p>
              </div>
              
              <div class="content">
                <p>This ticket has been reassigned to you by L3 management. Please review and handle accordingly.</p>
                
                <div class="ticket-info">
                  <p><span class="highlight">Case Number:</span> ${ticketData.ticket_number}</p>
                  <p><span class="highlight">Asset Name:</span> ${ticketData.PUNAME || ticketData.machine_number || 'Unknown Asset'}</p>
                  <p><span class="highlight">Problem:</span> ${ticketData.title || 'No description'}</p>
                  <p><span class="highlight">Reassigned By:</span> ${reassignerName}</p>
                  <p><span class="highlight">Status:</span> <span class="status-blue">Reassigned</span></p>
                  <p><span class="highlight">Reason:</span> ${reassignmentReason || 'งานได้รับการมอบหมายใหม่ให้คุณ'}</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="btn">View Ticket Details</a>
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from Mars CMMS System. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(result => result.data && !result.error);

      console.log(`Ticket reassignment emails sent successfully to ${successful.length}/${notificationUsers.length} recipients`);
      return { success: true, sentCount: successful.length };
    } catch (error) {
      console.error('Email service error (reassignment):', error);
      throw error;
    }
  }

  /**
   * Test email service connection
   * @returns {Promise<Object>} - Test result
   */
  async testConnection() {
    try {
      // Try to send a test email to verify the API key
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: ['test@example.com'],
        subject: 'Test Email',
        html: '<p>This is a test email to verify the connection.</p>',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: 'Email service is working correctly' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
