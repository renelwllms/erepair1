"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Download,
  Mail,
  Edit,
  Trash2,
  DollarSign,
  FileText,
  Printer,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { normalizePaymentTerms } from "@/lib/payment-terms";
import { TermsSummary } from "@/components/legal/terms-summary";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemType: string;
}

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
}

interface Refund {
  id: string;
  amount: number;
  refundMethod: string;
  refundDate: string;
  reason: string;
  referenceNumber?: string | null;
  payoutStatus?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  notes?: string;
  paymentTerms?: string;
  customer: {
    id: string;
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
    id: string;
    jobNumber: string;
    isCallout?: boolean;
    calloutFee?: number | null;
    diagnosticFeeAmount?: number;
    diagnosticFeePaid?: boolean;
    applianceType: string;
    applianceBrand: string;
    modelNumber?: string;
    issueDescription: string;
    status: string;
  };
  issuedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  invoiceItems: InvoiceItem[];
  payments: Payment[];
  refunds: Refund[];
}

interface CompanySettings {
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogo?: string;
}

interface SessionInfo {
  user?: {
    role?: string;
  };
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [showRefundTools, setShowRefundTools] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Refund form state
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split("T")[0]);
  const [refundReferenceNumber, setRefundReferenceNumber] = useState("");
  const [refundPayoutStatus, setRefundPayoutStatus] = useState("COMPLETED");

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const [invoiceResponse, settingsResponse] = await Promise.all([
        fetch(`/api/invoices/${params.id}`),
        fetch('/api/public/settings')
      ]);

      if (!invoiceResponse.ok) throw new Error("Failed to fetch invoice");

      const invoiceData = await invoiceResponse.json();
      setInvoice(invoiceData);

      // Fetch company settings for print view
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setCompanySettings(settingsData);
      }

      const sessionResponse = await fetch("/api/auth/session");
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSessionInfo(sessionData);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
      router.push("/invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ");
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    const statusMap: Record<string, "default" | "secondary" | "destructive"> = {
      DRAFT: "secondary",
      SENT: "default",
      PARTIALLY_PAID: "default",
      PAID: "secondary",
      OVERDUE: "destructive",
      CANCELLED: "destructive",
    };
    return statusMap[status] || "default";
  };

  const calculateRefundSummary = (currentInvoice: Invoice) => {
    const totalRefunded = (currentInvoice.refunds || []).reduce(
      (sum, refund) => sum + refund.amount,
      0
    );
    const nonRefundableDiagnosticFee =
      currentInvoice.job.diagnosticFeePaid && currentInvoice.job.diagnosticFeeAmount
        ? currentInvoice.job.diagnosticFeeAmount
        : 0;
    const nonRefundableCalloutFee = currentInvoice.job.isCallout
      ? currentInvoice.job.calloutFee || 0
      : 0;
    const refundableInvoiceAmount = Math.max(
      0,
      currentInvoice.totalAmount -
        nonRefundableDiagnosticFee -
        nonRefundableCalloutFee
    );
    const maximumRefundableAmount = Math.max(
      0,
      Math.min(
        currentInvoice.paidAmount - totalRefunded,
        refundableInvoiceAmount - totalRefunded
      )
    );
    const totalPaidDisplay =
      currentInvoice.paidAmount + nonRefundableDiagnosticFee;
    const netPaid = Math.max(0, currentInvoice.paidAmount - totalRefunded);

    return {
      totalPaidDisplay,
      totalRefunded,
      netPaid,
      nonRefundableDiagnosticFee,
      nonRefundableCalloutFee,
      refundableInvoiceAmount,
      maximumRefundableAmount,
    };
  };

  const getRefundUnavailableReason = (currentInvoice: Invoice) => {
    const summary = calculateRefundSummary(currentInvoice);

    if (!(sessionInfo?.user?.role === "ADMIN" || sessionInfo?.user?.role === "TECHNICIAN")) {
      return "Only admins and technicians can record refunds.";
    }

    if (currentInvoice.status === "CANCELLED") {
      return "Cancelled invoices cannot be refunded.";
    }

    if (summary.netPaid <= 0) {
      return "There is no paid amount left to refund.";
    }

    if (summary.refundableInvoiceAmount <= summary.totalRefunded) {
      return "All refundable invoice value has already been refunded. Diagnostic and callout fees remain non-refundable.";
    }

    if (summary.maximumRefundableAmount <= 0) {
      return "No refundable amount is available for this invoice.";
    }

    return "";
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoice?.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const handleEmailInvoice = async () => {
    setIsSendingEmail(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}/email`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send email");
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: `Invoice sent to ${data.recipient}`,
      });

      // Refresh invoice data to get updated status
      fetchInvoice();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(paymentAmount) > invoice!.balanceAmount) {
      toast({
        title: "Amount Too Large",
        description: `Payment cannot exceed balance of ${formatCurrency(invoice!.balanceAmount)}`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          paymentMethod,
          paymentDate: new Date(paymentDate).toISOString(),
          referenceNumber: referenceNumber || undefined,
          notes: paymentNotes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add payment");
      }

      const { invoice: updatedInvoice } = await response.json();
      setInvoice(updatedInvoice);
      setIsPaymentDialogOpen(false);

      // Reset form
      setPaymentAmount("");
      setPaymentMethod("CASH");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setReferenceNumber("");
      setPaymentNotes("");

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const openRefundDialog = () => {
    if (!invoice) return;

    const summary = calculateRefundSummary(invoice);
    setRefundAmount(summary.maximumRefundableAmount.toFixed(2));
    setRefundReason("");
    setRefundMethod("CASH");
    setRefundDate(new Date().toISOString().split("T")[0]);
    setRefundReferenceNumber("");
    setRefundPayoutStatus("COMPLETED");
    setIsRefundDialogOpen(true);
  };

  const handleProcessRefund = async () => {
    if (!invoice) return;

    const amount = parseFloat(refundAmount);
    const summary = calculateRefundSummary(invoice);

    if (!refundAmount || Number.isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid refund amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > summary.maximumRefundableAmount) {
      toast({
        title: "Amount Too Large",
        description: `Refund cannot exceed ${formatCurrency(summary.maximumRefundableAmount)}`,
        variant: "destructive",
      });
      return;
    }

    if (!refundReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please enter a refund reason",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingRefund(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}/refunds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          refundMethod,
          refundDate: new Date(refundDate).toISOString(),
          reason: refundReason.trim(),
          referenceNumber: refundReferenceNumber || undefined,
          payoutStatus: refundPayoutStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process refund");
      }

      setInvoice(result.invoice);
      setIsRefundDialogOpen(false);

      toast({
        title: "Success",
        description: "Refund recorded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;

    const confirmed = window.confirm(
      `Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingInvoice(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete invoice");
      }

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });

      router.push(`/invoices/new?jobId=${invoice.job.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const canEditInvoice = invoice.status === "DRAFT";
  const canDeleteInvoice =
    sessionInfo?.user?.role === "ADMIN" &&
    invoice.payments.length === 0;
  const canProcessRefund =
    (sessionInfo?.user?.role === "ADMIN" || sessionInfo?.user?.role === "TECHNICIAN") &&
    invoice.status !== "CANCELLED" &&
    calculateRefundSummary(invoice).maximumRefundableAmount > 0;
  const refundSummary = calculateRefundSummary(invoice);
  const refundUnavailableReason = getRefundUnavailableReason(invoice);

  return (
    <>
      <style jsx global>{`
        @media print {
          /* Hide everything except the invoice content */
          body * {
            visibility: hidden;
          }

          /* Hide sidebar, header, and navigation */
          aside,
          nav,
          header,
          .no-print {
            display: none !important;
          }

          /* Show only the invoice content */
          #invoice-content,
          #invoice-content * {
            visibility: visible;
          }

          /* Position invoice content at top of page */
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 8px 12px;
            font-size: 10px;
            line-height: 1.25;
            color: #111827;
          }

          /* Remove max-width for printing */
          #invoice-content > div {
            max-width: none !important;
          }

          #invoice-content,
          #invoice-content .space-y-6,
          #invoice-content .space-y-3,
          #invoice-content .space-y-2 {
            gap: 0 !important;
          }

          #invoice-content .print-section {
            margin: 0 !important;
          }

          #invoice-content .print-card > div {
            padding: 8px 10px !important;
          }

          #invoice-content .print-card > div:first-child {
            display: none !important;
          }

          #invoice-content h1 {
            font-size: 18px !important;
            line-height: 1.1 !important;
          }

          #invoice-content h2 {
            font-size: 15px !important;
            margin-bottom: 4px !important;
          }

          #invoice-content h3,
          #invoice-content h4 {
            font-size: 10px !important;
            margin: 0 0 4px !important;
          }

          #invoice-content p,
          #invoice-content span,
          #invoice-content div,
          #invoice-content td,
          #invoice-content th {
            font-size: 10px !important;
            line-height: 1.25 !important;
          }

          #invoice-content table th,
          #invoice-content table td {
            padding: 3px 5px !important;
          }

          #invoice-content .print-company-header {
            margin-bottom: 8px !important;
            padding-bottom: 6px !important;
          }

          #invoice-content .print-company-header-row {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) 210px !important;
            column-gap: 18px !important;
            align-items: start !important;
          }

          #invoice-content .print-company-contact,
          #invoice-content .print-invoice-meta {
            min-width: 0 !important;
            overflow-wrap: anywhere !important;
          }

          #invoice-content .print-company-logo {
            height: 38px !important;
            margin-bottom: 4px !important;
          }

          #invoice-content .print-invoice-meta h1 {
            margin: 0 0 4px !important;
          }

          #invoice-content .print-meta-row {
            display: grid !important;
            grid-template-columns: 58px minmax(0, 1fr) !important;
            gap: 6px !important;
            margin-bottom: 2px !important;
            text-align: right !important;
          }

          #invoice-content .print-meta-row span:first-child {
            text-align: left !important;
          }

          #invoice-content .print-metadata-duplicate,
          #invoice-content .print-hide,
          #invoice-content [data-radix-separator] {
            display: none !important;
          }

          #invoice-content .print-job-details {
            padding: 6px !important;
          }

          #invoice-content .print-totals {
            width: 230px !important;
          }

          #invoice-content .print-terms-summary {
            border: 0 !important;
            padding: 4px 0 0 !important;
            background: transparent !important;
          }

          #invoice-content .print-terms-summary ul {
            columns: 2;
            gap: 16px;
            margin: 0 !important;
          }

          #invoice-content .print-terms-summary li,
          #invoice-content .print-terms-summary p {
            font-size: 8px !important;
            line-height: 1.2 !important;
          }

          /* Ensure proper page breaks */
          .print-section {
            page-break-inside: avoid;
          }

          /* Remove shadows and borders for cleaner print */
          .print-card {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }

          /* Show company header on print */
          .print\\:block {
            display: block !important;
          }

          /* Ensure images print */
          img {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      <div id="invoice-content" className="mx-auto max-w-6xl space-y-6">
        {/* Header - Hide on print */}
        <div className="flex flex-col gap-4 no-print lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              Job #{" "}
              <Link href={`/jobs/${invoice.job.id}`} className="text-blue-700 hover:underline">
                {invoice.job.jobNumber}
              </Link>
              {" - "}
              {invoice.customer.firstName}{" "}
              {invoice.customer.lastName}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {canEditInvoice && (
            <Button variant="outline" onClick={() => router.push(`/invoices/${params.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDeleteInvoice && (
            <Button variant="destructive" onClick={handleDeleteInvoice} disabled={isDeletingInvoice}>
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeletingInvoice ? "Deleting..." : "Delete"}
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handleEmailInvoice} disabled={isSendingEmail}>
            {isSendingEmail ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Status and Payment Section - Hide on print */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={getStatusBadgeVariant(invoice.status)} className="text-base px-3 py-1">
              {formatStatus(invoice.status)}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoice.totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(invoice.balanceAmount)}
            </div>
            {invoice.balanceAmount > 0 && invoice.status !== "CANCELLED" && (
              <Button
                onClick={() => setIsPaymentDialogOpen(true)}
                className="mt-3 w-full"
                size="sm"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="no-print">
        <Button
          variant="outline"
          onClick={() => setShowRefundTools((current) => !current)}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {showRefundTools ? "Hide Refund Options" : "Refund Options"}
        </Button>
      </div>

      {showRefundTools && (
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Refund
            </CardTitle>
            <CardDescription>
              Refunds exclude earned diagnostic and callout fees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500">Total Paid</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(refundSummary.totalPaidDisplay)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500">Non-refundable Diagnostic Fee</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(refundSummary.nonRefundableDiagnosticFee)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500">Non-refundable Callout Fee</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(refundSummary.nonRefundableCalloutFee)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500">Refunded</div>
                <div className="text-lg font-semibold text-red-600">
                  {formatCurrency(refundSummary.totalRefunded)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500">Net Paid</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(refundSummary.netPaid)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500">Maximum Refundable Amount</div>
                <div className="text-lg font-semibold text-green-700">
                  {formatCurrency(refundSummary.maximumRefundableAmount)}
                </div>
              </div>
            </div>
            <Button onClick={openRefundDialog} disabled={!canProcessRefund}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Process Refund
            </Button>
            {!canProcessRefund && refundUnavailableReason && (
              <p className="text-sm text-gray-600">{refundUnavailableReason}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoice Details */}
      <Card className="print-section print-card">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Header - Only visible when printing */}
          {companySettings && (
            <div className="print-company-header hidden print:block mb-6 pb-4 border-b-2">
              <div className="print-company-header-row flex justify-between items-start">
                <div className="print-company-contact">
                  {companySettings.companyLogo && (
                    <img
                      src={`${companySettings.companyLogo}?t=${new Date().getTime()}`}
                      alt={companySettings.companyName}
                      className="print-company-logo h-16 w-auto mb-3"
                    />
                  )}
                  {!companySettings.companyLogo && (
                    <h2 className="text-2xl font-bold mb-3">{companySettings.companyName}</h2>
                  )}
                  <div className="text-sm space-y-1">
                    {companySettings.companyEmail && (
                      <div>{companySettings.companyEmail}</div>
                    )}
                    {companySettings.companyPhone && (
                      <div>{companySettings.companyPhone}</div>
                    )}
                    {companySettings.companyAddress && (
                      <div className="whitespace-pre-line">{companySettings.companyAddress}</div>
                    )}
                  </div>
                </div>
                <div className="print-invoice-meta text-right">
                  <h1 className="text-3xl font-bold">INVOICE</h1>
                  <div className="text-sm mt-2 space-y-1">
                    <div className="print-meta-row">
                      <span className="font-semibold">Invoice #:</span>
                      <span>{invoice.invoiceNumber}</span>
                    </div>
                    <div className="print-meta-row">
                      <span className="font-semibold">Issue Date:</span>
                      <span>{format(new Date(invoice.issueDate), "MMM dd, yyyy")}</span>
                    </div>
                    <div className="print-meta-row">
                      <span className="font-semibold">Payment:</span>
                      <span>Payment due upon collection of the device</span>
                    </div>
                    <div className="print-meta-row">
                      <span className="font-semibold">Job #:</span>
                      <span>{invoice.job.jobNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <div className="print-metadata-duplicate">
              <h3 className="font-semibold text-sm text-gray-500 mb-2">BILL TO</h3>
              <p className="font-medium">
                {invoice.customer.firstName} {invoice.customer.lastName}
              </p>
              {invoice.customer.address && (
                <>
                  <p className="text-sm text-gray-600">{invoice.customer.address}</p>
                  <p className="text-sm text-gray-600">
                    {invoice.customer.city}, {invoice.customer.state} {invoice.customer.zipCode}
                  </p>
                </>
              )}
              <p className="text-sm text-gray-600 mt-1">{invoice.customer.email}</p>
              <p className="text-sm text-gray-600">{invoice.customer.phone}</p>
            </div>
            <div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Invoice Number:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Issue Date:</span>
                  <span className="font-medium">
                    {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Due Date:</span>
                  <span className="font-medium">Payment due upon collection of the device</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Job Number:</span>
                  <Link href={`/jobs/${invoice.job.id}`} className="font-medium text-blue-700 hover:underline">
                    {invoice.job.jobNumber}
                  </Link>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Issued By:</span>
                  <span className="font-medium">
                    {invoice.issuedBy.firstName} {invoice.issuedBy.lastName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Job Information */}
          <div>
            <h3 className="font-semibold mb-2">Job Details</h3>
            <div className="print-job-details bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="font-medium">Appliance:</span>{" "}
                {invoice.job.applianceBrand} {invoice.job.applianceType}
                {invoice.job.modelNumber && ` (${invoice.job.modelNumber})`}
              </p>
              <p className="text-sm">
                <span className="font-medium">Issue:</span> {invoice.job.issueDescription}
              </p>
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <h3 className="font-semibold mb-3">Items</h3>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.invoiceItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.itemType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="flex justify-start md:justify-end">
            <div className="print-totals w-full space-y-2 md:w-80">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({invoice.taxRate}%):</span>
                <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(invoice.discountAmount)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Paid:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(invoice.paidAmount)}
                </span>
              </div>
              {refundSummary.totalRefunded > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Refunded:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(refundSummary.totalRefunded)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Net Paid:</span>
                    <span className="font-medium">
                      {formatCurrency(refundSummary.netPaid)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span className="text-orange-600">Balance Due:</span>
                <span className="text-orange-600">
                  {formatCurrency(invoice.balanceAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(invoice.notes || invoice.paymentTerms) && (
            <>
              <Separator />
              <div className="space-y-3">
                {normalizePaymentTerms(invoice.paymentTerms) && (
                  <div className="print-hide">
                    <h3 className="font-semibold text-sm mb-1">Payment Terms</h3>
                    <p className="text-sm text-gray-600">
                      {normalizePaymentTerms(invoice.paymentTerms)}
                    </p>
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Notes</h3>
                    <p className="text-sm text-gray-600">{invoice.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />
          <TermsSummary className="print-terms-summary" />
        </CardContent>
      </Card>

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <Card className="print-hide print-section print-card">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              {invoice.payments.length} payment{invoice.payments.length !== 1 ? "s" : ""} recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.paymentDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatStatus(payment.paymentMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {payment.referenceNumber || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {payment.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {invoice.refunds && invoice.refunds.length > 0 && (
        <Card className="print-hide print-section print-card">
          <CardHeader>
            <CardTitle>Refund History</CardTitle>
            <CardDescription>
              {invoice.refunds.length} refund{invoice.refunds.length !== 1 ? "s" : ""} recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.refunds.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell>
                      {format(new Date(refund.refundDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatStatus(refund.refundMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={refund.payoutStatus === "PENDING" ? "destructive" : "secondary"}>
                        {formatStatus(refund.payoutStatus || "COMPLETED")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {refund.referenceNumber || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {refund.reason}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      -{formatCurrency(refund.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      </div>

      {/* Add Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Add a payment for invoice {invoice.invoiceNumber}. Balance due:{" "}
              <span className="font-semibold">{formatCurrency(invoice.balanceAmount)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={invoice.balanceAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                  <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Payment Date *</Label>
              <Input
                id="date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction ID, Check #, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Additional payment notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
              disabled={isProcessingPayment}
            >
              Cancel
            </Button>
            <Button onClick={handleAddPayment} disabled={isProcessingPayment}>
              {isProcessingPayment ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Maximum refundable amount:{" "}
              <span className="font-semibold">
                {formatCurrency(refundSummary.maximumRefundableAmount)}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refundAmount">Refund Amount *</Label>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={refundSummary.maximumRefundableAmount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refundReason">Refund Reason *</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger id="refundReason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Part unavailable">Part unavailable</SelectItem>
                  <SelectItem value="Customer cancelled">Customer cancelled</SelectItem>
                  <SelectItem value="Warranty issue">Warranty issue</SelectItem>
                  <SelectItem value="Duplicate charge">Duplicate charge</SelectItem>
                  <SelectItem value="Goodwill refund">Goodwill refund</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refundMethod">Refund Method *</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refundDate">Refund Date *</Label>
              <Input
                id="refundDate"
                type="date"
                value={refundDate}
                onChange={(e) => setRefundDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refundReference">Manual Payout Reference</Label>
              <Input
                id="refundReference"
                value={refundReferenceNumber}
                onChange={(e) => setRefundReferenceNumber(e.target.value)}
                placeholder="Bank ref, receipt number, card terminal ref..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refundPayoutStatus">Manual Payout Status *</Label>
              <Select value={refundPayoutStatus} onValueChange={setRefundPayoutStatus}>
                <SelectTrigger id="refundPayoutStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {refundPayoutStatus === "PENDING" && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                This records the refund and deducts it from revenue. The manual payout still needs to be completed.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRefundDialogOpen(false)}
              disabled={isProcessingRefund}
            >
              Cancel
            </Button>
            <Button onClick={handleProcessRefund} disabled={isProcessingRefund}>
              {isProcessingRefund ? "Processing..." : "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
