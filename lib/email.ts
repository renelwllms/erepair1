import nodemailer from "nodemailer";
import { db } from "./db";

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

// Get email configuration from settings or environment
async function getEmailConfig(): Promise<EmailConfig> {
  // Try to get from database settings first
  const settings = await db.settings.findFirst();

  if (
    settings?.smtpHost &&
    settings?.smtpPort &&
    settings?.smtpUser &&
    settings?.smtpPassword
  ) {
    return {
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

  // Fall back to environment variables
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    throw new Error("Email configuration not found in settings or environment variables");
  }

  return {
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

// Create transporter
async function createTransporter() {
  const config = await getEmailConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
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
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  emailType: string;
  relatedId?: string;
  sentById?: string;
}) {
  try {
    const config = await getEmailConfig();
    const transporter = await createTransporter();

    const info = await transporter.sendMail({
      from: `"${config.from.name}" <${config.from.email}>`,
      to,
      subject,
      text: text || "",
      html,
    });

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

    // Verify connection
    await transporter.verify();

    // Send test email
    await transporter.sendMail({
      from: `"${config.from.name}" <${config.from.email}>`,
      to: testEmail,
      subject: "E-Repair Shop - Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Configuration Test</h2>
          <p>This is a test email from your E-Repair Shop management system.</p>
          <p>If you received this email, your email configuration is working correctly!</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Configuration Details:<br>
            Host: ${config.host}<br>
            Port: ${config.port}<br>
            From: ${config.from.email}
          </p>
        </div>
      `,
    });

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
