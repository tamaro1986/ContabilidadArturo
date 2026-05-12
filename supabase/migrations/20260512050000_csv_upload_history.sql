-- Migration: Create csv_upload_history table for traceability
-- Description: Creates the dedicated table for tracking CSV uploads as requested by the Senior Architect.

-- 1. Create the status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'csv_upload_status') THEN
        CREATE TYPE public.csv_upload_status AS ENUM ('pending', 'processing', 'success', 'error');
    END IF;
END $$;

-- 2. Create the csv_upload_history table
CREATE TABLE IF NOT EXISTS public.csv_upload_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL, -- Isolated by tenant
    company_id UUID REFERENCES public.companies(id), -- Optional: associated company
    document_type TEXT, -- Tipo de documento (F07, F14, etc)
    uploaded_by UUID REFERENCES auth.users(id), -- User who uploaded
    filename TEXT NOT NULL,
    file_path TEXT, -- Path in storage
    status public.csv_upload_status DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.csv_upload_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Users can view their own tenant upload history" ON public.csv_upload_history;
CREATE POLICY "Users can view their own tenant upload history"
    ON public.csv_upload_history
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert upload records for their tenant" ON public.csv_upload_history;
CREATE POLICY "Users can insert upload records for their tenant"
    ON public.csv_upload_history
    FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

-- 5. Performance Index
CREATE INDEX IF NOT EXISTS idx_csv_upload_history_tenant_created ON public.csv_upload_history(tenant_id, created_at DESC);

-- 6. Comments
COMMENT ON TABLE public.csv_upload_history IS 'Traceability log for all financial CSV uploads';
COMMENT ON COLUMN public.csv_upload_history.status IS 'Current processing status (OWASP validated)';
