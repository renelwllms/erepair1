import jsPDF from "jspdf";
import { format } from "date-fns";
import { readFile } from "fs/promises";
import { join } from "path";

interface QuoteData {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
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
    diagnosticResults?: string;
  };
  quoteItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  diagnosticFeeAmount?: number;
  notes?: string;
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

export async function generateQuotePDF(quoteData: QuoteData): Promise<jsPDF> {
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

  // Add logo if available
  if (quoteData.companyLogo) {
    try {
      let base64Logo = '';
      let logoFormat: LogoFormat | null = null;

      if (quoteData.companyLogo.startsWith('data:')) {
        // It's already base64
        base64Logo = quoteData.companyLogo;
        const mime = base64Logo.slice(5, base64Logo.indexOf(';')).toLowerCase();
        if (mime.includes("png")) {
          logoFormat = "PNG";
        } else if (mime.includes("jpeg") || mime.includes("jpg")) {
          logoFormat = "JPEG";
        }
      } else if (quoteData.companyLogo.startsWith('/')) {
        // It's a relative path, read from filesystem
        const logoPath = join(
          process.cwd(),
          'public',
          normalizeLocalPath(quoteData.companyLogo)
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
        const parsed = new URL(quoteData.companyLogo);
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
          const response = await fetch(quoteData.companyLogo);
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
          console.log("Logo skipped in quote PDF due to size:", approxBytes);
          yPosition += 10;
        } else {
          // Add image with aspect ratio preserved (jsPDF handles this automatically)
          // We set a max width and let jsPDF calculate the height
          const maxWidth = 50;
          const imageProps = doc.getImageProperties(base64Logo);
          const aspectRatio = imageProps.height / imageProps.width;
          const logoWidth = maxWidth;
          const logoHeight = maxWidth * aspectRatio;

          // Cap height if needed
          const maxHeight = 25;
          const finalWidth = logoHeight > maxHeight ? maxHeight / aspectRatio : logoWidth;
          const finalHeight = logoHeight > maxHeight ? maxHeight : logoHeight;

          doc.addImage(base64Logo, logoFormat, margin, yPosition, finalWidth, finalHeight, undefined, "FAST");
          yPosition += finalHeight + 5;
        }
      } else if (base64Logo && !logoFormat) {
        console.log("Logo skipped in quote PDF due to unsupported format.");
        yPosition += 10;
      } else {
        yPosition += 10;
      }
    } catch (error) {
      console.log("Error loading logo:", error);
      // Don't add company name text if logo fails, just skip
      yPosition += 10;
    }
  } else {
    // No logo provided, skip company name entirely
    yPosition += 10;
  }

  // Company Contact Information
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (quoteData.companyEmail) {
    doc.text(quoteData.companyEmail, margin, yPosition);
    yPosition += 5;
  }
  if (quoteData.companyPhone) {
    doc.text(quoteData.companyPhone, margin, yPosition);
    yPosition += 5;
  }
  if (quoteData.companyAddress) {
    doc.text(quoteData.companyAddress, margin, yPosition);
    yPosition += 10;
  } else {
    yPosition += 5;
  }

  // Quote Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 99, 235); // Blue color
  doc.text("QUOTE", pageWidth - margin, 20, { align: "right" });
  doc.setTextColor(0, 0, 0); // Reset to black

  // Quote Details (Right side)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let rightYPosition = 28;
  doc.text(`Quote #: ${quoteData.quoteNumber}`, pageWidth - margin, rightYPosition, { align: "right" });
  rightYPosition += 5;
  doc.text(`Date: ${format(new Date(quoteData.issueDate), "MMM dd, yyyy")}`, pageWidth - margin, rightYPosition, { align: "right" });
  rightYPosition += 5;
  doc.text(`Valid Until: ${format(new Date(quoteData.validUntil), "MMM dd, yyyy")}`, pageWidth - margin, rightYPosition, { align: "right" });
  rightYPosition += 5;
  doc.text(`Job #: ${quoteData.job.jobNumber}`, pageWidth - margin, rightYPosition, { align: "right" });

  yPosition += 10;

  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Quote For section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTE FOR:", margin, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${quoteData.customer.firstName} ${quoteData.customer.lastName}`, margin, yPosition);
  yPosition += 5;

  if (quoteData.customer.address) {
    doc.text(quoteData.customer.address, margin, yPosition);
    yPosition += 5;
    if (quoteData.customer.city) {
      doc.text(`${quoteData.customer.city}, ${quoteData.customer.state} ${quoteData.customer.zipCode}`, margin, yPosition);
      yPosition += 5;
    }
  }

  doc.text(quoteData.customer.email, margin, yPosition);
  yPosition += 5;
  doc.text(quoteData.customer.phone, margin, yPosition);
  yPosition += 10;

  // Job Details section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DEVICE INFORMATION:", margin, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const jobDetails = `${quoteData.job.applianceBrand} ${quoteData.job.applianceType}${quoteData.job.modelNumber ? ` (${quoteData.job.modelNumber})` : ""}`;
  doc.text(jobDetails, margin, yPosition);
  yPosition += 5;

  // Wrap issue description if too long
  const issueLines = doc.splitTextToSize(`Issue: ${quoteData.job.issueDescription}`, pageWidth - 2 * margin);
  doc.text(issueLines, margin, yPosition);
  yPosition += issueLines.length * 5 + 5;

  // Diagnostic results if available
  if (quoteData.job.diagnosticResults) {
    const diagnosticLines = doc.splitTextToSize(`Diagnostic: ${quoteData.job.diagnosticResults}`, pageWidth - 2 * margin);
    doc.text(diagnosticLines, margin, yPosition);
    yPosition += diagnosticLines.length * 5 + 5;
  }

  yPosition += 5;

  // Items Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Description", margin + 2, yPosition + 5);
  doc.text("Qty", pageWidth - 100, yPosition + 5);
  doc.text("Unit Price", pageWidth - 80, yPosition + 5);
  doc.text("Total", pageWidth - margin - 2, yPosition + 5, { align: "right" });
  yPosition += 8;

  // Items
  doc.setFont("helvetica", "normal");
  quoteData.quoteItems.forEach((item) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    const descLines = doc.splitTextToSize(item.description, pageWidth - 140);
    doc.text(descLines, margin + 2, yPosition + 4);
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
  doc.text(formatCurrency(quoteData.subtotal), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 6;

  doc.text(`GST (${quoteData.taxRate}%):`, totalsX, yPosition);
  doc.text(formatCurrency(quoteData.taxAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 6;

  // Total line
  doc.setDrawColor(0, 0, 0);
  doc.line(totalsX - 5, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", totalsX, yPosition);
  doc.text(formatCurrency(quoteData.totalAmount), pageWidth - margin - 2, yPosition, { align: "right" });
  yPosition += 15;

  if (typeof quoteData.diagnosticFeeAmount === "number" && quoteData.diagnosticFeeAmount > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Diagnostic Fee Notice:", margin, yPosition);
    yPosition += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const diagnosticNotice = `Diagnostic fee of ${formatCurrency(
      quoteData.diagnosticFeeAmount
    )} is non-refundable if repair is declined. If you approve the repair, this fee will be credited toward the final invoice.`;
    const diagnosticLines = doc.splitTextToSize(diagnosticNotice, pageWidth - 2 * margin);
    doc.text(diagnosticLines, margin, yPosition);
    yPosition += diagnosticLines.length * 4 + 5;
  }

  // Notes
  if (quoteData.notes) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("NOTES:", margin, yPosition);
    yPosition += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const notesLines = doc.splitTextToSize(quoteData.notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPosition);
    yPosition += notesLines.length * 4 + 5;
  }

  // Terms and Conditions
  if (quoteData.termsAndConditions) {
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
    const termsLines = doc.splitTextToSize(quoteData.termsAndConditions, pageWidth - 2 * margin);
    doc.text(termsLines, margin, yPosition);
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
  doc.text("This quote is valid for 30 days from the issue date.", pageWidth / 2, footerY, { align: "center" });

  return doc;
}
