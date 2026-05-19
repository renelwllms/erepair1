import jsPDF from "jspdf";
import { format } from "date-fns";
import { readFile } from "fs/promises";
import { join } from "path";

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

type LogoFormat = "PNG" | "JPEG";

const normalizeLocalPath = (value: string) => {
  const withoutHash = value.split("#")[0] ?? value;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  return withoutQuery;
};

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let yPosition = margin;
  const normalizedPaymentTerms = invoiceData.paymentTerms?.trim();

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
  const rightLabelX = pageWidth - 82;
  const rightValueX = pageWidth - margin;
  const rightValueWidth = 48;
  let leftYPosition = yPosition;
  let rightYPosition = yPosition;

  // LEFT SIDE: Logo and Company Info
  if (invoiceData.companyLogo) {
    try {
      let base64Logo = '';
      let logoFormat: LogoFormat | null = null;

      if (invoiceData.companyLogo.startsWith('data:')) {
        base64Logo = invoiceData.companyLogo;
        const mime = base64Logo.slice(5, base64Logo.indexOf(';')).toLowerCase();
        if (mime.includes("png")) {
          logoFormat = "PNG";
        } else if (mime.includes("jpeg") || mime.includes("jpg")) {
          logoFormat = "JPEG";
        }
      } else if (invoiceData.companyLogo.startsWith('/')) {
        // It's a relative path, read from filesystem
        const logoPath = join(
          process.cwd(),
          'public',
          normalizeLocalPath(invoiceData.companyLogo)
        );
        const logoBuffer = await readFile(logoPath);
        const ext = logoPath.split(".").pop()?.toLowerCase();
        if (ext === "png") {
          base64Logo = `data:image/png;base64,${logoBuffer.toString('base64')}`;
          logoFormat = "PNG";
        } else if (ext === "jpg" || ext === "jpeg") {
          base64Logo = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
          logoFormat = "JPEG";
        }
      } else {
        // It's a full URL, fetch it
        const parsed = new URL(invoiceData.companyLogo);
        if (parsed.pathname.startsWith("/uploads/")) {
          const logoPath = join(process.cwd(), "public", normalizeLocalPath(parsed.pathname));
          const logoBuffer = await readFile(logoPath);
          const ext = logoPath.split(".").pop()?.toLowerCase();
          if (ext === "png") {
            base64Logo = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            logoFormat = "PNG";
          } else if (ext === "jpg" || ext === "jpeg") {
            base64Logo = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
            logoFormat = "JPEG";
          }
        } else {
          const response = await fetch(invoiceData.companyLogo);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const contentType = response.headers.get("content-type")?.toLowerCase() || "";
            if (contentType.includes("png")) {
              base64Logo = `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
              logoFormat = "PNG";
            } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
              base64Logo = `data:image/jpeg;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
              logoFormat = "JPEG";
            }
          }
        }
      }

      if (base64Logo && logoFormat) {
        // Skip oversized logos to keep PDFs small
        const base64Data = base64Logo.startsWith("data:")
          ? base64Logo.split(",")[1] || ""
          : base64Logo;
        const approxBytes = Math.ceil(base64Data.length * 0.75);
        const maxLogoBytes = 350 * 1024;

        if (approxBytes > maxLogoBytes) {
          console.log("Logo skipped in invoice PDF due to size:", approxBytes);
        } else {
          // Get image properties and calculate dimensions maintaining aspect ratio
          const maxWidth = 40;
          const imageProps = doc.getImageProperties(base64Logo);
          const aspectRatio = imageProps.height / imageProps.width;
          const logoWidth = maxWidth;
          const logoHeight = maxWidth * aspectRatio;

          // Cap height if needed
          const maxHeight = 16;
          const finalWidth = logoHeight > maxHeight ? maxHeight / aspectRatio : logoWidth;
          const finalHeight = logoHeight > maxHeight ? maxHeight : logoHeight;

          doc.addImage(base64Logo, logoFormat, leftColumnX, leftYPosition, finalWidth, finalHeight, undefined, "FAST");
          leftYPosition += finalHeight + 3;
        }
      } else if (base64Logo && !logoFormat) {
        console.log("Logo skipped in invoice PDF due to unsupported format.");
      }
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
  doc.setFontSize(8);
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
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", rightColumnX, rightYPosition, { align: "right" });
  rightYPosition += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  const addHeaderRow = (label: string, value: string) => {
    const valueLines = doc.splitTextToSize(value, rightValueWidth);
    doc.setFont("helvetica", "bold");
    doc.text(label, rightLabelX, rightYPosition);
    doc.setFont("helvetica", "normal");
    doc.text(valueLines, rightValueX, rightYPosition, { align: "right" });
    rightYPosition += Math.max(valueLines.length * 3.8, 4.5) + 1.2;
  };

  addHeaderRow("Invoice #:", invoiceData.invoiceNumber);
  addHeaderRow("Issue Date:", format(new Date(invoiceData.issueDate), "MMM dd, yyyy"));
  addHeaderRow(
    normalizedPaymentTerms ? "Payment:" : "Due Date:",
    normalizedPaymentTerms || format(new Date(invoiceData.dueDate), "MMM dd, yyyy")
  );
  addHeaderRow("Job #:", invoiceData.job.jobNumber);

  // Set yPosition to the lower of the two columns
  yPosition = Math.max(leftYPosition, rightYPosition) + 6;

  // Horizontal line separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // Bill To section
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("BILL TO", margin, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${invoiceData.customer.firstName} ${invoiceData.customer.lastName}`, margin, yPosition);
  yPosition += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
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
  yPosition += 6;

  // Job Details section with background
  doc.setFillColor(249, 250, 251);
  const jobBoxHeight = 15;
  doc.rect(margin, yPosition, pageWidth - 2 * margin, jobBoxHeight, "F");

  yPosition += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Job Details", margin + 3, yPosition);
  yPosition += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  const jobDetails = `Appliance: ${invoiceData.job.applianceBrand} ${invoiceData.job.applianceType}${invoiceData.job.modelNumber ? ` (${invoiceData.job.modelNumber})` : ""}`;
  doc.text(jobDetails, margin + 3, yPosition);
  yPosition += 4;

  const issueText = `Issue: ${invoiceData.job.issueDescription}`;
  const issueLines = doc.splitTextToSize(issueText, pageWidth - 2 * margin - 6);
  doc.text(issueLines, margin + 3, yPosition);
  yPosition += Math.max(issueLines.length * 3.5, 3.5) + 5;

  // Items section header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Items", margin, yPosition);
  yPosition += 6;

  // Items Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 6, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Description", margin + 2, yPosition + 4.2);
  doc.text("Type", pageWidth - 126, yPosition + 4.2);
  doc.text("Qty", pageWidth - 88, yPosition + 4.2);
  doc.text("Unit Price", pageWidth - 68, yPosition + 4.2);
  doc.text("Total", pageWidth - margin - 2, yPosition + 4.2, { align: "right" });
  yPosition += 6;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  invoiceData.invoiceItems.forEach((item, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 48) {
      doc.addPage();
      yPosition = margin;
    }

    const descLines = doc.splitTextToSize(item.description, 92);
    doc.text(descLines, margin + 2, yPosition + 3.5);

    // Type badge
    doc.setFillColor(240, 240, 240);
    const typeWidth = doc.getTextWidth(item.itemType) + 4;
    doc.roundedRect(pageWidth - 131, yPosition + 0.5, typeWidth, 4.5, 1, 1, "F");
    doc.text(item.itemType, pageWidth - 129, yPosition + 3.5);

    doc.text(item.quantity.toString(), pageWidth - 88, yPosition + 3.5, { align: "center" });
    doc.text(formatCurrency(item.unitPrice), pageWidth - 68, yPosition + 3.5);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(item.totalPrice), pageWidth - margin - 2, yPosition + 3.5, { align: "right" });
    doc.setFont("helvetica", "normal");

    const lineHeight = Math.max(descLines.length * 3.5, 5);
    yPosition += lineHeight;

    // Draw line separator
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 2;
  });

  yPosition += 4;

  // Totals section - right aligned in a box
  const totalsBoxX = pageWidth - 78;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  doc.text("Subtotal:", totalsBoxX, yPosition);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(invoiceData.subtotal), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Tax (${invoiceData.taxRate}%):`, totalsBoxX, yPosition);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(invoiceData.taxAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 4.5;

  if (invoiceData.discountAmount > 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Discount:", totalsBoxX, yPosition);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(`-${formatCurrency(invoiceData.discountAmount)}`, pageWidth - margin - 2, yPosition, { align: "right" });
    doc.setTextColor(0, 0, 0);
    yPosition += 4.5;
  }

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(totalsBoxX - 2, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Total:", totalsBoxX, yPosition);
  doc.text(formatCurrency(invoiceData.totalAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 5;

  // Paid amount
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Paid:", totalsBoxX, yPosition);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrency(invoiceData.paidAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 5;

  // Balance Due
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(234, 88, 12);
  doc.text("Balance Due:", totalsBoxX, yPosition);
  doc.text(formatCurrency(invoiceData.balanceAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  doc.setTextColor(0, 0, 0);
  yPosition += 8;

  // Payment Terms and Notes
  if (invoiceData.notes) {
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

    doc.setFontSize(7.5);

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

  // Footer
  const footerY = pageHeight - 15;
  const termsUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/terms-and-conditions`
    : "/terms-and-conditions";
  const termsSummary =
    "Terms Summary: Inspection fees are non-refundable if repair is declined. Customer data must be backed up. " +
    "3-month warranty excludes liquid/physical damage and glass replacements. No warranty on liquid damage repairs. " +
    "Devices must be collected within 4 weeks. NZ Consumer Guarantees Act applies.";

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const summaryLines = doc.splitTextToSize(termsSummary, pageWidth - 2 * margin);
  const summaryStartY = footerY - 6 - summaryLines.length * 3.5;
  doc.text(summaryLines, margin, summaryStartY);
  doc.text(`Full Terms: ${termsUrl}`, margin, footerY - 4);

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

  return doc;
}
