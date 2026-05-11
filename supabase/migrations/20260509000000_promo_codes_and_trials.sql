-- Migration: Promo Codes and Trial Management
-- Created: 2026-05-09

-- 1. Table for Promo Codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    days_granted INTEGER NOT NULL DEFAULT 7,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add trial_ends_at to tenants
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='tenants' AND COLUMN_NAME='trial_ends_at') THEN
        ALTER TABLE public.tenants ADD COLUMN trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days';
    END IF;
END $$;

-- 3. RLS for promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on promo_codes"
    ON public.promo_codes FOR ALL
    USING (
        auth.jwt() ->> 'email' = 'enrique@arturo.com' OR -- Replace with actual admin email if known
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'contador')
    );

CREATE POLICY "Authenticated users can select active promo codes"
    ON public.promo_codes FOR SELECT
    USING (is_active = TRUE);

-- 4. Unified Trigger for New User Registration
-- This replaces manual profile/tenant creation by handling it atomically on Auth SignUp
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_days INTEGER := 7; -- Default trial days
    v_promo_code TEXT;
    v_full_name TEXT;
    v_tenant_name TEXT;
BEGIN
    -- Extract metadata from Auth SignUp
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario Principal');
    v_tenant_name := COALESCE(NEW.raw_user_meta_data->>'tenant_name', 'Firma Contable New');
    v_promo_code := NEW.raw_user_meta_data->>'promo_code';

    -- 1. Create the Tenant
    INSERT INTO public.tenants (name)
    VALUES (v_tenant_name)
    RETURNING id INTO v_tenant_id;

    -- 2. Validate Promo Code if provided
    IF v_promo_code IS NOT NULL AND v_promo_code <> '' THEN
        SELECT days_granted INTO v_days
        FROM public.promo_codes
        WHERE code = v_promo_code AND is_active = TRUE;
        
        -- If code is invalid or not found, fall back to 7 days
        IF NOT FOUND THEN
            v_days := 7;
        END IF;
    END IF;

    -- 3. Update Tenant with Trial Date
    UPDATE public.tenants
    SET trial_ends_at = NOW() + (v_days || ' days')::INTERVAL
    WHERE id = v_tenant_id;

    -- 4. Create User Profile
    INSERT INTO public.user_profiles (id, tenant_id, role, full_name, email)
    VALUES (
        NEW.id,
        v_tenant_id,
        'contador', -- First user of a tenant is the admin/contador
        v_full_name,
        NEW.email
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();
