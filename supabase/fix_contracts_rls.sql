-- ==============================================================================
-- CORREÇÃO DE POLÍTICAS DE RLS - GESTÃO DE CONTRATOS
-- Execute este script no SQL Editor do Supabase para liberar o salvamento de
-- contratos manuais e gerenciamento de solicitações e modelos.
-- ==============================================================================

-- 1. HABILITAÇÃO DO RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_models ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA A TABELA CONTRACTS
DROP POLICY IF EXISTS "Enable select for everyone on contracts" ON public.contracts;
DROP POLICY IF EXISTS "Enable select for everyone" ON public.contracts;
CREATE POLICY "Enable select for everyone on contracts" 
ON public.contracts FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.contracts;
DROP POLICY IF EXISTS "Enable insert for all on contracts" ON public.contracts;
CREATE POLICY "Enable insert for all on contracts" 
ON public.contracts FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for anyone (sign contract)" ON public.contracts;
DROP POLICY IF EXISTS "Enable update for all on contracts" ON public.contracts;
CREATE POLICY "Enable update for all on contracts" 
ON public.contracts FOR UPDATE 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.contracts;
DROP POLICY IF EXISTS "Enable delete for all on contracts" ON public.contracts;
CREATE POLICY "Enable delete for all on contracts" 
ON public.contracts FOR DELETE 
USING (true);

-- 3. POLÍTICAS PARA A TABELA CONTRACT_MODELS
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.contract_models;
DROP POLICY IF EXISTS "Enable all on contract_models" ON public.contract_models;
CREATE POLICY "Enable all on contract_models" 
ON public.contract_models FOR ALL 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for everyone" ON public.contract_models;
CREATE POLICY "Enable select for everyone on contract_models" 
ON public.contract_models FOR SELECT 
USING (true);

-- 4. GARANTE ACESSO PÚBLICO AO BUCKET CONTRACTS
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'contracts');
