-- Scratch script to backfill user_profiles for existing auth.users
-- Run this once to fix users who registered while the trigger was missing.

DO $$
DECLARE
    r RECORD;
    v_tenant_id UUID;
    v_role public.user_role;
    v_full_name TEXT;
    v_tenant_name TEXT;
BEGIN
    FOR r IN SELECT * FROM auth.users WHERE id NOT IN (SELECT id FROM public.user_profiles) LOOP
        -- Extract metadata
        v_full_name := COALESCE(r.raw_user_meta_data->>'full_name', 'Usuario Backfill');
        v_tenant_name := COALESCE(r.raw_user_meta_data->>'tenant_name', 'Firma Contable Backfill');
        v_role := COALESCE((r.raw_user_meta_data->>'role')::public.user_role, 'contador');

        -- Create a tenant for them if they don't have one in metadata
        INSERT INTO public.tenants (name)
        VALUES (v_tenant_name)
        RETURNING id INTO v_tenant_id;

        -- Create profile
        INSERT INTO public.user_profiles (id, tenant_id, role, full_name, email)
        VALUES (r.id, v_tenant_id, v_role, v_full_name, r.email);
        
        RAISE NOTICE 'Backfilled profile for user: %', r.email;
    END LOOP;
END $$;
