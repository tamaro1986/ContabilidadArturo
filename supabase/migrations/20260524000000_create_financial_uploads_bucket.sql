-- Migration: Create Storage Bucket for Financial Uploads
-- Created: 2026-05-24

-- Create the bucket for financial data uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('financial_uploads', 'financial_uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage.objects for the financial_uploads bucket
-- 1. Allow authenticated users (contadores) to select/download their own tenant's files
CREATE POLICY "Contadores can view their tenant uploads"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'financial_uploads' AND
        (storage.foldername(name))[1] = public.get_current_user_tenant_id()::text
    );

-- Note: Uploads are currently handled by the backend using the Service Role key,
-- so we don't strictly need an INSERT policy for authenticated users.
-- However, we add it just in case direct uploads from frontend are implemented later.
CREATE POLICY "Contadores can upload to their tenant folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'financial_uploads' AND
        (storage.foldername(name))[1] = public.get_current_user_tenant_id()::text
    );
