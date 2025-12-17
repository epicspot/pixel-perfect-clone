/**
 * Centralized formatting utilities for currency and numbers
 * Used across the entire application for consistent formatting
 */

/**
 * Format a number as currency in F CFA with French locale thousand separators
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "1 250 000 F CFA")
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F CFA';
};

/**
 * Format a number as currency, returning '-' for null/undefined values
 * @param value - The numeric value to format (can be null)
 * @returns Formatted currency string or '-' if null
 */
export const formatCurrencyOrDash = (value: number | null | undefined): string => {
  return value != null ? formatCurrency(value) : '-';
};

/**
 * Format a number with French locale thousand separators (no currency)
 * @param value - The numeric value to format
 * @returns Formatted number string (e.g., "1 250 000")
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
};

/**
 * Format a number as a percentage
 * @param value - The numeric value (already in percentage form, e.g., 15 for 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "15.0%")
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a number as a signed percentage (with + prefix for positive values)
 * @param value - The numeric value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "+15.0%" or "-5.0%")
 */
export const formatSignedPercent = (value: number, decimals: number = 1): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};
