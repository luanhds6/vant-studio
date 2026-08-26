-- ==============================================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS - VANT STUDIO
-- Execute este script no SQL Editor do seu novo projeto no Supabase
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELAS PÚBLICAS
-- ==============================================================================

-- 2.1 PROFILES (Perfis de Usuários sincronizados com auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user',
    permissions TEXT[],
    profile_photo TEXT,
    must_change_password BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.2 FABRIC_INDUSTRIES (Indústrias têxteis)
CREATE TABLE IF NOT EXISTS public.fabric_industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.3 FABRIC_TYPES (Tipos de Tecido vinculados a Indústrias)
CREATE TABLE IF NOT EXISTS public.fabric_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES public.fabric_industries(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.4 COLORS (Cores vinculadas a Tipos de Tecido)
CREATE TABLE IF NOT EXISTS public.colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fabric_type_id UUID REFERENCES public.fabric_types(id) ON DELETE CASCADE,
    codigo TEXT,
    nome TEXT NOT NULL,
    hex TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.5 HOSPITALS (Unidades / Hospitais)
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cidade TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.6 PRODUCTS (Produtos dos Hospitais)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT,
    referencia TEXT,
    tecido TEXT,
    tamanhos TEXT[],
    cores JSONB,
    dimensoes JSONB,
    detalhes JSONB,
    imagem_principal TEXT,
    imagens_detalhe JSONB,
    pintura JSONB,
    marca_cliente JSONB,
    nome_campo JSONB,
    timbrado JSONB DEFAULT '{"ativo": false, "imagem": ""}'::jsonb,
    rastreavel JSONB DEFAULT '{"ativo": false, "imagem": ""}'::jsonb,
    arquivado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.7 COMPANY_SETTINGS (Configurações gerais da empresa / marca)
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    logo TEXT,
    nome_empresa TEXT,
    slogan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.8 CONTRACT_MODELS (Modelos de Contratos)
CREATE TABLE IF NOT EXISTS public.contract_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.9 CONTRACTS (Contratos gerados / assinados)
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES public.contract_models(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    signer_name TEXT,
    signer_cpf TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    is_manual BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_fabric_types_industry_id ON public.fabric_types USING btree (industry_id);
CREATE INDEX IF NOT EXISTS idx_colors_fabric_type_id ON public.colors USING btree (fabric_type_id);
CREATE INDEX IF NOT EXISTS idx_products_hospital_id ON public.products USING btree (hospital_id);
CREATE INDEX IF NOT EXISTS idx_products_arquivado ON public.products USING btree (arquivado);
CREATE INDEX IF NOT EXISTS idx_products_hospital_arquivado ON public.products USING btree (hospital_id, arquivado);
CREATE INDEX IF NOT EXISTS idx_products_referencia ON public.products USING btree (referencia);

-- ==============================================================================
-- 4. FUNÇÕES DO SISTEMA (SECURITY DEFINER)
-- ==============================================================================

-- 4.1 Validação de permissão de administrador ou gestor de usuários
CREATE OR REPLACE FUNCTION public.can_manage_user_profiles()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        lower(trim(p.role::text)) IN (
          'admin',
          'administrador',
          'administrator',
          'master',
          'administrador master'
        )
        OR (p.permissions IS NOT NULL AND 'usuarios' = ANY (p.permissions))
      )
  );
$$;

-- 4.2 Trigger ao criar usuário em auth.users -> cria perfil correspondente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, permissions)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'administrador', 'master') THEN 
        ARRAY['pagina_inicial', 'gerar_catalogo', 'novo_produto', 'produtos', 'configuracoes', 'usuarios']
      ELSE 
        ARRAY['gerar_catalogo']
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

-- 4.3 Trigger ao excluir usuário em auth.users -> remove perfil correspondente
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- ==============================================================================
-- 5. TRIGGERS EM auth.users
-- ==============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

-- ==============================================================================
-- 6. HABILITAÇÃO DO ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 7. POLÍTICAS DE ACESSO (RLS POLICIES)
-- ==============================================================================

