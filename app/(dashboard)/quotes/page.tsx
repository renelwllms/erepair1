"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Filter,
  Receipt,
  Eye,
  Bell,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  issueDate: string;
  validUntil: string;
  totalAmount: number;
  customerResponse: string | null;
  customerResponseDate: string | null;
  rejectionReason: string | null;
  convertedToInvoiceId: string | null;
  lastReminderSent: string | null;
  reminderCount: number;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  job: {
    id: string;
    jobNumber: string;
    applianceType: string;
    applianceBrand: string;
    status: string;
    quoteSentAt?: string | null;
    diagnosticFeeAmount?: number;
    diagnosticFeePaid?: boolean;
    diagnosticFeeAppliedToInvoice?: boolean;
  };
  issuedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/quotes");
      if (response.ok) {
        const data = await response.json();
        setQuotes(data);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (quoteId: string) => {
    if (!confirm("Send a reminder email to the customer about this quote?")) {
      return;
    }

    try {
      const response = await fetch(`/api/quotes/${quoteId}/send-reminder`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        alert(`Reminder sent successfully! (Total reminders: ${data.reminderCount})`);
        fetchQuotes(); // Refresh the list
      } else {
        alert(data.error || "Failed to send reminder");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      alert("An error occurred while sending the reminder");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { bg: "bg-gray-100", text: "text-gray-800", icon: Clock },
      SENT: { bg: "bg-blue-100", text: "text-blue-800", icon: FileText },
      ACCEPTED: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
      EXPIRED: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      CONVERTED_TO_INVOICE: { bg: "bg-purple-100", text: "text-purple-800", icon: Receipt },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  const filteredQuotes = quotes.filter((quote) => {
    if (filter === "all") return true;
    return quote.status === filter;
  });

  const stats = {
    total: quotes.length,
    sent: quotes.filter((q) => q.status === "SENT").length,
    accepted: quotes.filter((q) => q.status === "ACCEPTED").length,
    rejected: quotes.filter((q) => q.status === "REJECTED").length,
    converted: quotes.filter((q) => q.status === "CONVERTED_TO_INVOICE").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600">View and manage all quotes sent to customers</p>
        </div>
        <Link
          href="/quotes/new"
          className="inline-flex h-11 w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
        >
          <FileText className="h-4 w-4 mr-2" />
          Create Quote
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Quotes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Awaiting Response</p>
              <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Converted</p>
              <p className="text-2xl font-bold text-purple-600">{stats.converted}</p>
            </div>
            <Receipt className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("SENT")}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === "SENT"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Awaiting Response
            </button>
            <button
              onClick={() => setFilter("ACCEPTED")}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === "ACCEPTED"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Accepted
            </button>
            <button
              onClick={() => setFilter("REJECTED")}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === "REJECTED"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setFilter("CONVERTED_TO_INVOICE")}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === "CONVERTED_TO_INVOICE"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Converted
            </button>
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading quotes...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No quotes found</p>
          </div>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {filteredQuotes.map((quote) => (
              <div key={quote.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/quotes/${quote.id}`} className="font-semibold text-blue-700 hover:underline">
                      {quote.quoteNumber}
                    </Link>
                    <p className="mt-1 text-sm text-gray-700">{quote.customer.firstName} {quote.customer.lastName}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      <Link href={`/jobs/${quote.job.id}`} className="text-blue-700 hover:underline">
                        {quote.job.jobNumber}
                      </Link>
                      {" · "}
                      {quote.job.applianceBrand} {quote.job.applianceType}
                    </p>
                  </div>
                  {getStatusBadge(quote.status)}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-semibold">${quote.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Valid Until</p>
                    <p className="font-semibold">{format(new Date(quote.validUntil), "MMM dd, yyyy")}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => router.push(`/quotes/${quote.id}`)}
                    className="inline-flex h-11 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => router.push(`/jobs/${quote.job.id}`)}
                    className="inline-flex h-11 items-center justify-center rounded-md border border-gray-200 px-3 text-sm font-medium"
                  >
                    Job
                  </button>
                  {quote.status === "SENT" && new Date(quote.validUntil) > new Date() && (
                    <button
                      onClick={() => sendReminder(quote.id)}
                      className="col-span-2 inline-flex h-11 items-center justify-center rounded-md border border-orange-200 px-3 text-sm font-medium text-orange-700"
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Send Reminder
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quote #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onDoubleClick={() => router.push(`/quotes/${quote.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {quote.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/jobs/${quote.job.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {quote.job.jobNumber}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {quote.job.applianceBrand} {quote.job.applianceType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {quote.customer.firstName} {quote.customer.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{quote.customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-semibold text-gray-900">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        {quote.totalAmount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(quote.issueDate), "MMM dd, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(quote.validUntil), "MMM dd, yyyy")}
                      {new Date(quote.validUntil) < new Date() && (
                        <span className="ml-2 text-xs text-red-600">(Expired)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(quote.status)}
                      {quote.customerResponseDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          {format(new Date(quote.customerResponseDate), "MMM dd, yyyy")}
                        </div>
                      )}
                      {quote.rejectionReason && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={quote.rejectionReason}>
                          Reason: {quote.rejectionReason}
                        </div>
                      )}
                      {quote.status === "SENT" && quote.lastReminderSent && (
                        <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                          <Bell className="h-3 w-3" />
                          Last reminder: {format(new Date(quote.lastReminderSent), "MMM dd")}
                        </div>
                      )}
                      {quote.status === "SENT" && (
                        <div className="text-xs text-gray-500 mt-1">
                          {quote.reminderCount} of 5 reminders sent
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Link
                          href={`/jobs/${quote.job.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Job"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {quote.status === "SENT" && new Date(quote.validUntil) > new Date() && (
                          <button
                            onClick={() => sendReminder(quote.id)}
                            className="text-orange-600 hover:text-orange-900 relative"
                            title={`Send Reminder (${quote.reminderCount} sent)`}
                          >
                            <Bell className="h-4 w-4" />
                            {quote.reminderCount > 0 && (
                              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                {quote.reminderCount}
                              </span>
                            )}
                          </button>
                        )}
                        {quote.status === "ACCEPTED" && !quote.convertedToInvoiceId && (
                          <button
                            onClick={async () => {
                              if (
                                quote.job.diagnosticFeeAmount &&
                                quote.job.diagnosticFeeAmount > 0 &&
                                !quote.job.diagnosticFeePaid
                              ) {
                                const proceed = confirm(
                                  "Diagnostic fee is not marked as paid for this job. Please record the payment before generating the invoice. Do you want to continue anyway?"
                                );
                                if (!proceed) {
                                  return;
                                }
                              }

                              if (confirm("Convert this quote to an invoice?")) {
                                try {
                                  const response = await fetch(`/api/quotes/${quote.id}/convert-to-invoice`, {
                                    method: "POST",
                                  });
                                  const data = await response.json();
                                  if (response.ok) {
                                    alert("Quote converted to invoice successfully!");
                                    fetchQuotes(); // Refresh the list
                                  } else {
                                    alert(data.error || "Failed to convert quote");
                                  }
                                } catch (error) {
                                  alert("An error occurred");
                                }
                              }
                            }}
                            className="text-purple-600 hover:text-purple-900"
                            title="Convert to Invoice"
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
