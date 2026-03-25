import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyPlus, Trash2, ShieldAlert, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function UsersManagement() {
  const { users, currentUser, addUser, deleteUser } = useAuthStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "user" as "admin" | "user" });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Acesso Negado</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    // Check if email already exists
    if (users.some(u => u.email === formData.email)) {
      toast.error("Já existe um usuário com este e-mail.");
      return;
    }

    addUser(formData);
    toast.success("Usuário criado com sucesso!");
    setIsDialogOpen(false);
    setFormData({ name: "", email: "", password: "", role: "user" });
  };

  const handleDelete = (id: string, name: string) => {
    if (id === currentUser?.id) {
      toast.error("Você não pode excluir sua própria conta.");
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o usuário ${name}?`)) {
      deleteUser(id);
      toast.success("Usuário excluído com sucesso.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Controle de acesso à plataforma de catálogos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <CopyPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Usuário</DialogTitle>
              <DialogDescription>
                Crie um novo acesso para gerentes do catálogo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="Nome do Usuário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha Temporária</Label>
                <Input 
                  id="password" 
                  type="text" 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Nível de Acesso</Label>
                <Select value={formData.role} onValueChange={(val: any) => setFormData({...formData, role: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário Comum (Acesso a Catálogos)</SelectItem>
                    <SelectItem value="admin">Administrador Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="w-full">Salvar Usuário</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'
                  }`}>
                    {user.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                    {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </span>
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id, user.name)} disabled={user.id === currentUser?.id} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
