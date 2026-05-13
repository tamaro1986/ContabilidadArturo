-- Migration: CSV Upload Traceability Evolution
-- Description: Evolves the tax_documents table to support full processing status, error tracking and user traceability.

-- 1. Create the status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'csv_upload_status') THEN
        CREATE TYPE public.csv_upload_status AS ENUM ('pending', 'processing', 'success', 'error');
    END IF;
END $$;

-- 2. Evolve tax_documents table
ALTER TABLE public.tax_documents 
    ADD COLUMN IF NOT EXISTS records_processed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- 3. Convert existing status column to enum if it's text
-- Drop default first to avoid casting issues
ALTER TABLE public.tax_documents ALTER COLUMN status DROP DEFAULT;

-- We handle the case where status might be 'processed' (from existing code) and map it to 'success'
ALTER TABLE public.tax_documents 
    ALTER COLUMN status TYPE public.csv_upload_status 
    USING (
        CASE 
            WHEN status = 'processed' THEN 'success'::public.csv_upload_status
            WHEN status = 'success' THEN 'success'::public.csv_upload_status
            WHEN status = 'error' THEN 'error'::public.csv_upload_status
            WHEN status = 'processing' THEN 'processing'::public.csv_upload_status
            ELSE 'pending'::public.csv_upload_status
        END
    );

-- 4. Set default value for status
ALTER TABLE public.tax_documents ALTER COLUMN status SET DEFAULT 'pending'::public.csv_upload_status;

-- 5. Add index for performance on dashboard queries
CREATE INDEX IF NOT EXISTS idx_tax_docs_tenant_created ON public.tax_documents(tenant_id, created_at DESC);

-- 6. Ensure RLS Policies are correct for traceability
-- We assume basic RLS is already active on tax_documents. 
-- We add/refine policies to ensure only members of the tenant see the history.

DROP POLICY IF EXISTS "Users can view their own tenant upload history" ON public.tax_documents;
CREATE POLICY "Users can view their own tenant upload history"
    ON public.tax_documents
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert upload records for their tenant" ON public.tax_documents;
CREATE POLICY "Users can insert upload records for their tenant"
    ON public.tax_documents
    FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

-- Update comments for clarity
COMMENT ON COLUMN public.tax_documents.status IS 'Current processing status of the CSV file';
COMMENT ON COLUMN public.tax_documents.records_processed IS 'Number of rows successfully inserted into financial_records';
COMMENT ON COLUMN public.tax_documents.error_message IS 'Detailed error message if processing failed';
COMMENT ON COLUMN public.tax_documents.uploaded_by IS 'Reference to the user who performed the upload';
