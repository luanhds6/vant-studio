export type ContractStatus = 'pending' | 'signed';

export interface ContractModel {
  id: string;
  name: string;
  file_path: string;
  created_at: string;
}

export interface Contract {
  id: string;
  created_at: string;
  status: ContractStatus;
  file_path: string;
  signer_name: string | null;
  signer_cpf: string | null;
  signed_at: string | null;
  created_by: string | null;
  is_manual: boolean;
  model_id: string | null;
}

export interface CreateContractPayload {
  file_path: string;
  model_id?: string;
}

export interface SignContractPayload {
  signer_name: string;
  signer_cpf: string;
  is_manual?: boolean;
}
