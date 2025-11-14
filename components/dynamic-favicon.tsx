"use client";

import { useEffect } from "react";

export function DynamicFavicon() {
  useEffect(() => {
    // Fetch company settings to get favicon
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.companyFavicon) {
          // Update favicon
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) {
            link.href = data.companyFavicon;
          } else {
            const newLink = document.createElement("link");
            newLink.rel = "icon";
            newLink.href = data.companyFavicon;
            document.head.appendChild(newLink);
          }

          // Update apple-touch-icon if exists
          const appleLink = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
          if (appleLink) {
            appleLink.href = data.companyFavicon;
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
