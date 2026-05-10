import React, { useEffect, useState, useMemo } from 'react';
import { useContractStore } from '@/store/contractStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileSignature, Plus, Copy, Check, Clock, FileText, 
  Trash2, Folder, FolderOpen, Download, Upload, User, 
  Settings2, FileUp, Search, X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function ContractsPage() {
  const { 
    contracts, models, isLoading, 
    fetchContracts, fetchModels, createContract, 
    deleteContract, updateModelFile, addManualContract, deleteUserFolder
  } = useContractStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [openUserFolder, setOpenUserFolder] = useState<string | null>(null);

  // Manual Upload State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCpf, setManualCpf] = useState('');
  const [manualFile, setManualFile] = useState<File | null>(null);

  useEffect(() => {
    fetchContracts();
    fetchModels();
  }, [fetchContracts, fetchModels]);

  const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, '');

  const handleGenerateLink = async (modelId: string, modelPath: string) => {
    const { success, id } = await createContract({
      file_path: modelPath,
      model_id: modelId
    });
    if (success && id) {
      toast.success('Solicitação criada com sucesso!');
      copyToClipboard(id);
    }
  };

  const copyToClipboard = (id: string) => {
    const link = `${window.location.origin}/contrato/assinar/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return;
    const { success, message } = await deleteContract(id);
    if (success) {
      toast.success('Solicitação excluída.');
    } else {
      toast.error('Erro ao excluir: ' + message);
    }
  };

  const handleUpdateModel = async (modelId: string, file: File) => {
    setIsUploading(true);
    try {
      const fileName = `models/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      await updateModelFile(modelId, publicUrl);
      toast.success('Modelo de contrato atualizado!');
    } catch (err: any) {
      toast.error('Erro ao atualizar modelo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFile || !manualName || !manualCpf) return;
    setIsUploading(true);

    try {
      const fileName = `manual/${normalizeCpf(manualCpf)}/${Date.now()}_${manualFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, manualFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      await addManualContract({
        signer_name: manualName,
        signer_cpf: manualCpf,
        file_path: publicUrl
      });

      toast.success('Contrato anexado com sucesso!');
      setShowManualModal(false);
      setManualName('');
      setManualCpf('');
      setManualFile(null);
    } catch (err: any) {
      toast.error('Erro no upload: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFolder = async (cpf: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a PASTA de ${name}? Isso removerá todos os contratos assinados por esta pessoa.`)) return;
    
    const { success, message } = await deleteUserFolder(cpf);
    if (success) {
      toast.success(`Pasta de ${name} excluída.`);
    } else {
      toast.error('Erro ao excluir pasta: ' + message);
    }
  };

  // Group contracts by User (CPF)
  const usersFolders = useMemo(() => {
    const groups: Record<string, { name: string, cpf: string, contracts: any[] }> = {};
    
    contracts.filter(c => c.status === 'signed').forEach(c => {
      const key = normalizeCpf(c.signer_cpf || '000');
      if (!groups[key]) {
        groups[key] = {
          name: c.signer_name || 'Desconhecido',
          cpf: c.signer_cpf || '---',
          contracts: []
        };
      }
      groups[key].contracts.push(c);
    });

    return Object.values(groups).filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.cpf.includes(searchTerm)
    );
  }, [contracts, searchTerm]);

  const pendingContracts = contracts.filter(c => c.status === 'pending');

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileSignature className="h-8 w-8 text-primary" />
            </div>
            Gestão de Contratos
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de modelos, solicitações e arquivos assinados.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
                <FileUp className="mr-2 h-4 w-4" />
                Anexar Contrato Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload de Contrato Assinado Manualmente</DialogTitle>
                <DialogDescription>
                  Se o cliente assinou no papel, faça o upload do arquivo digitalizado aqui.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleManualUploadSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Cliente</Label>
                    <Input placeholder="Nome Completo" value={manualName} onChange={e => setManualName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input placeholder="000.000.000-00" value={manualCpf} onChange={e => setManualCpf(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Arquivo (PDF ou Foto)</Label>
                  <Input type="file" onChange={e => setManualFile(e.target.files?.[0] || null)} required />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? 'Enviando...' : 'Salvar na Pasta do Usuário'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="solicitacoes" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
          <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
          <TabsTrigger value="assinados">Pastas Assinadas</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
        </TabsList>

        {/* --- ABA SOLICITAÇÕES --- */}
        <TabsContent value="solicitacoes" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold text-slate-800">Links Pendentes</h3>
             <Button size="sm" onClick={() => {
               if (models.length > 0) {
                 handleGenerateLink(models[0].id, models[0].file_path);
               } else {
                 toast.error('Nenhum modelo de contrato cadastrado.');
               }
             }}>
               <Plus className="mr-2 h-4 w-4" />
               Gerar Novo Link
             </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingContracts.length === 0 ? (
              <Card className="col-span-full border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mb-4 opacity-20" />
                  <p className="mb-4">Nenhuma solicitação de assinatura pendente.</p>
                  <Button onClick={() => {
                    if (models.length > 0) {
                      handleGenerateLink(models[0].id, models[0].file_path);
                    } else {
                      toast.error('Nenhum modelo de contrato cadastrado.');
                    }
                  }}>
                    Gerar primeiro link agora
                  </Button>
                </CardContent>
              </Card>
            ) : (
              pendingContracts.map(c => (
                <Card key={c.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">Pendente</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg mt-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      Contrato #{c.id.slice(0, 5)}
                    </CardTitle>
                    <CardDescription>
                      Criado em {new Date(c.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2 gap-2">
                    <Button className="flex-1" size="sm" onClick={() => copyToClipboard(c.id)}>
                      {copiedId === c.id ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      Copiar Link
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* --- ABA PASTAS ASSINADAS --- */}
        <TabsContent value="assinados" className="space-y-6">
          <div className="flex items-center gap-2 max-w-sm mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por Nome ou CPF..." 
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {usersFolders.map(user => (
              <div key={user.cpf} className="relative group">
                <Dialog open={openUserFolder === user.cpf} onOpenChange={(open) => setOpenUserFolder(open ? user.cpf : null)}>
                  <DialogTrigger asChild>
                    <div className="cursor-pointer bg-white border rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 hover:bg-slate-50 transition-all shadow-sm">
                      <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Folder className="h-6 w-6 text-primary fill-primary/20" />
                      </div>
                      <div className="min-w-0 pr-6">
                        <p className="font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground">CPF: {user.cpf}</p>
                        <Badge variant="outline" className="mt-1 h-5 text-[10px]">{user.contracts.length} arquivos</Badge>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        Pasta de {user.name}
                      </DialogTitle>
                      <DialogDescription>Todos os contratos assinados ou anexados para este usuário.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                      {user.contracts.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className={c.is_manual ? "text-amber-600" : "text-green-600"}>
                              {c.is_manual ? <Upload className="h-4 w-4" /> : <FileSignature className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">Contrato Assinado {c.is_manual ? "(Manual)" : "(Digital)"}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(c.signed_at!).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                              <a href={c.file_path} target="_blank" rel="noreferrer">Ver</a>
                            </Button>
                            <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                              <a href={c.file_path} download={`Contrato_${user.name}.pdf`}>
                                <Download className="h-3 w-3 mr-1" />
                                Baixar
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Delete Folder Button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-7 w-7 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(user.cpf, user.name);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* --- ABA MODELOS --- */}
        <TabsContent value="modelos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {models.map(model => (
              <Card key={model.id} className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {model.name}
                    </span>
                    <Badge>Ativo</Badge>
                  </CardTitle>
                  <CardDescription>Arquivo base usado para novas solicitações.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-[4/3] bg-slate-100 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
                    <iframe src={model.file_path} className="w-full h-full border-0 pointer-events-none opacity-50" />
                    <div className="absolute flex flex-col items-center gap-2">
                       <FileText className="h-12 w-12 text-slate-300" />
                       <Button variant="secondary" size="sm" asChild>
                         <a href={model.file_path} target="_blank" rel="noreferrer">Visualizar Modelo Atual</a>
                       </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs font-bold uppercase">Trocar Arquivo Modelo</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="file" 
                          accept=".pdf" 
                          className="text-xs"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleUpdateModel(model.id, file);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50 gap-2">
                  <Button className="w-full h-11 text-lg font-bold" onClick={() => handleGenerateLink(model.id, model.file_path)}>
                    <Plus className="mr-2 h-5 w-5" />
                    Gerar Solicitação para este Modelo
                  </Button>
                  <Button variant="outline" className="h-11 border-primary text-primary" asChild title="Baixar para assinar a mão">
                    <a href={model.file_path} download="Contrato_Vant.pdf">
                      <Download className="h-5 w-5" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
