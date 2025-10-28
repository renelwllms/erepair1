// Email template base layout
function emailLayout(content: string, companyName: string = "E-Repair Shop"): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                ${companyName}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Thank you for choosing ${companyName}
              </p>
              <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Job confirmation email template
export function jobConfirmationEmail({
  jobNumber,
  customerName,
  applianceType,
  applianceBrand,
  issueDescription,
  trackingUrl,
  companyName = "E-Repair Shop",
}: {
  jobNumber: string;
  customerName: string;
  applianceType: string;
  applianceBrand: string;
  issueDescription: string;
  trackingUrl: string;
  companyName?: string;
}): { subject: string; html: string; text: string } {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">
      Job Confirmation
    </h2>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear ${customerName},
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      Thank you for submitting your repair request. We have received your job and our team will review it shortly.
    </p>

    <!-- Job Number Box -->
    <div style="background-color: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 0 0 30px 0; text-align: center;">
      <p style="color: #1e40af; font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">
        Your Job Number
      </p>
      <p style="color: #1e3a8a; font-size: 32px; margin: 0; font-weight: bold; letter-spacing: 2px;">
        ${jobNumber}
      </p>
      <p style="color: #3b82f6; font-size: 12px; margin: 10px 0 0 0;">
        Please save this number for tracking your repair
      </p>
    </div>

    <!-- Job Details -->
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 0 0 30px 0;">
      <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
        Job Details
      </h3>
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Appliance:</td>
          <td style="color: #1f2937; font-size: 14px; font-weight: bold; padding: 8px 0;">${applianceType} - ${applianceBrand}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 8px 0; vertical-align: top;">Issue:</td>
          <td style="color: #1f2937; font-size: 14px; padding: 8px 0;">${issueDescription}</td>
        </tr>
      </table>
    </div>

    <!-- Track Button -->
    <div style="text-align: center; margin: 0 0 30px 0;">
      <a href="${trackingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Track Your Job
      </a>
    </div>

    <!-- What's Next -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
      <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
        What Happens Next?
      </h3>
      <ol style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 10px;">Our team will review your submission and contact you within 24 hours.</li>
        <li style="margin-bottom: 10px;">You'll receive updates via email as your repair progresses.</li>
        <li style="margin-bottom: 10px;">Use your job number to track the status anytime.</li>
      </ol>
    </div>
  `;

  const text = `
Job Confirmation - ${companyName}

Dear ${customerName},

Thank you for submitting your repair request. Your job number is: ${jobNumber}

Job Details:
- Appliance: ${applianceType} - ${applianceBrand}
- Issue: ${issueDescription}

Track your job at: ${trackingUrl}

What's Next?
1. Our team will review your submission and contact you within 24 hours.
2. You'll receive updates via email as your repair progresses.
3. Use your job number to track the status anytime.

Thank you for choosing ${companyName}!
  `;

  return {
    subject: `Job Confirmation - ${jobNumber}`,
    html: emailLayout(content, companyName),
    text,
  };
}

// Status update email template
export function statusUpdateEmail({
  jobNumber,
  customerName,
  applianceType,
  oldStatus,
  newStatus,
  notes,
  trackingUrl,
  companyName = "E-Repair Shop",
}: {
  jobNumber: string;
  customerName: string;
  applianceType: string;
  oldStatus: string;
  newStatus: string;
  notes?: string;
  trackingUrl: string;
  companyName?: string;
}): { subject: string; html: string; text: string } {
  const formatStatus = (status: string) => status.replace(/_/g, " ");

  const statusColors: Record<string, string> = {
    OPEN: "#3b82f6",
    IN_PROGRESS: "#3b82f6",
    AWAITING_PARTS: "#f59e0b",
    READY_FOR_PICKUP: "#10b981",
    CLOSED: "#6b7280",
    CANCELLED: "#ef4444",
  };

  const statusColor = statusColors[newStatus] || "#3b82f6";

  let statusMessage = "";
  if (newStatus === "READY_FOR_PICKUP") {
    statusMessage = `
      <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #065f46; margin: 0; font-weight: bold;">
          ✓ Your appliance is ready for pickup!
        </p>
        <p style="color: #047857; margin: 10px 0 0 0; font-size: 14px;">
          Please visit our shop during business hours to collect your repaired appliance.
        </p>
      </div>
    `;
  } else if (newStatus === "CLOSED") {
    statusMessage = `
      <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #374151; margin: 0; font-weight: bold;">
          ✓ Job Completed
        </p>
        <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">
          Thank you for choosing our service. We hope to see you again!
        </p>
      </div>
    `;
  }

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">
      Status Update - ${jobNumber}
    </h2>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear ${customerName},
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      We have an update on your ${applianceType} repair.
    </p>

    ${statusMessage}

    <!-- Status Change -->
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 0 0 20px 0;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap;">
        <div style="text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0;">Previous Status</p>
          <p style="color: #9ca3af; font-size: 16px; margin: 0; text-decoration: line-through;">
            ${formatStatus(oldStatus)}
          </p>
        </div>
        <div style="color: #2563eb; font-size: 24px;">→</div>
        <div style="text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0;">New Status</p>
          <p style="color: ${statusColor}; font-size: 18px; margin: 0; font-weight: bold;">
            ${formatStatus(newStatus)}
          </p>
        </div>
      </div>
    </div>

    ${notes ? `
      <div style="background-color: #fffbeb; border-left: 3px solid #f59e0b; padding: 15px; margin: 0 0 30px 0; border-radius: 4px;">
        <p style="color: #92400e; margin: 0; font-weight: bold; font-size: 14px;">
          Update Notes:
        </p>
        <p style="color: #78350f; margin: 10px 0 0 0; font-size: 14px;">
          ${notes}
        </p>
      </div>
    ` : ""}

    <!-- Track Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${trackingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
        View Full Status
      </a>
    </div>
  `;

  const text = `
Status Update - ${jobNumber}

Dear ${customerName},

We have an update on your ${applianceType} repair.

Status Changed: ${formatStatus(oldStatus)} → ${formatStatus(newStatus)}

${notes ? `Update Notes: ${notes}` : ""}

Track your job at: ${trackingUrl}

Thank you for choosing ${companyName}!
  `;

  return {
    subject: `Status Update: ${formatStatus(newStatus)} - ${jobNumber}`,
    html: emailLayout(content, companyName),
    text,
  };
}

