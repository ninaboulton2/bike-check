const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? "€";
}

export function formatCost(cents: number, currency: string): string {
  const symbol = currencySymbol(currency);
  return `${symbol}${(cents / 100).toFixed(2)}`;
}
