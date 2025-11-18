/**
 * Input Sanitization Utilities
 * 
 * Security Enhancement: VULN-003 Fix
 * Provides functions to sanitize user inputs and prevent XSS attacks
 * Uses DOMPurify to strip potentially harmful HTML/scripts
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content by stripping all tags and dangerous content
 * Use this for user inputs that should not contain any HTML
 * 
 * @param dirty - Potentially unsafe HTML string
 * @returns Sanitized plain text string
 */
export function sanitizeHTML(dirty: string): string {
  if (typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
    KEEP_CONTENT: true, // Keep text content
  });
}

/**
 * Sanitizes a string by removing dangerous characters
 * while preserving basic formatting
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  // Remove control characters except newlines and tabs
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Recursively sanitizes all string values in an object
 * Useful for sanitizing entire request bodies
 * 
 * @param input - Object, array, or primitive to sanitize
 * @returns Sanitized copy of the input
 */
export function sanitizeInput(input: any): any {
  // Handle null and undefined
  if (input === null || input === undefined) {
    return input;
  }

  // Handle strings
  if (typeof input === 'string') {
    return sanitizeHTML(input);
  }

  // Handle arrays
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  // Handle objects
  if (typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeText(key);
      sanitized[sanitizedKey] = sanitizeInput(value);
    }
    return sanitized;
  }

  // Return primitives as-is (numbers, booleans, etc.)
  return input;
}

/**
 * Sanitizes HTML but allows safe tags for rich text content
 * Use this only when you need to preserve some HTML formatting
 * 
 * @param dirty - HTML string with potential unsafe content
 * @returns Sanitized HTML with only safe tags
 */
export function sanitizeRichHTML(dirty: string): string {
  if (typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true,
  });
}

/**
 * Escapes special SQL characters to prevent SQL injection
 * Note: This should be used in addition to parameterized queries, not instead of
 * 
 * @param input - String that may contain SQL special characters
 * @returns Escaped string
 */
export function escapeSQLInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/\\/g, '\\\\'); // Escape backslashes
}

/**
 * Validates and sanitizes email addresses
 * 
 * @param email - Email address to sanitize
 * @returns Sanitized lowercase email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== 'string') {
    return null;
  }

  const sanitized = email.toLowerCase().trim();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitizes phone numbers by removing all non-numeric characters
 * 
 * @param phone - Phone number string
 * @returns Only numeric characters
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }

  return phone.replace(/\D/g, '');
}

/**
 * Sanitizes CPF/CNPJ documents
 * 
 * @param document - CPF or CNPJ string
 * @returns Only numeric characters
 */
export function sanitizeDocument(document: string): string {
  if (typeof document !== 'string') {
    return '';
  }

  return document.replace(/\D/g, '');
}
