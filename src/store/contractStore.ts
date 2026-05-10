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
  updateModelFile: (modelId: string, filePath: string) => Promise<{ success: boolean }>;
  addManualContract: (payload: { signer_name: string, signer_cpf: string, file_path: string }) => Promise<{ success: boolean }>;
  deleteUserFolder: (cpf: string) => Promise<{ success: boolean; message?: string }>;
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
      set({ contracts: data as Contract[] });
    } catch (err) {
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
      set({ models: data as ContractModel[] });
    } catch (err) {
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
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          file_path: payload.file_path,
          model_id: payload.model_id,
          created_by: userData?.user?.id
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
        signer_cpf: payload.signer_cpf,
        signed_at: new Date().toISOString(),
        is_manual: payload.is_manual ?? false
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
    } catch (err) {
      return { success: false };
    }
  },

  addManualContract: async (payload) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('contracts')
        .insert({
          status: 'signed',
          is_manual: true,
          signer_name: payload.signer_name,
          signer_cpf: payload.signer_cpf,
          file_path: payload.file_path,
          signed_at: new Date().toISOString(),
          created_by: userData?.user?.id
        });

      if (error) throw error;
      await get().fetchContracts();
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  deleteUserFolder: async (cpf) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('signer_cpf', cpf);

      if (error) return { success: false, message: error.message };
      await get().fetchContracts();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}));
