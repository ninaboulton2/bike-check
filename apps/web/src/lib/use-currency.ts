"use client";

import { useEffect, useState } from "react";

export function useCurrency(): string {
  const [currency, setCurrency] = useState("EUR");

  useEffect(() => {
    // Check localStorage cache first
    const cached = localStorage.getItem("bikecheck_currency");
    if (cached) setCurrency(cached);

    // Fetch from API
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.currency) {
          setCurrency(data.currency);
          localStorage.setItem("bikecheck_currency", data.currency);
        }
      })
      .catch(() => {});
  }, []);

  return currency;
}
