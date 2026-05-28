ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS upload_id UUID REFERENCES public.csv_upload_history(id) ON DELETE CASCADE;
