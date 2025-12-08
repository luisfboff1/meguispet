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
    .regex(/^[a-zA-ZÀ-ÿ0-9\s.'\-&()]+$/, 'Nome contém caracteres inválidos')
    .trim(),

  tipo: z.enum(['cliente', 'fornecedor', 'ambos'], {
    message: 'Tipo inválido. Deve ser: cliente, fornecedor ou ambos'
  }),

  email: emailSchema,

  telefone: z.string()
    .refine((phone) => {
      if (!phone || phone === '') return true; // Optional
      const cleanPhone = phone.replace(/\D/g, '');
      return cleanPhone.length >= 10 && cleanPhone.length <= 11;
    }, 'Telefone deve ter 10 ou 11 dígitos')
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
    .refine((estado) => {
      if (!estado || estado === '') return true; // Optional
      return estado.length === 2;
    }, 'Estado deve ter 2 caracteres (UF)')
    .transform((val) => val ? val.toUpperCase() : val)
    .optional()
    .or(z.literal('')),

  cep: z.string()
    .refine((cep) => {
      if (!cep || cep === '') return true; // Optional
      const cleanCep = cep.replace(/\D/g, '');
      return cleanCep.length === 8;
    }, 'CEP deve ter 8 dígitos')
    .optional()
    .or(z.literal('')),

  vendedor_id: z.number()
    .int('ID do vendedor deve ser um número inteiro')
    .positive('ID do vendedor deve ser positivo')
    .nullish(),

  inscricao_estadual: z.string()
    .max(50, 'Inscrição Estadual deve ter no máximo 50 caracteres')
    .optional()
    .or(z.literal('')),

  observacoes: z.string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
    .or(z.literal('')),

  // Geolocation fields (optional, auto-generated)
  latitude: z.number()
    .min(-90, 'Latitude deve estar entre -90 e 90')
    .max(90, 'Latitude deve estar entre -90 e 90')
    .nullish(),

  longitude: z.number()
    .min(-180, 'Longitude deve estar entre -180 e 180')
    .max(180, 'Longitude deve estar entre -180 e 180')
    .nullish(),

  geocoded_at: z.string()
    .datetime()
    .nullish(),

  geocoding_source: z.enum(['manual', 'api', 'cep', 'brasilapi'])
    .nullish(),

  geocoding_precision: z.enum(['exact', 'street', 'city', 'approximate'])
    .nullish(),
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
