-- Migration: Add file_hash dedup for csv_upload_history
--
-- Evita subir el mismo archivo dos veces al mismo tenant.
-- El hash SHA-256 se calcula en el backend antes del upload.

ALTER TABLE public.csv_upload_history
    ADD COLUMN IF NOT EXISTS file_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_csv_upload_file_hash
    ON public.csv_upload_history(tenant_id, file_hash)
    WHERE file_hash IS NOT NULL;

COMMENT ON COLUMN public.csv_upload_history.file_hash IS 'SHA-256 del contenido del archivo subido';
