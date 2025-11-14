"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function AcceptQuotePage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const acceptQuote = async () => {
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
      }
    };

    if (params.id) {
      acceptQuote();
    }
  }, [params.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Processing Your Response
              </h1>
              <p className="text-gray-600">Please wait while we accept your quote...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Accepted!</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  Thank you for accepting our quote. We'll begin working on your repair right away.
                  You'll receive updates via email as we progress.
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
