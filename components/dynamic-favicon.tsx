"use client";

import { useEffect } from "react";

export function DynamicFavicon() {
  useEffect(() => {
    // Fetch company settings to get favicon
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.companyFavicon) {
          // Add cache-busting timestamp to favicon URL
          const timestamp = new Date().getTime();
          const faviconUrl = `${data.companyFavicon}?v=${timestamp}`;

          // Remove all existing favicon links to force refresh
          const existingLinks = document.querySelectorAll("link[rel~='icon']");
          existingLinks.forEach(link => link.remove());

          // Create new favicon link with cache-busting
          const newLink = document.createElement("link");
          newLink.rel = "icon";
          newLink.type = "image/png";
          newLink.href = faviconUrl;
          document.head.appendChild(newLink);

          // Update apple-touch-icon if exists, or create new one
          const appleLink = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
          if (appleLink) {
            appleLink.href = faviconUrl;
          } else {
            const newAppleLink = document.createElement("link");
            newAppleLink.rel = "apple-touch-icon";
            newAppleLink.href = faviconUrl;
            document.head.appendChild(newAppleLink);
          }
        }

        // Update page title with company name
        if (data.companyName) {
          document.title = `${data.companyName} - Management System`;
        }
      })
      .catch((error) => {
        console.error("Error loading favicon:", error);
      });
  }, []);

  return null;
}
