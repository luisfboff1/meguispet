-- Migration: Adicionar colunas sem_ipi e sem_st na tabela vendas
-- Data: 2026-01-16
-- Descrição: Permite controle individual de IPI e ST nas vendas
--
-- IMPORTANTE: Execute este SQL no Supabase Dashboard > SQL Editor

-- Adicionar colunas sem_ipi e sem_st na tabela vendas
ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS sem_ipi BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sem_st BOOLEAN DEFAULT FALSE;

-- Adicionar comentários para documentação
COMMENT ON COLUMN vendas.sem_ipi IS 'Indica se a venda é sem IPI';
COMMENT ON COLUMN vendas.sem_st IS 'Indica se a venda é sem ST';
