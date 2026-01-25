import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultTemplates = [
  {
    name: "job_created",
    subject: "New Repair Job Created - {{jobNumber}}",
    body: `<h2>New Repair Job Created</h2>
<p>Dear {{customerName}},</p>
<p>Your repair job has been created successfully.</p>
<p><strong>Job Number:</strong> {{jobNumber}}<br>
<strong>Device:</strong> {{deviceType}}<br>
<strong>Issue:</strong> {{issueDescription}}<br>
<strong>Status:</strong> {{status}}</p>
<p>We will keep you updated on the progress of your repair.</p>
<p>Best regards,<br>{{companyName}}</p>`,
    description: "Sent when a new job is created",
    isActive: true,
  },
  {
    name: "job_status_updated",
    subject: "Job Status Update - {{jobNumber}}",
    body: `<h2>Job Status Update</h2>
<p>Dear {{customerName}},</p>
<p>The status of your repair job has been updated.</p>
<p><strong>Job Number:</strong> {{jobNumber}}<br>
<strong>New Status:</strong> {{status}}<br>
<strong>Device:</strong> {{deviceType}}</p>
<p>{{statusMessage}}</p>
<p>Best regards,<br>{{companyName}}</p>`,
    description: "Sent when job status changes",
    isActive: true,
  },
  {
    name: "job_completed",
    subject: "Your Repair is Complete - {{jobNumber}}",
    body: `<h2>Repair Completed!</h2>
<p>Dear {{customerName}},</p>
<p>Great news! Your repair has been completed.</p>
<p><strong>Job Number:</strong> {{jobNumber}}<br>
<strong>Device:</strong> {{deviceType}}<br>
<strong>Total Cost:</strong> {{totalCost}}</p>
<p>Your device is ready for pickup. Please bring your job number when collecting.</p>
<p>Best regards,<br>{{companyName}}</p>`,
    description: "Sent when job is completed",
    isActive: true,
  },
  {
    name: "quote_sent",
    subject: "Repair Quote - {{jobNumber}}",
    body: `<h2>Repair Quote</h2>
<p>Dear {{customerName}},</p>
<p>We have prepared a quote for your repair.</p>
<p><strong>Job Number:</strong> {{jobNumber}}<br>
<strong>Device:</strong> {{deviceType}}<br>
<strong>Quoted Amount:</strong> {{quoteAmount}}</p>
<p><strong>Quote Details:</strong><br>{{quoteDetails}}</p>
<p>Please review and approve the quote to proceed with the repair.</p>
<p><a href="{{approveLink}}">Approve Quote</a></p>
<p>Best regards,<br>{{companyName}}</p>`,
    description: "Sent when a quote is provided",
    isActive: true,
  },
  {
    name: "invoice_sent",
    subject: "Invoice - {{invoiceNumber}}",
    body: `<h2>Invoice</h2>
<p>Dear {{customerName}},</p>
<p>Please find your invoice attached.</p>
<p><strong>Invoice Number:</strong> {{invoiceNumber}}<br>
<strong>Job Number:</strong> {{jobNumber}}<br>
<strong>Total Amount:</strong> {{totalAmount}}<br>
<strong>Amount Paid:</strong> {{amountPaid}}<br>
<strong>Balance Due:</strong> {{balanceDue}}</p>
<p>{{paymentInstructions}}</p>
<p>Best regards,<br>{{companyName}}</p>`,
    description: "Sent with invoices",
    isActive: true,
  },
  {
    name: "payment_received",
    subject: "Payment Received - {{invoiceNumber}}",
    body: `<h2>Payment Confirmation</h2>
<p>Dear {{customerName}},</p>
<p>Thank you! We have received your payment.</p>
<p><strong>Invoice Number:</strong> {{invoiceNumber}}<br>
<strong>Amount Paid:</strong> {{amountPaid}}<br>
<strong>Payment Method:</strong> {{paymentMethod}}<br>
<strong>Date:</strong> {{paymentDate}}</p>
<p>{{remainingBalance}}</p>
<p>Best regards,<br>{{companyName}}</p>`,
    description: "Sent when payment is received",
    isActive: true,
  },
];

async function seedEmailTemplates() {
  console.log("Seeding email templates...");

  for (const template of defaultTemplates) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: template.name },
    });

    if (existing) {
      console.log(`Template "${template.name}" already exists, skipping...`);
      continue;
    }

    await prisma.emailTemplate.create({
      data: template,
    });

    console.log(`Created template: ${template.name}`);
  }

  console.log("Email templates seeded successfully!");
}

seedEmailTemplates()
  .catch((e) => {
    console.error("Error seeding templates:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
