-- Migration: Fix duplicate trigger and missing RLS policies
-- 
-- Problemas corregidos:
--   1. Trigger duplicado: on_auth_user_created_registration ejecutaba
--      handle_new_user_registration() DOS veces por registro, creando
--      tenants huérfanos y corrompiendo user_profiles.tenant_id.
--   2. Faltaban políticas RLS para 'administrador' en financial_records
--      y csv_upload_history — los admines recibían permission denied.
--   3. FK faltante en csv_upload_history.tenant_id — sin integridad referencial.

-- 1. Eliminar trigger duplicado (el original on_auth_user_created se conserva)
DROP TRIGGER IF EXISTS on_auth_user_created_registration ON auth.users;

-- 2. Agregar política RLS para administrador en financial_records
DROP POLICY IF EXISTS "Admins: Full access to financial_records" ON public.financial_records;
CREATE POLICY "Admins: Full access to financial_records"
    ON public.financial_records FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'administrador')
    WITH CHECK (public.get_current_user_role() = 'administrador');

-- 3. Agregar política RLS para administrador en csv_upload_history
DROP POLICY IF EXISTS "Admins: Full access to csv_upload_history" ON public.csv_upload_history;
CREATE POLICY "Admins: Full access to csv_upload_history"
    ON public.csv_upload_history FOR ALL
    TO authenticated
    USING (public.get_current_user_role() = 'administrador')
    WITH CHECK (public.get_current_user_role() = 'administrador');

-- 4. Agregar FK faltante en csv_upload_history.tenant_id
--    (en producción puede haber filas sin FK, por eso NOT VALID primero)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'csv_upload_history_tenant_id_fkey'
    ) THEN
        ALTER TABLE public.csv_upload_history
            ADD CONSTRAINT csv_upload_history_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
            NOT VALID;
    END IF;
END $$;

-- 5. Validar la FK para filas existentes (opcional, silencioso si hay violaciones)
DO $$
BEGIN
    EXECUTE 'ALTER TABLE public.csv_upload_history VALIDATE CONSTRAINT csv_upload_history_tenant_id_fkey';
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo validar la FK csv_upload_history_tenant_id_fkey (puede haber filas huérfanas): %', SQLERRM;
END $$;
