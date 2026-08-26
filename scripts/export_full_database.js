import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://kugfcjzgahljnchuxdop.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1Z2ZjanpnYWhsam5jaHV4ZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDkxODksImV4cCI6MjA5MjI4NTE4OX0.Nxt7GDs6jcK-ZPPrnZEkv6HYWaVT-oGmb9nsBwonWz0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function escapeSqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    const elements = val.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
    return `ARRAY[${elements}]::text[]`;
  }
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function formatProductInsert(p) {
  return `INSERT INTO public.products (
  id, hospital_id, nome, categoria, referencia, tecido, tamanhos, cores, dimensoes, detalhes, imagem_principal, imagens_detalhe, pintura, marca_cliente, nome_campo, timbrado, rastreavel, arquivado, created_at, updated_at
) VALUES (
  ${escapeSqlVal(p.id)},
  ${escapeSqlVal(p.hospital_id)},
  ${escapeSqlVal(p.nome)},
  ${escapeSqlVal(p.categoria)},
  ${escapeSqlVal(p.referencia)},
  ${escapeSqlVal(p.tecido)},
  ${escapeSqlVal(p.tamanhos)},
  ${escapeSqlVal(p.cores)},
  ${escapeSqlVal(p.dimensoes)},
  ${escapeSqlVal(p.detalhes)},
  ${escapeSqlVal(p.imagem_principal)},
  ${escapeSqlVal(p.imagens_detalhe)},
  ${escapeSqlVal(p.pintura)},
  ${escapeSqlVal(p.marca_cliente)},
  ${escapeSqlVal(p.nome_campo)},
  ${escapeSqlVal(p.timbrado)},
  ${escapeSqlVal(p.rastreavel)},
  ${escapeSqlVal(p.arquivado)},
  ${escapeSqlVal(p.created_at)},
  ${escapeSqlVal(p.updated_at)}
) ON CONFLICT (id) DO UPDATE SET
  hospital_id = EXCLUDED.hospital_id,
  nome = EXCLUDED.nome,
  categoria = EXCLUDED.categoria,
  referencia = EXCLUDED.referencia,
  tecido = EXCLUDED.tecido,
  tamanhos = EXCLUDED.tamanhos,
  cores = EXCLUDED.cores,
  dimensoes = EXCLUDED.dimensoes,
  detalhes = EXCLUDED.detalhes,
  imagem_principal = EXCLUDED.imagem_principal,
  imagens_detalhe = EXCLUDED.imagens_detalhe,
  pintura = EXCLUDED.pintura,
  marca_cliente = EXCLUDED.marca_cliente,
  nome_campo = EXCLUDED.nome_campo,
  timbrado = EXCLUDED.timbrado,
  rastreavel = EXCLUDED.rastreavel,
  arquivado = EXCLUDED.arquivado,
  updated_at = EXCLUDED.updated_at;`;
}

