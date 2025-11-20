"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { Wrench, Smartphone, ArrowRight } from "lucide-react";

export default function QRCodePage() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    // Get the full URL for the submit-job page
    const submitJobUrl = `${window.location.origin}/submit-job`;
    setUrl(submitJobUrl);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-8">
      <Card className="w-full max-w-4xl bg-white shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <Wrench className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-4xl md:text-5xl font-bold mb-4">
            Need Appliance Repair?
          </CardTitle>
          <CardDescription className="text-xl md:text-2xl text-gray-600">
            Scan the QR code with your smartphone to submit a repair request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg border-4 border-blue-500">
              {url ? (
                <QRCodeSVG
                  value={url}
                  size={320}
                  level="H"
                  includeMargin={true}
                />
              ) : (
                <div className="w-80 h-80 bg-gray-100 animate-pulse rounded" />
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-xl p-6 space-y-4">
            <h3 className="text-xl font-semibold text-center text-gray-800 mb-4">
              How It Works
            </h3>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <Smartphone className="h-8 w-8 text-blue-600" />
                <p className="text-sm font-medium">
                  Open your phone&apos;s camera and point it at the QR code
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  2
                </div>
                <ArrowRight className="h-8 w-8 text-blue-600" />
                <p className="text-sm font-medium">
                  Tap the notification to open the repair request form
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  3
                </div>
                <Wrench className="h-8 w-8 text-blue-600" />
                <p className="text-sm font-medium">
                  Fill out the form and submit your repair request
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-200">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-bold text-xs">✓</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Fast & Easy</p>
                <p className="text-gray-600">Submit your request in under 2 minutes</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-200">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-bold text-xs">✓</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Instant Confirmation</p>
                <p className="text-gray-600">Get a job number immediately</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-200">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-bold text-xs">✓</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Track Your Repair</p>
                <p className="text-gray-600">Check status anytime with your job number</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-200">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 font-bold text-xs">✓</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Email Updates</p>
                <p className="text-gray-600">Receive notifications about your repair</p>
              </div>
            </div>
          </div>

          {/* URL Display */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">Or visit this URL directly:</p>
            <p className="text-lg font-mono text-blue-600 break-all">
              {url || "Loading..."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
