import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de Importação Automática para Novo Projeto Supabase
 *
 * Como usar:
 * node scripts/import_to_new_supabase.js "https://SEU_NOVO_PROJETO.supabase.co" "SEU_SERVICE_ROLE_KEY"
 */

const targetUrl = process.argv[2];
const targetKey = process.argv[3];

if (!targetUrl || !targetKey) {
  console.log(`
Uso:
  node scripts/import_to_new_supabase.js <NOVA_SUPABASE_URL> <NOVA_SERVICE_ROLE_KEY>

Exemplo:
  node scripts/import_to_new_supabase.js "https://xyz.supabase.co" "eyJhbGciOi..."
`);
  process.exit(1);
}

const supabase = createClient(targetUrl, targetKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(`🚀 Conectando ao novo projeto Supabase: ${targetUrl}...`);

  // Lê o dump original
  const dumpSourceUrl = 'https://kugfcjzgahljnchuxdop.supabase.co';
  const dumpAnon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1Z2ZjanpnYWhsam5jaHV4ZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDkxODksImV4cCI6MjA5MjI4NTE4OX0.Nxt7GDs6jcK-ZPPrnZEkv6HYWaVT-oGmb9nsBwonWz0';
  const sourceClient = createClient(dumpSourceUrl, dumpAnon);

  console.log('📦 Baixando todos os dados do banco de origem...');
  const { data: dump, error: dumpErr } = await sourceClient.functions.invoke('export-database');
  if (dumpErr || !dump) {
    throw new Error('Falha ao baixar dados de origem: ' + (dumpErr?.message || 'Sem dados'));
  }

  // 1. Inserir Hospitais
  if (dump.hospitals.length) {
    console.log(`🏥 Importando ${dump.hospitals.length} hospitais...`);
    const { error } = await supabase.from('hospitals').upsert(dump.hospitals);
    if (error) console.error('Erro em hospitais:', error.message);
  }

  // 2. Indústrias
  if (dump.fabric_industries.length) {
    console.log(`🏭 Importando ${dump.fabric_industries.length} indústrias...`);
    const { error } = await supabase.from('fabric_industries').upsert(dump.fabric_industries);
    if (error) console.error('Erro em indústrias:', error.message);
  }

  // 3. Tipos de tecido
  if (dump.fabric_types.length) {
    console.log(`🧵 Importando ${dump.fabric_types.length} tipos de tecido...`);
    const { error } = await supabase.from('fabric_types').upsert(dump.fabric_types);
    if (error) console.error('Erro em tipos de tecido:', error.message);
  }

  // 4. Cores
  if (dump.colors.length) {
    console.log(`🎨 Importando ${dump.colors.length} cores...`);
    const { error } = await supabase.from('colors').upsert(dump.colors);
    if (error) console.error('Erro em cores:', error.message);
  }

  // 5. Configurações
  if (dump.company_settings.length) {
    console.log(`⚙️ Importando configurações da empresa...`);
    const { error } = await supabase.from('company_settings').upsert(dump.company_settings);
    if (error) console.error('Erro em configurações:', error.message);
  }

  // 6. Modelos de contrato
  if (dump.contract_models.length) {
    console.log(`📄 Importando modelos de contrato...`);
    const { error } = await supabase.from('contract_models').upsert(dump.contract_models);
    if (error) console.error('Erro em modelos de contrato:', error.message);
  }

  // 7. Produtos em lotes de 5
  if (dump.products.length) {
    console.log(`📦 Importando ${dump.products.length} produtos (com fotos em alta resolução)...`);
    const BATCH = 5;
    for (let i = 0; i < dump.products.length; i += BATCH) {
      const slice = dump.products.slice(i, i + BATCH);
      const { error } = await supabase.from('products').upsert(slice);
      if (error) {
        console.error(`Erro nos produtos ${i + 1} a ${i + slice.length}:`, error.message);
      } else {
        console.log(`   ✓ Produtos ${i + 1} a ${Math.min(i + BATCH, dump.products.length)} salvos com sucesso.`);
      }
    }
  }

  // 8. Usuários no Auth
  console.log('👥 Criando usuários de autenticação no novo projeto...');
  const usersToCreate = [
    { email: 'vant@vant.com', name: 'Luan VantDEV', role: 'admin' },
    { email: 'jessika@vant.com', name: 'jessika', role: 'admin' },
  ];

  for (const u of usersToCreate) {
    const { data: created, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: 'sua_senha_ou_123456',
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role },
    });
    if (authErr && !authErr.message?.includes('already registered')) {
      console.error(`Erro ao criar usuário ${u.email}:`, authErr.message);
    }
  }

  // 9. Perfis
  if (dump.profiles.length) {
    console.log(`👤 Sincronizando perfis e permissões...`);
    const { error } = await supabase.from('profiles').upsert(dump.profiles);
    if (error) console.error('Erro em perfis:', error.message);
  }

  console.log('\n🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO NO NOVO PROJETO!');
}

main().catch((err) => {
  console.error('Erro na importação:', err);
  process.exit(1);
});
