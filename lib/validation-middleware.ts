/**
 * API Validation Middleware
 *
 * Security Enhancement: VULN-003 Fix
 * Provides validation middleware for API routes using Zod schemas
 * Automatically validates request bodies and returns structured errors
 * Includes automatic XSS sanitization via DOMPurify
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ZodSchema, ZodError } from 'zod';
import { sanitizeInput } from './sanitization';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: ValidationError[];
}

/**
 * Validates request body against a Zod schema
 * Returns validated data or throws validation error
 */
export function validateRequestBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  try {
    const validatedData = schema.parse(body);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const zodError = error as ZodError;
      const errors: ValidationError[] = zodError.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return {
        success: false,
        errors,
      };
    }

    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Higher-order function that wraps an API handler with validation
 * Validates the request body before calling the handler
 *
 * @example
 * const handler = withValidation(
 *   clienteCreateSchema,
 *   async (req, res, validatedData) => {
 *     // validatedData is typed and validated
 *     const { data, error } = await supabase
 *       .from('clientes_fornecedores')
 *       .insert(validatedData);
 *
 *     return res.status(201).json({ success: true, data });
 *   }
 * );
 */
export function withValidation<T, TReq extends NextApiRequest = NextApiRequest>(
  schema: ZodSchema<T>,
  handler: (
    req: TReq,
    res: NextApiResponse,
    validatedData: T
  ) => Promise<void> | void
) {
  return async (req: TReq, res: NextApiResponse) => {
    try {
      // Sanitize input first to prevent XSS
      const sanitizedBody = sanitizeInput(req.body);

      // Validate sanitized data against schema
      const validation = validateRequestBody(schema, sanitizedBody);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: validation.errors,
        } as ApiError);
      }

      // Call handler with validated and sanitized data
      return await handler(req, res, validation.data);
    } catch (error) {
      console.error('[Validation Middleware] Unexpected error:', error);

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      } as ApiError);
    }
  };
}

/**
 * Validates query parameters
 */
export function validateQueryParams<T>(
  schema: ZodSchema<T>,
  query: unknown
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  return validateRequestBody(schema, query);
}
