import Link from "next/link";

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 hidden border-t bg-white sm:block">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col items-center gap-1 text-sm text-gray-600 sm:flex-row sm:justify-center">
          <Link
            href="/terms-and-conditions"
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Terms &amp; Conditions
          </Link>
          <span className="hidden sm:inline">•</span>
          <span>Developed and Hosted By</span>
          <a
            href="https://edgepoint.co.nz/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Edgepoint
          </a>
        </div>
      </div>
    </footer>
  );
}
