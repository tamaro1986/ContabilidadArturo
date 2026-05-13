-- Migration: Add exento_amount to financial_records
-- Description: Adds the exento_amount column to track exempt amounts for tax annexes.

ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS exento_amount NUMERIC(15, 2) DEFAULT 0.00;

COMMENT ON COLUMN public.financial_records.exento_amount IS 'Amount exempt from taxes (IVA/ISR) for this transaction';
