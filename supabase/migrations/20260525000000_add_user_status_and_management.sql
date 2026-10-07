-- Migration: Add user status and enhanced user management
-- Description: Adds is_active column to user_profiles and updates registration trigger

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Update trigger function to handle is_active and support all roles properly
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
    v_is_active BOOLEAN := TRUE;
BEGIN
    -- Extract metadata from Auth
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario');
    v_tenant_name := COALESCE(NEW.raw_user_meta_data->>'tenant_name', 'Nueva Firma Contable');
    v_promo_code := NEW.raw_user_meta_data->>'promo_code';
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'contador');
    v_metadata_tenant_id := NEW.raw_user_meta_data->>'tenant_id';

    -- LOGIC: Invitation / Admin create vs Self-Registration
    IF v_metadata_tenant_id IS NOT NULL AND v_metadata_tenant_id <> '' THEN
        v_tenant_id := v_metadata_tenant_id::UUID;
    ELSE
        INSERT INTO public.tenants (name)
        VALUES (v_tenant_name)
        RETURNING id INTO v_tenant_id;

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

    -- Create/Update User Profile
    INSERT INTO public.user_profiles (id, tenant_id, role, full_name, email, is_active)
    VALUES (
        NEW.id,
        v_tenant_id,
        v_role,
        v_full_name,
        NEW.email,
        v_is_active
    )
    ON CONFLICT (id) DO UPDATE 
    SET 
        tenant_id = EXCLUDED.tenant_id,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        is_active = COALESCE(public.user_profiles.is_active, TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
