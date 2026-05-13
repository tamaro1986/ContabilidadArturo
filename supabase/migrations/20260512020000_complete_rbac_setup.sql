-- Migration: Complete RBAC and Registration Fix
-- Description: Adds missing trigger for auth.users, fixes RLS policies for Admin/Contador, and handles existing users.

-- 1. Attach the registration trigger to auth.users
-- This was missing in previous migrations.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_registration'
    ) THEN
        CREATE TRIGGER on_auth_user_created_registration
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();
    END IF;
END $$;


-- 2. Enhanced handle_new_user_registration (Resilience)
-- Updated to handle potential conflicts and ensure 'administrador' gets the right setup.
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_days INTEGER := 7;
    v_promo_code TEXT;
    v_full_name TEXT;
    v_tenant_name TEXT;
    v_role public.user_role;
    v_metadata_tenant_id TEXT;
BEGIN
    -- Extract metadata from Auth
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario');
    v_tenant_name := COALESCE(NEW.raw_user_meta_data->>'tenant_name', 'Nueva Firma Contable');
    v_promo_code := NEW.raw_user_meta_data->>'promo_code';
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'contador');
    v_metadata_tenant_id := NEW.raw_user_meta_data->>'tenant_id';

    -- LOGIC: Invitation vs Self-Registration
    IF v_metadata_tenant_id IS NOT NULL AND v_metadata_tenant_id <> '' THEN
        -- Invitation path: User is joining an existing tenant
        v_tenant_id := v_metadata_tenant_id::UUID;
    ELSE
        -- Self-Registration path: Create a new tenant
        INSERT INTO public.tenants (name)
        VALUES (v_tenant_name)
        RETURNING id INTO v_tenant_id;

        -- Apply trial logic
        IF v_promo_code IS NOT NULL AND v_promo_code <> '' THEN
            SELECT days_granted INTO v_days
            FROM public.promo_codes
            WHERE code = v_promo_code AND is_active = TRUE;
            IF NOT FOUND THEN v_days := 7; END IF;
        END IF;

        UPDATE public.tenants
        SET trial_ends_at = NOW() + (v_days || ' days')::INTERVAL
        WHERE id = v_tenant_id;
    END IF;

    -- Create User Profile (with ON CONFLICT just in case)
    INSERT INTO public.user_profiles (id, tenant_id, role, full_name, email)
    VALUES (
        NEW.id,
        v_tenant_id,
        v_role,
        v_full_name,
        NEW.email
    )
    ON CONFLICT (id) DO UPDATE 
    SET 
        tenant_id = EXCLUDED.tenant_id,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Fix RLS for 'companies' and 'tax_documents'
-- Ensure 'administrador' has FULL access (including WITH CHECK)
-- and 'contador' is correctly scoped.

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Admins: Full access to companies" ON public.companies;
DROP POLICY IF EXISTS "Contadors can perform all actions on tenant companies" ON public.companies;
DROP POLICY IF EXISTS "Contadors: Full access to tenant companies" ON public.companies;

CREATE POLICY "Admins: Full access to companies" ON public.companies FOR ALL 
    TO authenticated
    USING (public.get_current_user_role() = 'administrador')
    WITH CHECK (public.get_current_user_role() = 'administrador');

CREATE POLICY "Contadors: Full access to tenant companies" ON public.companies FOR ALL
    TO authenticated
    USING (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    )
    WITH CHECK (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    );

-- Same for tax_documents
DROP POLICY IF EXISTS "Admins: Full access to tax_documents" ON public.tax_documents;
DROP POLICY IF EXISTS "Contadors can perform all actions on tenant tax documents" ON public.tax_documents;
DROP POLICY IF EXISTS "Contadors: Full access to tenant tax documents" ON public.tax_documents;

CREATE POLICY "Admins: Full access to tax_documents" ON public.tax_documents FOR ALL 
    TO authenticated
    USING (public.get_current_user_role() = 'administrador')
    WITH CHECK (public.get_current_user_role() = 'administrador');

CREATE POLICY "Contadors: Full access to tenant tax documents" ON public.tax_documents FOR ALL
    TO authenticated
    USING (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    )
    WITH CHECK (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    );
