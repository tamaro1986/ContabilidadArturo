-- Configuración inicial para la base de datos de Contabilidad (SaaS Multi-tenant)

-- Extensión para usar gen_random_uuid() si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tipo Enum para los roles
CREATE TYPE user_role AS ENUM ('contador', 'cliente');

-- 2. Tabla Tenants (Empresas/Firmas contables)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla User Profiles (Extiende auth.users de Supabase)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'cliente',
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla de Ejemplo para demostrar el aislamiento (Facturas o Documentos)
CREATE TABLE public.client_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Función de ayuda para obtener el tenant_id del usuario actual a través de JWT
-- Cuando FastAPI hace peticiones en nombre del usuario, pasará el JWT.
-- Supabase setea el auth.uid() basado en ese JWT.
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id
    FROM public.user_profiles
    WHERE id = auth.uid();
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- POLÍTICAS PARA TENANTS
-- ==========================================
-- Ambos roles (contador y cliente) pueden leer el tenant al que pertenecen.
CREATE POLICY "Tenants are viewable by users who belong to them"
    ON public.tenants FOR SELECT
    USING (id = public.get_current_user_tenant_id());

-- ==========================================
-- POLÍTICAS PARA USER PROFILES
-- ==========================================
-- Los usuarios pueden leer su propio perfil
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (id = auth.uid());

-- Contadores pueden leer todos los perfiles de su tenant
CREATE POLICY "Contadors can view all profiles in their tenant"
    ON public.user_profiles FOR SELECT
    USING (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    );

-- Contadores pueden actualizar perfiles de su tenant
CREATE POLICY "Contadors can update profiles in their tenant"
    ON public.user_profiles FOR UPDATE
    USING (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    );


-- ==========================================
-- POLÍTICAS PARA CLIENT DOCUMENTS (Ejemplo)
-- ==========================================
-- Contadores pueden ver/escribir todos los documentos en su tenant
CREATE POLICY "Contadors can do all on tenant documents"
    ON public.client_documents FOR ALL
    USING (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    );

-- Clientes solo pueden ver y crear sus propios documentos
CREATE POLICY "Clientes can select their own documents"
    ON public.client_documents FOR SELECT
    USING (client_id = auth.uid());

CREATE POLICY "Clientes can insert their own documents"
    ON public.client_documents FOR INSERT
    WITH CHECK (
        client_id = auth.uid() 
        AND tenant_id = public.get_current_user_tenant_id()
    );

-- =========================================================================
-- TRIGGER PARA CREACIÓN AUTOMÁTICA DE PERFIL (Opcional)
-- Dado que la creación del tenant puede darse al mismo tiempo, 
-- se recomienda manejar la inserción del `user_profile` y `tenant` 
-- desde el Backend (FastAPI) de forma transaccional o a través de supabase-admin.
-- =========================================================================
