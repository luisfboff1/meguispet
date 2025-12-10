import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse ISO date string as LOCAL date (not UTC)
 *
 * PROBLEM: new Date("2024-11-29") interprets as UTC midnight,
 * which in Brazil (UTC-3) becomes 21:00 of day 28 - showing wrong date!
 *
 * SOLUTION: Parse components and create date in local timezone
 *
 * @param dateStr - ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
 * @returns Date object in local timezone
 *
 * @example
 * parseLocalDate("2024-11-29") // Nov 29, 2024 at 00:00 LOCAL (not UTC)
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date()

  // Handle ISO datetime strings (with time component)
  if (dateStr.includes('T')) {
    // If has timezone info (Z or +/-), parse as-is
    if (dateStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
      return new Date(dateStr)
    }
    // Otherwise assume local
    return new Date(dateStr)
  }

  // Parse date-only strings as LOCAL (not UTC)
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed
}

/**
 * Format date to pt-BR locale string
 *
 * @param date - Date object, ISO string, or timestamp
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 *
 * @example
 * formatLocalDate("2024-11-29") // "29/11/2024"
 * formatLocalDate("2024-11-29", { day: '2-digit', month: 'short' }) // "29 de nov"
 */
export function formatLocalDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string'
    ? parseLocalDate(date)
    : typeof date === 'number'
    ? new Date(date)
    : date

  return dateObj.toLocaleDateString('pt-BR', options)
}

/**
 * Format number as Brazilian currency (BRL)
 *
 * @param value - Number to format
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56) // "R$ 1.234,56"
 * formatCurrency(0) // "R$ 0,00"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}
