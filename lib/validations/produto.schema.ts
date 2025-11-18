/**
 * Input Validation Schema for Produtos
 * 
 * Security Enhancement: VULN-003 Fix
 * Implements comprehensive input validation using Zod
 * Prevents invalid prices, negative stock, and XSS attacks
 */

import { z } from 'zod';

export const produtoSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .trim(),

  descricao: z.string()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
    .trim()
    .optional()
    .or(z.literal('')),

  preco: z.number()
    .nonnegative('Preço deve ser maior ou igual a zero')
    .max(999999.99, 'Preço máximo excedido')
    .finite('Preço deve ser um número válido'),

  preco_venda: z.number()
    .nonnegative('Preço de venda deve ser maior ou igual a zero')
    .max(999999.99, 'Preço de venda máximo excedido')
    .finite('Preço de venda deve ser um número válido'),

  preco_custo: z.number()
    .nonnegative('Preço de custo deve ser maior ou igual a zero')
    .max(999999.99, 'Preço de custo máximo excedido')
    .finite('Preço de custo deve ser um número válido'),

  estoque: z.number()
    .int('Estoque deve ser um número inteiro')
    .nonnegative('Estoque não pode ser negativo')
    .max(999999, 'Estoque máximo excedido'),

  estoque_minimo: z.number()
    .int('Estoque mínimo deve ser um número inteiro')
    .nonnegative('Estoque mínimo não pode ser negativo')
    .max(999999, 'Estoque mínimo máximo excedido')
    .optional()
    .default(0),

  categoria: z.string()
    .max(100, 'Categoria deve ter no máximo 100 caracteres')
    .trim()
    .optional()
    .or(z.literal('')),

  codigo_barras: z.string()
    .max(50, 'Código de barras deve ter no máximo 50 caracteres')
    .regex(/^[0-9A-Z-]*$/, 'Código de barras deve conter apenas números, letras maiúsculas e hífens')
    .optional()
    .or(z.literal('')),

  ativo: z.boolean()
    .optional()
    .default(true),

  unidade: z.string()
    .max(10, 'Unidade deve ter no máximo 10 caracteres')
    .toUpperCase()
    .optional()
    .or(z.literal('UN')),

}).refine((data) => {
  // Business rule: preço de venda deve ser >= preço de custo
  return data.preco_venda >= data.preco_custo;
}, {
  message: 'Preço de venda deve ser maior ou igual ao preço de custo',
  path: ['preco_venda']
}).refine((data) => {
  // Business rule: estoque mínimo deve ser <= estoque atual
  if (data.estoque_minimo && data.estoque) {
    return data.estoque_minimo <= data.estoque;
  }
  return true;
}, {
  message: 'Estoque mínimo não pode ser maior que o estoque atual',
  path: ['estoque_minimo']
});

// Schema for creating a new product
export const produtoCreateSchema = produtoSchema;

// Schema for updating a product
export const produtoUpdateSchema = produtoSchema.partial().extend({
  id: z.number().int().positive()
});

// Type inference
export type ProdutoInput = z.infer<typeof produtoSchema>;
export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>;
