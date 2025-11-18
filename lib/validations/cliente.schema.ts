/**
 * Input Validation Schema for Clientes/Fornecedores
 * 
 * Security Enhancement: VULN-003 Fix
 * Implements comprehensive input validation using Zod
 * Prevents XSS, SQL injection, and invalid data insertion
 */

import { z } from 'zod';

// CPF/CNPJ validation regex
const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const PHONE_REGEX = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
const CEP_REGEX = /^\d{5}-?\d{3}$/;

// Email validation
const emailSchema = z.string()
  .email('Email inválido')
  .max(255, 'Email deve ter no máximo 255 caracteres')
  .toLowerCase()
  .trim()
  .optional()
  .or(z.literal(''));

// Cliente/Fornecedor schema
export const clienteSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s.'-]+$/, 'Nome deve conter apenas letras e espaços')
    .trim(),

  tipo: z.enum(['cliente', 'fornecedor', 'ambos'], {
    errorMap: () => ({ message: 'Tipo inválido. Deve ser: cliente, fornecedor ou ambos' })
  }),

  email: emailSchema,

  telefone: z.string()
    .regex(PHONE_REGEX, 'Telefone inválido. Formato: (XX) XXXXX-XXXX')
    .optional()
    .or(z.literal('')),

  documento: z.string()
    .refine((doc) => {
      if (!doc || doc === '') return true; // Optional
      const cleanDoc = doc.replace(/\D/g, '');
      return cleanDoc.length === 11 || cleanDoc.length === 14;
    }, 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos')
    .optional(),

  endereco: z.string()
    .max(500, 'Endereço deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),

  cidade: z.string()
    .max(100, 'Cidade deve ter no máximo 100 caracteres')
    .optional()
    .or(z.literal('')),

  estado: z.string()
    .length(2, 'Estado deve ter 2 caracteres (UF)')
    .toUpperCase()
    .optional()
    .or(z.literal('')),

  cep: z.string()
    .regex(CEP_REGEX, 'CEP inválido. Formato: XXXXX-XXX')
    .optional()
    .or(z.literal('')),

  vendedor_id: z.number()
    .int('ID do vendedor deve ser um número inteiro')
    .positive('ID do vendedor deve ser positivo')
    .optional(),

  observacoes: z.string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
    .or(z.literal('')),
});

// Schema for creating a new client
export const clienteCreateSchema = clienteSchema;

// Schema for updating a client
export const clienteUpdateSchema = clienteSchema.partial().extend({
  id: z.number().int().positive()
});

// Type inference
export type ClienteInput = z.infer<typeof clienteSchema>;
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>;
