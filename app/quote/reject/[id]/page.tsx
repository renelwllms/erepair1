"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function RejectQuotePage() {
  const params = useParams();
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">("form");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch(`/api/quotes/${params.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Quote rejected successfully");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to reject quote");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred while rejecting the quote");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === "form" && (
            <>
              <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Decline Quote</h1>
              <p className="text-gray-600 mb-6">
                We're sorry to hear you'd like to decline this quote.
                Would you mind sharing why? (Optional)
              </p>

              <form onSubmit={handleReject} className="text-left">
                <div className="mb-6">
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for declining (Optional)
                  </label>
                  <textarea
                    id="reason"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Price is too high, Found a better quote elsewhere, Decided not to repair..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Decline Quote
                  </button>
                </div>
              </form>
            </>
          )}

          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 text-red-600 animate-spin mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Processing Your Response
              </h1>
              <p className="text-gray-600">Please wait while we process your decision...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Declined</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  Thank you for letting us know. We've recorded your decision.
                  {reason && " Your feedback helps us improve our service."}
                  {" "}Feel free to contact us if you change your mind or have any questions.
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Process</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">
                  If you need assistance, please contact us directly.
                </p>
              </div>
              <button
                onClick={() => setStatus("form")}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
