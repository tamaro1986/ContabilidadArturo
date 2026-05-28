-- Migration: Add metadata columns to companies table
--
-- Agrega columnas para el portafolio de empresas:
--   - status: estado actual (active/pending/error)
--   - total_records: cantidad de registros financieros asociados
--   - last_processed_month: último mes procesado (ej. "2024-07")

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS total_records INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_processed_month TEXT;

-- Actualizar total_records desde financial_records existentes
UPDATE public.companies c
SET total_records = (
    SELECT COUNT(*) FROM public.financial_records fr
    WHERE fr.company_id = c.id AND fr.status = 'Valido'
);

COMMENT ON COLUMN public.companies.status IS 'Estado actual: active, pending, error';
COMMENT ON COLUMN public.companies.total_records IS 'Cantidad de registros financieros válidos asociados';
COMMENT ON COLUMN public.companies.last_processed_month IS 'Último mes procesado en formato YYYY-MM';
