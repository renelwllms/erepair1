"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QRPrintPage() {
  const [url, setUrl] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get the full URL for the submit-job page
    const submitJobUrl = `${window.location.origin}/submit-job`;
    setUrl(submitJobUrl);

    // Load settings to get company logo and info
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      {/* Print button - hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50">
        <Button onClick={handlePrint} size="lg">
          Print QR Code
        </Button>
      </div>

      {/* A4 Printable Content */}
      <div className="print-content min-h-screen bg-white p-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header with Logo */}
          <div className="text-center space-y-4">
            {settings?.companyLogo && (
              <div className="flex justify-center mb-6">
                <img
                  src={settings.companyLogo}
                  alt="Company Logo"
                  className="max-h-24 object-contain"
                />
              </div>
            )}
            <h1 className="text-5xl font-bold text-gray-900">
              {settings?.companyName || "eRepair"} – We fix it all
            </h1>
            <p className="text-2xl text-gray-600">
              Submit your job online in just 3 easy steps.
            </p>
          </div>

          <div className="border-t-2 border-gray-300 my-8"></div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center space-y-6">
            <div className="bg-white p-8 border-4 border-gray-900 rounded-lg">
              {url ? (
                <QRCodeSVG
                  value={url}
                  size={400}
                  level="H"
                  includeMargin={true}
                />
              ) : (
                <div className="w-[400px] h-[400px] bg-gray-100 animate-pulse" />
              )}
            </div>
            <p className="text-3xl font-semibold text-gray-900">
              Scan this QR Code to Submit a Job
            </p>
          </div>

          <div className="border-t-2 border-gray-300 my-8"></div>

          {/* Instructions */}
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
              THREE EASY STEPS
            </h2>

            {/* Step 1 */}
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Step 1 — Scan the QR Code
                </h3>
                <p className="text-xl text-gray-700">
                  Open your phone camera and scan the QR code to open the eRepair job submission portal.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Step 2 — Search Your Phone Number
                </h3>
                <ul className="text-xl text-gray-700 space-y-2">
                  <li>• If you are an existing customer, your details will be automatically found.</li>
                  <li>• If this is your first time, please fill out all the fields.</li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Step 3 — Submit Your Job
                </h3>
                <p className="text-xl text-gray-700">
                  Describe the device issue, attach photos if needed, and submit.
                  <br />
                  A Job ID will be created instantly.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-300 my-8"></div>

          {/* Footer */}
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold text-gray-900">
              {settings?.companyName || "eRepair"}
            </h3>
            <p className="text-xl text-gray-700">
              Website: {url.replace('/submit-job', '')}
            </p>
            {settings?.companyPhone && (
              <p className="text-xl text-gray-700">
                Phone: {settings.companyPhone}
              </p>
            )}
            {settings?.companyEmail && (
              <p className="text-xl text-gray-700">
                Email: {settings.companyEmail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          .print-content {
            padding: 2cm !important;
          }

          body {
            margin: 0;
            padding: 0;
          }

          @page {
            size: A4;
            margin: 0;
          }
        }

        @media screen {
          .print-content {
            min-height: 297mm; /* A4 height */
            width: 210mm; /* A4 width */
            margin: 0 auto;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
    </>
  );
}