// Ready for pickup notification (special case)
export function readyForPickupEmail({
  jobNumber,
  customerName,
  applianceType,
  trackingUrl,
  shopAddress,
  shopPhone,
  shopHours,
  companyName = "E-Repair Shop",
}: {
  jobNumber: string;
  customerName: string;
  applianceType: string;
  trackingUrl: string;
  shopAddress?: string;
  shopPhone?: string;
  shopHours?: string;
  companyName?: string;
}): { subject: string; html: string; text: string } {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">
      Your ${applianceType} is Ready!
    </h2>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear ${customerName},
    </p>

    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 30px; margin: 0 0 30px 0; text-align: center;">
      <p style="color: #ffffff; font-size: 24px; margin: 0; font-weight: bold;">
        ✓ Ready for Pickup!
      </p>
      <p style="color: #d1fae5; font-size: 14px; margin: 10px 0 0 0;">
        Job ${jobNumber}
      </p>
    </div>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      Great news! Your ${applianceType} has been repaired and is ready to be picked up at your convenience.
    </p>

    ${shopAddress || shopPhone || shopHours ? `
      <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 0 0 30px 0;">
        <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
          Pickup Information
        </h3>
        ${shopAddress ? `
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
            <strong>Address:</strong><br>
            ${shopAddress}
          </p>
        ` : ""}
        ${shopPhone ? `
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
            <strong>Phone:</strong> ${shopPhone}
          </p>
        ` : ""}
        ${shopHours ? `
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">
            <strong>Hours:</strong> ${shopHours}
          </p>
        ` : ""}
      </div>
    ` : ""}

    <div style="background-color: #fffbeb; border-left: 3px solid #f59e0b; padding: 15px; margin: 0 0 30px 0; border-radius: 4px;">
      <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>Please bring:</strong><br>
        • Your job number (${jobNumber})<br>
        • Photo ID for verification
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${trackingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
        View Job Details
      </a>
    </div>
  `;

  const text = `
Your ${applianceType} is Ready for Pickup!

Dear ${customerName},

Great news! Your ${applianceType} has been repaired and is ready to be picked up.

Job Number: ${jobNumber}

${shopAddress ? `Address: ${shopAddress}` : ""}
${shopPhone ? `Phone: ${shopPhone}` : ""}
${shopHours ? `Hours: ${shopHours}` : ""}

Please bring:
• Your job number (${jobNumber})
• Photo ID for verification

Track your job at: ${trackingUrl}

Thank you for choosing ${companyName}!
  `;

  return {
    subject: `Ready for Pickup - ${jobNumber}`,
    html: emailLayout(content, companyName),
    text,
  };
}
