-- Migration: Add company_id and customer_name to financial_records
-- Description: The processing tasks script inserts company_id and customer_name, but these columns were missing from the financial_records schema.

ALTER TABLE public.financial_records
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
ADD COLUMN customer_name VARCHAR(255);

-- Performance index for queries by company
CREATE INDEX IF NOT EXISTS idx_financial_records_company_id ON public.financial_records(company_id);
