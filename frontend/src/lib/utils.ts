import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names without conflicting styles.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format monetary numbers into readable localized currency strings.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "USD"
): string {
  if (amount === null || amount === undefined || amount === "") {
    return "—";
  }

  const numericValue = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericValue)) {
    return "—";
  }

  try {
    // If currency symbol or custom code
    if (currency === "BDT" || currency === "৳") {
      return `৳${numericValue.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${currency} ${numericValue.toFixed(2)}`;
  }
}

/**
 * Format ISO or standard date strings into user-friendly presentation.
 */
export function formatDate(
  dateValue: string | Date | null | undefined,
  includeTime: boolean = false
): string {
  if (!dateValue) return "—";

  try {
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return String(dateValue);

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return date.toLocaleDateString("en-US", options);
  } catch {
    return String(dateValue);
  }
}
