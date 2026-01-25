// Email template base layout
export function emailLayout(content: string, companyName: string = "E-Repair Shop"): string {
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

function getTermsUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/terms-and-conditions`
    : "/terms-and-conditions";
}

export function termsSummaryHtml(termsUrl: string): string {
  return `
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <h4 style="color: #111827; margin: 0 0 8px 0; font-size: 14px;">Terms Summary</h4>
    <ul style="color: #374151; font-size: 13px; line-height: 1.6; margin: 0 0 12px 18px; padding: 0;">
      <li>Inspection fees are non-refundable if repair is declined.</li>
      <li>Customer data must be backed up; eRepair is not liable for data loss.</li>
      <li>3-month return-to-base warranty on repairs (excluding liquid, physical damage &amp; glass replacements).</li>
      <li>No warranty on liquid damage repairs.</li>
      <li>Courier damage is subject to courier terms.</li>
      <li>Devices must be collected within 4 weeks.</li>
      <li>Rights under the NZ Consumer Guarantees Act apply.</li>
    </ul>
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      Full Terms &amp; Conditions available on request or on our website:
      <a href="${termsUrl}" style="color: #2563eb; text-decoration: underline;">${termsUrl}</a>
    </p>
  `;
}

export function termsSummaryText(termsUrl: string): string {
  return `
Terms Summary
- Inspection fees are non-refundable if repair is declined
- Customer data must be backed up; eRepair is not liable for data loss
- 3-month return-to-base warranty on repairs (excluding liquid, physical damage & glass replacements)
- No warranty on liquid damage repairs
- Courier damage is subject to courier terms
- Devices must be collected within 4 weeks
- Rights under the NZ Consumer Guarantees Act apply

Full Terms & Conditions: ${termsUrl}
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
  const termsUrl = getTermsUrl();
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
        <li style="margin-bottom: 10px;">Our team will review your submission and contact you within 2-5 working days.</li>
        <li style="margin-bottom: 10px;">You'll receive updates via email as your repair progresses.</li>
        <li style="margin-bottom: 10px;">Use your job number to track the status anytime.</li>
      </ol>
    </div>

    ${termsSummaryHtml(termsUrl)}
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
1. Our team will review your submission and contact you within 2-5 working days.
2. You'll receive updates via email as your repair progresses.
3. Use your job number to track the status anytime.

${termsSummaryText(termsUrl)}

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
  const termsUrl = getTermsUrl();

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

    ${termsSummaryHtml(termsUrl)}
  `;

  const text = `
Status Update - ${jobNumber}

Dear ${customerName},

We have an update on your ${applianceType} repair.

Status Changed: ${formatStatus(oldStatus)} → ${formatStatus(newStatus)}

${notes ? `Update Notes: ${notes}` : ""}

Track your job at: ${trackingUrl}

${termsSummaryText(termsUrl)}

Thank you for choosing ${companyName}!
  `;

  return {
    subject: `Status Update: ${formatStatus(newStatus)} - ${jobNumber}`,
    html: emailLayout(content, companyName),
    text,
  };
}

// Job completion thank-you email
export function jobCompletedEmail({
  jobNumber,
  customerName,
  applianceType,
  trackingUrl,
  companyName = "E-Repair Shop",
}: {
  jobNumber: string;
  customerName: string;
  applianceType: string;
  trackingUrl: string;
  companyName?: string;
}): { subject: string; html: string; text: string } {
  const termsUrl = getTermsUrl();
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">
      Thank You for Choosing ${companyName}
    </h2>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear ${customerName},
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Your ${applianceType} repair (Job ${jobNumber}) has been completed. Thank you for trusting us with your repair.
    </p>

    <div style="text-align: center; margin: 20px 0 30px 0;">
      <a href="${trackingUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold;">
        View Job Details
      </a>
    </div>

    ${termsSummaryHtml(termsUrl)}
  `;

  const text = `
Thank You for Choosing ${companyName}

Dear ${customerName},

Your ${applianceType} repair (Job ${jobNumber}) has been completed. Thank you for trusting us with your repair.

View job details: ${trackingUrl}

${termsSummaryText(termsUrl)}
  `;

  return {
    subject: `Thank You - Job ${jobNumber} Completed`,
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

// Callout booking confirmation email template
export function calloutBookingConfirmationEmail({
  jobNumber,
  customerName,
  calloutDate,
  calloutLocation,
  calloutFee,
  address,
  serviceDescription,
  companyName = "E-Repair Shop",
}: {
  jobNumber: string;
  customerName: string;
  calloutDate: string;
  calloutLocation: string;
  calloutFee: number;
  address: string;
  serviceDescription: string;
  companyName?: string;
}): { subject: string; html: string; text: string } {
  const formattedDate = new Date(calloutDate).toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">
      Callout Booking Confirmed
    </h2>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear ${customerName},
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      Thank you for booking a callout service with ${companyName}. Your booking has been confirmed and our team will contact you shortly.
    </p>

    <!-- Job Number Box -->
    <div style="background-color: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 0 0 30px 0; text-align: center;">
      <p style="color: #1e40af; font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">
        Your Booking Number
      </p>
      <p style="color: #1e3a8a; font-size: 32px; margin: 0; font-weight: bold; letter-spacing: 2px;">
        ${jobNumber}
      </p>
      <p style="color: #3b82f6; font-size: 12px; margin: 10px 0 0 0;">
        Please save this number for tracking your booking
      </p>
    </div>

    <!-- Booking Details -->
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 0 0 20px 0;">
      <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
        Booking Details
      </h3>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">
            <strong>Service Location:</strong>
          </td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
            ${address}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
            <strong>Service Area:</strong>
          </td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
            ${calloutLocation}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
            <strong>Preferred Date:</strong>
          </td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
            ${formattedDate}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 15px 0 8px 0; color: #6b7280; font-size: 14px;">
            <strong>Service Required:</strong>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 0 0 8px 0; color: #1f2937; font-size: 14px;">
            ${serviceDescription}
          </td>
        </tr>
      </table>
    </div>

    <!-- Callout Fee Box -->
    <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
      <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 20px;">
        Callout Fee: $${calloutFee.toFixed(2)}
      </h3>
      <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>Important:</strong> This fee covers:
      </p>
      <ul style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 10px 0 10px 20px; padding: 0;">
        <li>Travel to your location</li>
        <li>Initial diagnostic assessment (up to 1 hour)</li>
        <li>Detailed fault report</li>
      </ul>
      <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">
        Any parts or additional labor required will be quoted separately for your approval.
      </p>
    </div>

    <!-- What Happens Next -->
    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 0 0 30px 0;">
      <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">
        What Happens Next?
      </h3>

      <div style="margin: 0 0 15px 0;">
        <p style="color: #047857; font-size: 14px; margin: 0 0 5px 0;">
          <strong>1. Confirmation Call</strong>
        </p>
        <p style="color: #059669; font-size: 14px; margin: 0; line-height: 1.5;">
          Our team will contact you within 2 business hours to confirm the exact time slot for your preferred date.
        </p>
      </div>

      <div style="margin: 0 0 15px 0;">
        <p style="color: #047857; font-size: 14px; margin: 0 0 5px 0;">
          <strong>2. Technician Visit</strong>
        </p>
        <p style="color: #059669; font-size: 14px; margin: 0; line-height: 1.5;">
          A qualified technician will arrive at your location on the scheduled date to assess the issue.
        </p>
      </div>

      <div style="margin: 0;">
        <p style="color: #047857; font-size: 14px; margin: 0 0 5px 0;">
          <strong>3. Detailed Quote</strong>
        </p>
        <p style="color: #059669; font-size: 14px; margin: 0; line-height: 1.5;">
          After diagnosis, we'll provide a quote for any repairs needed, which you can approve or decline.
        </p>
      </div>
    </div>

    <!-- Track Button -->
    <div style="text-align: center; margin: 0 0 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/track-job?jobNumber=${jobNumber}"
         style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Track Your Booking
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
      If you have any questions, please contact us and reference your booking number: <strong>${jobNumber}</strong>
    </p>
  `;

  const text = `
Callout Booking Confirmed

Dear ${customerName},

Your callout service has been booked successfully.

Booking Number: ${jobNumber}

BOOKING DETAILS:
Service Location: ${address}
Service Area: ${calloutLocation}
Preferred Date: ${formattedDate}
Callout Fee: $${calloutFee.toFixed(2)}

Service Required:
${serviceDescription}

CALLOUT FEE INFORMATION:
This fee covers:
• Travel to your location
• Initial diagnostic assessment (up to 1 hour)
• Detailed fault report

Any parts or additional labor required will be quoted separately for your approval.

WHAT HAPPENS NEXT:

1. Confirmation Call
Our team will contact you within 2 business hours to confirm the exact time slot for your preferred date.

2. Technician Visit
A qualified technician will arrive at your location on the scheduled date to assess the issue.

3. Detailed Quote
After diagnosis, we'll provide a quote for any repairs needed, which you can approve or decline.

Track your booking at: ${process.env.NEXT_PUBLIC_APP_URL || ''}/track-job?jobNumber=${jobNumber}

If you have any questions, please contact us and reference your booking number: ${jobNumber}

Thank you for choosing ${companyName}!
  `;

  return {
    subject: `Callout Booking Confirmed - ${jobNumber}`,
    html: emailLayout(content, companyName),
    text,
  };
}

// Quote sent email template (fallback when DB template is missing)
export function quoteSentEmail({
  customerName,
  jobNumber,
  applianceBrand,
  applianceType,
  issueDescription,
  quotedAmount,
  acceptUrl,
  rejectUrl,
  companyName = "E-Repair Shop",
  diagnosticFeeAmount,
}: {
  customerName: string;
  jobNumber: string;
  applianceBrand: string;
  applianceType: string;
  issueDescription: string;
  quotedAmount: string;
  acceptUrl: string;
  rejectUrl: string;
  companyName?: string;
  diagnosticFeeAmount?: number;
}): { subject: string; html: string; text: string } {
  const termsUrl = getTermsUrl();
  const diagnosticNotice =
    typeof diagnosticFeeAmount === "number" && diagnosticFeeAmount > 0
      ? `Diagnostic fee of ${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(diagnosticFeeAmount)} is non-refundable if you decide not to proceed. If you approve the repair, this fee will be credited toward your final invoice.`
      : null;
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">
      Repair Quote
    </h2>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear ${customerName},
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      We have completed the diagnostic on your device and prepared a quote for your approval.
    </p>

    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 0 0 30px 0;">
      <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
        Quote Details
      </h3>
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Job Number:</td>
          <td style="color: #1f2937; font-size: 14px; font-weight: bold; padding: 8px 0;">${jobNumber}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Device:</td>
          <td style="color: #1f2937; font-size: 14px; font-weight: bold; padding: 8px 0;">${applianceBrand} ${applianceType}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 8px 0; vertical-align: top;">Issue:</td>
          <td style="color: #1f2937; font-size: 14px; padding: 8px 0;">${issueDescription}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Estimated Cost:</td>
          <td style="color: #1f2937; font-size: 14px; font-weight: bold; padding: 8px 0;">${quotedAmount}</td>
        </tr>
      </table>
    </div>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Please review the attached quote and let us know if you would like to proceed.
    </p>

    ${
      diagnosticNotice
        ? `
      <div style="margin: 20px 0; padding: 14px 16px; border-radius: 8px; background: #fff7ed; color: #7c2d12; font-size: 13px; line-height: 1.6;">
        <strong>Diagnostic Fee Notice:</strong> ${diagnosticNotice}
      </div>
    `
        : ""
    }

    <div style="text-align: center; margin: 20px 0 30px 0;">
      <a href="${acceptUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; margin: 0 8px;">
        Accept Quote
      </a>
      <a href="${rejectUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; margin: 0 8px;">
        Decline Quote
      </a>
    </div>

    ${termsSummaryHtml(termsUrl)}
  `;

  const text = `
Repair Quote - ${companyName}

Dear ${customerName},

We have completed the diagnostic on your device and prepared a quote for your approval.

Job Number: ${jobNumber}
Device: ${applianceBrand} ${applianceType}
Issue: ${issueDescription}
Estimated Cost: ${quotedAmount}

Please review the attached quote and let us know if you would like to proceed.

${diagnosticNotice ? `Diagnostic fee: ${diagnosticNotice}\n\n` : ""}
Accept: ${acceptUrl}
Decline: ${rejectUrl}

${termsSummaryText(termsUrl)}
  `;

  return {
    subject: `Repair Quote for Your Approval - ${jobNumber}`,
    html: emailLayout(content, companyName),
    text,
  };
}

// Diagnostic fee paid email template
export function diagnosticFeePaidEmail({
  customerName,
  jobNumber,
  diagnosticFeeAmount,
  companyName = "E-Repair Shop",
}: {
  customerName: string;
  jobNumber: string;
  diagnosticFeeAmount: number;
  companyName?: string;
}): { subject: string; html: string; text: string } {
  const termsUrl = getTermsUrl();
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(diagnosticFeeAmount);

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">
      Diagnostic Fee Payment Received
    </h2>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear ${customerName},
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      We have received your diagnostic fee payment for job ${jobNumber}.
    </p>

    <div style="background-color: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 0 0 30px 0; text-align: center;">
      <p style="color: #1e40af; font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">
        Diagnostic Fee Paid
      </p>
      <p style="color: #1e3a8a; font-size: 28px; margin: 0; font-weight: bold;">
        ${formattedAmount}
      </p>
    </div>

    <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
      If you choose to proceed with the repair, this fee will be credited toward the final invoice.
    </p>

    ${termsSummaryHtml(termsUrl)}
  `;

  const text = `
Diagnostic Fee Payment Received - ${companyName}

Dear ${customerName},

We have received your diagnostic fee payment for job ${jobNumber}.

Diagnostic Fee Paid: ${formattedAmount}

If you choose to proceed with the repair, this fee will be credited toward the final invoice.

${termsSummaryText(termsUrl)}
  `;

  return {
    subject: `Diagnostic Fee Payment Received - ${jobNumber}`,
    html: emailLayout(content, companyName),
    text,
  };
}