-- 7.1 PROFILES
DROP POLICY IF EXISTS "Admins see all" ON public.profiles;
CREATE POLICY "Admins see all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "User managers can insert profiles" ON public.profiles;
CREATE POLICY "User managers can insert profiles" ON public.profiles FOR INSERT WITH CHECK (can_manage_user_profiles());

DROP POLICY IF EXISTS "User managers can update any profile" ON public.profiles;
CREATE POLICY "User managers can update any profile" ON public.profiles FOR UPDATE USING (can_manage_user_profiles()) WITH CHECK (can_manage_user_profiles());

DROP POLICY IF EXISTS "User managers can delete profiles" ON public.profiles;
CREATE POLICY "User managers can delete profiles" ON public.profiles FOR DELETE USING (can_manage_user_profiles());

DROP POLICY IF EXISTS "Service role bypass" ON public.profiles;
CREATE POLICY "Service role bypass" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 7.2 FABRIC_INDUSTRIES
DROP POLICY IF EXISTS "Allow authenticated to manage fabric_industries" ON public.fabric_industries;
CREATE POLICY "Allow authenticated to manage fabric_industries" ON public.fabric_industries FOR ALL USING (auth.role() = 'authenticated');

-- 7.3 FABRIC_TYPES
DROP POLICY IF EXISTS "Allow authenticated to manage fabric_types" ON public.fabric_types;
CREATE POLICY "Allow authenticated to manage fabric_types" ON public.fabric_types FOR ALL USING (auth.role() = 'authenticated');

-- 7.4 COLORS
DROP POLICY IF EXISTS "Allow authenticated to manage colors" ON public.colors;
CREATE POLICY "Allow authenticated to manage colors" ON public.colors FOR ALL USING (auth.role() = 'authenticated');

-- 7.5 HOSPITALS
DROP POLICY IF EXISTS "Allow authenticated to manage hospitals" ON public.hospitals;
CREATE POLICY "Allow authenticated to manage hospitals" ON public.hospitals FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated to read hospitals" ON public.hospitals;
CREATE POLICY "Allow authenticated to read hospitals" ON public.hospitals FOR SELECT USING (auth.role() = 'authenticated');

-- 7.6 PRODUCTS
DROP POLICY IF EXISTS "Allow authenticated to manage products" ON public.products;
CREATE POLICY "Allow authenticated to manage products" ON public.products FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated to read products" ON public.products;
CREATE POLICY "Allow authenticated to read products" ON public.products FOR SELECT USING (auth.role() = 'authenticated');

-- 7.7 COMPANY_SETTINGS
DROP POLICY IF EXISTS "Allow admins to manage settings" ON public.company_settings;
CREATE POLICY "Allow admins to manage settings" ON public.company_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "Allow authenticated to read settings" ON public.company_settings;
CREATE POLICY "Allow authenticated to read settings" ON public.company_settings FOR SELECT USING (auth.role() = 'authenticated');

-- 7.8 CONTRACT_MODELS
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.contract_models;
CREATE POLICY "Enable all for authenticated users" ON public.contract_models FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable select for everyone" ON public.contract_models;
CREATE POLICY "Enable select for everyone" ON public.contract_models FOR SELECT USING (true);

-- 7.9 CONTRACTS
DROP POLICY IF EXISTS "Enable select for everyone on contracts" ON public.contracts;
CREATE POLICY "Enable select for everyone on contracts" ON public.contracts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.contracts;
CREATE POLICY "Enable insert for authenticated users only" ON public.contracts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for anyone (sign contract)" ON public.contracts;
CREATE POLICY "Enable update for anyone (sign contract)" ON public.contracts FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.contracts;
CREATE POLICY "Enable delete for authenticated users" ON public.contracts FOR DELETE TO authenticated USING (true);

-- ==============================================================================
-- 8. STORAGE BUCKET (CONTRATOS)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para o Bucket 'contracts'
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'contracts');
