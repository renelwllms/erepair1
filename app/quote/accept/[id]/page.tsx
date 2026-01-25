"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { TermsSummary } from "@/components/legal/terms-summary";

type PublicQuote = {
  quoteId: string;
  quoteNumber: string;
  status: string;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  job: {
    jobNumber: string;
    applianceType: string;
    applianceBrand: string;
    modelNumber?: string | null;
    issueDescription: string;
    diagnosticFeeAmount?: number | null;
  };
};

type PublicSettings = {
  companyName?: string;
  companyLogo?: string | null;
  primaryColor?: string;
};

export default function AcceptQuotePage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  const hexToRgba = (hex: string, alpha: number) => {
    const normalized = hex.replace("#", "");
    const full = normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  useEffect(() => {
    const load = async () => {
      try {
        const [quoteRes, settingsRes] = await Promise.all([
          fetch(`/api/public/quotes/${params.id}`),
          fetch("/api/public/settings"),
        ]);

        if (!quoteRes.ok) {
          const data = await quoteRes.json();
          setStatus("error");
          setMessage(data.error || "Quote not found");
          return;
        }

        const quoteData = await quoteRes.json();
        setQuote(quoteData);

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        }

        setStatus("ready");
      } catch (error) {
        setStatus("error");
        setMessage("Unable to load quote details.");
      }
    };

    load();
  }, [params.id]);

  const acceptQuote = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/quotes/${params.id}/accept`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Quote accepted successfully!");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to accept quote");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred while accepting the quote");
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = settings?.primaryColor || "#2563eb";
  const backgroundStyle = {
    background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.18)} 0%, #f8fafc 60%)`,
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={backgroundStyle}>
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center">
          {settings?.companyLogo ? (
            <div className="mx-auto mb-4 flex items-center justify-center">
              <img
                src={`${settings.companyLogo}?t=${new Date().getTime()}`}
                alt={settings.companyName || "Company Logo"}
                className="max-h-20 max-w-[220px] object-contain"
              />
            </div>
          ) : null}

          {status === "loading" && (
            <>
              <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading your quote...</p>
            </>
          )}

          {status === "ready" && quote && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Accept Quote</h1>
              <p className="text-gray-600 mb-6">
                Please review the details below before we proceed with your repair.
              </p>

              <div className="grid gap-4 text-left">
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <div className="text-sm text-gray-500">Job Number</div>
                  <div className="text-lg font-semibold text-gray-900">{quote.job.jobNumber}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Device</div>
                  <div className="text-base font-semibold text-gray-900">
                    {quote.job.applianceBrand} {quote.job.applianceType}
                  </div>
                  {quote.job.modelNumber ? (
                    <div className="text-sm text-gray-600">Model: {quote.job.modelNumber}</div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Issue</div>
                  <div className="text-sm text-gray-700">{quote.job.issueDescription}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <div className="text-sm text-gray-500">Quoted Total</div>
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                    {formatCurrency(quote.totalAmount)}
                  </div>
                  {typeof quote.job.diagnosticFeeAmount === "number" &&
                  quote.job.diagnosticFeeAmount > 0 ? (
                    <div className="text-xs text-gray-600 mt-1">
                      Diagnostic fee ({formatCurrency(quote.job.diagnosticFeeAmount)}) will be credited
                      on approval and is non-refundable if declined.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-6">
                <button
                  className="w-full rounded-md px-4 py-3 text-sm font-semibold text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={acceptQuote}
                  disabled={isSubmitting}
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? "Processing..." : "Accept Quote"}
                </button>
              </div>

              <TermsSummary className="mt-6 text-left" />
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Accepted!</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  Thank you for accepting our quote. We&apos;ll begin working on your repair right away.
                  You&apos;ll receive updates via email as we progress.
                </p>
              </div>
              <p className="text-sm text-gray-500">
                You can close this window now.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Accept Quote</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">
                  If you need assistance, please contact us directly.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
