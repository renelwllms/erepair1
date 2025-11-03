import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultTemplates = [
  {
    name: "JOB_OPEN",
    subject: "New Repair Job Created - {{jobNumber}}",
    description: "Sent when a job is created with status OPEN",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Repair Job Created</h2>
        <p>Dear {{customerName}},</p>
        <p>We have received your repair request. Here are the details:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Job Number:</strong> {{jobNumber}}</p>
          <p><strong>Device:</strong> {{applianceBrand}} {{applianceType}}</p>
          <p><strong>Issue:</strong> {{issueDescription}}</p>
        </p>
        <p>Our team will review your request and contact you shortly.</p>
        <p>Best regards,<br>{{companyName}}</p>
      </div>
    `,
    isActive: true,
  },
  {
    name: "JOB_IN_PROGRESS",
    subject: "Your Repair is In Progress - {{jobNumber}}",
    description: "Sent when job status changes to IN_PROGRESS",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Repair In Progress</h2>
        <p>Dear {{customerName}},</p>
        <p>Good news! We have started working on your repair.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Job Number:</strong> {{jobNumber}}</p>
          <p><strong>Device:</strong> {{applianceBrand}} {{applianceType}}</p>
          <p><strong>Status:</strong> In Progress</p>
        </div>
        <p>We'll keep you updated on the progress.</p>
        <p>Best regards,<br>{{companyName}}</p>
      </div>
    `,
    isActive: true,
  },
  {
    name: "QUOTE_SENT",
    subject: "Repair Quote for Your Approval - {{jobNumber}}",
    description: "Sent when a quote is sent to customer",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Repair Quote</h2>
        <p>Dear {{customerName}},</p>
        <p>We have completed the diagnostic on your device and prepared a quote for your approval.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Job Number:</strong> {{jobNumber}}</p>
          <p><strong>Device:</strong> {{applianceBrand}} {{applianceType}}</p>
          <p><strong>Estimated Cost:</strong> {{quotedAmount}}</p>
        </div>
        <p>Please review the attached quote and let us know if you would like to proceed.</p>
        <p>Best regards,<br>{{companyName}}</p>
      </div>
    `,
    isActive: true,
  },
  {
    name: "AWAITING_PARTS",
    subject: "Waiting for Parts - {{jobNumber}}",
    description: "Sent when job status changes to AWAITING_PARTS",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Awaiting Parts</h2>
        <p>Dear {{customerName}},</p>
        <p>We have diagnosed your device and are now waiting for replacement parts to arrive.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Job Number:</strong> {{jobNumber}}</p>
          <p><strong>Device:</strong> {{applianceBrand}} {{applianceType}}</p>
          <p><strong>Status:</strong> Awaiting Parts</p>
        </div>
        <p>We'll notify you once the parts arrive and we resume the repair.</p>
        <p>Best regards,<br>{{companyName}}</p>
      </div>
    `,
    isActive: true,
  },
  {
    name: "READY_FOR_PICKUP",
    subject: "Your Repair is Complete - Ready for Pickup - {{jobNumber}}",
    description: "Sent when job status changes to READY_FOR_PICKUP",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Repair Complete!</h2>
        <p>Dear {{customerName}},</p>
        <p>Great news! Your device repair is complete and ready for pickup.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Job Number:</strong> {{jobNumber}}</p>
          <p><strong>Device:</strong> {{applianceBrand}} {{applianceType}}</p>
          <p><strong>Status:</strong> Ready for Pickup</p>
        </div>
        <p>Please contact us to arrange pickup at your earliest convenience.</p>
        <p>Best regards,<br>{{companyName}}</p>
      </div>
    `,
    isActive: true,
  },
  {
    name: "JOB_CLOSED",
    subject: "Repair Job Completed - {{jobNumber}}",
    description: "Sent when job status changes to CLOSED",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Job Completed</h2>
        <p>Dear {{customerName}},</p>
        <p>Your repair job has been completed and closed.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Job Number:</strong> {{jobNumber}}</p>
          <p><strong>Device:</strong> {{applianceBrand}} {{applianceType}}</p>
          <p><strong>Status:</strong> Completed</p>
        </div>
        <p>Thank you for trusting us with your repair!</p>
        <p>Best regards,<br>{{companyName}}</p>
      </div>
    `,
    isActive: true,
  },
  {
    name: "CUSTOMER_CANCELLED",
    subject: "Repair Job Cancelled - {{jobNumber}}",
    description: "Sent when job status changes to CANCELLED",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Job Cancelled</h2>
        <p>Dear {{customerName}},</p>
        <p>Your repair job has been cancelled as requested.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Job Number:</strong> {{jobNumber}}</p>
          <p><strong>Device:</strong> {{applianceBrand}} {{applianceType}}</p>
          <p><strong>Status:</strong> Cancelled</p>
        </div>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>{{companyName}}</p>
      </div>
    `,
    isActive: true,
  },
];

async function main() {
  console.log("Seeding email templates...");

  for (const template of defaultTemplates) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: template.name },
    });

    if (existing) {
      console.log(`Updating template: ${template.name}`);
      await prisma.emailTemplate.update({
        where: { name: template.name },
        data: template,
      });
    } else {
      console.log(`Creating template: ${template.name}`);
      await prisma.emailTemplate.create({
        data: template,
      });
    }
  }

  console.log("Email templates seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
