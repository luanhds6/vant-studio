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
  Settings2, FileUp, Search, X, Eye, ExternalLink, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface UserFolderGroup {
  key: string;
  name: string;
  cpf: string;
  contracts: any[];
}

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual Upload State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCpf, setManualCpf] = useState('');
  const [manualFile, setManualFile] = useState<File | null>(null);

  useEffect(() => {
    fetchContracts();
    fetchModels();
  }, [fetchContracts, fetchModels]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchContracts(), fetchModels()]);
      toast.success('Lista de contratos atualizada!');
    } catch {
      toast.error('Erro ao atualizar lista.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const normalizeDoc = (doc: string) => doc.replace(/\D/g, '');

  const handleGenerateLink = async (modelId: string, modelPath: string) => {
    const { success, id, message } = await createContract({
      file_path: modelPath,
      model_id: modelId
    });
    if (success && id) {
      toast.success('Solicitação criada com sucesso!');
      copyToClipboard(id);
    } else {
      toast.error('Erro ao criar solicitação: ' + (message || 'Erro desconhecido'));
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

  const handleDeleteSingleContract = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contrato assinado?')) return;
    const { success, message } = await deleteContract(id);
    if (success) {
      toast.success('Contrato excluído.');
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
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      const res = await updateModelFile(modelId, publicUrl);
      if (!res.success) throw new Error(res.message || 'Erro ao atualizar no banco');
      toast.success('Modelo de contrato atualizado!');
    } catch (err: any) {
      toast.error('Erro ao atualizar modelo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      toast.error('Por favor, informe o Nome do Cliente.');
      return;
    }
    if (!manualFile) {
      toast.error('Por favor, selecione o arquivo do contrato.');
      return;
    }
    setIsUploading(true);

    try {
      const cleanDoc = normalizeDoc(manualCpf) || manualName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const cleanFileName = manualFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `manual/${cleanDoc}/${Date.now()}_${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, manualFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      const res = await addManualContract({
        signer_name: manualName.trim(),
        signer_cpf: manualCpf.trim() || undefined,
        file_path: publicUrl,
        model_id: models[0]?.id || undefined,
      });

      if (!res.success) {
        throw new Error(res.message || 'Falha ao gravar contrato no banco de dados.');
      }

      toast.success('Contrato anexado com sucesso na pasta do cliente!');
      setShowManualModal(false);
      setManualName('');
      setManualCpf('');
      setManualFile(null);
    } catch (err: any) {
      console.error('Erro no upload manual:', err);
      toast.error('Erro no anexo manual: ' + (err.message || 'Falha desconhecida.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFolder = async (folder: UserFolderGroup) => {
    if (!confirm(`Tem certeza que deseja excluir a PASTA de «${folder.name}»? Isso removerá todos os contratos deste cliente.`)) return;
    
    const { success, message } = await deleteUserFolder({
      cpf: folder.cpf !== '---' ? folder.cpf : undefined,
      name: folder.name
    });

    if (success) {
      toast.success(`Pasta de ${folder.name} excluída.`);
      if (openUserFolder === folder.key) {
        setOpenUserFolder(null);
      }
    } else {
      toast.error('Erro ao excluir pasta: ' + message);
    }
  };

  const handleDownloadFile = async (url: string, suggestedName: string) => {
    try {
      const toastId = toast.loading('Baixando arquivo...');
      const response = await fetch(url);
      if (!response.ok) throw new Error('Não foi possível obter o arquivo.');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.dismiss(toastId);
      toast.success('Download concluído!');
    } catch (err: any) {
      console.warn('Download direto falhou, abrindo link:', err);
      window.open(url, '_blank');
    }
  };

  // Group contracts by User (CPF/CNPJ if available, or Client Name)
  const usersFolders = useMemo<UserFolderGroup[]>(() => {
    const groups: Record<string, UserFolderGroup> = {};
    
    contracts.filter(c => c.status === 'signed').forEach(c => {
      const rawCpf = c.signer_cpf?.trim();
      const cleanDoc = rawCpf ? normalizeDoc(rawCpf) : '';
      const clientName = c.signer_name?.trim() || 'Cliente Sem Nome';
      
      // Agrupa por CPF/CNPJ se preenchido; se não, agrupa pelo Nome do Cliente
      const groupKey = cleanDoc 
        ? `doc_${cleanDoc}` 
        : `name_${clientName.toLowerCase()}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          name: clientName,
          cpf: rawCpf || '---',
          contracts: []
        };
      }
      groups[groupKey].contracts.push(c);
    });

    const term = searchTerm.toLowerCase().trim();
    return Object.values(groups).filter(u => 
      !term ||
      u.name.toLowerCase().includes(term) || 
      u.cpf.toLowerCase().includes(term) ||
      normalizeDoc(u.cpf).includes(term)
    );
  }, [contracts, searchTerm]);

  const pendingContracts = contracts.filter(c => c.status === 'pending');

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileSignature className="h-8 w-8 text-primary" />
            </div>
            Gestão de Contratos
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de modelos, solicitações e arquivos assinados.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            title="Atualizar lista"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
                <FileUp className="mr-2 h-4 w-4" />
                Anexar Contrato Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload de Contrato Assinado Manualmente</DialogTitle>
                <DialogDescription>
                  Se o cliente assinou no papel ou externamente, faça o upload do arquivo digitalizado aqui.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleManualUploadSubmit} className="space-y-4 py-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="manual-name">
                      Nome do Cliente <span className="text-destructive">*</span>
                    </Label>
                    <Input 
                      id="manual-name"
                      placeholder="Ex: João da Silva ou Empresa LTDA" 
                      value={manualName} 
                      onChange={e => setManualName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="manual-cpf">CPF/CNPJ</Label>
                      <span className="text-[11px] text-muted-foreground">Opcional</span>
                    </div>
                    <Input 
                      id="manual-cpf"
                      placeholder="000.000.000-00 ou 00.000.000/0000-00" 
                      value={manualCpf} 
                      onChange={e => setManualCpf(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="manual-file">
                      Arquivo do Contrato <span className="text-destructive">*</span>
                    </Label>
                    <Input 
                      id="manual-file"
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={e => setManualFile(e.target.files?.[0] || null)} 
                      required 
                    />
                  </div>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowManualModal(false)} disabled={isUploading}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar na Pasta do Cliente'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="assinados" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
          <TabsTrigger value="assinados">Pastas Assinadas</TabsTrigger>
          <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
        </TabsList>

        {/* --- ABA PASTAS ASSINADAS --- */}
        <TabsContent value="assinados" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por Nome ou CPF/CNPJ..." 
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {usersFolders.length} {usersFolders.length === 1 ? 'pasta de cliente' : 'pastas de clientes'}
            </p>
          </div>

          {usersFolders.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <Folder className="h-8 w-8 opacity-70" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {searchTerm ? 'Nenhuma pasta encontrada para a busca' : 'Nenhuma pasta ou contrato assinado'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  {searchTerm 
                    ? `Nenhum cliente corresponde ao termo «${searchTerm}». Tente buscar por outro nome ou CPF/CNPJ.` 
                    : 'Os contratos assinados digitalmente pelos clientes ou anexados manualmente aparecerão aqui organizados em pastas por cliente.'}
                </p>
                {!searchTerm && (
                  <Button 
                    variant="outline" 
                    className="border-primary text-primary hover:bg-primary/5 gap-2"
                    onClick={() => setShowManualModal(true)}
                  >
                    <FileUp className="h-4 w-4" />
                    Anexar Primeiro Contrato Manual
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {usersFolders.map(user => (
                <div key={user.key} className="relative group">
                  <Dialog open={openUserFolder === user.key} onOpenChange={(open) => setOpenUserFolder(open ? user.key : null)}>
                    <DialogTrigger asChild>
                      <div className="cursor-pointer bg-card border rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 hover:bg-muted/40 transition-all shadow-xs">
                        <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors shrink-0">
                          <Folder className="h-6 w-6 text-primary fill-primary/20" />
                        </div>
                        <div className="min-w-0 flex-1 pr-6">
                          <p className="font-bold text-foreground truncate text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.cpf && user.cpf !== '---' ? `CPF/CNPJ: ${user.cpf}` : 'CPF/CNPJ: Não informado'}
                          </p>
                          <Badge variant="secondary" className="mt-1 h-5 text-[10px]">
                            {user.contracts.length} {user.contracts.length === 1 ? 'arquivo' : 'arquivos'}
                          </Badge>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                      <DialogHeader className="pb-2">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          Pasta de {user.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          {user.cpf && user.cpf !== '---' ? (
                            <>CPF/CNPJ: <strong className="text-foreground">{user.cpf}</strong> · </>
                          ) : (
                            <span className="text-muted-foreground">CPF/CNPJ não informado · </span>
                          )}
                          {user.contracts.length} contrato{user.contracts.length !== 1 ? 's' : ''} registrado{user.contracts.length !== 1 ? 's' : ''}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-2.5 my-2 flex-1 overflow-y-auto pr-1">
                        {user.contracts.map((c, idx) => (
                          <div key={c.id || idx} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`p-2 rounded-md shrink-0 ${c.is_manual ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                                {c.is_manual ? <Upload className="h-4 w-4" /> : <FileSignature className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">
                                    Contrato Assinado #{idx + 1}
                                  </p>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] py-0 px-1.5 ${
                                      c.is_manual 
                                        ? "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10" 
                                        : "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                                    }`}
                                  >
                                    {c.is_manual ? "Manual" : "Digital"}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {c.signed_at ? new Date(c.signed_at).toLocaleString() : new Date(c.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs gap-1"
                                onClick={() => window.open(c.file_path, '_blank')}
                                title="Visualizar documento em nova aba"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver
                              </Button>

                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-8 text-xs gap-1"
                                onClick={() => handleDownloadFile(c.file_path, `Contrato_${user.name.replace(/\s+/g, '_')}_${idx + 1}.pdf`)}
                                title="Baixar arquivo para o computador"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Baixar
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteSingleContract(c.id)}
                                title="Excluir este contrato"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <DialogFooter className="pt-2 border-t flex flex-row items-center justify-between">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                          onClick={() => handleDeleteFolder(user)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir Pasta Inteira
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setOpenUserFolder(null)}>
                          Fechar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Quick Delete Folder Button on Card Hover */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(user);
                    }}
                    title={`Excluir pasta de ${user.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* --- ABA SOLICITAÇÕES --- */}
        <TabsContent value="solicitacoes" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold text-foreground">Links Pendentes</h3>
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
              <Card className="col-span-full border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                  <Clock className="h-12 w-12 mb-4 opacity-20" />
                  <p className="mb-4 text-sm">Nenhuma solicitação de assinatura pendente no momento.</p>
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
                      <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                        Pendente
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-base mt-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      Contrato #{c.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription className="text-xs">
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
                  <div className="aspect-[4/3] bg-muted/40 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden relative">
                    <iframe src={model.file_path} className="w-full h-full border-0 pointer-events-none opacity-40" />
                    <div className="absolute flex flex-col items-center gap-2 p-4 bg-background/80 backdrop-blur-xs rounded-xl shadow-xs">
                       <FileText className="h-10 w-10 text-primary/70" />
                       <Button variant="secondary" size="sm" asChild className="text-xs gap-1.5">
                         <a href={model.file_path} target="_blank" rel="noreferrer">
                           <ExternalLink className="h-3.5 w-3.5" />
                           Visualizar Modelo Atual
                         </a>
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
                <CardFooter className="bg-muted/20 gap-2">
                  <Button className="w-full h-11 text-base font-bold" onClick={() => handleGenerateLink(model.id, model.file_path)}>
                    <Plus className="mr-2 h-5 w-5" />
                    Gerar Solicitação para este Modelo
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-11 border-primary text-primary" 
                    onClick={() => handleDownloadFile(model.file_path, `${model.name}.pdf`)}
                    title="Baixar para assinar a mão"
                  >
                    <Download className="h-5 w-5" />
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
