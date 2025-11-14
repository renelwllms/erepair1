export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t bg-white z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center text-sm text-gray-600">
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
