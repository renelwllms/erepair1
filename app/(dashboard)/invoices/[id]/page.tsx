"use client";

import { useState, useEffect } from "react";
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
  DollarSign,
  FileText,
  Printer,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

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
}

interface CompanySettings {
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogo?: string;
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

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
            padding: 20px;
          }

          /* Remove max-width for printing */
          #invoice-content > div {
            max-width: none !important;
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

      <div id="invoice-content" className="space-y-6 max-w-6xl">
        {/* Header - Hide on print */}
        <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              Job #{invoice.job.jobNumber} - {invoice.customer.firstName}{" "}
              {invoice.customer.lastName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handleEmailInvoice}>
            <Mail className="h-4 w-4 mr-2" />
            Email
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

      {/* Invoice Details */}
      <Card className="print-section print-card">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Header - Only visible when printing */}
          {companySettings && (
            <div className="hidden print:block mb-6 pb-4 border-b-2">
              <div className="flex justify-between items-start">
                <div>
                  {companySettings.companyLogo && (
                    <img
                      src={companySettings.companyLogo}
                      alt={companySettings.companyName}
                      className="h-16 w-auto mb-3"
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
                <div className="text-right">
                  <h1 className="text-3xl font-bold">INVOICE</h1>
                  <div className="text-sm mt-2 space-y-1">
                    <div><span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}</div>
                    <div><span className="font-semibold">Issue Date:</span> {format(new Date(invoice.issueDate), "MMM dd, yyyy")}</div>
                    <div><span className="font-semibold">Due Date:</span> {format(new Date(invoice.dueDate), "MMM dd, yyyy")}</div>
                    <div><span className="font-semibold">Job #:</span> {invoice.job.jobNumber}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header Info */}
          <div className="grid grid-cols-2 gap-8">
            <div>
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
                  <span className="font-medium">
                    {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Job Number:</span>
                  <span className="font-medium">{invoice.job.jobNumber}</span>
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
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
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

          <Separator />

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
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
                {invoice.paymentTerms && (
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Payment Terms</h3>
                    <p className="text-sm text-gray-600">{invoice.paymentTerms}</p>
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
        </CardContent>
      </Card>

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <Card className="print-section print-card">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              {invoice.payments.length} payment{invoice.payments.length !== 1 ? "s" : ""} recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      </div>

      {/* Add Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
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
    </>
  );
}
