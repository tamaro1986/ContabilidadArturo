-- Migration: Fix dedup index to be per-company, not per-tenant

DROP INDEX IF EXISTS idx_csv_upload_file_hash;

CREATE UNIQUE INDEX IF NOT EXISTS idx_csv_upload_file_hash_per_company
    ON public.csv_upload_history(tenant_id, company_id, file_hash)
    WHERE file_hash IS NOT NULL;

COMMENT ON INDEX idx_csv_upload_file_hash_per_company IS 'Evita subir el mismo archivo dos veces a la misma empresa';
