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
  termsAndConditions?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogo?: string;
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<jsPDF> {
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

  // Company Header Section - Two Column Layout
  const leftColumnX = margin;
  const rightColumnX = pageWidth - margin;
  let leftYPosition = yPosition;
  let rightYPosition = yPosition;

  // LEFT SIDE: Logo and Company Info
  if (invoiceData.companyLogo) {
    try {
      const logoWidth = 50;
      const logoHeight = 16;

      if (invoiceData.companyLogo.startsWith('data:')) {
        doc.addImage(invoiceData.companyLogo, "PNG", leftColumnX, leftYPosition, logoWidth, logoHeight);
      } else {
        const response = await fetch(invoiceData.companyLogo);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();

          await new Promise<void>((resolve) => {
            reader.onloadend = () => {
              const base64data = reader.result as string;
              doc.addImage(base64data, "PNG", leftColumnX, leftYPosition, logoWidth, logoHeight);
              resolve();
            };
            reader.readAsDataURL(blob);
          });
        }
      }
      leftYPosition += logoHeight + 3;
    } catch (error) {
      console.log("Error loading logo:", error);
    }
  } else if (invoiceData.companyName) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(invoiceData.companyName, leftColumnX, leftYPosition);
    leftYPosition += 8;
  }

  // Company Contact Information
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (invoiceData.companyEmail) {
    doc.text(invoiceData.companyEmail, leftColumnX, leftYPosition);
    leftYPosition += 4;
  }
  if (invoiceData.companyPhone) {
    doc.text(invoiceData.companyPhone, leftColumnX, leftYPosition);
    leftYPosition += 4;
  }
  if (invoiceData.companyAddress) {
    const addressLines = doc.splitTextToSize(invoiceData.companyAddress, 80);
    doc.text(addressLines, leftColumnX, leftYPosition);
    leftYPosition += addressLines.length * 4;
  }

  // RIGHT SIDE: Invoice Title and Details
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", rightColumnX, rightYPosition, { align: "right" });
  rightYPosition += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  doc.setFont("helvetica", "bold");
  doc.text("Invoice #:", rightColumnX - 35, rightYPosition);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceData.invoiceNumber, rightColumnX, rightYPosition, { align: "right" });
  rightYPosition += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Issue Date:", rightColumnX - 35, rightYPosition);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(invoiceData.issueDate), "MMM dd, yyyy"), rightColumnX, rightYPosition, { align: "right" });
  rightYPosition += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Due Date:", rightColumnX - 35, rightYPosition);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(invoiceData.dueDate), "MMM dd, yyyy"), rightColumnX, rightYPosition, { align: "right" });
  rightYPosition += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Job #:", rightColumnX - 35, rightYPosition);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceData.job.jobNumber, rightColumnX, rightYPosition, { align: "right" });

  // Set yPosition to the lower of the two columns
  yPosition = Math.max(leftYPosition, rightYPosition) + 10;

  // Horizontal line separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Bill To section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("BILL TO", margin, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${invoiceData.customer.firstName} ${invoiceData.customer.lastName}`, margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (invoiceData.customer.address) {
    doc.text(invoiceData.customer.address, margin, yPosition);
    yPosition += 4;
    if (invoiceData.customer.city) {
      doc.text(`${invoiceData.customer.city}, ${invoiceData.customer.state} ${invoiceData.customer.zipCode}`, margin, yPosition);
      yPosition += 4;
    }
  }

  doc.text(invoiceData.customer.email, margin, yPosition);
  yPosition += 4;
  doc.text(invoiceData.customer.phone, margin, yPosition);
  yPosition += 10;

  // Job Details section with background
  doc.setFillColor(249, 250, 251);
  const jobBoxHeight = 18;
  doc.rect(margin, yPosition, pageWidth - 2 * margin, jobBoxHeight, "F");

  yPosition += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Job Details", margin + 3, yPosition);
  yPosition += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const jobDetails = `Appliance: ${invoiceData.job.applianceBrand} ${invoiceData.job.applianceType}${invoiceData.job.modelNumber ? ` (${invoiceData.job.modelNumber})` : ""}`;
  doc.text(jobDetails, margin + 3, yPosition);
  yPosition += 4;

  const issueText = `Issue: ${invoiceData.job.issueDescription}`;
  const issueLines = doc.splitTextToSize(issueText, pageWidth - 2 * margin - 6);
  doc.text(issueLines, margin + 3, yPosition);
  yPosition += Math.max(issueLines.length * 4, 4) + 8;

  // Items section header
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Items", margin, yPosition);
  yPosition += 6;

  // Items Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 7, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Description", margin + 2, yPosition + 5);
  doc.text("Type", pageWidth - 130, yPosition + 5);
  doc.text("Qty", pageWidth - 90, yPosition + 5);
  doc.text("Unit Price", pageWidth - 70, yPosition + 5);
  doc.text("Total", pageWidth - margin - 2, yPosition + 5, { align: "right" });
  yPosition += 7;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  invoiceData.invoiceItems.forEach((item, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    const descLines = doc.splitTextToSize(item.description, 90);
    doc.text(descLines, margin + 2, yPosition + 4);

    // Type badge
    doc.setFillColor(240, 240, 240);
    const typeWidth = doc.getTextWidth(item.itemType) + 4;
    doc.roundedRect(pageWidth - 135, yPosition + 0.5, typeWidth, 5, 1, 1, "F");
    doc.text(item.itemType, pageWidth - 133, yPosition + 4);

    doc.text(item.quantity.toString(), pageWidth - 90, yPosition + 4, { align: "center" });
    doc.text(formatCurrency(item.unitPrice), pageWidth - 70, yPosition + 4);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(item.totalPrice), pageWidth - margin - 2, yPosition + 4, { align: "right" });
    doc.setFont("helvetica", "normal");

    const lineHeight = Math.max(descLines.length * 4, 6);
    yPosition += lineHeight;

    // Draw line separator
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 2;
  });

  yPosition += 8;

  // Totals section - right aligned in a box
  const totalsBoxX = pageWidth - 85;
  const totalsBoxWidth = 65;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  doc.text("Subtotal:", totalsBoxX, yPosition);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(invoiceData.subtotal), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Tax (${invoiceData.taxRate}%):`, totalsBoxX, yPosition);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(invoiceData.taxAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 5;

  if (invoiceData.discountAmount > 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Discount:", totalsBoxX, yPosition);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(`-${formatCurrency(invoiceData.discountAmount)}`, pageWidth - margin - 2, yPosition, { align: "right" });
    doc.setTextColor(0, 0, 0);
    yPosition += 5;
  }

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(totalsBoxX - 2, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Total:", totalsBoxX, yPosition);
  doc.text(formatCurrency(invoiceData.totalAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 6;

  // Paid amount
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Paid:", totalsBoxX, yPosition);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrency(invoiceData.paidAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 6;

  // Balance Due
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(234, 88, 12);
  doc.text("Balance Due:", totalsBoxX, yPosition);
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

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFontSize(8);

    if (invoiceData.paymentTerms) {
      doc.setFont("helvetica", "bold");
      doc.text("Payment Terms", margin, yPosition);
      yPosition += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const termsLines = doc.splitTextToSize(invoiceData.paymentTerms, pageWidth - 2 * margin);
      doc.text(termsLines, margin, yPosition);
      yPosition += termsLines.length * 3.5 + 4;
      doc.setTextColor(0, 0, 0);
    }

    if (invoiceData.notes) {
      doc.setFont("helvetica", "bold");
      doc.text("Notes", margin, yPosition);
      yPosition += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const notesLines = doc.splitTextToSize(invoiceData.notes, pageWidth - 2 * margin);
      doc.text(notesLines, margin, yPosition);
      yPosition += notesLines.length * 3.5;
      doc.setTextColor(0, 0, 0);
    }
  }

  // Terms and Conditions
  if (invoiceData.termsAndConditions) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    yPosition += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("TERMS AND CONDITIONS", margin, yPosition);
    yPosition += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const termsLines = doc.splitTextToSize(invoiceData.termsAndConditions, pageWidth - 2 * margin);

    // Check if terms will fit on current page
    const termsHeight = termsLines.length * 4;
    if (yPosition + termsHeight > pageHeight - 25) {
      doc.addPage();
      yPosition = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TERMS AND CONDITIONS (continued)", margin, yPosition);
      yPosition += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }

    doc.text(termsLines, margin, yPosition);
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

  return doc;
}
