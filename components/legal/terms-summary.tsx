"use client";

import Link from "next/link";

const getTermsUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/terms-and-conditions`;
  }
  return process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/terms-and-conditions`
    : "/terms-and-conditions";
};

export function TermsSummary({ className = "" }: { className?: string }) {
  const termsUrl = getTermsUrl();

  return (
    <div className={`rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 ${className}`}>
      <h4 className="font-semibold text-gray-900 mb-2">Terms Summary</h4>
      <ul className="list-disc pl-5 space-y-1">
        <li>Inspection fees are non-refundable if repair is declined.</li>
        <li>Customer data must be backed up; eRepair is not liable for data loss.</li>
        <li>3-month return-to-base warranty on repairs (excluding liquid, physical damage &amp; glass replacements).</li>
        <li>No warranty on liquid damage repairs.</li>
        <li>Courier damage is subject to courier terms.</li>
        <li>Devices must be collected within 4 weeks.</li>
        <li>Rights under the NZ Consumer Guarantees Act apply.</li>
      </ul>
      <p className="mt-3 text-xs text-gray-600">
        Full Terms &amp; Conditions available on request or on our website:{" "}
        <Link href="/terms-and-conditions" className="font-semibold text-blue-600 hover:underline">
          {termsUrl}
        </Link>
      </p>
    </div>
  );
}
