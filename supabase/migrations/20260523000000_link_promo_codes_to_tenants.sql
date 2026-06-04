-- Migration: Link Promo Codes to Tenants
-- Created: 2026-05-23

-- 1. Add tenant_id to promo_codes
ALTER TABLE public.promo_codes
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 2. Update RLS policies for promo_codes to allow authenticated users 
-- to select if it belongs to their tenant OR if they are admins.
-- The previous policy:
-- CREATE POLICY "Authenticated users can select active promo codes" ON public.promo_codes FOR SELECT USING (is_active = TRUE);
-- We'll modify it to allow selecting active codes that belong to the user's tenant.

DROP POLICY IF EXISTS "Authenticated users can select active promo codes" ON public.promo_codes;

CREATE POLICY "Authenticated users can select their tenant active promo codes"
    ON public.promo_codes FOR SELECT
    USING (
        is_active = TRUE AND 
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
    );
