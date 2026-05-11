-- Migration: RBAC and B2B Onboarding
-- Description: Adds 'administrador' role, updates registration trigger, and configures RLS for role hierarchy.

-- 1. Add 'administrador' to user_role enum
-- We use COMMIT to ensure the value is registered before the rest of the migration uses it in RLS policies
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'administrador';
COMMIT;


-- 2. Enhanced Trigger for User Registration
-- Handles: 
--  a) Self-registration (Creates new tenant, defaults to 'contador')
--  b) Invitation (Links to existing tenant via metadata, uses assigned 'role')
--  c) Global Admin (Assigns role, handles tenant logic)
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

        -- Apply trial logic only for new tenants
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

    -- Create User Profile linked to the tenant
    INSERT INTO public.user_profiles (id, tenant_id, role, full_name, email)
    VALUES (
        NEW.id,
        v_tenant_id,
        v_role,
        v_full_name,
        NEW.email
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS Policies for Administrator (Global Access)
-- Profiles
CREATE POLICY "Admins: Full access to user_profiles" ON public.user_profiles FOR ALL 
    USING (public.get_current_user_role() = 'administrador');

-- Tenants
CREATE POLICY "Admins: Full access to tenants" ON public.tenants FOR ALL 
    USING (public.get_current_user_role() = 'administrador');

-- Companies
CREATE POLICY "Admins: Full access to companies" ON public.companies FOR ALL 
    USING (public.get_current_user_role() = 'administrador');

-- Tax Documents
CREATE POLICY "Admins: Full access to tax_documents" ON public.tax_documents FOR ALL 
    USING (public.get_current_user_role() = 'administrador');

-- 4. RLS Policies for Cliente (Restricted Read-only Access)
-- Clientes can only see companies within their tenant
CREATE POLICY "Clientes: Read-only access to tenant companies" ON public.companies FOR SELECT
    USING (tenant_id = public.get_current_user_tenant_id());

-- Clientes can only see tax documents within their tenant
CREATE POLICY "Clientes: Read-only access to tenant tax documents" ON public.tax_documents FOR SELECT
    USING (tenant_id = public.get_current_user_tenant_id());