async function main() {
  console.log('Obtendo dados do banco via Edge Function...');
  const { data: dump, error } = await supabase.functions.invoke('export-database');
  if (error) throw error;

  const baseDir = path.resolve(process.cwd(), 'supabase');
  const chunksDir = path.resolve(baseDir, 'backup_partes');
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }

  // ============================================================================
  // PARTE 1: ESTRUTURA BASE (Usuários, Hospital, Tecidos, Cores, Configs, Perfis)
  // ~35 KB (Ultra leve, roda em 1s)
  // ============================================================================
  const p1Lines = [];
  p1Lines.push('-- ==============================================================================');
  p1Lines.push('-- PARTE 1 DE 4: DADOS BASE (Usuários, Hospital, Indústrias, Tecidos, Cores, Perfis)');
  p1Lines.push('-- ==============================================================================\n');
  p1Lines.push('BEGIN;\n');

  p1Lines.push('-- 0. AUTH.USERS');
  p1Lines.push(`INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
) VALUES 
(
  'cd0079a9-fb5e-413c-a655-5fe6736ff06d',
  '00000000-0000-0000-0000-000000000000',
  'vant@vant.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Luan VantDEV","role":"admin"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
),
(
  'd065696a-ad00-4964-926a-a5c2aa184bf9',
  '00000000-0000-0000-0000-000000000000',
  'jessika@vant.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"jessika","role":"admin"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;\n`);

  p1Lines.push(`-- 1. HOSPITALS (${dump.hospitals.length})`);
  for (const h of dump.hospitals) {
    p1Lines.push(`INSERT INTO public.hospitals (id, nome, cidade, created_at) VALUES (${escapeSqlVal(h.id)}, ${escapeSqlVal(h.nome)}, ${escapeSqlVal(h.cidade)}, ${escapeSqlVal(h.created_at)}) ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, cidade = EXCLUDED.cidade;`);
  }
  p1Lines.push('');

  p1Lines.push(`-- 2. FABRIC_INDUSTRIES (${dump.fabric_industries.length})`);
  for (const ind of dump.fabric_industries) {
    p1Lines.push(`INSERT INTO public.fabric_industries (id, nome, created_at) VALUES (${escapeSqlVal(ind.id)}, ${escapeSqlVal(ind.nome)}, ${escapeSqlVal(ind.created_at)}) ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;`);
  }
  p1Lines.push('');

  p1Lines.push(`-- 3. FABRIC_TYPES (${dump.fabric_types.length})`);
  for (const ft of dump.fabric_types) {
    p1Lines.push(`INSERT INTO public.fabric_types (id, industry_id, nome, created_at) VALUES (${escapeSqlVal(ft.id)}, ${escapeSqlVal(ft.industry_id)}, ${escapeSqlVal(ft.nome)}, ${escapeSqlVal(ft.created_at)}) ON CONFLICT (id) DO UPDATE SET industry_id = EXCLUDED.industry_id, nome = EXCLUDED.nome;`);
  }
  p1Lines.push('');

  p1Lines.push(`-- 4. COLORS (${dump.colors.length})`);
  for (const c of dump.colors) {
    p1Lines.push(`INSERT INTO public.colors (id, fabric_type_id, codigo, nome, hex, created_at) VALUES (${escapeSqlVal(c.id)}, ${escapeSqlVal(c.fabric_type_id)}, ${escapeSqlVal(c.codigo)}, ${escapeSqlVal(c.nome)}, ${escapeSqlVal(c.hex)}, ${escapeSqlVal(c.created_at)}) ON CONFLICT (id) DO UPDATE SET fabric_type_id = EXCLUDED.fabric_type_id, codigo = EXCLUDED.codigo, nome = EXCLUDED.nome, hex = EXCLUDED.hex;`);
  }
  p1Lines.push('');

  p1Lines.push(`-- 5. COMPANY_SETTINGS (${dump.company_settings.length})`);
  for (const s of dump.company_settings) {
    p1Lines.push(`INSERT INTO public.company_settings (id, user_id, logo, nome_empresa, slogan, created_at) VALUES (${escapeSqlVal(s.id)}, ${escapeSqlVal(s.user_id)}, ${escapeSqlVal(s.logo)}, ${escapeSqlVal(s.nome_empresa)}, ${escapeSqlVal(s.slogan)}, ${escapeSqlVal(s.created_at)}) ON CONFLICT (id) DO UPDATE SET logo = EXCLUDED.logo, nome_empresa = EXCLUDED.nome_empresa, slogan = EXCLUDED.slogan;`);
  }
  p1Lines.push('');

  p1Lines.push(`-- 6. CONTRACT_MODELS (${dump.contract_models.length})`);
  for (const m of dump.contract_models) {
    p1Lines.push(`INSERT INTO public.contract_models (id, name, file_path, created_at) VALUES (${escapeSqlVal(m.id)}, ${escapeSqlVal(m.name)}, ${escapeSqlVal(m.file_path)}, ${escapeSqlVal(m.created_at)}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, file_path = EXCLUDED.file_path;`);
  }
  p1Lines.push('');

  p1Lines.push(`-- 7. PROFILES (${dump.profiles.length})`);
  for (const prof of dump.profiles) {
    p1Lines.push(`INSERT INTO public.profiles (id, name, email, role, permissions, profile_photo, must_change_password, created_at, updated_at) VALUES (${escapeSqlVal(prof.id)}, ${escapeSqlVal(prof.name)}, ${escapeSqlVal(prof.email)}, ${escapeSqlVal(prof.role)}, ${escapeSqlVal(prof.permissions)}, ${escapeSqlVal(prof.profile_photo)}, ${escapeSqlVal(prof.must_change_password)}, ${escapeSqlVal(prof.created_at)}, ${escapeSqlVal(prof.updated_at)}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role, permissions = EXCLUDED.permissions, profile_photo = EXCLUDED.profile_photo, must_change_password = EXCLUDED.must_change_password;`);
  }
  p1Lines.push('');

  p1Lines.push('COMMIT;');
  const p1Path = path.resolve(chunksDir, '1_dados_base.sql');
  fs.writeFileSync(p1Path, p1Lines.join('\n'), 'utf-8');
  console.log(`✅ Parte 1 salva: ${p1Path}`);

  // ============================================================================
  // PRODUTOS DIVIDIDOS EM PEQUENOS LOTES (3 produtos por arquivo - ~800 KB)
  // 100% compatível com o limite de tamanho do SQL Editor do navegador
  // ============================================================================
  const products = dump.products;
  const CHUNK_SIZE = 3;
  let partNumber = 2;

  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    const chunk = products.slice(i, i + CHUNK_SIZE);
    const pLines = [];
    pLines.push('-- ==============================================================================');
    pLines.push(`-- PARTE ${partNumber}: PRODUTOS DO ${i + 1} AO ${i + chunk.length} (com imagens em alta resolução)`);
    pLines.push('-- ==============================================================================\n');
    pLines.push('BEGIN;\n');

    for (const p of chunk) {
      pLines.push(formatProductInsert(p));
      pLines.push('');
    }

    pLines.push('COMMIT;');
    const chunkPath = path.resolve(chunksDir, `${partNumber}_produtos_${i + 1}_a_${i + chunk.length}.sql`);
    fs.writeFileSync(chunkPath, pLines.join('\n'), 'utf-8');
    console.log(`✅ Parte ${partNumber} salva (${chunk.length} produtos): ${chunkPath}`);
    partNumber++;
  }

  console.log('\n🎉 Todos os arquivos fracionados foram criados com sucesso na pasta: supabase/backup_partes/');
}

main().catch((err) => {
  console.error('Erro na exportação:', err);
  process.exit(1);
});
