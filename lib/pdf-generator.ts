import jsPDF from "jspdf";
import { format } from "date-fns";

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  job: {
    jobNumber: string;
    applianceType: string;
    applianceBrand: string;
    modelNumber?: string;
    issueDescription: string;
  };
  invoiceItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    itemType: string;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  notes?: string;
  paymentTerms?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
}

export function generateInvoicePDF(invoiceData: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Header - Company Name
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(invoiceData.companyName || "E-Repair Shop", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (invoiceData.companyEmail) {
    doc.text(invoiceData.companyEmail, margin, yPosition);
    yPosition += 5;
  }
  if (invoiceData.companyPhone) {
    doc.text(invoiceData.companyPhone, margin, yPosition);
    yPosition += 5;
  }
  if (invoiceData.companyAddress) {
    doc.text(invoiceData.companyAddress, margin, yPosition);
    yPosition += 10;
  } else {
    yPosition += 5;
  }

  // Invoice Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - margin, 20, { align: "right" });

  // Invoice Details (Right side)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let rightYPosition = 28;
  doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, pageWidth - margin, rightYPosition, { align: "right" });
  rightYPosition += 5;
  doc.text(`Issue Date: ${format(new Date(invoiceData.issueDate), "MMM dd, yyyy")}`, pageWidth - margin, rightYPosition, { align: "right" });
  rightYPosition += 5;
  doc.text(`Due Date: ${format(new Date(invoiceData.dueDate), "MMM dd, yyyy")}`, pageWidth - margin, rightYPosition, { align: "right" });
  rightYPosition += 5;
  doc.text(`Job #: ${invoiceData.job.jobNumber}`, pageWidth - margin, rightYPosition, { align: "right" });

  yPosition += 10;

  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Bill To section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", margin, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${invoiceData.customer.firstName} ${invoiceData.customer.lastName}`, margin, yPosition);
  yPosition += 5;

  if (invoiceData.customer.address) {
    doc.text(invoiceData.customer.address, margin, yPosition);
    yPosition += 5;
    if (invoiceData.customer.city) {
      doc.text(`${invoiceData.customer.city}, ${invoiceData.customer.state} ${invoiceData.customer.zipCode}`, margin, yPosition);
      yPosition += 5;
    }
  }

  doc.text(invoiceData.customer.email, margin, yPosition);
  yPosition += 5;
  doc.text(invoiceData.customer.phone, margin, yPosition);
  yPosition += 10;

  // Job Details section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("JOB DETAILS:", margin, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const jobDetails = `${invoiceData.job.applianceBrand} ${invoiceData.job.applianceType}${invoiceData.job.modelNumber ? ` (${invoiceData.job.modelNumber})` : ""}`;
  doc.text(jobDetails, margin, yPosition);
  yPosition += 5;

  // Wrap issue description if too long
  const issueLines = doc.splitTextToSize(`Issue: ${invoiceData.job.issueDescription}`, pageWidth - 2 * margin);
  doc.text(issueLines, margin, yPosition);
  yPosition += issueLines.length * 5 + 10;

  // Items Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Description", margin + 2, yPosition + 5);
  doc.text("Type", pageWidth - 140, yPosition + 5);
  doc.text("Qty", pageWidth - 100, yPosition + 5);
  doc.text("Unit Price", pageWidth - 80, yPosition + 5);
  doc.text("Total", pageWidth - margin - 2, yPosition + 5, { align: "right" });
  yPosition += 8;

  // Items
  doc.setFont("helvetica", "normal");
  invoiceData.invoiceItems.forEach((item) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    const descLines = doc.splitTextToSize(item.description, pageWidth - 180);
    doc.text(descLines, margin + 2, yPosition + 4);
    doc.text(item.itemType, pageWidth - 140, yPosition + 4);
    doc.text(item.quantity.toString(), pageWidth - 100, yPosition + 4);
    doc.text(formatCurrency(item.unitPrice), pageWidth - 80, yPosition + 4);
    doc.text(formatCurrency(item.totalPrice), pageWidth - margin - 2, yPosition + 4, { align: "right" });

    const lineHeight = Math.max(descLines.length * 5, 6);
    yPosition += lineHeight;

    // Draw line separator
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 2;
  });

  yPosition += 5;

  // Totals section
  const totalsX = pageWidth - 80;
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX, yPosition);
  doc.text(formatCurrency(invoiceData.subtotal), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 6;

  doc.text(`Tax (${invoiceData.taxRate}%):`, totalsX, yPosition);
  doc.text(formatCurrency(invoiceData.taxAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 6;

  if (invoiceData.discountAmount > 0) {
    doc.text("Discount:", totalsX, yPosition);
    doc.text(`-${formatCurrency(invoiceData.discountAmount)}`, pageWidth - margin - 2, yPosition, { align: "right" });
    yPosition += 6;
  }

  // Total line
  doc.setDrawColor(0, 0, 0);
  doc.line(totalsX - 5, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", totalsX, yPosition);
  doc.text(formatCurrency(invoiceData.totalAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Paid:", totalsX, yPosition);
  doc.setTextColor(0, 128, 0);
  doc.text(formatCurrency(invoiceData.paidAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 6;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Balance Due:", totalsX, yPosition);
  doc.setTextColor(255, 100, 0);
  doc.text(formatCurrency(invoiceData.balanceAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  doc.setTextColor(0, 0, 0);
  yPosition += 15;

  // Payment Terms and Notes
  if (invoiceData.paymentTerms || invoiceData.notes) {
    // Check if we need a new page
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    if (invoiceData.paymentTerms) {
      doc.setFont("helvetica", "bold");
      doc.text("Payment Terms:", margin, yPosition);
      yPosition += 5;
      doc.setFont("helvetica", "normal");
      const termsLines = doc.splitTextToSize(invoiceData.paymentTerms, pageWidth - 2 * margin);
      doc.text(termsLines, margin, yPosition);
      yPosition += termsLines.length * 4 + 5;
    }

    if (invoiceData.notes) {
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", margin, yPosition);
      yPosition += 5;
      doc.setFont("helvetica", "normal");
      const notesLines = doc.splitTextToSize(invoiceData.notes, pageWidth - 2 * margin);
      doc.text(notesLines, margin, yPosition);
    }
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

  return doc;
}
