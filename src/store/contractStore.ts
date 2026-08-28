import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Contract, ContractModel, CreateContractPayload, SignContractPayload } from '@/types/Contract';

interface ContractStore {
  contracts: Contract[];
  models: ContractModel[];
  isLoading: boolean;
  
  fetchContracts: () => Promise<void>;
  fetchModels: () => Promise<void>;
  getContractById: (id: string) => Promise<Contract | null>;
  createContract: (payload: CreateContractPayload) => Promise<{ success: boolean; id?: string; message?: string }>;
  signContract: (id: string, payload: SignContractPayload & { file_path?: string }) => Promise<{ success: boolean; message?: string }>;
  deleteContract: (id: string) => Promise<{ success: boolean; message?: string }>;
  updateModelFile: (modelId: string, filePath: string) => Promise<{ success: boolean; message?: string }>;
  addManualContract: (payload: { signer_name: string; signer_cpf?: string; file_path: string; model_id?: string }) => Promise<{ success: boolean; id?: string; message?: string }>;
  deleteUserFolder: (identifier: { cpf?: string; name?: string }) => Promise<{ success: boolean; message?: string }>;
}

export const useContractStore = create<ContractStore>((set, get) => ({
  contracts: [],
  models: [],
  isLoading: false,

  fetchContracts: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ contracts: (data || []) as Contract[] });
    } catch (err: any) {
      console.error('Error fetching contracts:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchModels: async () => {
    try {
      const { data, error } = await supabase
        .from('contract_models')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      set({ models: (data || []) as ContractModel[] });
    } catch (err: any) {
      console.error('Error fetching models:', err);
    }
  },

  getContractById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return null;
      return data as Contract;
    } catch (err) {
      return null;
    }
  },

  createContract: async (payload: CreateContractPayload) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const modelId = payload.model_id?.trim() || null;

      const { data, error } = await supabase
        .from('contracts')
        .insert({
          file_path: payload.file_path,
          model_id: modelId,
          created_by: userData?.user?.id || null,
        })
        .select('id')
        .single();

      if (error) return { success: false, message: error.message };
      await get().fetchContracts();
      return { success: true, id: data.id };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  signContract: async (id: string, payload: SignContractPayload & { file_path?: string }) => {
    try {
      const updateData: any = {
        status: 'signed',
        signer_name: payload.signer_name,
        signer_cpf: payload.signer_cpf?.trim() || null,
        signed_at: new Date().toISOString(),
        is_manual: payload.is_manual ?? false,
      };

      if (payload.file_path) {
        updateData.file_path = payload.file_path;
      }

      const { error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', id);

      if (error) return { success: false, message: error.message };
      await get().fetchContracts();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  deleteContract: async (id: string) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) return { success: false, message: error.message };
      await get().fetchContracts();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  updateModelFile: async (modelId: string, filePath: string) => {
    try {
      const { error } = await supabase
        .from('contract_models')
        .update({ file_path: filePath })
        .eq('id', modelId);
      
      if (error) throw error;
      await get().fetchModels();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message };
    }
  },

  addManualContract: async (payload: { signer_name: string; signer_cpf?: string; file_path: string; model_id?: string }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      // Garante que o model_id seja uma chave válida existente ou null
      let targetModelId: string | null = payload.model_id?.trim() || null;
      if (!targetModelId) {
        const availableModels = get().models;
        if (availableModels && availableModels.length > 0 && availableModels[0]?.id) {
          targetModelId = availableModels[0].id;
        }
      }

      const { data, error } = await supabase
        .from('contracts')
        .insert({
          status: 'signed',
          is_manual: true,
          signer_name: payload.signer_name.trim(),
          signer_cpf: payload.signer_cpf?.trim() || null,
          file_path: payload.file_path,
          model_id: targetModelId,
          signed_at: new Date().toISOString(),
          created_by: userData?.user?.id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao adicionar contrato manual:', error);
        return { success: false, message: error.message };
      }

      await get().fetchContracts();
      return { success: true, id: data?.id };
    } catch (err: any) {
      console.error('❌ Erro inesperado ao adicionar contrato manual:', err);
      return { success: false, message: err?.message || 'Erro ao salvar contrato manual.' };
    }
  },

  deleteUserFolder: async (identifier: { cpf?: string; name?: string }) => {
    try {
      let query = supabase.from('contracts').delete();
      if (identifier.cpf && identifier.cpf.trim() && identifier.cpf.trim() !== '---') {
        query = query.eq('signer_cpf', identifier.cpf.trim());
      } else if (identifier.name && identifier.name.trim()) {
        query = query.eq('signer_name', identifier.name.trim());
      } else {
        return { success: false, message: 'Identificador do cliente não informado.' };
      }

      const { error } = await query;
      if (error) return { success: false, message: error.message };
      await get().fetchContracts();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },
}));
