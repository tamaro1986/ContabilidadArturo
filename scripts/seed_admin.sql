-- Script para inicializar el usuario Administrador en PostgreSQL del VPS
DO $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_email TEXT := 'admin@integrum.sv';
    v_password TEXT := 'Admin2026!';
BEGIN
    -- 1. Asegurar extensión pgcrypto
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- 2. Verificar si el usuario ya existe
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

    IF v_user_id IS NULL THEN
        -- Insertar en auth.users (el trigger creará el tenant y el user_profile inicial)
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, email, encrypted_password, email_confirmed_at, raw_user_meta_data
        ) VALUES (
            v_user_id,
            v_email,
            crypt(v_password, gen_salt('bf')),
            NOW(),
            jsonb_build_object('full_name', 'Administrador Integrum', 'tenant_name', 'Integrum Firma Contable', 'role', 'administrador')
        );
    ELSE
        -- Actualizar contraseña si ya existía
        UPDATE auth.users 
        SET encrypted_password = crypt(v_password, gen_salt('bf')),
            email_confirmed_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- 3. Asegurar que el perfil en user_profiles tenga rol administrador y esté activo
    UPDATE public.user_profiles
    SET role = 'administrador',
        is_active = TRUE,
        full_name = 'Administrador Integrum'
    WHERE id = v_user_id;

    -- Si por alguna razón el perfil no existía aún (ej. trigger desactivado), crearlo
    IF NOT FOUND THEN
        SELECT id INTO v_tenant_id FROM public.tenants WHERE name = 'Integrum Firma Contable' LIMIT 1;
        IF v_tenant_id IS NULL THEN
            INSERT INTO public.tenants (name, trial_ends_at)
            VALUES ('Integrum Firma Contable', NOW() + INTERVAL '10 years')
            RETURNING id INTO v_tenant_id;
        END IF;

        INSERT INTO public.user_profiles (id, tenant_id, role, full_name, email, is_active)
        VALUES (v_user_id, v_tenant_id, 'administrador', 'Administrador Integrum', v_email, TRUE)
        ON CONFLICT (id) DO UPDATE SET role = 'administrador', is_active = TRUE;
    END IF;

    RAISE NOTICE 'Usuario % configurado exitosamente como Administrador', v_email;
END $$;
