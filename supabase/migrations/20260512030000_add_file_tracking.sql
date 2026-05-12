-- Migration: Add filename and file_path to tax_documents
-- Description: Ensures we can track the physical file in storage and show a friendly name.

ALTER TABLE public.tax_documents 
ADD COLUMN IF NOT EXISTS filename TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Refresh policies (optional but good for visibility)
COMMENT ON COLUMN public.tax_documents.filename IS 'Friendly name of the uploaded file';
COMMENT ON COLUMN public.tax_documents.file_path IS 'Path to the file in Supabase Storage';
