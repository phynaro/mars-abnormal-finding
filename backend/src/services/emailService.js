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
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { 
            display: inline-block; 
            background: #2563eb; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Mars CMMS System</h1>
          </div>
          <div class="content">
            <h2>Welcome ${firstName}!</h2>
            <p>Thank you for registering with the Mars CMMS System. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">
              ${verificationLink}
            </p>
            
            <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
            
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
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Mars CMMS!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Congratulations! Your email has been successfully verified and your account is now active.</p>
            
            <p>You can now:</p>
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
    subject: '🚨 New Abnormal Finding Ticket Created - Mars CMMS',
    html: (ticketData, reporterName) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Ticket Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .priority-high { color: #dc2626; font-weight: bold; }
          .priority-medium { color: #d97706; font-weight: bold; }
          .priority-low { color: #059669; font-weight: bold; }
          .severity-critical { background: #fef2f2; border-left: 4px solid #dc2626; padding: 10px; }
          .severity-high { background: #fef3c7; border-left: 4px solid #d97706; padding: 10px; }
          .severity-medium { background: #f0fdf4; border-left: 4px solid #059669; padding: 10px; }
          .severity-low { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 10px; }
          .button { 
            display: inline-block; 
            background: #2563eb; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
            font-weight: bold;
            text-align: center;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 New Abnormal Finding Ticket</h1>
            <p>Ticket #${ticketData.ticket_number}</p>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>A new abnormal finding has been reported in the Mars CMMS System that requires your attention.</p>
            
            <div class="ticket-info">
              <h3>Ticket Details:</h3>
              <p><strong>Title:</strong> ${ticketData.title}</p>
              <p><strong>Description:</strong> ${ticketData.description}</p>
              <p><strong>Affected Point:</strong> ${ticketData.affected_point_name} (${ticketData.affected_point_type})</p>
              <p><strong>Reported By:</strong> ${reporterName}</p>
              <p><strong>Priority:</strong> <span class="priority-${ticketData.priority}">${ticketData.priority.toUpperCase()}</span></p>
              <p><strong>Severity:</strong> <span class="severity-${ticketData.severity_level}">${ticketData.severity_level.toUpperCase()}</span></p>
              ${ticketData.estimated_downtime_hours ? `<p><strong>Estimated Downtime:</strong> ${ticketData.estimated_downtime_hours} hours</p>` : ''}
              <p><strong>Created:</strong> ${new Date(ticketData.created_at).toLocaleString()}</p>
            </div>
            
            <p><strong>Action Required:</strong> Please review this ticket and take appropriate action based on the severity and priority level.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="button">
                🎯 View Ticket Details
              </a>
            </div>
            
            <p style="text-align: center; margin-top: 20px; font-size: 14px; color: #666;">
              Or copy this link: <br>
              <span style="word-break: break-all; background: #e5e7eb; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">
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
    subject: '📌 Ticket Assigned To You - Mars CMMS',
    html: (ticketData, assigneeName) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket Assignment</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📌 Ticket Assigned</h1>
            <p>Ticket #${ticketData.ticket_number}</p>
          </div>
          <div class="content">
            <p>Hello ${assigneeName},</p>
            <p>You have been assigned a ticket that requires your attention.</p>
            <div class="ticket-info">
              <p><strong>Title:</strong> ${ticketData.title}</p>
              <p><strong>Severity:</strong> ${ticketData.severity_level?.toUpperCase()}</p>
              <p><strong>Priority:</strong> ${ticketData.priority?.toUpperCase()}</p>
              <p><strong>Affected Point:</strong> ${ticketData.affected_point_name} (${ticketData.affected_point_type})</p>
            </div>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="button">View Ticket</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  statusUpdate: {
    subject: '🔄 Ticket Status Updated - Mars CMMS',
    html: (ticketData, oldStatus, newStatus, changedByName) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f0f9ff; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 Ticket Status Updated</h1>
            <p>Ticket #${ticketData.ticket_number}</p>
          </div>
          <div class="content">
            <p><strong>Changed By:</strong> ${changedByName}</p>
            <p><strong>Status:</strong> ${oldStatus || 'N/A'} → ${newStatus}</p>
            <div class="ticket-info">
              <p><strong>Title:</strong> ${ticketData.title}</p>
              <p><strong>Severity:</strong> ${ticketData.severity_level?.toUpperCase()}</p>
              <p><strong>Priority:</strong> ${ticketData.priority?.toUpperCase()}</p>
            </div>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${ticketData.id}" class="button">View Ticket</a>
            </div>
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
   * Send new ticket notification email
   * @param {Object} ticketData - Ticket information
   * @param {string} reporterName - Name of the person who reported the ticket
   * @param {string} toEmail - Recipient email (for demo, will be phynaro@hotmail.com)
   * @returns {Promise<Object>} - Resend API response
   */
  async sendNewTicketNotification(ticketData, reporterName, toEmail = 'phynaro@hotmail.com') {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: EMAIL_TEMPLATES.newTicket.subject,
        html: EMAIL_TEMPLATES.newTicket.html(ticketData, reporterName),
      });

      if (error) {
        console.error('Resend API error:', error);
        throw new Error(`Failed to send ticket notification email: ${error.message}`);
      }

      console.log('Ticket notification email sent successfully:', data);
      return { success: true, messageId: data.id };
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
  async sendTicketAcceptedNotification(ticketData, acceptorName, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: `✅ Ticket Accepted - ${ticketData.ticket_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #059669;">✅ Ticket Accepted</h2>
            <p><strong>Ticket:</strong> #${ticketData.ticket_number}</p>
            <p><strong>Title:</strong> ${ticketData.title}</p>
            <p><strong>Accepted By:</strong> ${acceptorName}</p>
            <p><strong>Status:</strong> Work in Progress</p>
            <p>Your ticket has been accepted and work has started. You will be notified when it's completed.</p>
          </div>
        `,
      });

      if (error) {
        throw new Error(`Failed to send acceptance email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email service error (acceptance):', error);
      throw error;
    }
  }

  /**
   * Send ticket rejected notification to requestor
   */
  async sendTicketRejectedNotification(ticketData, rejectorName, rejectionReason, status, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: `❌ Ticket Rejected - ${ticketData.ticket_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">❌ Ticket Rejected</h2>
            <p><strong>Ticket:</strong> #${ticketData.ticket_number}</p>
            <p><strong>Title:</strong> ${ticketData.title}</p>
            <p><strong>Rejected By:</strong> ${rejectorName}</p>
            <p><strong>Status:</strong> ${status}</p>
            <p><strong>Reason:</strong> ${rejectionReason}</p>
            <p>Your ticket has been rejected. ${status === 'rejected_pending_l3_review' ? 'It has been escalated to L3 for review.' : 'This is a final rejection.'}</p>
          </div>
        `,
      });

      if (error) {
        throw new Error(`Failed to send rejection email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email service error (rejection):', error);
      throw error;
    }
  }

  /**
   * Send job completed notification to requestor
   */
  async sendJobCompletedNotification(ticketData, completerName, completionNotes, downtimeAvoidance, costAvoidance, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: `✅ Job Completed - ${ticketData.ticket_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #059669;">✅ Job Completed</h2>
            <p><strong>Ticket:</strong> #${ticketData.ticket_number}</p>
            <p><strong>Title:</strong> ${ticketData.title}</p>
            <p><strong>Completed By:</strong> ${completerName}</p>
            <p><strong>Downtime Avoidance:</strong> ${downtimeAvoidance || 'Not specified'} hours</p>
            <p><strong>Cost Avoidance:</strong> ${costAvoidance ? `$${costAvoidance.toFixed(2)}` : 'Not specified'}</p>
            ${completionNotes ? `<p><strong>Notes:</strong> ${completionNotes}</p>` : ''}
            <p>Your ticket has been completed. Please review and close it if you're satisfied with the work.</p>
          </div>
        `,
      });

      if (error) {
        throw new Error(`Failed to send completion email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email service error (completion):', error);
      throw error;
    }
  }

  /**
   * Send ticket escalated notification to L3
   */
  async sendTicketEscalatedNotification(ticketData, escalatorName, escalationReason, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: `🚨 Ticket Escalated - ${ticketData.ticket_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #d97706;">🚨 Ticket Escalated</h2>
            <p><strong>Ticket:</strong> #${ticketData.ticket_number}</p>
            <p><strong>Title:</strong> ${ticketData.title}</p>
            <p><strong>Escalated By:</strong> ${escalatorName}</p>
            <p><strong>Reason:</strong> ${escalationReason}</p>
            <p>This ticket has been escalated to you for L3 review and handling.</p>
          </div>
        `,
      });

      if (error) {
        throw new Error(`Failed to send escalation email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
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
        subject: `🚨 Ticket Escalated - ${ticketData.ticket_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #d97706;">🚨 Ticket Escalated</h2>
            <p><strong>Ticket:</strong> #${ticketData.ticket_number}</p>
            <p><strong>Title:</strong> ${ticketData.title}</p>
            <p><strong>Escalated By:</strong> ${escalatorName}</p>
            <p><strong>Reason:</strong> ${escalationReason}</p>
            <p>Your ticket has been escalated to L3 for review and handling.</p>
          </div>
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
  async sendTicketClosedNotification(ticketData, closerName, closeReason, satisfactionRating, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: `✅ Ticket Closed - ${ticketData.ticket_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #059669;">✅ Ticket Closed</h2>
            <p><strong>Ticket:</strong> #${ticketData.ticket_number}</p>
            <p><strong>Title:</strong> ${ticketData.title}</p>
            <p><strong>Closed By:</strong> ${closerName}</p>
            ${closeReason ? `<p><strong>Close Reason:</strong> ${closeReason}</p>` : ''}
            ${satisfactionRating ? `<p><strong>Satisfaction Rating:</strong> ${satisfactionRating}/5</p>` : ''}
            <p>This ticket has been closed by the requestor.</p>
          </div>
        `,
      });

      if (error) {
        throw new Error(`Failed to send closure email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email service error (closure):', error);
      throw error;
    }
  }

  /**
   * Send ticket reopened notification to assignee
   */
  async sendTicketReopenedNotification(ticketData, reopenerName, reopenReason, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: `🔄 Ticket Reopened - ${ticketData.ticket_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0ea5e9;">🔄 Ticket Reopened</h2>
            <p><strong>Ticket:</strong> #${ticketData.ticket_number}</p>
            <p><strong>Title:</strong> ${ticketData.title}</p>
            <p><strong>Reopened By:</strong> ${reopenerName}</p>
            ${reopenReason ? `<p><strong>Reason:</strong> ${reopenReason}</p>` : ''}
            <p>This ticket has been reopened and requires your attention again.</p>
          </div>
        `,
      });

      if (error) {
        throw new Error(`Failed to send reopen email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
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
        subject: `📌 Ticket Pre-Assigned - ${ticketData.ticket_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">📌 Ticket Pre-Assigned</h2>
            <p><strong>Ticket:</strong> #${ticketData.ticket_number}</p>
            <p><strong>Title:</strong> ${ticketData.title}</p>
            <p><strong>Reported By:</strong> ${reporterName}</p>
            <p><strong>Priority:</strong> ${ticketData.priority?.toUpperCase()}</p>
            <p><strong>Severity:</strong> ${ticketData.severity_level?.toUpperCase()}</p>
            <p>You have been pre-assigned to this ticket. Please review and accept or reject it.</p>
          </div>
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
  async sendTicketReassignedNotification(ticketData, reassignerName, reassignmentReason, toEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: `🔄 Ticket Reassigned - ${ticketData.ticket_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0ea5e9;">🔄 Ticket Reassigned</h2>
            <p><strong>Ticket:</strong> #${ticketData.ticket_number}</p>
            <p><strong>Title:</strong> ${ticketData.title}</p>
            <p><strong>Reassigned By:</strong> ${reassignerName}</p>
            ${reassignmentReason ? `<p><strong>Reason:</strong> ${reassignmentReason}</p>` : ''}
            <p>This ticket has been reassigned to you by L3 management. Please review and handle accordingly.</p>
          </div>
        `,
      });

      if (error) {
        throw new Error(`Failed to send reassignment email: ${error.message}`);
      }

      return { success: true, messageId: data.id };
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
