/**
 * Input Validation Schema for Vendas
 * 
 * Security Enhancement: VULN-003 Fix
 * Implements comprehensive input validation using Zod
 * Prevents invalid sales, negative amounts, and data integrity issues
 */

import { z } from 'zod';

// Schema for sale item
export const vendaItemSchema = z.object({
  produto_id: z.number()
    .int('ID do produto deve ser um número inteiro')
    .positive('ID do produto deve ser positivo'),

  quantidade: z.number()
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero')
    .max(999999, 'Quantidade máxima excedida'),

  preco_unitario: z.number()
    .nonnegative('Preço unitário deve ser maior ou igual a zero')
    .max(999999.99, 'Preço unitário máximo excedido')
    .finite('Preço unitário deve ser um número válido'),

  desconto: z.number()
    .nonnegative('Desconto não pode ser negativo')
    .max(100, 'Desconto não pode ser maior que 100%')
    .optional()
    .default(0),

  subtotal: z.number()
    .nonnegative('Subtotal deve ser maior ou igual a zero')
    .finite('Subtotal deve ser um número válido'),
});

// Schema for sale
export const vendaSchema = z.object({
  cliente_id: z.number()
    .int('ID do cliente deve ser um número inteiro')
    .positive('ID do cliente deve ser positivo'),

  vendedor_id: z.number()
    .int('ID do vendedor deve ser um número inteiro')
    .positive('ID do vendedor deve ser positivo')
    .optional(),

  data_venda: z.string()
    .datetime('Data da venda inválida')
    .or(z.date())
    .optional(),

  valor_total: z.number()
    .nonnegative('Valor total deve ser maior ou igual a zero')
    .max(9999999.99, 'Valor total máximo excedido')
    .finite('Valor total deve ser um número válido'),

  desconto_total: z.number()
    .nonnegative('Desconto total não pode ser negativo')
    .max(9999999.99, 'Desconto total máximo excedido')
    .optional()
    .default(0),

  forma_pagamento: z.enum([
    'dinheiro',
    'cartao_credito',
    'cartao_debito',
    'pix',
    'boleto',
    'transferencia',
    'cheque',
    'crediario'
  ], {
    message: 'Forma de pagamento inválida'
  }),

  status: z.enum(['pendente', 'concluida', 'cancelada'], {
    message: 'Status inválido'
  }).optional().default('pendente'),

  observacoes: z.string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .trim()
    .optional()
    .or(z.literal('')),

  itens: z.array(vendaItemSchema)
    .min(1, 'Venda deve ter pelo menos 1 item')
    .max(100, 'Venda não pode ter mais de 100 itens'),

}).refine((data) => {
  // Business rule: valor_total should match sum of item subtotals
  const itemsTotal = data.itens.reduce((sum, item) => sum + item.subtotal, 0);
  const expectedTotal = itemsTotal - (data.desconto_total || 0);
  
  // Allow small floating point differences
  return Math.abs(data.valor_total - expectedTotal) < 0.01;
}, {
  message: 'Valor total não corresponde à soma dos itens',
  path: ['valor_total']
});

// Schema for creating a new sale
export const vendaCreateSchema = vendaSchema;

// Schema for updating a sale
export const vendaUpdateSchema = vendaSchema.partial().extend({
  id: z.number().int().positive()
});

// Type inference
export type VendaInput = z.infer<typeof vendaSchema>;
export type VendaUpdateInput = z.infer<typeof vendaUpdateSchema>;
export type VendaItemInput = z.infer<typeof vendaItemSchema>;
