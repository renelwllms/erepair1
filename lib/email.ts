import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";
import { db } from "./db";

// Email configuration interface
interface EmailConfig {
  provider?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  mailtrapToken?: string;
  from: {
    name: string;
    email: string;
  };
}

// Get email configuration from settings or environment
async function getEmailConfig(): Promise<EmailConfig> {
  // Try to get from database settings first
  const settings = await db.settings.findFirst();

  // Check for Mailtrap configuration first (environment variable)
  if (process.env.MAILTRAP_TOKEN) {
    return {
      provider: "mailtrap",
      mailtrapToken: process.env.MAILTRAP_TOKEN,
      from: {
        name: settings?.smtpFromName || process.env.SMTP_FROM_NAME || "Mailtrap Test",
        email: settings?.smtpFromEmail || process.env.SMTP_FROM_EMAIL || "hello@demomailtrap.co",
      },
    };
  }

  // Check for SMTP configuration in database
  if (
    settings?.smtpHost &&
    settings?.smtpPort &&
    settings?.smtpUser &&
    settings?.smtpPassword
  ) {
    return {
      provider: "smtp",
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
      from: {
        name: settings.smtpFromName || settings.companyName || "E-Repair Shop",
        email: settings.smtpFromEmail || settings.smtpUser,
      },
    };
  }

  // Fall back to environment variables for SMTP
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return {
      provider: "smtp",
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      from: {
        name: process.env.SMTP_FROM_NAME || "E-Repair Shop",
        email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      },
    };
  }

  throw new Error("Email configuration not found in settings or environment variables");
}

// Create transporter
async function createTransporter() {
  const config = await getEmailConfig();

  // Use Mailtrap if configured
  if (config.provider === "mailtrap" && config.mailtrapToken) {
    return nodemailer.createTransport(
      MailtrapTransport({
        token: config.mailtrapToken,
      })
    );
  }

  // Use SMTP
  return nodemailer.createTransport({
    host: config.host!,
    port: config.port!,
    secure: config.secure!,
    auth: config.auth!,
  });
}

// Send email and log it
export async function sendEmail({
  to,
  subject,
  html,
  text,
  emailType,
  relatedId,
  sentById,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  emailType: string;
  relatedId?: string;
  sentById?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding?: string;
    contentType?: string;
  }>;
}) {
  try {
    const config = await getEmailConfig();
    const transporter = await createTransporter();

    // Prepare mail options
    const mailOptions: any = {
      to,
      subject,
      text: text || "",
      html,
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    // Handle sender format based on provider
    if (config.provider === "mailtrap") {
      mailOptions.from = {
        address: config.from.email,
        name: config.from.name,
      };
      mailOptions.category = "Application Email";
    } else {
      mailOptions.from = `"${config.from.name}" <${config.from.email}>`;
    }

    const info = await transporter.sendMail(mailOptions);

    // Log successful email
    await db.emailLog.create({
      data: {
        sentById,
        recipient: to,
        subject,
        body: html,
        status: "SENT",
        emailType,
        relatedId,
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Error sending email:", error);

    // Log failed email
    await db.emailLog.create({
      data: {
        sentById,
        recipient: to,
        subject,
        body: html,
        status: "FAILED",
        errorMsg: error.message,
        emailType,
        relatedId,
      },
    });

    throw error;
  }
}

// Test email configuration
export async function testEmailConfig(
  testEmail: string
): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getEmailConfig();
    const transporter = await createTransporter();

    // Verify connection (skip for Mailtrap as it doesn't support verify)
    if (config.provider !== "mailtrap") {
      await transporter.verify();
    }

    // Prepare mail options
    const mailOptions: any = {
      to: testEmail,
      subject: "E-Repair Shop - Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Configuration Test</h2>
          <p>This is a test email from your E-Repair Shop management system.</p>
          <p>If you received this email, your email configuration is working correctly!</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Configuration Details:<br>
            Provider: ${config.provider || 'SMTP'}<br>
            ${config.host ? `Host: ${config.host}<br>` : ''}
            ${config.port ? `Port: ${config.port}<br>` : ''}
            From: ${config.from.email}
          </p>
        </div>
      `,
    };

    // Handle sender format based on provider
    if (config.provider === "mailtrap") {
      mailOptions.from = {
        address: config.from.email,
        name: config.from.name,
      };
      mailOptions.category = "Test Email";
    } else {
      mailOptions.from = `"${config.from.name}" <${config.from.email}>`;
    }

    // Send test email
    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "Test email sent successfully! Check your inbox.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to send test email: ${error.message}`,
    };
  }
}
