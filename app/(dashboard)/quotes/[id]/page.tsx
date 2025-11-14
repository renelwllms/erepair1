"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Wrench,
  Download,
  Printer,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  customerResponse: string | null;
  customerResponseDate: string | null;
  rejectionReason: string | null;
  convertedToInvoiceId: string | null;
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
    email: string;
  };
  quoteItems: QuoteItem[];
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    fetchQuote();
    fetchCompanySettings();
  }, [params.id]);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quotes/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setQuote(data);
      } else {
        console.error("Failed to fetch quote");
      }
    } catch (error) {
      console.error("Error fetching quote:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setCompanySettings(data);
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { bg: "bg-gray-100", text: "text-gray-800", icon: Clock },
      SENT: { bg: "bg-blue-100", text: "text-blue-800", icon: FileText },
      ACCEPTED: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
      EXPIRED: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      CONVERTED_TO_INVOICE: { bg: "bg-purple-100", text: "text-purple-800", icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-4 w-4" />
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-6">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quote Not Found</h2>
          <p className="text-gray-600 mb-4">The quote you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push("/quotes")}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to Quotes
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          /* Hide all non-printable elements */
          body * {
            visibility: hidden;
          }

          /* Only show the print container and its children */
          .print-container,
          .print-container * {
            visibility: visible;
          }

          /* Position print container at top left */
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 30px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white !important;
          }

          @page {
            margin: 1.5cm;
            size: A4;
          }

          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }

          .hidden.print\\:block {
            display: block !important;
            visibility: visible !important;
          }

          .no-page-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Ensure borders and backgrounds print */
          table, th, td {
            border-color: #d1d5db !important;
          }

          .bg-gray-100,
          .bg-gray-50 {
            background-color: #f9fafb !important;
          }

          .bg-blue-50 {
            background-color: #eff6ff !important;
          }

          /* Remove hover effects in print */
          tr:hover {
            background-color: inherit !important;
          }

          /* Ensure text is black for printing */
          body, p, span, td, th {
            color: #000 !important;
          }

          h1, h2, h3, h4, h5, h6 {
            color: #000 !important;
          }

          /* Preserve specific colors */
          .text-blue-600,
          .text-blue-700 {
            color: #2563eb !important;
          }

          .text-green-600 {
            color: #16a34a !important;
          }

          .text-red-600 {
            color: #dc2626 !important;
          }

          .text-gray-400,
          .text-gray-500,
          .text-gray-600 {
            color: #6b7280 !important;
          }
        }
      `}</style>

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/quotes")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quote Details</h1>
              <p className="text-gray-600">View quote sent to customer</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* Quote Document */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto print-container">
        {/* Header */}
        <div className="border-b-2 border-gray-200 pb-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">QUOTE</h2>
              <p className="text-lg text-gray-600 font-medium">{quote.quoteNumber}</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{companySettings?.companyName || "E-Repair Shop"}</h3>
              {companySettings?.address && <p className="text-gray-600 text-sm">{companySettings.address}</p>}
              {companySettings?.city && (
                <p className="text-gray-600 text-sm">
                  {companySettings.city}, {companySettings.state} {companySettings.zipCode}
                </p>
              )}
              {companySettings?.phone && <p className="text-gray-600 text-sm mt-1">{companySettings.phone}</p>}
              {companySettings?.email && <p className="text-gray-600 text-sm">{companySettings.email}</p>}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6 print:hidden">
          {getStatusBadge(quote.status)}
        </div>

        {/* Status for Print */}
        <div className="mb-6 hidden print:block">
          <div className="inline-flex items-center gap-2 text-blue-700 font-semibold">
            <FileText className="h-5 w-5" />
            {quote.status.replace(/_/g, " ")}
          </div>
        </div>

        {/* Quote Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8 no-page-break">
          <div>
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 border-b pb-2">Quote To</h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-900 font-medium">
                  {quote.customer.firstName} {quote.customer.lastName}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm break-all">{quote.customer.email}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">{quote.customer.phone}</span>
              </div>
              {quote.customer.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-gray-700 text-sm">
                    <div>{quote.customer.address}</div>
                    {quote.customer.city && (
                      <div>
                        {quote.customer.city}, {quote.customer.state} {quote.customer.zipCode}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 border-b pb-2">Quote Details</h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  <span className="font-medium">Issue Date:</span> {format(new Date(quote.issueDate), "MMM dd, yyyy")}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  <span className="font-medium">Valid Until:</span> {format(new Date(quote.validUntil), "MMM dd, yyyy")}
                  {new Date(quote.validUntil) < new Date() && (
                    <span className="ml-2 text-red-600 font-semibold">(Expired)</span>
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Wrench className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <Link href={`/jobs/${quote.job.id}`} className="text-blue-600 hover:underline text-sm font-medium print:text-blue-700">
                  Job: {quote.job.jobNumber}
                </Link>
              </div>
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  {quote.job.applianceBrand} {quote.job.applianceType}
                  {quote.job.modelNumber && ` - ${quote.job.modelNumber}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Job Description */}
        {quote.job.issueDescription && (
          <div className="mb-8 bg-gray-50 rounded-lg p-4 no-page-break">
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Issue Description</h4>
            <p className="text-gray-700 text-sm leading-relaxed">{quote.job.issueDescription}</p>
          </div>
        )}

        {/* Quote Items Table */}
        <div className="mb-8 no-page-break">
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Quote Items</h4>
          <div className="overflow-hidden border border-gray-300 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quote.quoteItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">${item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-gray-300 pt-6 mb-8 no-page-break">
          <div className="flex justify-end">
            <div className="w-80 space-y-3">
              <div className="flex justify-between items-center text-gray-700">
                <span className="text-base">Subtotal:</span>
                <span className="font-semibold text-lg">${quote.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-700">
                <span className="text-base">GST:</span>
                <span className="font-semibold text-lg">${quote.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold text-gray-900 pt-3 border-t-2 border-gray-300">
                <span>Total:</span>
                <span className="flex items-center text-2xl">
                  ${quote.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4 no-page-break">
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Notes</h4>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Customer Response Section */}
        {quote.customerResponse && (
          <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-4 no-page-break print:hidden">
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Customer Response</h4>
            <div className="flex items-center gap-2 mb-2">
              {quote.customerResponse === "ACCEPTED" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-semibold ${quote.customerResponse === "ACCEPTED" ? "text-green-600" : "text-red-600"}`}>
                {quote.customerResponse}
              </span>
              {quote.customerResponseDate && (
                <span className="text-gray-500 text-sm">
                  on {format(new Date(quote.customerResponseDate), "MMM dd, yyyy")}
                </span>
              )}
            </div>
            {quote.rejectionReason && (
              <div className="text-gray-700 text-sm mt-2">
                <span className="font-semibold">Reason: </span>
                {quote.rejectionReason}
              </div>
            )}
          </div>
        )}

        {/* Converted to Invoice Notice */}
        {quote.convertedToInvoiceId && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-8 print:hidden">
            <p className="text-purple-800 text-sm">
              This quote has been converted to invoice.
              <Link href={`/invoices/${quote.convertedToInvoiceId}`} className="ml-2 font-semibold hover:underline">
                View Invoice
              </Link>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-200 pt-6 mt-8">
          <div className="text-sm text-gray-600 text-center space-y-2">
            <p className="font-medium">Issued by: {quote.issuedBy.firstName} {quote.issuedBy.lastName}</p>
            <p className="text-gray-500">This quote is valid until {format(new Date(quote.validUntil), "MMMM dd, yyyy")}</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
